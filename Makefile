.DEFAULT_GOAL := help
.PHONY: help fmt validate test test-aws deploy pipeline quality analytics destroy docs

TF := terraform -chdir=terraform

help:
	@echo "Helper: E-commerce Data Lake on AWS"
	@echo ""
	@echo "  make validate   Check Terraform formatting and syntax (no AWS)"
	@echo "  make test       Run tests that need no AWS credentials"
	@echo "  make deploy     Provision the 12 AWS resources"
	@echo "  make pipeline   Ingest, catalog, clean, model"
	@echo "  make quality    Profile the raw data (read-only, changes nothing)"
	@echo "  make analytics  Re-run only the six business questions"
	@echo "  make test-aws   Verify the deployed lake against expected numbers"
	@echo "  make destroy    Tear down every AWS resource"
	@echo "  make docs       Serve the guided walkthrough at localhost:8000"
	@echo ""
	@echo "First run: cp terraform/terraform.tfvars.example terraform/terraform.tfvars"

fmt:
	$(TF) fmt -recursive

validate:
	$(TF) fmt -check -recursive
	$(TF) init -backend=false -input=false
	$(TF) validate

test:
	pytest -m "not aws" -q

test-aws:
	pytest -m aws -q

deploy:
	$(TF) init -input=false
	$(TF) apply

pipeline:
	./scripts/run_pipeline.sh all

quality:
	./scripts/run_pipeline.sh quality

analytics:
	./scripts/run_pipeline.sh analytics

destroy:
	$(TF) destroy

docs:
	@echo "http://localhost:8000"
	@cd docs && python3 -m http.server 8000
