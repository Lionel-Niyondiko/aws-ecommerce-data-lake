.DEFAULT_GOAL := help
.PHONY: help fmt validate test test-aws deploy pipeline quality analytics analytics-view destroy docs

TF := terraform -chdir=terraform

help:
	@echo "Helper: E-commerce Data Lake on AWS"
	@echo ""
	@echo "Local, no AWS credentials needed"
	@echo "  make test            Run the offline tests"
	@echo "  make validate        Check Terraform formatting and syntax"
	@echo "  make fmt             Reformat the Terraform files"
	@echo "  make docs            Serve the guided walkthrough at http://localhost:8000"
	@echo ""
	@echo "AWS, in this order"
	@echo "  make deploy          Provision the AWS infrastructure (terraform apply)"
	@echo "  make pipeline        Ingest, catalog, clean, model (bronze -> silver -> gold)"
	@echo "  make quality         Profile the raw data (optional, read-only)"
	@echo "  make analytics       Run the six business questions and generate the report"
	@echo "  make test-aws        Verify the deployed lake against expected numbers"
	@echo "  make destroy         Tear down every Terraform-managed AWS resource"
	@echo ""
	@echo "Report viewer, no AWS call"
	@echo "  make analytics-view  Serve the last local report at http://localhost:8001/report.html"
	@echo ""
	@echo "First AWS run: cp terraform/terraform.tfvars.example terraform/terraform.tfvars"

fmt:
	$(TF) fmt -recursive

validate:
	$(TF) fmt -check -recursive
	$(TF) init -backend=false -input=false
	$(TF) validate

test:
	uv run pytest -m "not aws" -q

test-aws:
	uv run pytest -m aws -q

deploy:
	$(TF) init -input=false
	$(TF) apply

pipeline:
	./scripts/run_pipeline.sh all

quality:
	./scripts/run_pipeline.sh quality

analytics:
	@echo "==> Running analytics"
	@./scripts/run_pipeline.sh analytics
	@echo ""
	@echo "Analytics complete."
	@echo "Local report: reports/report.html (open it with: make analytics-view)"
	@echo "S3 copies:    athena-results/analytics/<run>/ and athena-results/analytics/latest/"

destroy:
	$(TF) destroy

docs:
	@echo "http://localhost:8000"
	@cd docs && uv run python -m http.server 8000

# Serves the files already in reports/. Recomputes nothing and calls no AWS API.
analytics-view:
	@test -f reports/report.html || { echo "No local report yet. Run 'make analytics' first."; exit 1; }
	@echo "http://localhost:8001/report.html  (Ctrl+C to stop)"
	@cd reports && uv run --no-project python -m http.server 8001
