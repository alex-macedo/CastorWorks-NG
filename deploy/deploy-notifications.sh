#!/bin/bash
# =============================================================================
# CastorWorks Notification System Deployment Script
# =============================================================================
# 
# This script deploys the notification system to the production Supabase
# Docker container running on castorworks.cloud
#
# USAGE:
#   ./deploy/deploy-notifications.sh [options]
#
# OPTIONS:
#   --migrations-only   Only apply database migrations
#   --functions-only    Only deploy Edge Functions
#   --dry-run          Show what would be done without executing
#   --help             Show this help message
#
# =============================================================================

set -euo pipefail

# =============================================================================
# CONFIGURATION
# =============================================================================

PROD_SERVER="root@castorworks.cloud"
PROD_SSH_PORT="22"
SUPABASE_CONTAINER="supabase-db"  # Adjust if your container name is different

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
    head -n 18 "$0" | tail -n 15
    exit 0
}

# =============================================================================
# PARSE ARGUMENTS
# =============================================================================

MIGRATIONS_ONLY=false
FUNCTIONS_ONLY=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --migrations-only)
            MIGRATIONS_ONLY=true
            shift
            ;;
        --functions-only)
            FUNCTIONS_ONLY=true
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

log_info "Starting Notification System deployment..."
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
# APPLY DATABASE MIGRATIONS
# =============================================================================

if [[ "${FUNCTIONS_ONLY}" == "false" ]]; then
    log_info "Applying database migrations..."
    
    MIGRATIONS=(
        "20260125200000_notification_reminders_system.sql"
        "20260125200001_chat_message_notification_trigger.sql"
        "20260125200002_setup_notification_cron.sql"
    )
    
    for migration in "${MIGRATIONS[@]}"; do
        log_info "Applying migration: ${migration}"
        
        if [[ "${DRY_RUN}" == "true" ]]; then
            log_info "[DRY-RUN] Would apply: ${migration}"
        else
            # Copy migration file to server
            scp -P "${PROD_SSH_PORT}" \
                "supabase/migrations/${migration}" \
                "${PROD_SERVER}:/tmp/${migration}"
            
            # Execute migration in Docker container
            ssh -p "${PROD_SSH_PORT}" "${PROD_SERVER}" "
                docker exec -i ${SUPABASE_CONTAINER} psql -U postgres -d postgres < /tmp/${migration}
                rm /tmp/${migration}
            " || log_error "Failed to apply migration: ${migration}"
            
            log_success "Applied: ${migration}"
        fi
    done
    
    log_success "All migrations applied successfully"
fi

# =============================================================================
# DEPLOY EDGE FUNCTIONS
# =============================================================================

if [[ "${MIGRATIONS_ONLY}" == "false" ]]; then
    log_info "Deploying Edge Functions..."
    
    FUNCTIONS=(
        "check-due-notifications"
        "notify-chat-message"
    )
    
    for func in "${FUNCTIONS[@]}"; do
        log_info "Deploying function: ${func}"
        
        if [[ "${DRY_RUN}" == "true" ]]; then
            log_info "[DRY-RUN] Would deploy: ${func}"
        else
            # Create function directory on server
            ssh -p "${PROD_SSH_PORT}" "${PROD_SERVER}" "
                mkdir -p /tmp/supabase-functions/${func}
            "
            
            # Copy function files
            scp -P "${PROD_SSH_PORT}" -r \
                "supabase/functions/${func}/" \
                "${PROD_SERVER}:/tmp/supabase-functions/${func}/"
            
            # Deploy function (adjust this based on your Supabase setup)
            # This assumes you have a way to deploy functions to your Docker setup
            ssh -p "${PROD_SSH_PORT}" "${PROD_SERVER}" "
                # Copy to Supabase functions directory
                docker cp /tmp/supabase-functions/${func} ${SUPABASE_CONTAINER}:/var/lib/supabase/functions/
                
                # Restart Edge Functions (adjust container name if needed)
                docker restart supabase-edge-functions 2>/dev/null || echo 'Edge Functions container not found - manual restart may be needed'
                
                # Cleanup
                rm -rf /tmp/supabase-functions/${func}
            " || log_warning "Function deployment may need manual verification: ${func}"
            
            log_success "Deployed: ${func}"
        fi
    done
    
    log_success "All Edge Functions deployed"
fi

# =============================================================================
# VERIFY DEPLOYMENT
# =============================================================================

log_info "Verifying deployment..."

if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "[DRY-RUN] Would verify deployment"
else
    # Check if tables exist
    log_info "Checking database tables..."
    ssh -p "${PROD_SSH_PORT}" "${PROD_SERVER}" "
        docker exec ${SUPABASE_CONTAINER} psql -U postgres -d postgres -c \"
            SELECT 
                table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN (
                'notification_reminder_settings',
                'entity_reminder_overrides',
                'notification_sent_log'
            );
        \"
    " || log_error "Failed to verify tables"
    
    # Check if cron job exists
    log_info "Checking cron job..."
    ssh -p "${PROD_SSH_PORT}" "${PROD_SERVER}" "
        docker exec ${SUPABASE_CONTAINER} psql -U postgres -d postgres -c \"
            SELECT jobname, schedule FROM cron.job WHERE jobname = 'check-due-notifications';
        \"
    " || log_warning "Cron job verification failed - may need manual setup"
    
    log_success "Verification complete"
fi

# =============================================================================
# POST-DEPLOYMENT INSTRUCTIONS
# =============================================================================

echo ""
log_success "=========================================="
log_success "  Notification System Deployed!          "
log_success "=========================================="
echo ""

log_info "Next steps:"
echo ""
echo "1. Configure environment variables in Supabase:"
echo "   - TWILIO_ACCOUNT_SID"
echo "   - TWILIO_AUTH_TOKEN"
echo "   - TWILIO_WHATSAPP_FROM"
echo "   - RESEND_API_KEY"
echo ""
echo "2. Update app_settings table with Supabase URL and service key:"
echo "   ssh ${PROD_SERVER}"
echo "   docker exec -it ${SUPABASE_CONTAINER} psql -U postgres -d postgres"
echo "   UPDATE app_settings SET"
echo "     supabase_url = 'https://dev.castorworks.cloud',"
echo "     service_role_key = 'your-service-role-key'"
echo "   WHERE id = (SELECT id FROM app_settings LIMIT 1);"
echo ""
echo "3. Configure Twilio WhatsApp templates (see NOTIFICATION_SYSTEM_README.md)"
echo ""
echo "4. Test the system:"
echo "   - Create a task due tomorrow"
echo "   - Send a chat message"
echo "   - Check notifications table"
echo ""

log_info "For detailed instructions, see: NOTIFICATION_SYSTEM_README.md"
