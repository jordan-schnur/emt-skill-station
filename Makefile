.PHONY: deploy e2e e2e-ci

## Usage: make e2e   -- run the Playwright E2E suite locally (chromium)
e2e:
	@npx playwright test --project=chromium

## Usage: make e2e-ci   -- push an e2e-* tag to run the E2E job in GitHub Actions
e2e-ci:
	$(eval TAG := e2e-$(shell date +%Y%m%d-%H%M%S))
	@echo "Tagging $(TAG) and pushing to trigger GitHub Actions E2E run..."
	@git tag $(TAG)
	@git push origin $(TAG)
	@echo ""
	@echo "Triggered. Track progress:"
	@echo "  https://github.com/jordan-schnur/emt-skill-station/actions"


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
