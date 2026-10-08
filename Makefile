.PHONY: dev dev-config prod-config clean-dev docker-build docker-up docker-prod

APP_DIR := apps/terriamap
CONFIG_DIR := ../leylines-config

dev: dev-config
	pnpm dev

dev-config:
	@echo "Switching to the local Leylines development configuration..."
	@test -f $(CONFIG_DIR)/serverconfig.json || (echo "Missing $(CONFIG_DIR)/serverconfig.json" && exit 1)
	@if [ ! -L $(APP_DIR)/serverconfig.json ] && [ ! -f $(APP_DIR)/serverconfig.json.bak ]; then \
		mv $(APP_DIR)/serverconfig.json $(APP_DIR)/serverconfig.json.bak; \
	fi
	@rm -f $(APP_DIR)/serverconfig.json
	@sed 's/"pgHost": "db"/"pgHost": "localhost"/g' $(CONFIG_DIR)/serverconfig.json > $(APP_DIR)/serverconfig.json
	@for pair in \
		"$(APP_DIR)/wwwroot/config.json:$(abspath $(CONFIG_DIR)/config.json)" \
		"$(APP_DIR)/wwwroot/init/leylines.json:$(abspath $(CONFIG_DIR)/leylines.json)" \
		"$(APP_DIR)/wwwroot/init/leylines-stripped.json:$(abspath $(CONFIG_DIR)/leylines-stripped.json)" \
		"$(APP_DIR)/wwwroot/catalogs/catalog-uvgGrids.json:$(abspath $(CONFIG_DIR)/catalogs/catalog-uvgGrids.json)" \
		"$(APP_DIR)/wwwroot/catalogs/catalog-poleGrids.json:$(abspath $(CONFIG_DIR)/catalogs/catalog-poleGrids.json)" \
		"$(APP_DIR)/wwwroot/catalogs/catalog-experimentalGrids.json:$(abspath $(CONFIG_DIR)/catalogs/catalog-experimentalGrids.json)"; do \
		target=$${pair%%:*}; source=$${pair#*:}; \
		if [ ! -L "$$target" ] && [ -e "$$target" ] && [ ! -e "$$target.bak" ]; then mv "$$target" "$$target.bak"; fi; \
		rm -f "$$target"; ln -s "$$source" "$$target"; \
	done

clean-dev:
	@echo "Restoring repository configuration files..."
	@if [ -f $(APP_DIR)/serverconfig.json.bak ]; then \
		rm -f $(APP_DIR)/serverconfig.json; \
		mv $(APP_DIR)/serverconfig.json.bak $(APP_DIR)/serverconfig.json; \
	fi
	@for target in \
		$(APP_DIR)/wwwroot/config.json \
		$(APP_DIR)/wwwroot/init/leylines.json \
		$(APP_DIR)/wwwroot/init/leylines-stripped.json \
		$(APP_DIR)/wwwroot/catalogs/catalog-uvgGrids.json \
		$(APP_DIR)/wwwroot/catalogs/catalog-poleGrids.json \
		$(APP_DIR)/wwwroot/catalogs/catalog-experimentalGrids.json; do \
		if [ -L "$$target" ]; then rm -f "$$target"; fi; \
		if [ -e "$$target.bak" ]; then rm -f "$$target"; mv "$$target.bak" "$$target"; fi; \
	done

prod-config:
	@echo "Setting the shared server configuration to the Docker database host..."
	@test -f $(CONFIG_DIR)/serverconfig.json || (echo "Missing $(CONFIG_DIR)/serverconfig.json" && exit 1)
	@sed 's/"pgHost": "localhost"/"pgHost": "db"/g' $(CONFIG_DIR)/serverconfig.json > $(CONFIG_DIR)/serverconfig.tmp
	@mv $(CONFIG_DIR)/serverconfig.tmp $(CONFIG_DIR)/serverconfig.json

docker-build: clean-dev prod-config
	docker compose build leylinesmap

docker-up: prod-config
	docker compose up -d

docker-prod: prod-config
	docker compose -f compose.yml -f compose.production.yml pull
	docker compose -f compose.yml -f compose.production.yml up -d
