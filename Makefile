.PHONY: dev clean-dev

dev:
	@echo "Switching to Leylines Dev Environment..."
	# 1. Host in der Konfiguration auf localhost umstellen
	@if [ -f ../leylines-config/serverconfig.json ]; then \
		sed 's/"pgHost": "db"/"pgHost": "localhost"/g' ../leylines-config/serverconfig.json > ../leylines-config/serverconfig.tmp && \
		mv ../leylines-config/serverconfig.tmp ../leylines-config/serverconfig.json; \
	fi

	# 2. Bestehende Symlinks aufräumen / Backups erstellen
	[ -f serverconfig.json ] && mv serverconfig.json serverconfig.json.bak || true
	ln -s ../leylines-config/serverconfig.json serverconfig.json
	[ -f wwwroot/config.json ] && mv wwwroot/config.json wwwroot/config.json.bak || true
	ln -s ../../leylines-config/config.json wwwroot/config.json
	
	# 3. Restliche Symlinks setzen
	ln -s ../../../leylines-config/leylines.json wwwroot/init/leylines.json
	ln -s ../../../leylines-config/leylines-stripped.json wwwroot/init/leylines-stripped.json
	ln -s ../../../leylines-config/catalogs/catalog-uvgGrids.json wwwroot/catalogs/catalog-uvgGrids.json
	ln -s ../../../leylines-config/catalogs/catalog-poleGrids.json wwwroot/catalogs/catalog-poleGrids.json
	ln -s ../../../leylines-config/catalogs/catalog-experimentalGrids.json wwwroot/catalogs/catalog-experimentalGrids.json

clean-dev:
	@echo "Restoring Docker Production State..."
	# 1. Host in der Konfiguration wieder zurück auf 'db' stellen
	@if [ -f ../leylines-config/serverconfig.json ]; then \
		sed 's/"pgHost": "localhost"/"pgHost": "db"/g' ../leylines-config/serverconfig.json > ../leylines-config/serverconfig.tmp && \
		mv ../leylines-config/serverconfig.tmp ../leylines-config/serverconfig.json; \
	fi

	# 2. Symlinks entfernen und Backups wiederherstellen
	rm -f serverconfig.json
	[ -f serverconfig.json.bak ] && mv serverconfig.json.bak serverconfig.json || true
	rm -f wwwroot/config.json
	[ -f wwwroot/config.json.bak ] && mv wwwroot/config.json.bak wwwroot/config.json || true
	rm -f wwwroot/init/leylines.json
	rm -f wwwroot/init/leylines-stripped.json
	rm -f wwwroot/catalogs/catalog-uvgGrids.json
	rm -f wwwroot/catalogs/catalog-poleGrids.json
	rm -f wwwroot/catalogs/catalog-experimentalGrids.json
