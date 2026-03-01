#!/usr/bin/env bash
set -euo pipefail

echo "[engproapp] Safe pg_restore helper"

USAGE="Usage: $0 --custom DUMP_FILE [--schema SCHEMA_SQL]\n  --custom DUMP_FILE: required custom-format dump created by pg_dump --format=custom\n  --schema SCHEMA_SQL: optional schema SQL file to apply first (psql)\n  --clean: drop objects before restoring (use with caution)"

CUSTOM_DUMP=""
SCHEMA_SQL=""
CLEAN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --custom) CUSTOM_DUMP="$2"; shift 2;;
    --schema) SCHEMA_SQL="$2"; shift 2;;
    --clean) CLEAN=true; shift 1;;
    -h|--help) echo -e "$USAGE"; exit 0;;
    *) echo "Unknown arg: $1"; echo -e "$USAGE"; exit 2;;
  esac
done

if [ -z "$CUSTOM_DUMP" ]; then
  echo "ERROR: --custom DUMP_FILE is required."
  echo -e "$USAGE"
  exit 2
fi

if ! command -v pg_restore >/dev/null 2>&1; then
  echo "ERROR: pg_restore not found in PATH. Install Postgres client tools and try again."
  exit 2
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: psql not found in PATH. Install Postgres client tools and try again."
  exit 2
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL environment variable is not set. Set it to the target database to restore into."
  exit 2
fi

echo "Target database: (from DATABASE_URL)"
echo "  $DATABASE_URL" | sed -E 's#://([^:]+):([^@]+)@#://\1:***@#'

if [ -n "$SCHEMA_SQL" ]; then
  if [ ! -f "$SCHEMA_SQL" ]; then
    echo "ERROR: Schema SQL file not found: $SCHEMA_SQL"
    exit 3
  fi
  echo "Applying schema SQL ($SCHEMA_SQL) via psql..."
  psql "$DATABASE_URL" -f "$SCHEMA_SQL"
fi

RESTORE_CMD=(pg_restore --verbose)

if [ "$CLEAN" = true ]; then
  RESTORE_CMD+=(--clean)
fi

# Restore into the database using pg_restore
RESTORE_CMD+=(--dbname="$DATABASE_URL" "$CUSTOM_DUMP")

echo "Running: ${RESTORE_CMD[*]}"
"${RESTORE_CMD[@]}"

if [ $? -eq 0 ]; then
  echo "Restore completed successfully."
else
  echo "pg_restore failed. Check logs above and ensure compatibility between dump and target Postgres version."
  exit 4
fi

echo "Important: After restore, verify sequences, roles, and permissions. Use psql to inspect and adjust as needed."
