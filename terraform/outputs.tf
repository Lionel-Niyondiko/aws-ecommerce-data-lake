output "bucket_name" {
  description = "Name of the data lake S3 bucket"
  value       = aws_s3_bucket.datalake.id
}

output "glue_database" {
  description = "Glue Data Catalog database queried by Athena"
  value       = aws_glue_catalog_database.datalake.name
}

output "pipeline_role_arn" {
  description = "Least-privilege role to assume for ingestion and queries"
  value       = aws_iam_role.pipeline.arn
}

output "aws_region" {
  description = "Region the lake was deployed to"
  value       = var.aws_region
}

output "athena_results" {
  description = "S3 location where Athena writes native query results"
  value       = "s3://${aws_s3_bucket.datalake.id}/athena-results/queries/"
}

output "analytics_results" {
  description = "S3 location where the business analytics reports are stored"
  value       = "s3://${aws_s3_bucket.datalake.id}/athena-results/analytics/"
}
