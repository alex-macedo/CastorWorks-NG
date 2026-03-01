#!/usr/bin/env bash
set -euo pipefail

# Apply all SQL function files found under supabase/functions using psql.
# Mirrors scripts/migrate.sh style but searches recursively for .sql files.

DATABASE_URL="${DATABASE_URL:-postgresql://postgres:UAQady1wxmu4IobMmM3PwL0Bs9MuC6o5@127.0.0.1:5433/postgres}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

FUNCTIONS_DIR="supabase/functions"

if ! command -v psql >/dev/null 2>&1; then
  echo "psql not found. Install PostgreSQL client tools first." >&2
  exit 1
fi

if [ ! -d "${FUNCTIONS_DIR}" ]; then
  echo "Functions directory '${FUNCTIONS_DIR}' not found." >&2
  exit 1
fi

echo "Using DATABASE_URL=${DATABASE_URL}"
echo "Searching for SQL files in ${FUNCTIONS_DIR}"

mapfile -t SQL_FILES < <(find "${FUNCTIONS_DIR}" -type f -name "*.sql" | sort)

if [ ${#SQL_FILES[@]} -eq 0 ]; then
  echo "No .sql files found under ${FUNCTIONS_DIR}. Nothing to apply."
  exit 0
fi

echo "Applying ${#SQL_FILES[@]} function SQL files:"
for file in "${SQL_FILES[@]}"; do
  echo "--------------------------------------------------"
  echo "Applying: ${file}"
  if ! psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${file}"; then
    echo "❌ Failed applying ${file}"
    exit 1
  fi
  echo "✅ Done: ${file}"
done

echo "✅ All function SQL files applied successfully."
