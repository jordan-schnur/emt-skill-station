.PHONY: deploy

## Usage: make deploy e="staging"
deploy:
ifndef e
	$(error Usage: make deploy e="staging")
endif
ifeq ($(e),staging)
	$(eval BRANCH := $(shell git rev-parse --abbrev-ref HEAD))
	@echo "Triggering staging deploy of branch: $(BRANCH)"
	@gh workflow run deploy-staging.yml --ref main --field branch=$(BRANCH)
	@echo ""
	@echo "Deploy kicked off. Track progress:"
	@echo "  https://github.com/jordan-schnur/emt-skill-station/actions"
	@echo ""
	@echo "Staging URL (once complete):"
	@echo "  https://jordanschnur.com/emt-skill-station/staging/"
else
	$(error Unknown environment "$(e)". Valid: staging)
endif
