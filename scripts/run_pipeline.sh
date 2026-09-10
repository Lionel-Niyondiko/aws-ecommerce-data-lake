#!/usr/bin/env bash
# ===========================================================================
# run_pipeline.sh — the only runtime script in this project
# ===========================================================================
# One script, several sub-commands. Splitting it into six files would have
# duplicated the credential handling, the Terraform output reading and the
# Athena polling six times.
#
#   ./scripts/run_pipeline.sh all        ingest -> catalog -> silver -> gold
#   ./scripts/run_pipeline.sh ingest     upload data/ to bronze/, partitioned
#   ./scripts/run_pipeline.sh catalog    bronze DDL + MSCK
#   ./scripts/run_pipeline.sh quality    the profiling queries (read-only)
#   ./scripts/run_pipeline.sh silver     rebuild silver
#   ./scripts/run_pipeline.sh gold       rebuild the star schema
#   ./scripts/run_pipeline.sh analytics  the six business questions
#   ./scripts/run_pipeline.sh sql FILE   run any .sql file
#
# CREDENTIALS. The script assumes the least-privilege pipeline role, unless it
# is ALREADY running under an assumed role — which is what happens in CI, where
# OIDC has already produced one. Assuming a role from a role that cannot assume
# it fails; skipping the step when the caller is already correct is what makes
# the same script work on a laptop and in GitHub Actions.
#
# IDEMPOTENCE. Every rebuild drops the table AND deletes the S3 prefix. Athena
# refuses a CTAS into a non-empty location, and DROP TABLE on an external table
# does not delete files. Doing only one of the two produces the single most
# common error in this lab: "External location must be empty".
# ===========================================================================

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# --- output ---------------------------------------------------------------
if [ -t 1 ]; then
    BOLD=$'\033[1m'; DIM=$'\033[2m'; RED=$'\033[31m'
    GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RESET=$'\033[0m'
else
    BOLD=""; DIM=""; RED=""; GREEN=""; YELLOW=""; RESET=""
fi
step() { printf '\n%s==> %s%s\n' "$BOLD" "$1" "$RESET"; }
info() { printf '    %s%s%s\n' "$DIM" "$1" "$RESET"; }
ok()   { printf '    %s%s%s\n' "$GREEN" "$1" "$RESET"; }
warn() { printf '    %s%s%s\n' "$YELLOW" "$1" "$RESET"; }
die()  { printf '\n%sERROR: %s%s\n' "$RED" "$1" "$RESET" >&2; exit 1; }

# --- prerequisites --------------------------------------------------------
command -v aws       >/dev/null 2>&1 || die "aws CLI not found."
command -v terraform >/dev/null 2>&1 || die "terraform not found."
command -v jq        >/dev/null 2>&1 || die "jq not found."

# ---------------------------------------------------------------------------
# Terraform outputs. Read ONCE — each call costs a state read.
# ---------------------------------------------------------------------------
step "Reading the deployed infrastructure"
TF_JSON="$(terraform -chdir=terraform output -json 2>/dev/null)" \
    || die "No Terraform outputs. Run 'make deploy' first."

BUCKET="$(echo "$TF_JSON"   | jq -r '.bucket_name.value       // empty')"
DATABASE="$(echo "$TF_JSON" | jq -r '.glue_database.value     // empty')"
ROLE_ARN="$(echo "$TF_JSON" | jq -r '.pipeline_role_arn.value // empty')"
REGION="$(echo "$TF_JSON"   | jq -r '.aws_region.value        // empty')"
ATHENA_OUT="$(echo "$TF_JSON" | jq -r '.athena_results.value  // empty')"

[ -n "$BUCKET" ]   || die "bucket_name output is empty. Is the stack deployed?"
[ -n "$DATABASE" ] || die "glue_database output is empty."

export AWS_DEFAULT_REGION="$REGION"
info "bucket   $BUCKET"
info "database $DATABASE"
info "region   $REGION"

# ---------------------------------------------------------------------------
# Assume the pipeline role — unless already under an assumed role.
# ---------------------------------------------------------------------------
CURRENT_ARN="$(aws sts get-caller-identity --query Arn --output text)"

if [[ "$CURRENT_ARN" == *":assumed-role/"* ]]; then
    ok "Already running as an assumed role, no assume-role needed."
    info "$CURRENT_ARN"
else
    step "Assuming the pipeline role"
    CREDS="$(aws sts assume-role \
                --role-arn "$ROLE_ARN" \
                --role-session-name "pipeline-$(date +%s)" \
                --duration-seconds 3600 \
                --query Credentials --output json)" \
        || die "assume-role failed. Check the trust policy on $ROLE_ARN."

    AWS_ACCESS_KEY_ID="$(echo "$CREDS"     | jq -r .AccessKeyId)"
    AWS_SECRET_ACCESS_KEY="$(echo "$CREDS" | jq -r .SecretAccessKey)"
    AWS_SESSION_TOKEN="$(echo "$CREDS"     | jq -r .SessionToken)"
    export AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN

    ok "Session opened for 1 hour."
    info "$(aws sts get-caller-identity --query Arn --output text)"
    warn "From here on, every failure is a least-privilege failure, not a typo."
fi

# ---------------------------------------------------------------------------
# athena_run <sql> — submit, poll, fail loudly.
# ---------------------------------------------------------------------------
athena_run() {
    local sql="$1" qid state reason

    qid="$(aws athena start-query-execution \
              --query-string "$sql" \
              --query-execution-context "Database=$DATABASE" \
              --work-group primary \
              --result-configuration "OutputLocation=$ATHENA_OUT" \
              --query QueryExecutionId --output text)"

    while true; do
        state="$(aws athena get-query-execution --query-execution-id "$qid" \
                    --query 'QueryExecution.Status.State' --output text)"
        case "$state" in
            SUCCEEDED) break ;;
            FAILED|CANCELLED)
                reason="$(aws athena get-query-execution --query-execution-id "$qid" \
                            --query 'QueryExecution.Status.StateChangeReason' --output text)"
                printf '%s\n' "$RED--- failing query ---$RESET" >&2
                printf '%s\n' "$sql" | head -20 >&2
                die "Athena: $reason"
                ;;
            *) sleep 2 ;;
        esac
    done
    echo "$qid"
}

# Prints the result of the last query. Used by the verification blocks.
athena_show() {
    aws athena get-query-results --query-execution-id "$1" \
        --query 'ResultSet.Rows[].Data[].VarCharValue' --output text
}

# ---------------------------------------------------------------------------
# run_sql_file <path> — substitute ${BUCKET}, strip comments, split on ';',
# run each statement.
#
# ORDER MATTERS: comments are stripped BEFORE the split, never after. Several
# comments in these files contain a semicolon — "130 rows; partitioning would
# create more metadata than data" — and splitting first would cut the statement
# that follows in half at that semicolon and send two broken fragments to
# Athena. This is not hypothetical; it is the first bug this script had.
#
# The splitter remains naive in one respect: it cannot handle a ';' inside a
# string literal. That is a deliberate limit — none of the five files contains
# one, and a correct SQL parser in bash is not a thing worth writing. If you
# ever add one, use a real client.
# ---------------------------------------------------------------------------
run_sql_file() {
    local file="$1" n=0 stmt prepared
    [ -f "$file" ] || die "File not found: $file"
    step "Running $file"

    prepared="$(sed -e "s|\${BUCKET}|$BUCKET|g" -e 's/--.*$//' "$file")"

    while IFS= read -r -d ';' stmt; do
        [ -z "${stmt//[[:space:]]/}" ] && continue

        n=$((n + 1))
        local label
        label="$(echo "$stmt" | tr '\n' ' ' | tr -s ' ' | sed 's/^ *//' | cut -c1-70)"
        printf '    %2d. %s...\n' "$n" "$label"

        athena_run "$stmt" >/dev/null
    done <<< "$prepared"

    ok "$n statements executed."
}

# ---------------------------------------------------------------------------
# rebuild_zone <table> <prefix> — drop the table AND clear the prefix.
# ---------------------------------------------------------------------------
rebuild_zone() {
    local table="$1" prefix="$2"
    info "dropping $table and clearing s3://$BUCKET/$prefix"
    athena_run "DROP TABLE IF EXISTS $table" >/dev/null
    aws s3 rm "s3://$BUCKET/$prefix" --recursive --quiet 2>/dev/null || true
}

# ===========================================================================
# Sub-commands
# ===========================================================================

cmd_ingest() {
    step "Ingesting sources into bronze"
    local d
    d="$(date -u +%Y-%m-%d)"
    info "ingestion_date=$d"

    # Hive-style prefixes: Glue reads the partition value from the path itself.
    # ingestion_date=2026-09-09/, not 2026-09-09/.
    aws s3 cp data/orders.csv \
        "s3://$BUCKET/bronze/orders/ingestion_date=$d/orders.csv"
    aws s3 cp data/products.jsonl \
        "s3://$BUCKET/bronze/products/ingestion_date=$d/products.jsonl"
    aws s3 cp data/users.jsonl \
        "s3://$BUCKET/bronze/users/ingestion_date=$d/users.jsonl"

    ok "Three files uploaded. Bronze is append-only: a second run adds a"
    info "new partition, it does not overwrite the first."
}

cmd_catalog() {
    run_sql_file sql/01_bronze.sql
}

cmd_quality() {
    run_sql_file sql/02_quality.sql
}

cmd_silver() {
    step "Rebuilding silver"
    rebuild_zone orders_clean   silver/orders_clean/
    rebuild_zone products_clean silver/products_clean/
    rebuild_zone users_clean    silver/users_clean/
    run_sql_file sql/03_silver.sql
}

cmd_gold() {
    step "Rebuilding gold"
    # fact first: it depends on the dimensions, so it must go before them.
    rebuild_zone fact_ventes gold/fact_ventes/
    rebuild_zone dim_date    gold/dim_date/
    rebuild_zone dim_produit gold/dim_produit/
    rebuild_zone dim_client  gold/dim_client/
    run_sql_file sql/04_gold.sql
}

cmd_analytics() {
    run_sql_file sql/05_analytics.sql
    step "Results"
    info "Athena writes them to $ATHENA_OUT"
    info "Read them in the console, or with:"
    info "  aws athena get-query-results --query-execution-id <id>"
}

cmd_all() {
    cmd_ingest
    cmd_catalog
    cmd_silver
    cmd_gold
    step "Pipeline complete"
    ok "bronze 7,956 rows -> silver 7,547 rows -> gold 7,547 facts"
    info "Run 'make analytics' for the business questions,"
    info "or 'pytest -m aws' to check the invariants."
}

# ===========================================================================
usage() {
    sed -n '3,25p' "$0" | sed 's/^# \{0,1\}//'
}

case "${1:-all}" in
    all)       cmd_all ;;
    ingest)    cmd_ingest ;;
    catalog)   cmd_catalog ;;
    quality)   cmd_quality ;;
    silver)    cmd_silver ;;
    gold)      cmd_gold ;;
    analytics) cmd_analytics ;;
    sql)       run_sql_file "${2:?usage: run_pipeline.sh sql <file.sql>}" ;;
    -h|--help|help) usage ;;
    *)         die "Unknown command '$1'. Try --help." ;;
esac
