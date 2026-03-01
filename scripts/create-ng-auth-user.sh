#!/usr/bin/env bash
# Create a user in CastorWorks-NG Auth via the Admin API (bypasses signup form/API error).
# Use when signup fails with "API error" so you can get a first user in and then debug Auth.
#
# Usage:
#   ./scripts/create-ng-auth-user.sh <email> <password>
# Example:
#   ./scripts/create-ng-auth-user.sh amacedo.usa@gmail.com 'YourSecurePassword'
#
# Requires: SERVICE_ROLE_KEY (from docs/.env.supabase) and SSH access to castorworks.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="${REPO_ROOT}/docs/.env.supabase"

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <email> <password>"
  echo "Example: $0 amacedo.usa@gmail.com 'YourSecurePassword'"
  exit 1
fi

EMAIL="$1"
PASSWORD="$2"

if [[ -z "${SERVICE_ROLE_KEY:-}" ]] && [[ -f "$ENV_FILE" ]]; then
  SERVICE_ROLE_KEY=$(grep -E '^SERVICE_ROLE_KEY=' "$ENV_FILE" | cut -d= -f2- | tr -d '\n\r')
fi
if [[ -z "${SERVICE_ROLE_KEY:-}" ]]; then
  echo "Error: SERVICE_ROLE_KEY not set. Export it or ensure docs/.env.supabase contains SERVICE_ROLE_KEY=..."
  exit 1
fi

# Pass key and payload via base64 to avoid shell corruption of JWT (403 bad_jwt)
SRK_B64=$(echo -n "$SERVICE_ROLE_KEY" | base64)
BODY_JSON=$(printf '%s' "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\",\"email_confirm\":true}")
BODY_B64=$(echo -n "$BODY_JSON" | base64)

# Create user via Auth Admin API on the server (NG Kong at 8003)
RESPONSE=$(ssh -i "${HOME}/.ssh/castorworks_deploy" castorworks "SRK_B64='$SRK_B64'; BODY_B64='$BODY_B64'; KEY=\$(echo \"\$SRK_B64\" | base64 -d); BODY=\$(echo \"\$BODY_B64\" | base64 -d); curl -s -w '\\n%{http_code}' -X POST 'http://127.0.0.1:8003/auth/v1/admin/users' -H \"Authorization: Bearer \$KEY\" -H 'Content-Type: application/json' -H \"apikey: \$KEY\" -d \"\$BODY\"")

# Portable: all but last line = body; last line = http code (macOS head doesn't support -n -1)
HTTP_BODY=$(echo "$RESPONSE" | sed '$d')
HTTP_CODE=$(echo "$RESPONSE" | tail -1)

if [[ "$HTTP_CODE" == "200" ]] || [[ "$HTTP_CODE" == "201" ]]; then
  echo "User created successfully: $EMAIL"
  echo "They can sign in at https://devng.castorworks.cloud (or your NG app URL) with this email and password."
  exit 0
else
  echo "Request failed (HTTP $HTTP_CODE). Response:"
  echo "$HTTP_BODY" | head -c 500
  echo ""
  exit 1
fi
