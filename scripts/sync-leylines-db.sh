#!/usr/bin/env bash
set -euo pipefail

# Stream the source Leylines database into the local Docker database.
# Credentials and ports are read from the environment/.env instead of being
# embedded in this script.
SOURCE_PGHOST="${SOURCE_PGHOST:-localhost}"
SOURCE_PGPORT="${SOURCE_PGPORT:-5432}"
SOURCE_PGUSER="${SOURCE_PGUSER:-postgres}"
SOURCE_PGPASSWORD="${SOURCE_PGPASSWORD:?Set SOURCE_PGPASSWORD}"

TARGET_PGHOST="${TARGET_PGHOST:-localhost}"
TARGET_PGPORT="${POSTGRES_PORT:-5433}"
TARGET_PGUSER="${POSTGRES_USER:-postgres}"
TARGET_PGPASSWORD="${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD}"
PGDATABASE="${POSTGRES_DB:-leylines}"

PGPASSWORD="$SOURCE_PGPASSWORD" pg_dump \
  --host "$SOURCE_PGHOST" \
  --port "$SOURCE_PGPORT" \
  --username "$SOURCE_PGUSER" \
  --dbname "$PGDATABASE" \
  --no-owner \
  --no-privileges \
  | pv -r -a -b \
  | PGPASSWORD="$TARGET_PGPASSWORD" psql \
      --host "$TARGET_PGHOST" \
      --port "$TARGET_PGPORT" \
      --username "$TARGET_PGUSER" \
      --dbname "$PGDATABASE"
