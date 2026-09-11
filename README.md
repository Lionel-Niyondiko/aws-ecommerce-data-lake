# E-commerce Data Lake on AWS

A hands-on Cloud Data Engineering lab that builds a reproducible AWS data lake from raw e-commerce sources, transforms the data through a bronze → silver → gold medallion architecture, models the final layer as a star schema, and validates the resulting business metrics with automated tests.

**Terraform · Amazon S3 · AWS Glue · Amazon Athena · SQL · Python · GitHub Actions**

[![CI](https://github.com/Lionel-Niyondiko/aws-ecommerce-data-lake/actions/workflows/ci.yml/badge.svg)](https://github.com/Lionel-Niyondiko/aws-ecommerce-data-lake/actions/workflows/ci.yml)

📘 **[Follow the guided walkthrough →](https://lionel-niyondiko.github.io/aws-ecommerce-data-lake/)**

![Architecture](docs/architecture.svg)

---

## What we will build

Two sources that do not talk to each other, an ERP order export (CSV) and an application catalog (JSON), are reconciled into a dimensional model that a BI tool can query directly.

| Zone | Rows | Format |
|---|---:|---|
| `bronze/` | 7,956 | CSV + NDJSON |
| `silver/` | 7,547 | Parquet Snappy, 4 partitions |
| `gold/` | 7,547 facts + 354 dimension rows | Parquet |

Net revenue: **$9,284,872.42**.

Of that, **5.00% ($464,547.61)** sits on rows whose product or customer no longer exists in the catalog. A naive `INNER JOIN` deletes that value silently. Handling those orphan keys is the core data quality lesson of the project.

---

## Quick start

There are two ways to use this repository.

### 1. Run the project locally, no AWS required

This is the recommended first step for reviewers and anyone evaluating the repository.

```bash
git clone https://github.com/Lionel-Niyondiko/aws-ecommerce-data-lake.git
cd aws-ecommerce-data-lake

make test
make validate
```

These commands do not create AWS resources and do not require AWS credentials.

Expected result:

```text
23 passed, 15 deselected
Terraform configuration is valid
```

### 2. Run the full AWS project

After completing the prerequisites and configuring AWS authentication:

```bash
cp terraform/terraform.tfvars.example terraform/terraform.tfvars
```

Edit `terraform/terraform.tfvars` and set your alert email:

```hcl
budget_alert_email = "you@example.com"
aws_region         = "us-east-1"
```

Verify your AWS identity before deploying:

```bash
aws sts get-caller-identity
```

Then run:

```bash
make deploy
make pipeline
make analytics
make test-aws
make destroy
```

> **Important:** confirm the SNS subscription email after `make deploy`. Until the confirmation link is clicked, the CloudWatch notification path remains inactive.

### Windows

Use **Git Bash** with **GNU Make**. The project uses Bash scripts and Unix-style shell commands through the `Makefile`.

---

## Prerequisites

### Local development

| Tool | Version | Check |
|---|---|---|
| Git | Current | `git --version` |
| GNU Make | Current | `make --version` |
| Terraform | ≥ 1.5 | `terraform version` |
| Python | ≥ 3.9 | `python --version` |
| pytest | Current | `pytest --version` |

### AWS deployment

| Tool / account | Requirement | Check |
|---|---|---|
| AWS CLI | v2 | `aws --version` |
| AWS account | Required for the full project | AWS console access |
| AWS identity | Permissions for the project resources | `aws sts get-caller-identity` |

The deployment creates resources across S3, Glue, Athena, IAM, Budgets, SNS and CloudWatch.

### AWS authentication

Configure the AWS CLI using your preferred authentication method, then verify the active identity:

```bash
aws sts get-caller-identity
```

The repository does not require long-lived AWS keys in GitHub for its E2E workflow. GitHub Actions uses OIDC to obtain temporary AWS credentials.

---

## What the deployment does

The full project follows this sequence:

```text
Terraform
   ↓
AWS infrastructure
   ↓
S3 bronze
   ↓
Glue catalog
   ↓
Athena transformations
   ↓
S3 silver
   ↓
S3 gold + star schema
   ↓
Six analytics queries
   ↓
Automated assertions
   ↓
Terraform destroy
```

More precisely:

1. Terraform provisions the AWS infrastructure.
2. The pipeline ingests the source data into S3.
3. Glue catalogs the datasets.
4. Athena executes the SQL transformations.
5. The test suite verifies row counts, revenue, quality invariants and the business queries.
6. `make destroy` removes the project resources.

---

## Repository layout

```text
terraform/   AWS infrastructure: S3, Glue, IAM, Budget, SNS, CloudWatch
sql/         01_bronze → 02_quality → 03_silver → 04_gold → 05_analytics
scripts/     run_pipeline.sh, the pipeline entry point
data/        three read-only source files, intentionally versioned for reproducibility
tests/       pytest suite, with offline and deployed-AWS tests
docs/        static case study published on GitHub Pages
.github/     CI, E2E and Pages workflows
Makefile     project command interface
```

The SQL files are numbered in execution order. Each step ends with checks that prove it worked.

`02_quality.sql` is deliberately separate because it predicts that silver will contain 7,547 rows before producing them. That prediction makes the downstream pipeline verifiable.

---

## Make targets

Run:

```bash
make help
```

Available targets:

```text
make validate   Check Terraform formatting and syntax
make test       Run tests that need no AWS credentials
make deploy     Provision the AWS resources
make pipeline   Ingest, catalog, clean and model
make quality    Profile the raw data
make analytics  Run the six business questions
make test-aws   Verify the deployed lake against expected numbers
make destroy    Tear down every AWS resource
make docs       Serve the guided walkthrough at localhost:8000
```

---

## Cost and cleanup

A normal full project run is designed to cost only a few cents at this scale, but AWS charges depend on your account, region and usage. Treat the published figure as an estimate, not a guarantee.

The safest habit is:

```bash
make destroy
```

The Terraform configuration uses `force_destroy = true` for the data lake bucket so cleanup does not fail because of remaining objects.

---

## Design decisions

### Why no Airflow?

The pipeline is short and linear. It runs in a few minutes, has no branching, no backfill requirement and no cross-dependency graph. A `Makefile` expresses the orchestration with less operational overhead.

### Why no dbt?

The SQL layer intentionally exposes the Athena CTAS transformations that the project is meant to teach. Adding dbt would hide part of that mechanism without adding enough value for this scope.

### Why no remote Terraform backend?

A remote backend would tie every clone to a shared or pre-existing state bucket. Each user should own the state for their own lab, so state stays local and is ignored by Git.

Knowing when not to add a tool is part of the architecture exercise.

---

## CI and end-to-end testing

| Workflow | AWS | Trigger | What it proves |
|---|---|---|---|
| `ci.yml` | No | Every push and PR | Terraform validation, shell checks and offline tests |
| `e2e.yml` | Yes | Manual + Monday schedule | Real AWS deployment, pipeline execution, AWS assertions and clean teardown |
| `pages.yml` | No | Pushes affecting `docs/` | Publishes the walkthrough |

### CI

`ci.yml` is the zero-cost validation path. It runs on every push and pull request without AWS credentials.

### E2E

`e2e.yml` is the full proof path. It uses GitHub OIDC instead of long-lived AWS access keys, deploys the lab, runs the pipeline and analytics queries, executes the AWS assertions, uploads evidence, and destroys the infrastructure even when an earlier step fails.

The E2E workflow is optional for local development. You only need the one-time OIDC setup if you want GitHub Actions to deploy the lab into your AWS account.

---

## One-time GitHub OIDC setup

This section is only required for the **GitHub Actions E2E workflow**.

It is **not required** to:

- clone the repository
- run the local tests
- validate Terraform locally
- use the project without GitHub Actions deployment

The setup consists of:

```text
GitHub Actions
      ↓ OIDC
AWS IAM role
      ↓
Temporary AWS credentials
      ↓
Terraform
```

No long-lived AWS access keys are stored in the repository.

### Important OIDC note

GitHub changed the default OIDC subject format for repositories created after **July 15, 2026**. New repositories use immutable owner and repository IDs in the `sub` claim.

Before creating the AWS trust policy, check the current GitHub documentation for the OIDC subject format used by your repository:

https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws

For this repository, keep the OIDC bootstrap separate from the disposable infrastructure in `terraform/`. The bootstrap role has a different lifecycle because it is needed to start the E2E workflow.

After creating the role, add its ARN as the repository variable:

```text
Settings → Secrets and variables → Actions → Variables

AWS_ROLE_ARN
AWS_REGION
BUDGET_ALERT_EMAIL
```

The E2E workflow already consumes these variables.

Because this is a disposable lab, the example deliberately keeps the bootstrap IAM permissions broader than a production deployment would. In a real AWS account, scope the trust policy and permissions to the exact repository and resources required by the deployment.

---

## Expected results

A successful local validation looks like:

```text
make test
23 passed, 15 deselected

make validate
Success! The configuration is valid.
```

A successful AWS E2E run should complete all of these stages:

```text
Deploy                 ✅
Pipeline               ✅
Analytics              ✅
AWS assertions         ✅
Evidence collection    ✅
Destroy                ✅
No resources left      ✅
```

The business figures published above are asserted by the test suite. If they change unexpectedly, CI or E2E should expose the discrepancy instead of allowing the documentation to drift silently.

---

## Troubleshooting

### `make: command not found`

On Windows, use Git Bash and install GNU Make. Then restart VS Code so the updated PATH is loaded.

### `Unable to locate credentials`

Configure AWS authentication and verify:

```bash
aws sts get-caller-identity
```

### `terraform.tfvars not found`

Create it from the example file:

```bash
cp terraform/terraform.tfvars.example terraform/terraform.tfvars
```

Never commit `terraform/terraform.tfvars`. It is intentionally ignored by Git.

### AWS E2E cannot assume the role

Check that:

1. GitHub OIDC is configured in AWS.
2. The IAM trust policy matches the OIDC subject format used by this repository.
3. The repository variable `AWS_ROLE_ARN` is correct.
4. The E2E workflow has `id-token: write` permission.

---

## Reproducibility

Every important number in this README is asserted by `tests/test_pipeline.py` and re-verified by the E2E workflow.

The source data is versioned intentionally, the Terraform provider lock file is committed, and the AWS infrastructure is disposable.

The project is designed so that a reviewer can start with zero-cost local validation and move to a complete AWS run only when they want to evaluate the cloud implementation.

---

## License

MIT
