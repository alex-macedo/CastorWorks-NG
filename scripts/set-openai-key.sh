#!/bin/bash
# =============================================================================
# Set OpenAI API Key in Supabase Edge Functions Environment
# =============================================================================
# This script sets the OPENAI_API_KEY environment variable in the Supabase
# Edge Functions Docker container on the remote server.
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Configuration
REMOTE_SERVER="root@dev.castorworks.cloud"
SUPABASE_DIR="/root/supabase-CastorWorks"
ENV_FILE=".env"

log_info "Setting OpenAI API Key in Supabase Edge Functions..."

# Check if .env file exists locally
if [[ ! -f "${ENV_FILE}" ]]; then
    log_error "Local .env file not found. Please ensure .env exists with OPENAI_API_KEY set."
fi

# Read OPENAI_API_KEY from local .env file
OPENAI_KEY=$(grep "^OPENAI_API_KEY=" "${ENV_FILE}" | cut -d '=' -f 2- | tr -d '"' | tr -d "'")

if [[ -z "${OPENAI_KEY}" ]]; then
    log_error "OPENAI_API_KEY not found in ${ENV_FILE}"
fi

log_success "Found OpenAI API Key in local .env file"

# Execute remote commands
log_info "Connecting to remote server: ${REMOTE_SERVER}"

ssh "${REMOTE_SERVER}" bash << ENDSSH
set -euo pipefail

# Colors for remote output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "\${BLUE}[INFO]\${NC} \$1"; }
log_success() { echo -e "\${GREEN}[SUCCESS]\${NC} \$1"; }
log_error() { echo -e "\${RED}[ERROR]\${NC} \$1"; exit 1; }

SUPABASE_DIR="${SUPABASE_DIR}"
REMOTE_ENV_FILE="\${SUPABASE_DIR}/.env"

# Check if .env file exists
if [[ ! -f "\${REMOTE_ENV_FILE}" ]]; then
    log_error "Supabase .env file not found at: \${REMOTE_ENV_FILE}"
fi

log_info "Found Supabase environment file: \${REMOTE_ENV_FILE}"

# Backup the .env file
cp "\${REMOTE_ENV_FILE}" "\${REMOTE_ENV_FILE}.backup.\$(date +%Y%m%d_%H%M%S)"
log_success "Created backup of .env file"

# Check if OPENAI_API_KEY already exists
if grep -q "^OPENAI_API_KEY=" "\${REMOTE_ENV_FILE}"; then
    log_info "OPENAI_API_KEY already exists, updating..."
    # Remove the old key
    sed -i '/^OPENAI_API_KEY=/d' "\${REMOTE_ENV_FILE}"
else
    log_info "Adding new OPENAI_API_KEY..."
fi

# Add the key (will be replaced with actual value in next step)
echo "OPENAI_API_KEY=__PLACEHOLDER__" >> "\${REMOTE_ENV_FILE}"

log_success "Environment variable placeholder set in .env file"

# Find the Edge Functions container
EDGE_CONTAINER=\$(docker ps --filter "name=edge" --filter "name=function" --format "{{.Names}}" | head -1)

if [[ -z "\${EDGE_CONTAINER}" ]]; then
    # Try alternative container names
    EDGE_CONTAINER=\$(docker ps --format "{{.Names}}" | grep -i "supabase.*edge\|edge.*function" | head -1)
fi

if [[ -z "\${EDGE_CONTAINER}" ]]; then
    log_error "Could not find Edge Functions container. Available containers:"
    docker ps --format "{{.Names}}"
    exit 1
fi

echo "\${EDGE_CONTAINER}"
ENDSSH

# Capture the container name from the output
CONTAINER_NAME=$(ssh "${REMOTE_SERVER}" bash << 'ENDSSH2'
docker ps --filter "name=edge" --filter "name=function" --format "{{.Names}}" | head -1 || docker ps --format "{{.Names}}" | grep -i "supabase.*edge\|edge.*function" | head -1
ENDSSH2
)

log_info "Found Edge Functions container: ${CONTAINER_NAME}"

# Now replace the placeholder with the actual key (securely)
log_info "Setting the actual API key..."
ssh "${REMOTE_SERVER}" "sed -i 's|OPENAI_API_KEY=__PLACEHOLDER__|OPENAI_API_KEY=${OPENAI_KEY}|' ${SUPABASE_DIR}/.env"

log_success "API key set successfully"

# Restart the container
log_info "Restarting container to apply changes..."
ssh "${REMOTE_SERVER}" "docker restart ${CONTAINER_NAME}"

log_success "Container restarted successfully"

echo ""
echo "✅ OpenAI API Key configured successfully!"
echo ""
echo "The following container was restarted:"
echo "  - ${CONTAINER_NAME}"
echo ""
echo "Next steps:"
echo "  1. Test AI Insights in the application"
echo "  2. Check Edge Function logs if issues persist:"
echo "     ssh ${REMOTE_SERVER} 'docker logs -f ${CONTAINER_NAME}'"
echo ""
echo "To verify the key is set, run:"
echo "  ssh ${REMOTE_SERVER} 'docker exec ${CONTAINER_NAME} env | grep OPENAI_API_KEY'"
