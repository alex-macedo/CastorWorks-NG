#!/bin/bash
# =============================================================================
# CastorWorks Production Deployment Script
# =============================================================================
# 
# This script builds the production bundle locally and deploys it to the
# production server. The production server only serves static files via nginx.
#
# USAGE:
#   ./deploy/deploy.sh [options]
#
# OPTIONS:
#   --skip-build    Skip the build step (use existing dist/)
#   --skip-tests    Skip running tests before deploy
#   --dry-run       Show what would be done without executing
#   --help          Show this help message
#
# PREREQUISITES:
#   - SSH access to the production server
#   - rsync installed locally
#   - Node.js and npm installed locally
#
# =============================================================================

set -euo pipefail

# =============================================================================
# CONFIGURATION - Modify these for your environment
# =============================================================================

# Production server details
PROD_SERVER="root@castorworks.cloud"
PROD_SSH_PORT="22"

# Paths
LOCAL_DIST_DIR="./dist"
REMOTE_DEPLOY_PATH="/var/www/castorworks"
REMOTE_BACKUP_PATH="/var/www/castorworks-backups"

# Deployment user (for permissions)
DEPLOY_USER="www-data"
DEPLOY_GROUP="www-data"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

show_help() {
    head -n 25 "$0" | tail -n 22
    exit 0
}

# =============================================================================
# PARSE ARGUMENTS
# =============================================================================

SKIP_BUILD=false
SKIP_TESTS=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help|-h)
            show_help
            ;;
        *)
            log_error "Unknown option: $1. Use --help for usage."
            ;;
    esac
done

# =============================================================================
# PRE-FLIGHT CHECKS
# =============================================================================

log_info "Starting CastorWorks production deployment..."
log_info "Target server: ${PROD_SERVER}"

# Check if we're in the project root
if [[ ! -f "package.json" ]]; then
    log_error "Must be run from project root (where package.json is located)"
fi

# Check SSH connectivity
log_info "Checking SSH connectivity..."
if ! ssh -q -p "${PROD_SSH_PORT}" "${PROD_SERVER}" exit; then
    log_error "Cannot connect to ${PROD_SERVER}. Check SSH configuration."
fi
log_success "SSH connection OK"

# =============================================================================
# RUN TESTS
# =============================================================================

if [[ "${SKIP_TESTS}" == "false" ]]; then
    log_info "Running tests..."
    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "[DRY-RUN] Would run: npm run test:run"
    else
        npm run test:run || log_error "Tests failed. Aborting deployment."
        log_success "All tests passed"
    fi
else
    log_warning "Skipping tests (--skip-tests flag)"
fi

# =============================================================================
# BUILD PRODUCTION BUNDLE
# =============================================================================

if [[ "${SKIP_BUILD}" == "false" ]]; then
    log_info "Building production bundle..."
    
    # Clean previous build
    if [[ -d "${LOCAL_DIST_DIR}" ]]; then
        log_info "Cleaning previous build..."
        rm -rf "${LOCAL_DIST_DIR}"
    fi
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "[DRY-RUN] Would run: npm run build"
    else
        # Run production build
        npm run build || log_error "Build failed. Aborting deployment."
        log_success "Production build complete"
    fi
else
    log_warning "Skipping build (--skip-build flag)"
    if [[ ! -d "${LOCAL_DIST_DIR}" ]]; then
        log_error "dist/ directory not found. Run without --skip-build first."
    fi
fi

# Verify build output
if [[ "${DRY_RUN}" == "false" ]]; then
    if [[ ! -f "${LOCAL_DIST_DIR}/index.html" ]]; then
        log_error "Build verification failed: index.html not found in ${LOCAL_DIST_DIR}"
    fi
    
    BUILD_SIZE=$(du -sh "${LOCAL_DIST_DIR}" | cut -f1)
    log_info "Build size: ${BUILD_SIZE}"
fi

# =============================================================================
# CREATE BACKUP ON SERVER
# =============================================================================

log_info "Creating backup of current deployment..."

BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="backup_${BACKUP_TIMESTAMP}"

if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "[DRY-RUN] Would create backup: ${REMOTE_BACKUP_PATH}/${BACKUP_NAME}"
else
    ssh -p "${PROD_SSH_PORT}" "${PROD_SERVER}" "
        mkdir -p ${REMOTE_BACKUP_PATH}
        if [[ -d ${REMOTE_DEPLOY_PATH}/dist ]]; then
            cp -r ${REMOTE_DEPLOY_PATH}/dist ${REMOTE_BACKUP_PATH}/${BACKUP_NAME}
            echo 'Backup created: ${BACKUP_NAME}'
            
            # Keep only last 5 backups
            cd ${REMOTE_BACKUP_PATH}
            ls -t | tail -n +6 | xargs -r rm -rf
        else
            echo 'No existing deployment to backup'
        fi
    "
    log_success "Backup complete"
fi

# =============================================================================
# DEPLOY TO PRODUCTION
# =============================================================================

log_info "Deploying to production server..."

if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "[DRY-RUN] Would rsync ${LOCAL_DIST_DIR}/ to ${PROD_SERVER}:${REMOTE_DEPLOY_PATH}/dist/"
else
    # Create deployment directory if it doesn't exist
    ssh -p "${PROD_SSH_PORT}" "${PROD_SERVER}" "mkdir -p ${REMOTE_DEPLOY_PATH}/dist"
    
    # Sync files with rsync
    # --delete: Remove files on destination that don't exist on source
    # --checksum: Compare files by checksum, not just modification time
    # --compress: Compress during transfer
    rsync -avz --delete --checksum \
        -e "ssh -p ${PROD_SSH_PORT}" \
        "${LOCAL_DIST_DIR}/" \
        "${PROD_SERVER}:${REMOTE_DEPLOY_PATH}/dist/"
    
    log_success "Files synced to production"
fi

# =============================================================================
# SET PERMISSIONS
# =============================================================================

log_info "Setting file permissions..."

if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "[DRY-RUN] Would set permissions for ${DEPLOY_USER}:${DEPLOY_GROUP}"
else
    ssh -p "${PROD_SSH_PORT}" "${PROD_SERVER}" "
        chown -R ${DEPLOY_USER}:${DEPLOY_GROUP} ${REMOTE_DEPLOY_PATH}
        chmod -R 755 ${REMOTE_DEPLOY_PATH}
        find ${REMOTE_DEPLOY_PATH} -type f -exec chmod 644 {} \;
    "
    log_success "Permissions set"
fi

# =============================================================================
# VERIFY DEPLOYMENT
# =============================================================================

log_info "Verifying deployment..."

if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "[DRY-RUN] Would verify deployment"
else
    # Check if index.html exists
    if ssh -p "${PROD_SSH_PORT}" "${PROD_SERVER}" "test -f ${REMOTE_DEPLOY_PATH}/dist/index.html"; then
        log_success "Deployment verified - index.html exists"
    else
        log_error "Deployment verification failed - index.html not found"
    fi
    
    # Show deployed file count
    FILE_COUNT=$(ssh -p "${PROD_SSH_PORT}" "${PROD_SERVER}" "find ${REMOTE_DEPLOY_PATH}/dist -type f | wc -l")
    log_info "Deployed ${FILE_COUNT} files"
fi

# =============================================================================
# RELOAD NGINX
# =============================================================================

log_info "Reloading nginx..."

if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "[DRY-RUN] Would reload nginx"
else
    ssh -p "${PROD_SSH_PORT}" "${PROD_SERVER}" "
        nginx -t && systemctl reload nginx
    " || log_error "Failed to reload nginx"
    log_success "Nginx reloaded"
fi

# =============================================================================
# DONE
# =============================================================================

echo ""
log_success "=========================================="
log_success "    Deployment completed successfully!   "
log_success "=========================================="
echo ""
log_info "Deployed to: https://castorworks.cloud"
log_info "Backup: ${REMOTE_BACKUP_PATH}/${BACKUP_NAME}"
echo ""

# Optional: Show recent error logs
log_info "Checking for errors in nginx logs..."
ssh -p "${PROD_SSH_PORT}" "${PROD_SERVER}" "tail -n 5 /var/log/nginx/castorworks.error.log 2>/dev/null || echo 'No recent errors'"
