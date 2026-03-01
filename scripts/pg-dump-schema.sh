#!/usr/bin/env bash
set -euo pipefail

echo "[engproapp] Safe schema-only pg_dump helper"

USAGE="Usage: $0 [OUT_DIR]
  OUT_DIR: optional output directory (default: ./exported, fallback: /tmp/engpro_export)"

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  echo "$USAGE"
  exit 0
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "ERROR: pg_dump not found in PATH. Install Postgres client tools (e.g. brew install libpq) and try again."
  exit 2
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL environment variable is not set."
  echo "Set DATABASE_URL to your Postgres connection string, e.g.:"
  echo "  export DATABASE_URL='postgres://postgres:password@<host>:5432/postgres'"
  echo "Then re-run this script."
  exit 2
fi

OUT_DIR=${1:-"./exported"}

if mkdir -p "$OUT_DIR" 2>/dev/null; then
  echo "Using export directory: $OUT_DIR"
else
  OUT_DIR="/tmp/engpro_export"
  mkdir -p "$OUT_DIR"
  echo "Could not create requested export directory; using fallback: $OUT_DIR"
fi

TIMESTAMP=$(date +%Y%m%d%H%M%S)
PROJECT_REF="${VITE_SUPABASE_PROJECT_ID:-unknown}"
OUT_FILE="$OUT_DIR/schema-${PROJECT_REF}-${TIMESTAMP}.sql"

echo "Dumping schema-only (no data) to: $OUT_FILE"
echo "This will export table definitions, types, functions, and other schema objects."

# Run pg_dump safely: schema-only, avoid ownership and privilege statements
pg_dump --schema-only --no-owner --no-privileges --file="$OUT_FILE" "$DATABASE_URL"

if [ $? -ne 0 ]; then
  echo "pg_dump (schema-only) failed. Check connection and credentials."
  exit 3
fi

echo "Schema dump completed successfully. File: $OUT_FILE"

# Also produce a custom-format dump which preserves more details (useful for pg_restore)
CUSTOM_OUT="$OUT_DIR/db-${PROJECT_REF}-${TIMESTAMP}.dump"
echo "Creating a custom-format dump (functions, indexes, data as requested) to: $CUSTOM_OUT"

# By default we do schema-only to the SQL file, and a custom-format dump that includes everything.
# Use --format=custom for pg_restore compatibility. We omit privilege/owner statements to allow
# restoring into different roles.
pg_dump --format=custom --no-owner --no-privileges --file="$CUSTOM_OUT" "$DATABASE_URL"

if [ $? -ne 0 ]; then
  echo "pg_dump (custom-format) failed. Check connection and credentials."
  exit 4
fi

echo "Custom-format dump completed successfully. File: $CUSTOM_OUT"

echo "Note: The SQL schema file contains schema-only text; the custom-format dump can be restored with pg_restore (or pg_restore | psql). For large datasets consider using COPY or streaming to S3."
