.PHONY: server stop

PORT ?= 8791

server:
	docker run --rm -d --name puntopost-web -p $(PORT):4000 -v $(CURDIR):/srv/jekyll jekyll/jekyll:pages sh -c "gem install webrick && jekyll serve --watch --force_polling --host 0.0.0.0 --config _config.yml,_config_dev.yml"
	@echo "Serving at http://localhost:$(PORT)"

stop:
	docker stop puntopost-web
