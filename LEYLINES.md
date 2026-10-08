# Leylines development and deployment

## Local development

The development configuration is read from the sibling directory
`../leylines-config`. Start the map with:

```bash
make dev
```

This temporarily links the client configuration, init files and catalog files
into `apps/terriamap`, and writes a local `serverconfig.json` with
`pgHost: localhost`. The shared configuration itself remains suitable for
Docker.

The app's `dev` script explicitly starts `terriajs-server` with this
`serverconfig.json`. Calling `gulp dev` directly bypasses the Leylines database
configuration and should therefore be avoided. Restore the repository copies
with:

```bash
make clean-dev
```

## Local Docker stack

Create `.env` from `.env.example`, then build and start the stack:

```bash
cp .env.example .env
make docker-build
make docker-up
```

Docker Compose expects these sibling directories next to this repository:

- `../leylines-config`
- `../leylines-geodata`
- `../postgres_data`
- `../geoserver-data`

The Docker Make targets ensure the mounted
`../leylines-config/serverconfig.json` uses `"pgHost": "db"` so the map
container can reach the Compose database service. Externally maintained
catalog files are mounted individually; this deliberately avoids hiding the
other catalogs included in `apps/terriamap/wwwroot/catalogs`.

## Production

Pushes to `main` publish `ghcr.io/leylines/leylinesmap` with `latest` and
commit-SHA tags via `.github/workflows/docker-release.yml`.

On the server, create `.env` and the sibling configuration/data directories,
then run:

```bash
make docker-prod
```

This pulls the published image and starts `compose.yml` together with the TLS
Traefik configuration in `compose.production.yml`.

## Database sync

`scripts/sync-leylines-db.sh` replaces the old hard-coded sync script. It uses
the `POSTGRES_*` and `SOURCE_PG*` environment variables documented in
`.env.example`.
