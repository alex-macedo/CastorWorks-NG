#!/bin/bash
# =============================================================================
# CastorWorks Production Server Setup Script
# =============================================================================
#
# This script configures the production server to serve CastorWorks as a
# static application instead of proxying to the Vite dev server.
#
# PREREQUISITES:
#   - Run as root on the production server
#   - Production build uploaded to /var/www/castorworks/dist/
#   - Nginx configs uploaded to /tmp/
#
# USAGE:
#   chmod +x /tmp/setup-production.sh
#   /tmp/setup-production.sh
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

# Configuration
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/etc/nginx/sites-available/backup_${TIMESTAMP}"
DEPLOY_DIR="/var/www/castorworks"
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
echo -e "${GREEN}║   CastorWorks Production Server Setup                         ║${NC}"
echo -e "${GREEN}║   Timestamp: ${TIMESTAMP}                                ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if running as root
check_root

# =============================================================================
# STEP 1: Create Backup of Current Configuration
# =============================================================================

log_header "Step 1: Creating Backup"

mkdir -p "${BACKUP_DIR}"
log_info "Backup directory: ${BACKUP_DIR}"

# Backup existing nginx configs
if [[ -f "${NGINX_AVAILABLE}/castorworks.cloud" ]]; then
    cp "${NGINX_AVAILABLE}/castorworks.cloud" "${BACKUP_DIR}/"
    log_success "Backed up: castorworks.cloud"
else
    log_warning "No existing castorworks.cloud config found"
fi

if [[ -f "${NGINX_AVAILABLE}/dev.castorworks.conf" ]]; then
    cp "${NGINX_AVAILABLE}/dev.castorworks.conf" "${BACKUP_DIR}/"
    log_success "Backed up: dev.castorworks.conf"
else
    log_warning "No existing dev.castorworks.conf config found"
fi

# List backup contents
echo ""
log_info "Backup contents:"
ls -la "${BACKUP_DIR}/" 2>/dev/null || echo "  (empty)"

# =============================================================================
# STEP 2: Create Deployment Directory Structure
# =============================================================================

log_header "Step 2: Creating Deployment Directory"

if [[ ! -d "${DEPLOY_DIR}" ]]; then
    mkdir -p "${DEPLOY_DIR}/dist"
    log_success "Created: ${DEPLOY_DIR}/dist"
else
    log_info "Directory already exists: ${DEPLOY_DIR}"
fi

# Create log directory if needed
mkdir -p /var/log/nginx
log_success "Ensured log directory exists"

# =============================================================================
# STEP 3: Install New Nginx Configurations
# =============================================================================

log_header "Step 3: Installing Nginx Configurations"

# Check if new configs exist in /tmp
if [[ ! -f "/tmp/castorworks.conf" ]]; then
    log_error "Missing: /tmp/castorworks.conf"
    log_error "Please upload the nginx config files first:"
    log_error "  scp deploy/nginx/castorworks.conf root@server:/tmp/"
    exit 1
fi

if [[ ! -f "/tmp/dev.castorworks.conf" ]]; then
    log_error "Missing: /tmp/dev.castorworks.conf"
    log_error "Please upload the nginx config files first:"
    log_error "  scp deploy/nginx/dev.castorworks.conf root@server:/tmp/"
    exit 1
fi

# Install castorworks.conf (for castorworks.cloud domain)
# Note: The existing file is named 'castorworks.cloud', we'll update it
cp /tmp/castorworks.conf "${NGINX_AVAILABLE}/castorworks.cloud"
log_success "Installed: ${NGINX_AVAILABLE}/castorworks.cloud"

# Install dev.castorworks.conf
cp /tmp/dev.castorworks.conf "${NGINX_AVAILABLE}/dev.castorworks.conf"
log_success "Installed: ${NGINX_AVAILABLE}/dev.castorworks.conf"

# Ensure symlinks exist in sites-enabled
if [[ ! -L "${NGINX_ENABLED}/castorworks.cloud" ]]; then
    ln -sf "${NGINX_AVAILABLE}/castorworks.cloud" "${NGINX_ENABLED}/"
    log_success "Created symlink: castorworks.cloud"
else
    log_info "Symlink already exists: castorworks.cloud"
fi

if [[ ! -L "${NGINX_ENABLED}/dev.castorworks.conf" ]]; then
    ln -sf "${NGINX_AVAILABLE}/dev.castorworks.conf" "${NGINX_ENABLED}/"
    log_success "Created symlink: dev.castorworks.conf"
else
    log_info "Symlink already exists: dev.castorworks.conf"
fi

# =============================================================================
# STEP 4: Set File Permissions
# =============================================================================

log_header "Step 4: Setting File Permissions"

# Check if dist folder has files
if [[ -f "${DEPLOY_DIR}/dist/index.html" ]]; then
    log_info "Production build found in ${DEPLOY_DIR}/dist/"
    
    # Set ownership
    chown -R "${DEPLOY_USER}:${DEPLOY_GROUP}" "${DEPLOY_DIR}"
    log_success "Set ownership to ${DEPLOY_USER}:${DEPLOY_GROUP}"
    
    # Set permissions
    chmod -R 755 "${DEPLOY_DIR}"
    find "${DEPLOY_DIR}" -type f -exec chmod 644 {} \;
    log_success "Set directory permissions to 755, files to 644"
    
    # Show file count
    FILE_COUNT=$(find "${DEPLOY_DIR}/dist" -type f | wc -l)
    log_info "Total files in dist: ${FILE_COUNT}"
else
    log_warning "No index.html found in ${DEPLOY_DIR}/dist/"
    log_warning "Please upload the production build:"
    log_warning "  rsync -avz --delete dist/ root@server:/var/www/castorworks/dist/"
fi

# =============================================================================
# STEP 5: Test Nginx Configuration
# =============================================================================

log_header "Step 5: Testing Nginx Configuration"

if nginx -t; then
    log_success "Nginx configuration test passed"
else
    log_error "Nginx configuration test failed!"
    log_error "Rolling back to backup..."
    
    # Rollback
    if [[ -f "${BACKUP_DIR}/castorworks.cloud" ]]; then
        cp "${BACKUP_DIR}/castorworks.cloud" "${NGINX_AVAILABLE}/"
    fi
    if [[ -f "${BACKUP_DIR}/dev.castorworks.conf" ]]; then
        cp "${BACKUP_DIR}/dev.castorworks.conf" "${NGINX_AVAILABLE}/"
    fi
    
    log_info "Backup restored. Please check the configuration files."
    exit 1
fi

# =============================================================================
# STEP 6: Reload Nginx
# =============================================================================

log_header "Step 6: Reloading Nginx"

systemctl reload nginx
log_success "Nginx reloaded"

# =============================================================================
# STEP 7: Stop Vite Dev Server (if running)
# =============================================================================

log_header "Step 7: Stopping Vite Dev Server"

# Find and kill Vite processes
VITE_PIDS=$(pgrep -f "vite" 2>/dev/null || true)

if [[ -n "${VITE_PIDS}" ]]; then
    log_info "Found Vite processes: ${VITE_PIDS}"
    pkill -f "vite" || true
    sleep 2
    
    # Verify killed
    if pgrep -f "vite" > /dev/null 2>&1; then
        log_warning "Some Vite processes may still be running"
    else
        log_success "Vite dev server stopped"
    fi
else
    log_info "No Vite dev server processes found"
fi

# Also check for node processes on port 5173
PORT_5173_PID=$(lsof -t -i:5173 2>/dev/null || true)
if [[ -n "${PORT_5173_PID}" ]]; then
    log_info "Found process on port 5173: ${PORT_5173_PID}"
    kill -9 ${PORT_5173_PID} 2>/dev/null || true
    log_success "Killed process on port 5173"
fi

# =============================================================================
# STEP 8: Validate Deployment
# =============================================================================

log_header "Step 8: Validating Deployment"

VALIDATION_PASSED=true

# Check if static files exist
echo ""
log_info "Checking static files..."
if [[ -f "${DEPLOY_DIR}/dist/index.html" ]]; then
    log_success "✓ index.html exists"
else
    log_error "✗ index.html missing"
    VALIDATION_PASSED=false
fi

if [[ -d "${DEPLOY_DIR}/dist/assets" ]]; then
    ASSET_COUNT=$(find "${DEPLOY_DIR}/dist/assets" -type f | wc -l)
    log_success "✓ assets folder exists (${ASSET_COUNT} files)"
else
    log_error "✗ assets folder missing"
    VALIDATION_PASSED=false
fi

# Check nginx is running
echo ""
log_info "Checking nginx status..."
if systemctl is-active --quiet nginx; then
    log_success "✓ nginx is running"
else
    log_error "✗ nginx is not running"
    VALIDATION_PASSED=false
fi

# Check port 5173 is NOT listening (dev server should be stopped)
echo ""
log_info "Checking port 5173 (should be closed)..."
if lsof -i:5173 > /dev/null 2>&1; then
    log_warning "⚠ Something is still listening on port 5173"
else
    log_success "✓ Port 5173 is not in use (dev server stopped)"
fi

# Check Supabase services
echo ""
log_info "Checking Supabase services..."
if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/rest/v1/ | grep -q "200\|401"; then
    log_success "✓ Supabase Kong gateway responding"
else
    log_warning "⚠ Supabase Kong gateway may not be responding"
    log_info "  Check with: cd /root/supabase-CastorWorks && docker compose ps"
fi

# Test HTTPS endpoints (if curl available)
echo ""
log_info "Testing HTTPS endpoints..."

# Test castorworks.cloud
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 https://castorworks.cloud 2>/dev/null || echo "000")
if [[ "${HTTP_CODE}" == "200" ]]; then
    log_success "✓ https://castorworks.cloud returns 200"
elif [[ "${HTTP_CODE}" == "000" ]]; then
    log_warning "⚠ Could not connect to https://castorworks.cloud (DNS or network issue)"
else
    log_warning "⚠ https://castorworks.cloud returns ${HTTP_CODE}"
fi

# Test dev.castorworks.cloud
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 https://dev.castorworks.cloud 2>/dev/null || echo "000")
if [[ "${HTTP_CODE}" == "200" ]]; then
    log_success "✓ https://dev.castorworks.cloud returns 200"
elif [[ "${HTTP_CODE}" == "000" ]]; then
    log_warning "⚠ Could not connect to https://dev.castorworks.cloud"
else
    log_warning "⚠ https://dev.castorworks.cloud returns ${HTTP_CODE}"
fi

# =============================================================================
# SUMMARY
# =============================================================================

log_header "Setup Complete"

echo ""
if [[ "${VALIDATION_PASSED}" == "true" ]]; then
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   ✓ Production setup completed successfully!                  ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
else
    echo -e "${YELLOW}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║   ⚠ Setup completed with warnings - please review above       ║${NC}"
    echo -e "${YELLOW}╚═══════════════════════════════════════════════════════════════╝${NC}"
fi

echo ""
echo -e "${CYAN}Summary:${NC}"
echo "  • Backup location:  ${BACKUP_DIR}"
echo "  • Static files:     ${DEPLOY_DIR}/dist/"
echo "  • Nginx configs:    ${NGINX_AVAILABLE}/"
echo ""
echo -e "${CYAN}Next Steps:${NC}"
echo "  1. Open https://castorworks.cloud in browser"
echo "  2. Verify login works"
echo "  3. Test key features"
echo "  4. Check logs: tail -f /var/log/nginx/castorworks.error.log"
echo ""
echo -e "${CYAN}Rollback Command (if needed):${NC}"
echo "  cp ${BACKUP_DIR}/* ${NGINX_AVAILABLE}/"
echo "  nginx -t && systemctl reload nginx"
echo ""
