"""
Two test suites in one file, separated by a marker.

    pytest -m "not aws"     no credentials, no cost, runs on every push
    pytest -m aws           requires a deployed lake, runs after the e2e apply

The offline tests read the SOURCE FILES and the SQL. They catch the mistakes
that are expensive to discover on AWS: a forgotten skip.header.line.count, a
NOT IN that silently swallows orphans, a reference to bronze inside gold.

The aws tests read the DEPLOYED TABLES and assert the numbers the offline
profiling predicted. They are the only proof that the pipeline actually did
what the SQL says it does.

Numbers are hard-coded on purpose. A test that recomputes the expected value
with the same logic as the code under test proves nothing.
"""

import csv
import json
import os
import re
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
SQL = ROOT / "sql"


# ===========================================================================
# Offline - source data
# ===========================================================================

def test_orders_csv_has_expected_shape():
    """7,956 data rows and the exact 7 columns bronze declares."""
    with open(DATA / "orders.csv", newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    assert len(rows) == 7956
    assert list(rows[0].keys()) == [
        "InvoiceNo", "ProductID", "Quantity",
        "InvoiceDate", "UnitPrice", "CustomerID", "Country",
    ]


def test_orders_csv_anomalies_are_still_there():
    """
    If someone 'fixes' the source file, the whole lab loses its point and every
    downstream count becomes wrong. This test protects the anomalies.
    """
    with open(DATA / "orders.csv", newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))

    blank_dates = sum(1 for r in rows if not r["InvoiceDate"].strip())
    slash_dates = sum(1 for r in rows if "/" in r["InvoiceDate"])
    blank_qty = sum(1 for r in rows if not r["Quantity"].strip())
    blank_cust = sum(1 for r in rows if not r["CustomerID"].strip())
    returns = sum(1 for r in rows if r["InvoiceNo"].startswith("C"))
    countries = {r["Country"].strip() for r in rows}

    assert blank_dates == 36
    assert slash_dates == 29
    assert blank_qty == 116
    assert blank_cust == 157
    assert returns == 243
    assert len(countries) == 39, "39 raw spellings collapse to 10 countries"


def test_negative_prices_are_not_returns():
    """
    All 29 negative prices sit on NORMAL
    invoices, none on a 'C' return. So they are a data-entry defect, and
    dropping them (silver R4) is correct. If they were returns, dropping them
    would have destroyed real business events.
    """
    with open(DATA / "orders.csv", newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))

    negative = [r for r in rows
                if r["UnitPrice"].strip()
                and float(r["UnitPrice"]) < 0]
    assert len(negative) == 29
    assert all(not r["InvoiceNo"].startswith("C") for r in negative)


def test_invoiceno_is_not_an_order_key():
    """
    82% of invoice numbers carry more than one date. This is why the fact's
    natural key needs invoice_timestamp, and why counting DISTINCT invoiceno
    per month is a non-additive metric.
    """
    with open(DATA / "orders.csv", newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))

    dates_per_invoice = {}
    for r in rows:
        stamp = r["InvoiceDate"].strip()
        if stamp:
            dates_per_invoice.setdefault(r["InvoiceNo"], set()).add(stamp[:10])

    multi = sum(1 for d in dates_per_invoice.values() if len(d) > 1)
    ratio = multi / len(dates_per_invoice)
    assert ratio > 0.80, f"only {ratio:.0%} multi-dated - the premise changed"


@pytest.mark.parametrize("name,count", [("products.jsonl", 130),
                                        ("users.jsonl", 130)])
def test_jsonl_files_parse_line_by_line(name, count):
    with open(DATA / name, encoding="utf-8") as fh:
        objects = [json.loads(line) for line in fh if line.strip()]
    assert len(objects) == count


def test_brand_is_absent_from_62_products():
    """
    Absent key, not empty string. The SerDe returns NULL, which is why silver
    keeps the column rather than filtering on it.
    """
    with open(DATA / "products.jsonl", encoding="utf-8") as fh:
        products = [json.loads(line) for line in fh if line.strip()]
    assert sum(1 for p in products if "brand" not in p) == 62


def test_every_catalog_customer_is_american():
    """
    So revenue by country must come from the FACT (shipping country). Using
    dim_client.country would return a single row and raise no error.
    """
    with open(DATA / "users.jsonl", encoding="utf-8") as fh:
        users = [json.loads(line) for line in fh if line.strip()]
    assert {u["address"]["country"] for u in users} == {"United States"}


# ===========================================================================
# Offline - SQL source assertions
# ===========================================================================

def read_sql(name):
    return (SQL / name).read_text(encoding="utf-8")


def read_sql_code(name):
    """Same file with the comments removed for tests that must not match
    prose. Several comments deliberately quote the anti-patterns they warn
    against, so a naive substring search on the raw file would fail."""
    return re.sub(r"--.*$", "", read_sql(name), flags=re.MULTILINE)


def test_bronze_skips_the_csv_header():
    """Without this, the header becomes a data row and every COUNT is off."""
    assert "skip.header.line.count" in read_sql("01_bronze.sql")


def test_bronze_types_the_csv_as_string():
    """
    A strict type on a column holding '31/02/2026' fails the WHOLE query with
    HIVE_BAD_DATA. Bronze must not type; silver must, with TRY_CAST.
    """
    ddl = read_sql("01_bronze.sql")
    block = ddl[ddl.index("orders_raw"):ddl.index("PARTITIONED BY")]
    for column in ("quantity", "unitprice", "customerid", "invoicedate"):
        assert re.search(rf"\b{column}\s+string", block), \
            f"{column} must be string in bronze"


def test_bronze_repairs_every_partitioned_table():
    ddl = read_sql("01_bronze.sql")
    for table in ("orders_raw", "products_raw", "users_raw"):
        assert f"MSCK REPAIR TABLE {table}" in ddl


def test_gold_never_reads_bronze():
    """
    The medallion guard. Gold derives from silver only. CI runs the same check
    as a grep so it fails fast, but the assertion belongs here too.
    """
    assert "_raw" not in read_sql_code("04_gold.sql").lower()


def test_no_not_in_anywhere():
    """
    NOT IN against a column containing NULL evaluates to NULL and returns zero
    rows. Used for orphan detection it reports 'no orphans' on a dataset with
    376 of them. Every anti-join in this project uses LEFT JOIN ... IS NULL.
    """
    for path in sorted(SQL.glob("*.sql")):
        assert not re.search(r"\bNOT\s+IN\s*\(", read_sql_code(path.name),
                             re.IGNORECASE), \
            f"{path.name} uses NOT IN - use LEFT JOIN ... IS NULL"


def test_silver_deduplicates_on_business_columns_only():
    """
    SELECT DISTINCT * would include ingestion_date, so a second ingestion would
    leave every row twice and deduplicate nothing.
    """
    silver = read_sql("03_silver.sql")
    assert "SELECT DISTINCT *" not in silver
    assert "MAX(ingestion_date)" in silver


def test_silver_maps_countries_with_else_null():
    """
    ELSE country would let an unknown spelling through silently. ELSE NULL makes
    it visible, and the verification block asserts unmapped_country = 0.
    """
    silver = read_sql("03_silver.sql")
    assert "ELSE NULL" in silver
    assert "unmapped_country" in silver


def test_fact_uses_left_join_not_inner():
    """The 5%-of-revenue decision. INNER JOIN would drop 376 rows silently."""
    gold = read_sql_code("04_gold.sql")
    fact = gold[gold.index("CREATE TABLE fact_ventes"):]
    fact = fact[:fact.index(";", fact.index("FROM orders_clean"))]
    assert fact.count("LEFT JOIN") == 2
    assert not re.search(r"\n\s*(INNER\s+)?JOIN\b", fact)


def test_convention_keys_are_negative():
    """
    Real orphan product ids run 9002–9992. A technical key at 9999 would share
    the value space with natural keys; a negative integer cannot collide.
    (Comments are stripped: one of them quotes 9999 to explain the choice.)
    """
    gold = read_sql_code("04_gold.sql")
    assert "-1" in gold and "-2" in gold
    assert "9999" not in gold


def test_ctas_puts_partition_columns_last():
    """
    Athena requires it, and the error message when you get it wrong does not
    say so. Checked structurally: whatever the expressions are, the last two
    projected columns before FROM must be year then month.
    """
    tail_pattern = re.compile(
        r"(?:AS\s+year|\.year)\s*,\s*\n"     # ... year,
        r"[^\n]*(?:AS\s+month|\.month)\s*\n" # ... month
        r"\s*FROM\b",                        # FROM
        re.IGNORECASE)

    for name in ("03_silver.sql", "04_gold.sql"):
        body = read_sql_code(name)
        for match in re.finditer(
                r"partitioned_by\s*=\s*ARRAY\['year',\s*'month'\]", body):
            statement = body[match.end():]
            statement = statement[:statement.index(";")]
            assert tail_pattern.search(statement), \
                f"{name}: partition columns must be last in the SELECT"


def test_analytics_excludes_convention_rows_from_rankings():
    """
    Q2 and Q5 must exclude them: 'Unknown product' would rank 3rd by revenue,
    'Not recorded' would top the customer ranking. Q1/Q3/Q4/Q6 must keep them.
    """
    analytics = read_sql("05_analytics.sql")
    assert "product_id <> -1" in analytics
    assert "customer_id > 0" in analytics


def test_analytics_counts_orders_as_invoice_plus_date():
    """COUNT(DISTINCT invoiceno) alone overcounts by 125% across months."""
    analytics = read_sql("05_analytics.sql")
    assert "invoiceno || '|' || CAST(f.date_id AS varchar)" in analytics


# ===========================================================================
# Offline - no column is dropped between bronze and gold
# ===========================================================================
# The audit that produced these tests found the grain, the row counts and the
# revenue intact, and several columns simply missing from gold. Nothing was
# wrong; information was just absent, with nothing in the file to say whether
# that was a decision or an oversight. These tests turn that ambiguity into a
# failure: every bronze column must land somewhere, under its own name, a
# documented rename, or a documented flattening.


def _strip_string_literals(text):
    """A literal may contain a comma or the word AS. Blank them first."""
    return re.sub(r"'[^']*'", "''", text)


def _aliases(projection):
    """
    Output column names of a bare SELECT projection list.

    Commas and AS are read at parenthesis depth zero only, so
    CAST(NULL AS varchar) AS brand yields "brand" and not "varchar".
    """
    projection = _strip_string_literals(projection)

    items, depth, current = [], 0, []
    for char in projection:
        if char == "(":
            depth += 1
        elif char == ")":
            depth -= 1
        if char == "," and depth == 0:
            items.append("".join(current))
            current = []
        else:
            current.append(char)
    items.append("".join(current))

    names = []
    for item in items:
        item = " ".join(item.split())
        if not item:
            continue
        depth, cut = 0, None
        for token in re.finditer(r"[()]|\bAS\b", item, re.IGNORECASE):
            if token.group(0) == "(":
                depth += 1
            elif token.group(0) == ")":
                depth -= 1
            elif depth == 0:
                cut = token.end()
        name = item if cut is None else item[cut:]
        names.append(name.strip().strip('"').split(".")[-1].strip('"').lower())
    return names


def _projection(sql_code, create_marker, from_marker):
    """The first SELECT of a CTAS, read as a list of output column names."""
    body = sql_code[sql_code.index(create_marker):]
    body = body[body.index(") AS"):]
    body = body[body.index("SELECT") + len("SELECT"):body.index(from_marker)]
    return _aliases(body)


def _bronze_columns(table):
    """
    Top-level columns of a bronze external table, plus its partition column.

    Struct fields are not counted: flattening them is silver's job, and the
    ORIGINS maps below record where each one is supposed to land.
    """
    block = read_sql_code("01_bronze.sql")
    block = block[block.index(f"EXISTS {table} ("):]
    block = block[:block.index("PARTITIONED BY")]
    columns = re.findall(r"^  (`?\w+`?)\s+\S", block, re.MULTILINE)
    return [c.strip("`") for c in columns] + ["ingestion_date"]


# bronze column -> the silver column(s) it becomes. Anything absent from the
# map has to survive under its own name.
PRODUCT_ORIGINS = {
    "id":                   ["product_id"],
    "price":                ["catalog_price"],
    "discountpercentage":   ["discount_percentage"],
    "dimensions":           ["width", "height", "depth"],
    "tags":                 ["tags", "tag_count"],
    "warrantyinformation":  ["warranty_information"],
    "shippinginformation":  ["shipping_information"],
    "availabilitystatus":   ["availability_status"],
    "minimumorderquantity": ["minimum_order_quantity"],
    "ingestion_date":       ["source_ingestion_date"],
}
# computed in silver, with no bronze column behind it
PRODUCT_COMPUTED = {"discounted_price"}

USER_ORIGINS = {
    "id":      ["customer_id"],
    "address": ["address_street", "city", "state", "state_code",
                "postal_code", "country", "latitude", "longitude"],
    "company": ["company_name", "company_department", "company_title",
                "company_address_street", "company_address_city",
                "company_address_state", "company_address_state_code",
                "company_address_postal_code", "company_address_country",
                "company_address_lat", "company_address_lng"],
    "ingestion_date": ["source_ingestion_date"],
}
USER_COMPUTED = set()


def _expected_silver(bronze_columns, origins, computed):
    expected = set(computed)
    for column in bronze_columns:
        expected.update(origins.get(column, [column]))
    return expected


def test_products_reach_gold_with_nothing_dropped_on_the_way():
    """
    products_clean must account for every bronze column, and dim_produit must
    expose all of products_clean plus is_unknown. A column added to bronze and
    forgotten downstream fails here rather than in six months.
    """
    silver = _projection(read_sql_code("03_silver.sql"),
                         "CREATE TABLE products_clean", "FROM products_raw")
    gold = _projection(read_sql_code("04_gold.sql"),
                       "CREATE TABLE dim_produit", "FROM products_clean")

    assert set(silver) == _expected_silver(
        _bronze_columns("products_raw"), PRODUCT_ORIGINS, PRODUCT_COMPUTED)
    assert set(gold) == set(silver) | {"is_unknown"}
    assert gold[-1] == "is_unknown", "the convention flag stays last"


def test_users_reach_gold_with_nothing_dropped_on_the_way():
    """The mirror of the test above, on the customer side."""
    silver = _projection(read_sql_code("03_silver.sql"),
                         "CREATE TABLE users_clean", "FROM users_raw")
    gold = _projection(read_sql_code("04_gold.sql"),
                       "CREATE TABLE dim_client", "FROM users_clean")

    assert set(silver) == _expected_silver(
        _bronze_columns("users_raw"), USER_ORIGINS, USER_COMPUTED)
    assert set(gold) == set(silver) | {"customer_type"}
    assert gold[-1] == "customer_type", "the row-type flag stays last"


def test_convention_rows_line_up_with_the_dimension_they_extend():
    """
    UNION ALL is positional. A column added to the main SELECT and forgotten in
    a convention branch does not raise: it shifts every following value by one,
    or fails with a type error that reads like a typo. 04_gold.sql calls this
    its number one error, so it gets an assertion rather than a comment.
    """
    gold = read_sql_code("04_gold.sql")
    for create, source in (("CREATE TABLE dim_produit", "FROM products_clean"),
                           ("CREATE TABLE dim_client",  "FROM users_clean")):
        main = _projection(gold, create, source)
        block = gold[gold.index(create):]
        block = block[:block.index(";")]

        branches = block.split("UNION ALL")[1:]
        assert branches, f"{create}: no convention row"
        for branch in branches:
            names = _aliases(branch[branch.index("SELECT") + len("SELECT"):])
            assert names == main, (
                f"{create}: a convention row is out of step with the "
                f"main SELECT ({len(names)} columns against {len(main)})")


# ===========================================================================
# Offline - repository shape
# ===========================================================================

def test_no_hardcoded_account_id_or_bucket():
    """
    A 12-digit account number or a literal bucket in the SQL would make the
    project unreproducible for anyone else. The SQL uses ${BUCKET}, which
    run_pipeline.sh substitutes from the Terraform output; the account id comes
    from data.aws_caller_identity.

    Comments are stripped: iam.tf documents the trust policy with the
    conventional 123456789012 placeholder, which is not a real account.
    """
    paths = list(SQL.glob("*.sql")) + list((ROOT / "terraform").glob("*.tf"))
    for path in paths:
        code = re.sub(r"(--|#).*$", "", path.read_text(encoding="utf-8"),
                      flags=re.MULTILINE)
        assert not re.search(r"\b\d{12}\b", code), \
            f"{path.name}: hard-coded account id"


def test_gitignore_blocks_state_and_tfvars():
    """
    terraform.tfvars holds the alert email; state can hold anything. Neither
    belongs in a public repository.
    """
    ignored = (ROOT / ".gitignore").read_text(encoding="utf-8")
    for pattern in ("*.tfstate", "terraform/terraform.tfvars", ".terraform/"):
        assert pattern in ignored


def test_terraform_forces_destroy_on_the_bucket():
    """
    'terraform destroy leaves nothing behind' is a graded criterion, and S3
    refuses to delete a non-empty bucket without it.
    """
    assert "force_destroy = true" in (ROOT / "terraform" / "main.tf").read_text(
        encoding="utf-8")


# ===========================================================================
# AWS - requires a deployed lake
# ===========================================================================

pytestmark_aws = pytest.mark.aws


def tf_output(name):
    out = subprocess.run(
        ["terraform", f"-chdir={ROOT / 'terraform'}", "output", "-raw", name],
        capture_output=True, text=True, check=True)
    return out.stdout.strip()


def athena(sql):
    """Run one query, return rows as lists of strings (header stripped)."""
    database = tf_output("glue_database")
    results = tf_output("athena_results")
    region = tf_output("aws_region")
    env = {**os.environ, "AWS_DEFAULT_REGION": region}

    qid = subprocess.run(
        ["aws", "athena", "start-query-execution",
         "--query-string", sql,
         "--query-execution-context", f"Database={database}",
         "--work-group", "primary",
         "--result-configuration", f"OutputLocation={results}",
         "--query", "QueryExecutionId", "--output", "text"],
        capture_output=True, text=True, check=True, env=env).stdout.strip()

    while True:
        status = subprocess.run(
            ["aws", "athena", "get-query-execution", "--query-execution-id", qid,
             "--query", "QueryExecution.Status.State", "--output", "text"],
            capture_output=True, text=True, check=True, env=env).stdout.strip()
        if status == "SUCCEEDED":
            break
        if status in ("FAILED", "CANCELLED"):
            reason = subprocess.run(
                ["aws", "athena", "get-query-execution", "--query-execution-id", qid,
                 "--query", "QueryExecution.Status.StateChangeReason",
                 "--output", "text"],
                capture_output=True, text=True, env=env, check=False,).stdout.strip()
            pytest.fail(f"Athena failed: {reason}\n{sql}")
        __import__("time").sleep(2)

    payload = json.loads(subprocess.run(
        ["aws", "athena", "get-query-results", "--query-execution-id", qid,
         "--output", "json"],
        capture_output=True, text=True, check=True, env=env).stdout)

    rows = payload["ResultSet"]["Rows"][1:]  # drop the header row
    return [[cell.get("VarCharValue") for cell in r["Data"]] for r in rows]


def scalar(sql):
    return athena(sql)[0][0]


@pytest.mark.aws
def test_bronze_is_faithful_to_the_sources():
    assert int(scalar("SELECT COUNT(*) FROM orders_raw")) == 7956
    assert int(scalar("SELECT COUNT(*) FROM products_raw")) == 130
    assert int(scalar("SELECT COUNT(*) FROM users_raw")) == 130
    assert int(scalar(
        "SELECT COUNT(*) FROM orders_raw WHERE invoiceno = 'InvoiceNo'")) == 0


@pytest.mark.aws
def test_silver_row_count_and_revenue():
    assert int(scalar("SELECT COUNT(*) FROM orders_clean")) == 7547
    assert float(scalar(
        "SELECT ROUND(SUM(line_amount), 2) FROM orders_clean")) == 9284872.42


@pytest.mark.aws
def test_silver_left_no_anomaly_behind():
    row = athena("""
        SELECT COUNT_IF(invoice_date IS NULL),
               COUNT_IF(unit_price IS NULL),
               COUNT_IF(unit_price <= 0),
               COUNT_IF(quantity IS NULL),
               COUNT_IF(country IS NULL)
        FROM orders_clean
    """)[0]
    assert [int(v) for v in row] == [0, 0, 0, 0, 0]


@pytest.mark.aws
def test_silver_collapsed_39_spellings_into_10_countries():
    assert int(scalar(
        "SELECT COUNT(DISTINCT country) FROM orders_clean")) == 10


@pytest.mark.aws
def test_silver_kept_the_orphans():
    """
    Seeing 0 here is a FAILURE, not a success: it would mean silver took a
    business decision that belongs to gold.
    """
    assert int(scalar("""
        SELECT COUNT_IF(p.product_id IS NULL
                        OR o.customer_id IS NULL
                        OR u.customer_id IS NULL)
        FROM orders_clean o
        LEFT JOIN products_clean p ON p.product_id  = o.product_id
        LEFT JOIN users_clean    u ON u.customer_id = o.customer_id
    """)) == 376


@pytest.mark.aws
def test_gold_preserved_every_silver_row():
    """I1."""
    assert int(scalar("SELECT COUNT(*) FROM fact_ventes")) == 7547


@pytest.mark.aws
def test_declared_grain_is_the_real_grain():
    """
    I1b. The declared grain must be verifiable by query. Expect 0 collisions on
    (invoiceno, product_id, invoice_timestamp).
    """
    assert int(scalar("""
        SELECT COUNT(*) - COUNT(DISTINCT invoiceno
                                || '|' || CAST(product_id AS varchar)
                                || '|' || CAST(invoice_timestamp AS varchar))
        FROM fact_ventes
    """)) == 0


@pytest.mark.aws
def test_no_join_fan_out():
    """
    I2, the most important assertion here. If joining the dimensions changes
    the row count, a dimension holds a duplicate key and revenue inflates with
    no error anywhere.
    """
    row = athena("""
        SELECT COUNT(*), ROUND(SUM(f.line_amount), 2)
        FROM fact_ventes f
        JOIN dim_date    d ON d.date_id     = f.date_id
        JOIN dim_produit p ON p.product_id  = f.product_id
        JOIN dim_client  c ON c.customer_id = f.customer_id
    """)[0]
    assert int(row[0]) == 7547
    assert float(row[1]) == 9284872.42


@pytest.mark.aws
def test_dimension_keys_are_unique():
    """I3."""
    for table, key in (("dim_date", "date_id"),
                       ("dim_produit", "product_id"),
                       ("dim_client", "customer_id")):
        assert int(scalar(
            f"SELECT COUNT(*) - COUNT(DISTINCT {key}) FROM {table}")) == 0


@pytest.mark.aws
def test_no_unhandled_orphan_key():
    """I4 - the graded criterion, literally."""
    row = athena("""
        SELECT COUNT_IF(d.date_id IS NULL),
               COUNT_IF(p.product_id IS NULL),
               COUNT_IF(c.customer_id IS NULL)
        FROM fact_ventes f
        LEFT JOIN dim_date    d ON d.date_id     = f.date_id
        LEFT JOIN dim_produit p ON p.product_id  = f.product_id
        LEFT JOIN dim_client  c ON c.customer_id = f.customer_id
    """)[0]
    assert [int(v) for v in row] == [0, 0, 0]


@pytest.mark.aws
def test_convention_rows_carry_the_expected_volume():
    """I5 - 376 rows, $464,547.61, 5.00% of revenue."""
    row = athena("""
        SELECT COUNT_IF(product_id = -1),
               COUNT_IF(customer_id = -1),
               COUNT_IF(customer_id = -2),
               COUNT_IF(product_id = -1 OR customer_id < 0),
               ROUND(SUM(CASE WHEN product_id = -1 OR customer_id < 0
                              THEN line_amount END), 2)
        FROM fact_ventes
    """)[0]
    assert [int(v) for v in row[:4]] == [139, 82, 155, 376]
    assert float(row[4]) == 464547.61


@pytest.mark.aws
def test_dim_produit_carries_the_catalog_attributes():
    """
    rating was clean in silver and never reached gold. Now that it does, the
    only row allowed to be missing it is the convention row: a NULL on a real
    product would mean the widening lost data on the way through.
    """
    assert int(scalar("SELECT COUNT_IF(rating IS NULL) FROM dim_produit "
                      "WHERE product_id <> -1")) == 0
    assert int(scalar("SELECT COUNT_IF(rating IS NULL) FROM dim_produit "
                      "WHERE product_id = -1")) == 1
    assert int(scalar("SELECT COUNT_IF(tags IS NULL) FROM dim_produit "
                      "WHERE product_id <> -1")) == 0


@pytest.mark.aws
def test_dim_client_carries_the_customer_attributes():
    """
    The mirror on the customer side. age was in users_clean and stopped there;
    the two convention rows are the only ones entitled to a NULL.
    """
    assert int(scalar("SELECT COUNT_IF(age IS NULL) FROM dim_client "
                      "WHERE customer_id > 0")) == 0
    assert int(scalar("SELECT COUNT_IF(age IS NULL) FROM dim_client "
                      "WHERE customer_id < 0")) == 2
    assert int(scalar("SELECT COUNT_IF(latitude IS NULL) FROM dim_client "
                      "WHERE customer_id > 0")) == 0


@pytest.mark.aws
def test_calendar_is_continuous():
    """I6 - 91 days, no gap."""
    row = athena("""
        SELECT COUNT(*), DATE_DIFF('day', MIN(full_date), MAX(full_date)) + 1
        FROM dim_date
    """)[0]
    assert int(row[0]) == int(row[1]) == 91


@pytest.mark.aws
def test_inner_join_would_have_cost_five_percent():
    """
    Not an invariant - a demonstration. It asserts the exact size of the trap
    question 6 is about.
    """
    row = athena("""
        SELECT (SELECT COUNT(*) FROM fact_ventes) - COUNT(*),
               ROUND((SELECT SUM(line_amount) FROM fact_ventes)
                     - SUM(f.line_amount), 2)
        FROM fact_ventes f
        JOIN dim_produit p ON p.product_id  = f.product_id AND p.product_id  <> -1
        JOIN dim_client  c ON c.customer_id = f.customer_id AND c.customer_id > 0
    """)[0]
    assert int(row[0]) == 376
    assert float(row[1]) == 464547.61


@pytest.mark.aws
def test_monthly_order_counts_are_additive():
    """
    Sum of monthly orders must equal the total. With COUNT(DISTINCT invoiceno)
    it would not - 4,986 against 2,214.
    """
    monthly = athena("""
        SELECT COUNT(DISTINCT f.invoiceno || '|' || CAST(f.date_id AS varchar))
        FROM fact_ventes f
        JOIN dim_date d ON d.date_id = f.date_id
        GROUP BY d.year, d.month
    """)
    total = int(scalar("""
        SELECT COUNT(DISTINCT invoiceno || '|' || CAST(date_id AS varchar))
        FROM fact_ventes
    """))
    assert sum(int(r[0]) for r in monthly) == total == 7439


@pytest.mark.aws
def test_gold_is_parquet_and_partitioned():
    """
    The graded storage criterion. Verify the deployed table metadata rather
    than assuming Athena-generated object names contain '.parquet'.
    """
    bucket = tf_output("bucket_name")

    listing = subprocess.run(
        ["aws", "s3", "ls", f"s3://{bucket}/gold/fact_ventes/", "--recursive"],
        capture_output=True, text=True, check=True,
    ).stdout

    assert "year=" in listing and "month=" in listing

    rows = athena("SHOW CREATE TABLE fact_ventes")
    ddl = " ".join(str(cell) for row in rows for cell in row).upper()

    assert "PARQUET" in ddl
    assert "SNAPPY" in ddl
    assert "YEAR" in ddl
    assert "MONTH" in ddl
