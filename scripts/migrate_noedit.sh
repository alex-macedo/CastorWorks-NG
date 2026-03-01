#!/usr/bin/env bash
set -euo pipefail

DATABASE_URL="${DATABASE_URL:-postgresql://postgres:UAQady1wxmu4IobMmM3PwL0Bs9MuC6o5@127.0.0.1:5433/postgres}"

echo "Using DATABASE_URL=${DATABASE_URL}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

MIGRATIONS_DIR="supabase/migrations"

if [ ! -d "${MIGRATIONS_DIR}" ]; then
  echo "Migrations dir '${MIGRATIONS_DIR}' not found." >&2
  exit 1
fi

echo "Running migrations from '${MIGRATIONS_DIR}'"

for file in $(ls "${MIGRATIONS_DIR}"/*.sql | sort); do
  echo "--------------------------------------------------"
  echo "Applying migration: ${file}"
  if ! psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${file}"; then
    echo "❌ Migration failed for ${file}."
    exit 1
  fi
  echo "✅ Done: ${file}"
done

echo "✅ All migrations applied successfully."
