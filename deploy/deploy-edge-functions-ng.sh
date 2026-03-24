#!/bin/bash
# =============================================================================
# CastorWorks-NG Edge Functions Deployment Script
# =============================================================================
#
# Deploys Supabase Edge Functions to the NG self-hosted instance (devng.castorworks.cloud).
# Does not modify the original CastorWorks stack. Uses SSH (castorworks alias) per AGENTS.md.
#
# USAGE:
#   ./deploy/deploy-edge-functions-ng.sh [function_names...]
#
# Examples:
#   ./deploy/deploy-edge-functions-ng.sh
#   ./deploy/deploy-edge-functions-ng.sh stripe-webhook create-checkout-session create-billing-portal-session _shared
#
# PREREQUISITES:
#   - SSH config: Host castorworks, IdentityFile ~/.ssh/castorworks_deploy
#   - Remote path: /root/supabase-CastorWorks-NG/
#
# =============================================================================

set -euo pipefail

# NG stack (do not change original CastorWorks paths)
SSH_HOST="castorworks"
SSH_OPTS="-i ~/.ssh/castorworks_deploy"
REMOTE_BASE="/root/supabase-CastorWorks-NG"
REMOTE_FUNCTIONS="${REMOTE_BASE}/volumes/functions"
# Edge runtime service name on NG stack (docker compose service: functions)
CONTAINER_NAME="${EDGE_CONTAINER_NAME:-functions}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

if [[ $# -gt 0 ]]; then
  TARGETS=("$@")
else
  TARGETS=("_shared")
  for dir in supabase/functions/*/; do
    name=$(basename "$dir")
    [[ "$name" != "_shared" && "$name" != "__tests__" ]] && TARGETS+=("$name")
  done
fi

log_info "Deploying Edge Functions to NG stack at ${SSH_HOST}"
log_info "Remote: ${REMOTE_FUNCTIONS} | Container: ${CONTAINER_NAME}"
log_info "Targets: ${TARGETS[*]}"

ssh -q -o ConnectTimeout=5 ${SSH_OPTS} ${SSH_HOST} "echo OK" || log_error "Cannot connect to ${SSH_HOST}. Check ~/.ssh/config and castorworks_deploy key."

for target in "${TARGETS[@]}"; do
  if [[ "$target" == "_shared" ]]; then
    LOCAL_PATH="supabase/functions/_shared"
  else
    LOCAL_PATH="supabase/functions/${target}"
  fi

  if [[ ! -d "$LOCAL_PATH" ]]; then
    log_error "Local path not found: $LOCAL_PATH"
  fi

  log_info "Deploying ${target}..."
  ssh ${SSH_OPTS} ${SSH_HOST} "mkdir -p /tmp/edge-deploy-ng-${target}"
  scp ${SSH_OPTS} -r "${LOCAL_PATH}/"* "${SSH_HOST}:/tmp/edge-deploy-ng-${target}/" || log_error "Failed to copy ${target}"

  if [[ "$target" == "_shared" ]]; then
    ssh ${SSH_OPTS} ${SSH_HOST} "mkdir -p ${REMOTE_FUNCTIONS}/_shared && cp -r /tmp/edge-deploy-ng-_shared/* ${REMOTE_FUNCTIONS}/_shared/ && rm -rf /tmp/edge-deploy-ng-_shared"
  else
    ssh ${SSH_OPTS} ${SSH_HOST} "mkdir -p ${REMOTE_FUNCTIONS}/${target} && cp -r /tmp/edge-deploy-ng-${target}/* ${REMOTE_FUNCTIONS}/${target}/ && rm -rf /tmp/edge-deploy-ng-${target}"
  fi

  log_success "Deployed ${target}"
done

log_info "Restarting ${CONTAINER_NAME}..."
ssh ${SSH_OPTS} ${SSH_HOST} "cd ${REMOTE_BASE} && docker compose restart ${CONTAINER_NAME}" 2>/dev/null || \
  ssh ${SSH_OPTS} ${SSH_HOST} "docker restart ${CONTAINER_NAME}" 2>/dev/null || \
  log_error "Could not restart edge container. Restart it manually on the server."

log_success "Edge functions deployed to NG. Verify: https://devng.castorworks.cloud/functions/v1/..."
