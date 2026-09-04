.PHONY: server stop install-hook lint lint-js lint-html

PORT ?= 8791

# Node tooling runs in Docker so no local Node install is needed.
# node_modules and the npm cache live in named volumes to keep reruns fast.
NODE_RUN = docker run --rm \
	-v $(CURDIR):/app -w /app \
	-v puntopost-web-node-modules:/app/node_modules \
	-v puntopost-web-npm-cache:/root/.npm \
	node:20-alpine

server: install-hook
	docker run --rm -d --name puntopost-web -p $(PORT):4000 -v $(CURDIR):/srv/jekyll jekyll/jekyll:pages sh -c "gem install webrick && jekyll serve --watch --force_polling --host 0.0.0.0 --config _config.yml,_config_dev.yml"
	@echo "Serving at http://localhost:$(PORT)"

stop:
	docker stop puntopost-web

# Point git at the versioned hooks directory.
install-hook:
	@git config core.hooksPath .githooks
	@chmod +x .githooks/*
	@echo "Git hooks installed from .githooks/"

# Everything CI runs that can run locally.
lint: lint-js lint-html

# Same as the "JS Lint" CI job. Fast: runs in the pre-commit hook.
lint-js:
	@$(NODE_RUN) sh -c "npm install --no-save --silent --no-audit --no-fund eslint@9 @eslint/js@9 && npx eslint assets/js/"

# Same as the "HTML Lint" CI job. Needs a built site in _site/ (make server produces one).
lint-html:
	@test -d _site || { echo "_site/ not found: run 'make server' first"; exit 1; }
	@$(NODE_RUN) sh -c "npm install --no-save --silent --no-audit --no-fund htmlhint@latest && npx htmlhint '_site/**/*.html'"
