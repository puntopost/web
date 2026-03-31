.PHONY: server stop

PORT ?= 8791

server:
	docker run --rm -d --name puntopost-web -p $(PORT):80 -v $(CURDIR):/usr/share/nginx/html:ro -v $(CURDIR)/nginx.conf:/etc/nginx/conf.d/default.conf:ro nginx:alpine
	@echo "Serving at http://localhost:$(PORT)"

stop:
	docker stop puntopost-web
