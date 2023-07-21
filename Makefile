.PHONY: prepare
prepare: ## (deprecated)check workspace lint
	yarn install
.PHONY: lint
lint: ## check format
	yarn lint
.PHONY: test
test: ## check unit testing
	yarn test
.PHONY: build
build: ## check build
	yarn build

# https://nx.dev/recipes/ci/monorepo-ci-github-actions
.PHONY: ci
ci: ## run all test & linter
	@make prepare
	@make lint
	@make test
	@make build

.PHONY: help
help: ## Display this help screen
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'