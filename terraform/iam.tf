# ---------------------------------------------------------------------------
# Least-privilege role for the pipeline.
# ---------------------------------------------------------------------------

locals {

  trusted_principal = (
    var.trusted_principal_arn != ""
    ? var.trusted_principal_arn
    : data.aws_caller_identity.current.arn
  )
}

data "aws_iam_policy_document" "assume_role" {
  statement {
    sid     = "AllowProjectPrincipalToAssumeRole"
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "AWS"
      identifiers = [local.trusted_principal]
    }
  }
}

resource "aws_iam_role" "pipeline" {
  name                 = "${var.project_name}-pipeline"
  description          = "Data lake pipeline: bronze ingestion and Athena queries"
  assume_role_policy   = data.aws_iam_policy_document.assume_role.json
  max_session_duration = 3600
}

data "aws_iam_policy_document" "pipeline" {

  # S3, BUCKET level. 
  statement {
    sid    = "S3BucketLevel"
    effect = "Allow"
    actions = [
      "s3:ListBucket",
      "s3:GetBucketLocation",          # Athena calls this before every query
      "s3:ListBucketMultipartUploads", # large Parquet writes
    ]
    resources = [aws_s3_bucket.datalake.arn]
  }

  # S3, OBJECT level, restricted to the four zones. Writing anywhere else fails.
  statement {
    sid    = "S3ObjectLevelInLakeZonesOnly"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject", # required to re-run a CTAS: it refuses a non-empty prefix
      "s3:AbortMultipartUpload",
    ]
    resources = [
      "${aws_s3_bucket.datalake.arn}/bronze/*",
      "${aws_s3_bucket.datalake.arn}/silver/*",
      "${aws_s3_bucket.datalake.arn}/gold/*",
      "${aws_s3_bucket.datalake.arn}/athena-results/*",
    ]
  }

  statement {
    sid    = "AthenaOnPrimaryWorkgroup"
    effect = "Allow"
    actions = [
      "athena:StartQueryExecution",
      "athena:StopQueryExecution",
      "athena:GetQueryExecution",
      "athena:GetQueryResults",
      "athena:GetWorkGroup",
    ]
    resources = [
      "arn:aws:athena:${var.aws_region}:${local.account_id}:workgroup/primary"
    ]
  }

  # Note: Glue needs all THREE ARN levels. Omit the catalog ARN and every call fails
  # with AccessDenied, including ones that look table-scoped.
  statement {
    sid    = "GlueCatalogOnProjectDatabaseOnly"
    effect = "Allow"
    actions = [
      "glue:GetDatabase",
      "glue:GetDatabases",
      "glue:GetTable",
      "glue:GetTables",
      "glue:CreateTable",
      "glue:UpdateTable",
      "glue:DeleteTable",
      "glue:GetPartition",
      "glue:GetPartitions",
      "glue:BatchGetPartition",
      "glue:CreatePartition",
      "glue:BatchCreatePartition",
      "glue:UpdatePartition",
      "glue:DeletePartition",
      "glue:BatchDeletePartition",
    ]
    resources = [
      "${local.glue_arn_prefix}:catalog",
      "${local.glue_arn_prefix}:database/${aws_glue_catalog_database.datalake.name}",
      "${local.glue_arn_prefix}:table/${aws_glue_catalog_database.datalake.name}/*",
    ]
  }
}

# Note: Inline rather than managed: one role uses it, and it disappears with the role,
# which keeps `terraform destroy` clean.
resource "aws_iam_role_policy" "pipeline" {
  name   = "${var.project_name}-pipeline"
  role   = aws_iam_role.pipeline.id
  policy = data.aws_iam_policy_document.pipeline.json
}
