#!/bin/bash
# =============================================================================
# CastorWorks-NG Production Server Setup Script
# =============================================================================
#
# Configures the production server to serve CastorWorks-NG as a static
# application at devng.castorworks.cloud. Completely separate from the
# original CastorWorks setup — does not touch /var/www/castorworks,
# castorworks.conf, or dev.castorworks.conf.
#
# PREREQUISITES:
#   - Run as root on the production server
#   - NG production build uploaded to /var/www/castorworks-ng/dist/
#   - NG nginx configs uploaded to /tmp/
#   - SSL cert for devng.castorworks.cloud already issued:
#       certbot certonly --nginx -d devng.castorworks.cloud
#   - SSL cert for studiong.castorworks.cloud already issued:
#       certbot certonly --nginx -d studiong.castorworks.cloud
#
# USAGE (run on the server):
#   # 1. Upload configs from your local machine:
#   scp deploy/nginx/devng.castorworks.conf root@<server>:/tmp/
#   scp deploy/nginx/studiong.castorworks.conf root@<server>:/tmp/
#   scp deploy/setup-production-ng.sh root@<server>:/tmp/
#
#   # 2. Run on the server:
#   chmod +x /tmp/setup-production-ng.sh
#   /tmp/setup-production-ng.sh
#
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration — NG only (original CastorWorks paths are untouched)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/etc/nginx/sites-available/backup-ng_${TIMESTAMP}"
DEPLOY_DIR="/var/www/castorworks-ng"
NGINX_AVAILABLE="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"
DEPLOY_USER="www-data"
DEPLOY_GROUP="www-data"

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

log_header() {
    echo ""
    echo -e "${CYAN}============================================${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}============================================${NC}"
}

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
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root"
        exit 1
    fi
}

# =============================================================================
# MAIN SCRIPT
# =============================================================================

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   CastorWorks-NG Production Server Setup                      ║${NC}"
echo -e "${GREEN}║   Timestamp: ${TIMESTAMP}                                ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

check_root

# =============================================================================
# STEP 1: Backup Any Existing NG Configuration
# =============================================================================

log_header "Step 1: Creating Backup"

mkdir -p "${BACKUP_DIR}"
log_info "Backup directory: ${BACKUP_DIR}"

for conf in devng.castorworks.conf studiong.castorworks.conf; do
    if [[ -f "${NGINX_AVAILABLE}/${conf}" ]]; then
        cp "${NGINX_AVAILABLE}/${conf}" "${BACKUP_DIR}/"
        log_success "Backed up: ${conf}"
    else
        log_info "No existing ${conf} to back up (first-time setup)"
    fi
done

echo ""
log_info "Backup contents:"
ls -la "${BACKUP_DIR}/" 2>/dev/null || echo "  (empty)"

# =============================================================================
# STEP 2: Create NG Deployment Directory
# =============================================================================

log_header "Step 2: Creating NG Deployment Directory"

if [[ ! -d "${DEPLOY_DIR}" ]]; then
    mkdir -p "${DEPLOY_DIR}/dist"
    log_success "Created: ${DEPLOY_DIR}/dist"
else
    log_info "Directory already exists: ${DEPLOY_DIR}"
fi

mkdir -p /var/www/castorworks-ng-backups
log_success "Ensured backup directory exists"

mkdir -p /var/log/nginx
log_success "Ensured log directory exists"

# =============================================================================
# STEP 3: Install NG Nginx Configurations
# =============================================================================

log_header "Step 3: Installing Nginx Configurations"

if [[ ! -f "/tmp/devng.castorworks.conf" ]]; then
    log_error "Missing: /tmp/devng.castorworks.conf"
    echo "  Upload with: scp deploy/nginx/devng.castorworks.conf root@<server>:/tmp/"
    exit 1
fi

if [[ ! -f "/tmp/studiong.castorworks.conf" ]]; then
    log_error "Missing: /tmp/studiong.castorworks.conf"
    echo "  Upload with: scp deploy/nginx/studiong.castorworks.conf root@<server>:/tmp/"
    exit 1
fi

# Install devng.castorworks.conf
cp /tmp/devng.castorworks.conf "${NGINX_AVAILABLE}/devng.castorworks.conf"
log_success "Installed: ${NGINX_AVAILABLE}/devng.castorworks.conf"

# Install studiong.castorworks.conf
cp /tmp/studiong.castorworks.conf "${NGINX_AVAILABLE}/studiong.castorworks.conf"
log_success "Installed: ${NGINX_AVAILABLE}/studiong.castorworks.conf"

# Enable sites
for conf in devng.castorworks.conf studiong.castorworks.conf; do
    if [[ ! -L "${NGINX_ENABLED}/${conf}" ]]; then
        ln -sf "${NGINX_AVAILABLE}/${conf}" "${NGINX_ENABLED}/"
        log_success "Created symlink: ${conf}"
    else
        log_info "Symlink already exists: ${conf}"
    fi
done

# =============================================================================
# STEP 4: Set File Permissions
# =============================================================================

log_header "Step 4: Setting File Permissions"

if [[ -f "${DEPLOY_DIR}/dist/index.html" ]]; then
    log_info "NG build found in ${DEPLOY_DIR}/dist/"

    chown -R "${DEPLOY_USER}:${DEPLOY_GROUP}" "${DEPLOY_DIR}"
    log_success "Set ownership to ${DEPLOY_USER}:${DEPLOY_GROUP}"

    chmod -R 755 "${DEPLOY_DIR}"
    find "${DEPLOY_DIR}" -type f -exec chmod 644 {} \;
    log_success "Set directory permissions to 755, files to 644"

    FILE_COUNT=$(find "${DEPLOY_DIR}/dist" -type f | wc -l)
    log_info "Total files in dist: ${FILE_COUNT}"
else
    log_warning "No index.html found in ${DEPLOY_DIR}/dist/"
    log_warning "Deploy the NG build first:"
    log_warning "  ./deploy/deploy-ng.sh --skip-tests"
fi

# =============================================================================
# STEP 5: Test Nginx Configuration
# =============================================================================

log_header "Step 5: Testing Nginx Configuration"

if nginx -t; then
    log_success "Nginx configuration test passed"
else
    log_error "Nginx configuration test failed — rolling back NG configs..."

    for conf in devng.castorworks.conf studiong.castorworks.conf; do
        if [[ -f "${BACKUP_DIR}/${conf}" ]]; then
            cp "${BACKUP_DIR}/${conf}" "${NGINX_AVAILABLE}/"
            log_info "Restored: ${conf}"
        else
            rm -f "${NGINX_AVAILABLE}/${conf}"
            rm -f "${NGINX_ENABLED}/${conf}"
            log_info "Removed: ${conf} (was not present before)"
        fi
    done

    log_info "Rollback complete. Check the config files and re-run."
    exit 1
fi

# =============================================================================
# STEP 6: Reload Nginx
# =============================================================================

log_header "Step 6: Reloading Nginx"

systemctl reload nginx
log_success "Nginx reloaded"

# =============================================================================
# STEP 7: Validate NG Deployment
# =============================================================================

log_header "Step 7: Validating NG Deployment"

VALIDATION_PASSED=true

# Check static files
echo ""
log_info "Checking static files..."
if [[ -f "${DEPLOY_DIR}/dist/index.html" ]]; then
    log_success "✓ index.html exists"
else
    log_warning "✗ index.html missing — run ./deploy/deploy-ng.sh after setup"
    VALIDATION_PASSED=false
fi

if [[ -d "${DEPLOY_DIR}/dist/assets" ]]; then
    ASSET_COUNT=$(find "${DEPLOY_DIR}/dist/assets" -type f | wc -l)
    log_success "✓ assets folder exists (${ASSET_COUNT} files)"
else
    log_warning "✗ assets folder missing"
    VALIDATION_PASSED=false
fi

# Check nginx
echo ""
log_info "Checking nginx status..."
if systemctl is-active --quiet nginx; then
    log_success "✓ nginx is running"
else
    log_error "✗ nginx is not running"
    VALIDATION_PASSED=false
fi

# Check NG Supabase (port 8003)
echo ""
log_info "Checking NG Supabase services (port 8003)..."
if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8003/rest/v1/ | grep -q "200\|401"; then
    log_success "✓ NG Supabase Kong responding (port 8003)"
else
    log_warning "⚠ NG Supabase Kong (port 8003) may not be responding"
    log_info "  Check with: cd /root/supabase-CastorWorks-NG && docker compose ps"
fi

# Test HTTPS endpoints
echo ""
log_info "Testing HTTPS endpoints..."

for url in "https://devng.castorworks.cloud" "https://studiong.castorworks.cloud"; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${url}" 2>/dev/null || echo "000")
    if [[ "${HTTP_CODE}" == "200" ]]; then
        log_success "✓ ${url} returns 200"
    elif [[ "${HTTP_CODE}" == "000" ]]; then
        log_warning "⚠ Could not connect to ${url} (DNS or cert issue)"
    else
        log_warning "⚠ ${url} returns ${HTTP_CODE}"
    fi
done

# =============================================================================
# SUMMARY
# =============================================================================

log_header "NG Setup Complete"

echo ""
if [[ "${VALIDATION_PASSED}" == "true" ]]; then
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   ✓ CastorWorks-NG setup completed successfully!              ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
else
    echo -e "${YELLOW}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║   ⚠ Setup complete with warnings — review above               ║${NC}"
    echo -e "${YELLOW}╚═══════════════════════════════════════════════════════════════╝${NC}"
fi

echo ""
echo -e "${CYAN}Summary:${NC}"
echo "  • Backup location:   ${BACKUP_DIR}"
echo "  • NG static files:   ${DEPLOY_DIR}/dist/"
echo "  • Nginx configs:     ${NGINX_AVAILABLE}/"
echo ""
echo -e "${CYAN}Next Steps:${NC}"
echo "  1. Open https://devng.castorworks.cloud in browser"
echo "  2. Verify login works (Supabase at port 8003)"
echo "  3. Test key features"
echo "  4. Check NG logs: tail -f /var/log/nginx/devng.castorworks.error.log"
echo ""
echo -e "${CYAN}Rollback Command (if needed):${NC}"
echo "  cp ${BACKUP_DIR}/* ${NGINX_AVAILABLE}/"
echo "  nginx -t && systemctl reload nginx"
echo ""
echo -e "${CYAN}Original CastorWorks is unchanged at:${NC}"
echo "  https://castorworks.cloud  (port 8000 Supabase)"
echo "  https://dev.castorworks.cloud"
echo ""
