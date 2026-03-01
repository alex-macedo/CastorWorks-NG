#!/usr/bin/env bash
set -euo pipefail

# Connection to your self-hosted Supabase Postgres
#DATABASE_URL="${DATABASE_URL:-postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5433/postgres}"

echo "Using DATABASE_URL=${DATABASE_URL}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

MIGRATIONS_DIR="supabase/migrations"

if [ ! -d "${MIGRATIONS_DIR}" ]; then
  echo "Migrations dir '${MIGRATIONS_DIR}' not found." >&2
  exit 1
fi

# Build initial list: only files that contain CREATE (case-insensitive)
mapfile -t files < <(
  grep -li "create" "${MIGRATIONS_DIR}"/*.sql | sort
)

if [ "${#files[@]}" -eq 0 ]; then
  echo "No migrations with 'CREATE' found."
  exit 0
fi

echo "Found ${#files[@]} CREATE-style migrations."

pass=1
while [ "${#files[@]}" -gt 0 ]; do
  echo "========== Pass ${pass} =========="
  progress=false
  remaining=()

  for file in "${files[@]}"; do
    echo "---- Applying: ${file}"
    if psql "${DATABASE_URL}" \
        -v ON_ERROR_STOP=1 \
        -f "${file}"; then
      echo "✅ Success: ${file}"
      progress=true
    else
      echo "⚠️  Failed (will retry later): ${file}"
      remaining+=("${file}")
    fi
  done

  files=("${remaining[@]}")

  if [ "${progress}" = false ]; then
    echo "No progress this pass. Remaining files still failing:"
    printf '  %s\n' "${files[@]}"
    exit 1
  fi

  pass=$((pass + 1))
done

echo "✅ All CREATE-style migrations applied."
