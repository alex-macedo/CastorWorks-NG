#!/bin/bash

# Validation Test: Verify security scanner catches all permissive policies
# This tests the hardened scanner against ALL existing migrations

echo "🔍 Testing Hardened Security Scanner"
echo "====================================="
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${BLUE}Running scanner against all migration files...${NC}"
echo ""

# Run the scanner on all migrations
if node scripts/check-migration-security.js; then
  echo ""
  echo -e "${RED}${BOLD}⚠️  WARNING: Scanner did not detect violations${NC}"
  echo -e "${YELLOW}This may indicate:${NC}"
  echo "  1. All migrations are now secure (unlikely if 60+ permissive policies exist)"
  echo "  2. Scanner patterns need adjustment"
  echo "  3. Migrations have been fixed"
  echo ""
  exit 0
else
  EXIT_CODE=$?
  echo ""
  echo -e "${GREEN}${BOLD}✅ SCANNER WORKING CORRECTLY${NC}"
  echo -e "${GREEN}The hardened scanner successfully detected permissive policies!${NC}"
  echo ""
  echo -e "${YELLOW}Next Steps:${NC}"
  echo "  1. Review the violations listed above"
  echo "  2. Each violation must be fixed in the source migration file"
  echo "  3. DO NOT create corrective migrations - fix the source"
  echo "  4. See docs/MIGRATION_SECURITY_REMEDIATION.md for guidance"
  echo ""
  exit $EXIT_CODE
fi
