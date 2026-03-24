#!/bin/bash
# Apply Phase 4 Stripe setup: run SQL on NG DB, set STRIPE_WEBHOOK_SECRET on server, restart Edge.
# Run after: npm run stripe:phase4-setup

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="${SCRIPT_DIR}/.stripe-phase4-out"
SQL_PATH="${OUT_DIR}/price-ids.sql"
SECRET_PATH="${OUT_DIR}/webhook-secret.txt"
SSH_HOST="castorworks"
SSH_OPTS="-i ~/.ssh/castorworks_deploy"
REMOTE_BASE="/root/supabase-CastorWorks-NG"
CONTAINER_NAME="functions"

if [[ ! -f "$SQL_PATH" ]]; then
  echo "Missing $SQL_PATH - run npm run stripe:phase4-setup first" >&2
  exit 1
fi

echo "Applying SQL on NG DB..."
scp ${SSH_OPTS} -q "$SQL_PATH" "${SSH_HOST}:/tmp/stripe-phase4-price-ids.sql"
ssh ${SSH_OPTS} ${SSH_HOST} "docker exec -i castorworks-ng-db psql -U postgres -d postgres < /tmp/stripe-phase4-price-ids.sql"
echo "SQL applied."

if [[ -f "$SECRET_PATH" ]]; then
  echo "Setting STRIPE_WEBHOOK_SECRET on server..."
  WEBHOOK_SECRET=$(cat "$SECRET_PATH" | tr -d '\n')
  ssh ${SSH_OPTS} ${SSH_HOST} "grep -q '^STRIPE_WEBHOOK_SECRET=' ${REMOTE_BASE}/.env && sed -i.bak 's|^STRIPE_WEBHOOK_SECRET=.*|STRIPE_WEBHOOK_SECRET=${WEBHOOK_SECRET}|' ${REMOTE_BASE}/.env || echo 'STRIPE_WEBHOOK_SECRET=${WEBHOOK_SECRET}' >> ${REMOTE_BASE}/.env"
  echo "Webhook secret set."
fi

echo "Restarting ${CONTAINER_NAME}..."
ssh ${SSH_OPTS} ${SSH_HOST} "cd ${REMOTE_BASE} && docker compose restart ${CONTAINER_NAME}"
echo "Done."
