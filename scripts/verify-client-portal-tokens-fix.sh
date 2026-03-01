#!/bin/bash

# ============================================================================
# SECURITY FIX VERIFICATION SCRIPT
# ============================================================================
# Verifies that the client_portal_tokens security fix has been properly
# deployed to the database
# ============================================================================

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "============================================================================"
echo "Client Portal Tokens Security Fix - Deployment Verification"
echo "============================================================================"
echo ""

# Check if docker is available
if ! command -v docker &> /dev/null; then
    echo -e "${RED}ERROR: Docker is not installed or not in PATH${NC}"
    exit 1
fi

echo -e "${YELLOW}[1/5] Checking Supabase container status...${NC}"
if docker ps | grep -q supabase-db; then
    echo -e "${GREEN}✅ Supabase database container is running${NC}"
else
    echo -e "${RED}❌ Supabase database container is NOT running${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}[2/5] Verifying security functions exist and are SECURITY DEFINER...${NC}"
RESULT=$(docker exec supabase-db psql -U supabase_admin -d postgres -t -c \
    "SELECT COUNT(*) FROM pg_proc WHERE proname IN ('validate_client_portal_token', 'can_manage_client_portal_token') AND prosecdef = TRUE;" \
    2>&1 | tr -d '[:space:]')

if [ "$RESULT" = "2" ]; then
    echo -e "${GREEN}✅ Both security functions exist with SECURITY DEFINER flag${NC}"
    docker exec supabase-db psql -U supabase_admin -d postgres -c \
        "SELECT proname, prosecdef FROM pg_proc WHERE proname IN ('validate_client_portal_token', 'can_manage_client_portal_token') ORDER BY proname;"
else
    echo -e "${RED}❌ Security functions not found or not SECURITY DEFINER${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}[3/5] Verifying hardened RLS policies are in place...${NC}"
POLICIES=$(docker exec supabase-db psql -U supabase_admin -d postgres -t -c \
    "SELECT COUNT(*) FROM pg_policies WHERE tablename = 'client_portal_tokens' AND policyname LIKE 'Only project managers%';" \
    2>&1 | tr -d '[:space:]')

if [ "$POLICIES" -ge "4" ]; then
    echo -e "${GREEN}✅ All 4 hardened RLS policies in place${NC}"
    docker exec supabase-db psql -U supabase_admin -d postgres -c \
        "SELECT policyname, cmd FROM pg_policies WHERE tablename = 'client_portal_tokens' AND policyname LIKE 'Only project managers%' ORDER BY cmd, policyname;"
else
    echo -e "${RED}❌ Expected 4 hardened policies but found ${POLICIES}${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}[4/5] Checking for overly permissive policies (should find none)...${NC}"
PERMISSIVE=$(docker exec supabase-db psql -U supabase_admin -d postgres -t -c \
    "SELECT COUNT(*) FROM pg_policies WHERE tablename = 'client_portal_tokens' AND (policyname LIKE '%users%' AND cmd = 'SELECT') OR (policyname LIKE '%team members%' AND cmd = 'SELECT');" \
    2>&1 | tr -d '[:space:]')

if [ "$PERMISSIVE" = "0" ]; then
    echo -e "${GREEN}✅ No overly permissive policies found${NC}"
else
    echo -e "${RED}❌ Found ${PERMISSIVE} potentially overly permissive policies${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}[5/5] Verifying token table has expiration and active status columns...${NC}"
COLUMNS=$(docker exec supabase-db psql -U supabase_admin -d postgres -t -c \
    "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'client_portal_tokens' AND column_name IN ('expires_at', 'is_active');" \
    2>&1 | tr -d '[:space:]')

if [ "$COLUMNS" = "2" ]; then
    echo -e "${GREEN}✅ Token expiration and active status fields present${NC}"
else
    echo -e "${RED}❌ Token expiration/active status fields not found${NC}"
    exit 1
fi

echo ""
echo "============================================================================"
echo -e "${GREEN}✅ ALL VERIFICATION CHECKS PASSED${NC}"
echo "============================================================================"
echo ""
echo "Security fix is successfully deployed!"
echo ""
echo "Next steps:"
echo "1. Update application code to use validate_client_portal_token() RPC"
echo "2. Audit existing queries accessing client_portal_tokens table"
echo "3. Test token validation in staging environment"
echo "4. Deploy updated application to production"
echo ""
echo "For detailed information, see:"
echo "- SECURITY_FIX_DEPLOYMENT_COMPLETE_CLIENT_PORTAL_TOKENS.md"
echo "- SECURITY_FIX_CLIENT_PORTAL_TOKENS.md"
echo "============================================================================"
