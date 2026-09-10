variable "project_name" {
  description = "Prefix for every resource name in this project"
  type        = string
  default     = "ecommerce-datalake"
}

variable "aws_region" {
  description = "Deployment region. us-east-1 is the only region publishing billing metrics."
  type        = string
  default     = "us-east-1"
}

variable "budget_limit_usd" {
  description = "Monthly budget threshold, in USD. A full lab run costs under $0.10."
  type        = number
  default     = 20
}

variable "budget_alert_email" {
  description = "Address receiving budget and CloudWatch alerts. Required."
  type        = string
}

variable "budget_alert_thresholds" {
  description = "Budget alert thresholds, as a percentage of budget_limit_usd."
  type = list(object({
    percent = number
    type    = string # ACTUAL or FORECASTED
  }))
  default = [
    { percent = 50, type = "ACTUAL" },
    { percent = 80, type = "ACTUAL" },
    { percent = 100, type = "FORECASTED" },
  ]
}

variable "bucket_size_alarm_threshold_bytes" {
  description = <<-EOT
    CloudWatch alarm threshold on bucket size, in bytes. Default 1 GiB.
    A normal run stays under 100 MiB, so this only fires if a script loops
    or CTAS statements are replayed in bulk.
  EOT
  type        = number
  default     = 1073741824
}

variable "trusted_principal_arn" {
  description = <<-EOT
    IAM principal allowed to assume the pipeline role.
    Leave empty to trust whoever runs Terraform.
    In CI, set this to the GitHub OIDC role ARN.
  EOT
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags applied to every taggable resource"
  type        = map(string)
  default = {
    Project   = "ecommerce-datalake-lab"
    ManagedBy = "terraform"
  }
}
