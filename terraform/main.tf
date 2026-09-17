terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = var.tags
  }
}

data "aws_caller_identity" "current" {}

# S3 bucket names are globally unique across every AWS account on the planet.
# A 3-byte suffix gives 16.7M combinations, which is plenty to avoid a clash.
resource "random_id" "suffix" {
  byte_length = 3
}

locals {
  # S3 forbids underscores; Glue databases dislike hyphens because the SQL parser
  # reads them as subtraction. Same name, two spellings, encapsulated once.
  bucket_name   = "${var.project_name}-${random_id.suffix.hex}"
  glue_database = replace("${var.project_name}_${random_id.suffix.hex}", "-", "_")

  account_id      = data.aws_caller_identity.current.account_id
  glue_arn_prefix = "arn:aws:glue:${var.aws_region}:${data.aws_caller_identity.current.account_id}"
}

# ---------------------------------------------------------------------------
# S3 - the data lake itself
# ---------------------------------------------------------------------------
resource "aws_s3_bucket" "datalake" {
  bucket = local.bucket_name

  # Note: Lets Terraform empty the bucket before deleting it. Without this, destroy
  # fails with BucketNotEmpty. Must be present from the FIRST apply so it is
  # recorded in state. Never set this on a production bucket.
  force_destroy = true
}

# S3 has no folders. These zero-byte keys exist so the lake's structure is
# visible in the console and explicit in code.
resource "aws_s3_object" "zones" {
  for_each = toset([
    "bronze/",
    "silver/",
    "gold/",
    "athena-results/",
  ])

  bucket = aws_s3_bucket.datalake.id
  key    = each.value
}

# ---------------------------------------------------------------------------
# Glue Data Catalog - metadata only, no data
# ---------------------------------------------------------------------------
# Tables are created in SQL (CREATE EXTERNAL TABLE, CTAS). 
resource "aws_glue_catalog_database" "datalake" {
  name        = local.glue_database
  description = "E-commerce data lake catalog (bronze/silver/gold) - managed by Terraform"
}

# No dedicated Athena workgroup: "primary" is always present, and a workgroup
# with enforce_workgroup_configuration would override the external_location of
# every CTAS. Each query passes its own result location instead.

# ---------------------------------------------------------------------------
# AWS Budgets - cost guardrail
# ---------------------------------------------------------------------------
# Account-wide, no cost_filter. 
resource "aws_budgets_budget" "datalake" {
  name        = "${var.project_name}-monthly"
  budget_type = "COST"
  time_unit   = "MONTHLY"

  limit_amount = var.budget_limit_usd
  limit_unit   = "USD"

  dynamic "notification" {
    for_each = var.budget_alert_thresholds

    content {
      comparison_operator        = "GREATER_THAN"
      threshold                  = notification.value.percent
      threshold_type             = "PERCENTAGE"
      notification_type          = notification.value.type
      subscriber_email_addresses = [var.budget_alert_email]
    }
  }
}

# ---------------------------------------------------------------------------
# SNS + CloudWatch - volume guardrail
# ---------------------------------------------------------------------------
# Budgets watches dollars; CloudWatch watches a technical metric. 
resource "aws_sns_topic" "alerts" {
  name         = "${var.project_name}-alerts"
  display_name = "E-commerce Data Lake alerts"
}

resource "aws_sns_topic_subscription" "alerts_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.budget_alert_email

  # Stays PendingConfirmation until the recipient clicks the link in their
  # inbox. Until clicked, the alarm is silent.
}

resource "aws_cloudwatch_metric_alarm" "bucket_size" {
  alarm_name        = "${var.project_name}-bucket-size"
  alarm_description = "Lake volume above expectation (normal run stays under 100 MiB)."

  namespace   = "AWS/S3"
  metric_name = "BucketSizeBytes"

  dimensions = {
    BucketName = aws_s3_bucket.datalake.id
    StorageType = "StandardStorage"
  }

  statistic = "Maximum"

  # S3 publishes storage metrics once per day. Any shorter period never sees
  # a datapoint.
  period             = 86400
  evaluation_periods = 1

  comparison_operator = "GreaterThanThreshold"
  threshold           = var.bucket_size_alarm_threshold_bytes

  # Without this the alarm sits in INSUFFICIENT_DATA for 24-48h after apply,
  # which looks like a failure but is not.
  treat_missing_data = "notBreaching"

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
}
