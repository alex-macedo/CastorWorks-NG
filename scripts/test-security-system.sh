#!/bin/bash

# Test Security Prevention System
# This script demonstrates that the security scanner catches dangerous RLS patterns

echo "🧪 Testing Security Prevention System"
echo "======================================"
echo ""

# Create colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BLUE}Test Setup:${NC}"
echo "Created test-insecure-migration.sql with the following dangerous patterns:"
echo "  1. USING (true) - Allows unrestricted access"
echo "  2. WITH CHECK (true) - Allows unrestricted inserts"
echo "  3. Policy named 'Anyone can...' - Suggests public access"
echo "  4. FOR ALL without WITH CHECK - Missing validation"
echo ""

echo -e "${BLUE}Running migration security scanner...${NC}"
echo "-----------------------------------"
echo ""

# Run the scanner on the test file
if node scripts/check-migration-security.js test-insecure-migration.sql; then
  echo ""
  echo -e "${RED}${BOLD}❌ TEST FAILED${NC}"
  echo -e "${RED}The scanner should have caught the dangerous patterns but it passed!${NC}"
  exit 1
else
  echo ""
  echo -e "${GREEN}${BOLD}✅ TEST PASSED${NC}"
  echo -e "${GREEN}The scanner correctly detected and blocked the dangerous patterns!${NC}"
  echo ""
  echo -e "${YELLOW}What this means:${NC}"
  echo "  ✅ Pre-commit hook will block this migration"
  echo "  ✅ CI/CD pipeline will reject this code"
  echo "  ✅ Dangerous policies cannot reach production"
  echo "  ✅ Security prevention system is working!"
  echo ""
  exit 0
fi
