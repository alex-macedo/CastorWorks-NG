#!/bin/bash
# =============================================================================
# CastorWorks Edge Functions Deployment Script
# =============================================================================
#
# Deploys Supabase Edge Functions to the self-hosted Supabase instance at
# dev.castorworks.cloud. Uses SSH (castorworks alias) per AGENTS.md.
#
# USAGE:
#   ./deploy/deploy-edge-functions.sh [function_names...]
#
# Examples:
#   ./deploy/deploy-edge-functions.sh                    # Deploy all functions
#   ./deploy/deploy-edge-functions.sh send-email-notification  # Deploy single function
#   ./deploy/deploy-edge-functions.sh send-email-notification send-whatsapp-notification _shared
#
# PREREQUISITES:
#   - SSH config: Host castorworks, IdentityFile ~/.ssh/castorworks_deploy
#   - Remote path: /root/supabase-CastorWorks/
#
# =============================================================================

set -euo pipefail

# Configuration
SSH_HOST="castorworks"
SSH_OPTS="-i ~/.ssh/castorworks_deploy"
REMOTE_BASE="/root/supabase-CastorWorks"
# Container mounts volumes/functions - deploy there so container picks up changes
REMOTE_FUNCTIONS="${REMOTE_BASE}/volumes/functions"
CONTAINER_NAME="supabase-edge-functions"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Parse arguments - specific functions or all
if [[ $# -gt 0 ]]; then
  TARGETS=("$@")
else
  # Deploy all functions + _shared
  TARGETS=("_shared")
  for dir in supabase/functions/*/; do
    name=$(basename "$dir")
    [[ "$name" != "_shared" && "$name" != "__tests__" ]] && TARGETS+=("$name")
  done
fi

log_info "Deploying Edge Functions to ${SSH_HOST}"
log_info "Targets: ${TARGETS[*]}"

# Verify SSH connectivity
log_info "Checking SSH connectivity..."
ssh -q -o ConnectTimeout=5 ${SSH_OPTS} ${SSH_HOST} "echo OK" || log_error "Cannot connect to ${SSH_HOST}. Check ~/.ssh/config and castorworks_deploy key."

# Deploy each target
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
  # Create temp dir on remote, then scp into it
  ssh ${SSH_OPTS} ${SSH_HOST} "mkdir -p /tmp/edge-deploy-${target}"
  scp ${SSH_OPTS} -r "${LOCAL_PATH}/"* "${SSH_HOST}:/tmp/edge-deploy-${target}/" || log_error "Failed to copy ${target}"

  if [[ "$target" == "_shared" ]]; then
    ssh ${SSH_OPTS} ${SSH_HOST} "mkdir -p ${REMOTE_FUNCTIONS}/_shared && cp -r /tmp/edge-deploy-_shared/* ${REMOTE_FUNCTIONS}/_shared/ && rm -rf /tmp/edge-deploy-_shared"
  else
    ssh ${SSH_OPTS} ${SSH_HOST} "mkdir -p ${REMOTE_FUNCTIONS}/${target} && cp -r /tmp/edge-deploy-${target}/* ${REMOTE_FUNCTIONS}/${target}/ && rm -rf /tmp/edge-deploy-${target}"
  fi

  log_success "Deployed ${target}"
done

# Restart edge runtime to pick up changes
log_info "Restarting ${CONTAINER_NAME}..."
ssh ${SSH_OPTS} ${SSH_HOST} "docker restart ${CONTAINER_NAME}" || log_error "Failed to restart container"

log_success "Edge functions deployed. Container restarted."
log_info "Verify: curl -s https://dev.castorworks.cloud/functions/v1/send-email-notification -X POST -H 'Content-Type: application/json' -d '{}'"
