# E-commerce Data Lake on AWS

A hands-on data engineering lab. Build a medallion data lake (bronze → silver → gold),
model it as a star schema, answer six business questions in SQL, then destroy everything.

**Everything is provisioned with Terraform. No manual console clicks.**

📘 **[Follow the guided walkthrough →](https://lionel-niyondiko.github.io/aws-ecommerce-data-lake/)**

![Architecture](docs/architecture.svg)

---

## What you build

Two sources that don't talk to each other - an ERP order export and an application
catalog - are reconciled into a dimensional model a BI tool can query directly.

| Zone | Rows | Format |
|---|---:|---|
| `bronze/` - raw, immutable, faithful to source | 7,956 | CSV + NDJSON |
| `silver/` - cleaned, typed, deduplicated | 7,547 | Parquet Snappy, 4 partitions |
| `gold/` - star schema | 7,547 facts + 354 dimension rows | Parquet |

Net revenue: **$9,284,872.42**. Of that, **5.00% ($464,547.61)** sits on rows whose
product or customer no longer exists in the catalog - a naive `INNER JOIN` deletes it
silently. Handling those orphan keys is the point of the lab.

---

## Quick start

```bash
git clone https://github.com/Lionel-Niyondiko/aws-ecommerce-data-lake.git
cd aws-ecommerce-data-lake

cp terraform/terraform.tfvars.example terraform/terraform.tfvars
# edit: set budget_alert_email

make deploy      # provision 12 AWS resources
make pipeline    # ingest → catalog → silver → gold
make analytics   # the six business questions
make test-aws    # verify the numbers above against the deployed lake
make destroy     # tear everything down
```

`make test` is the offline half - it runs without credentials and costs nothing,
so it is the one CI runs on every push.

`make` on its own lists every target.

> **Confirm the SNS subscription email** after `make deploy`. Until you click that link,
> the CloudWatch alarm is declared but silent.

---

## Prerequisites

| Tool | Version | Check |
|---|---|---|
| Terraform | ≥ 1.5 | `terraform version` |
| AWS CLI | v2 | `aws sts get-caller-identity` |
| Python | ≥ 3.9 + `pytest` | `pytest --version` |

An AWS account with permissions for S3, Glue, Athena, IAM, Budgets, SNS and CloudWatch.
Billing data access must be enabled for AWS Budgets to work.

**Cost:** under **$0.10** for a full run. S3 holds 600 KB, Athena bills $5 per TB scanned,
Glue and Budgets are free at this volume. Always run `make destroy` when you are done -
`force_destroy = true` is set from the first apply so it never fails on `BucketNotEmpty`.

---

## Layout

```
terraform/   12 resources: S3 + zones, Glue database, IAM role, Budget, SNS, CloudWatch alarm
sql/         01_bronze → 02_quality → 03_silver → 04_gold → 05_analytics
scripts/     run_pipeline.sh - the only script, with sub-commands
data/        the three source files (read-only input, 600 KB, versioned on purpose)
tests/       test_pipeline.py - runs with or without AWS
docs/        the case study published on GitHub Pages - 5 static files, no build
```

The SQL files are numbered in execution order, and each one ends with the checks that
prove it worked. `02_quality.sql` is deliberately separate: it predicts that silver will
hold 7,547 rows **before** producing them. That prediction is what makes everything
downstream verifiable.

---

## What this project deliberately does not use

| Not used | Why |
|---|---|
| **Airflow** | Six linear steps, two minutes, run once. No branching, no backfill, no cross-dependency. Managed MWAA starts around $350/month - seven thousand times the cost of the lab itself. A `Makefile` expresses the same DAG. |
| **dbt** | Genuinely tempting for the SQL layer, but it hides the `CTAS` statements this lab exists to teach. |
| **Remote Terraform backend** | It would tie the project to *my* bucket. Everyone who clones needs their own state, so state stays local and git-ignored. |
| **Step Functions** | Cheaper than Airflow, but adds ASL JSON, another IAM role and a state machine to debug - for a pipeline that never branches. |
| **Kubernetes** | Nothing runs continuously. There is nothing to orchestrate. |

Knowing when *not* to add a tool is an architecture skill. This table is the shortest
section of the repository and probably the most useful one.

---

## CI

| Workflow | AWS | Trigger | What it proves |
|---|---|---|---|
| `ci.yml` | no | every push and PR | Terraform is valid, shell is clean, the source-data numbers still hold |
| `e2e.yml` | yes | manual + Mondays 06:00 UTC | the lab is still reproducible end to end, then destroys itself |
| `pages.yml` | no | push to `main` touching `docs/` | publishes the walkthrough |

`e2e.yml` authenticates through **GitHub OIDC** - no long-lived AWS keys are stored
anywhere in this repository.

<details>
<summary><strong>One-time OIDC setup</strong> (apply once, then never again)</summary>

Save as `oidc.tf` in a scratch directory, set your GitHub org and repo, and apply it
once. It is intentionally kept out of `terraform/` because it has the opposite lifecycle:
permanent, while everything in `terraform/` is disposable.

```hcl
variable "github_repo" {
  description = "owner/repository"
  type        = string
}

data "aws_caller_identity" "current" {}

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

data "aws_iam_policy_document" "github_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repo}:*"]
    }
  }
}

resource "aws_iam_role" "github_actions" {
  name               = "lab-datalake-github-actions"
  assume_role_policy = data.aws_iam_policy_document.github_assume.json
}

resource "aws_iam_role_policy_attachment" "github_actions" {
  role       = aws_iam_role.github_actions.name
  policy_arn = "arn:aws:iam::aws:policy/PowerUserAccess"
}

resource "aws_iam_role_policy" "github_actions_iam" {
  name = "manage-lab-iam"
  role = aws_iam_role.github_actions.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["iam:*Role*", "iam:*Policy*", "budgets:*"]
      Resource = "*"
    }]
  })
}

output "role_arn" { value = aws_iam_role.github_actions.arn }
```

Then add the resulting ARN as the repository variable `AWS_ROLE_ARN`
(Settings → Secrets and variables → Actions → Variables).

`PowerUserAccess` plus a narrow IAM/Budgets grant is broad on purpose: this role only
ever exists in a lab account. In any real account, scope it down.

</details>

---

## Reproducibility

Every number in this README is asserted by `tests/test_pipeline.py` and re-verified
weekly by `e2e.yml`. If a figure here is ever wrong, CI goes red before you find out
the hard way.

## License

MIT
