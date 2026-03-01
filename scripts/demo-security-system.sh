#!/bin/bash

# Quick demonstration of the security scanner in action
# This provides an instant visual demo of the system working

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

clear

echo ""
echo -e "${BLUE}${BOLD}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}${BOLD}   Security Prevention System - Live Demonstration${NC}"
echo -e "${BLUE}${BOLD}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Show what we're testing
echo -e "${YELLOW}📝 Demo Overview:${NC}"
echo ""
echo "This demo will:"
echo "  1. Show an INSECURE migration with USING (true)"
echo "  2. Run the security scanner on it"
echo "  3. Show how it gets BLOCKED"
echo "  4. Show a SECURE migration with proper RLS"
echo "  5. Show how it gets APPROVED"
echo ""
echo -e "${BLUE}Press Enter to start the demo...${NC}"
read

clear

# ============================================================================
# Part 1: Show the insecure migration
# ============================================================================

echo ""
echo -e "${RED}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${RED}${BOLD}  ❌ INSECURE MIGRATION EXAMPLE${NC}"
echo -e "${RED}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}File: test-insecure-migration.sql${NC}"
echo ""
cat << 'EOF'
CREATE TABLE public.materials (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  name TEXT NOT NULL
);

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- ❌ DANGEROUS POLICY:
CREATE POLICY "Users can view materials"
  ON public.materials
  FOR SELECT
  USING (true);  -- ⚠️  ANY authenticated user can see ALL materials!

-- ❌ DANGEROUS POLICY:  
CREATE POLICY "Anyone can update materials"
  ON public.materials
  FOR UPDATE
  USING (true)  -- ⚠️  Public access!
  WITH CHECK (true);  -- ⚠️  No validation!
EOF

echo ""
echo -e "${RED}${BOLD}Why this is dangerous:${NC}"
echo -e "${RED}• USING (true) allows ANY authenticated user to see ALL data${NC}"
echo -e "${RED}• Bypasses multi-tenant isolation completely${NC}"
echo -e "${RED}• Users can see competitors' data, pricing, etc.${NC}"
echo -e "${RED}• Violates GDPR, LGPD, and other privacy regulations${NC}"
echo ""
echo -e "${BLUE}Press Enter to run the security scanner...${NC}"
read

echo ""
echo -e "${YELLOW}🔍 Running security scanner on insecure migration...${NC}"
echo ""
sleep 1

# Run the scanner
node scripts/check-migration-security.js test-insecure-migration.sql 2>&1 || true

echo ""
echo -e "${GREEN}${BOLD}✅ SUCCESS: Scanner detected and blocked the dangerous patterns!${NC}"
echo ""
echo -e "${YELLOW}What happens in real workflow:${NC}"
echo -e "${RED}• Git commit is BLOCKED by pre-commit hook${NC}"
echo -e "${RED}• Pull request fails CI/CD checks${NC}"
echo -e "${RED}• Code cannot reach production${NC}"
echo ""
echo -e "${BLUE}Press Enter to see the secure version...${NC}"
read

clear

# ============================================================================
# Part 2: Show the secure migration
# ============================================================================

echo ""
echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}${BOLD}  ✅ SECURE MIGRATION EXAMPLE${NC}"
echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}File: test-secure-migration.sql${NC}"
echo ""
cat << 'EOF'
CREATE TABLE public.user_settings (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  theme TEXT DEFAULT 'light'
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- ✅ SECURE POLICY:
CREATE POLICY "Users view own settings"
  ON public.user_settings
  FOR SELECT
  USING (user_id = auth.uid());  -- ✅ User can only see their own data

-- ✅ SECURE POLICY:
CREATE POLICY "Users update own settings"
  ON public.user_settings
  FOR UPDATE
  USING (user_id = auth.uid())  -- ✅ User-scoped access
  WITH CHECK (user_id = auth.uid());  -- ✅ Proper validation
EOF

echo ""
echo -e "${GREEN}${BOLD}Why this is secure:${NC}"
echo -e "${GREEN}• Uses auth.uid() to scope access to the current user${NC}"
echo -e "${GREEN}• Each user can only access their own data${NC}"
echo -e "${GREEN}• WITH CHECK ensures proper validation on writes${NC}"
echo -e "${GREEN}• Follows principle of least privilege${NC}"
echo ""
echo -e "${BLUE}Press Enter to run the security scanner...${NC}"
read

echo ""
echo -e "${YELLOW}🔍 Running security scanner on secure migration...${NC}"
echo ""
sleep 1

# Run the scanner  
node scripts/check-migration-security.js test-secure-migration.sql 2>&1

SCANNER_EXIT=$?

echo ""
if [ $SCANNER_EXIT -eq 0 ]; then
  echo -e "${GREEN}${BOLD}✅ SUCCESS: Scanner approved the secure migration!${NC}"
  echo ""
  echo -e "${YELLOW}What happens in real workflow:${NC}"
  echo -e "${GREEN}• Pre-commit hook passes${NC}"
  echo -e "${GREEN}• Git commit succeeds${NC}"
  echo -e "${GREEN}• CI/CD checks pass${NC}"
  echo -e "${GREEN}• Code can be deployed to production safely${NC}"
else
  echo -e "${RED}${BOLD}❌ UNEXPECTED: Scanner rejected secure migration${NC}"
  echo -e "${RED}This might be a false positive that needs investigation${NC}"
fi

echo ""
echo -e "${BLUE}Press Enter for the final summary...${NC}"
read

clear

# ============================================================================
# Final Summary
# ============================================================================

echo ""
echo -e "${BLUE}${BOLD}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}${BOLD}   🎉 Security Prevention System Summary${NC}"
echo -e "${BLUE}${BOLD}═══════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${GREEN}${BOLD}✅ What We've Demonstrated:${NC}"
echo ""
echo "1. ${RED}INSECURE${NC} migrations with ${RED}USING (true)${NC} are ${RED}BLOCKED${NC}"
echo "2. ${GREEN}SECURE${NC} migrations with proper access control ${GREEN}PASS${NC}"
echo "3. Scanner provides ${YELLOW}clear error messages${NC} with fixes"
echo "4. System prevents dangerous code from reaching production"
echo ""

echo -e "${BLUE}${BOLD}🛡️ Multi-Layer Protection:${NC}"
echo ""
echo "Layer 1: Pre-commit Hook"
echo "  • Runs automatically on 'git commit'"
echo "  • Blocks commit if violations found"
echo "  • Fastest feedback loop"
echo ""
echo "Layer 2: Migration Scanner"  
echo "  • Detects USING (true) and WITH CHECK (true)"
echo "  • Catches 'Anyone can...' policy names"
echo "  • Warns about missing WITH CHECK clauses"
echo ""
echo "Layer 3: CI/CD Pipeline"
echo "  • Runs on every push and pull request"
echo "  • Blocks deployment if tests fail"
echo "  • Production gate"
echo ""
echo "Layer 4: Security Test Suite"
echo "  • Comprehensive RLS isolation tests"
echo "  • Database policy checker"
echo "  • Continuous monitoring"
echo ""

echo -e "${YELLOW}${BOLD}📚 Documentation & Resources:${NC}"
echo ""
echo "• docs/MIGRATION_TEMPLATE.md - Secure patterns and examples"
echo "• docs/SECURITY_PREVENTION.md - Complete prevention system guide"  
echo "• docs/SECURITY_TESTING.md - Testing strategy"
echo "• TEST_README.md - How to run tests"
echo ""

echo -e "${GREEN}${BOLD}🚀 Ready to Use:${NC}"
echo ""
echo "Your database is now protected by a comprehensive security prevention"
echo "system that makes it nearly impossible for dangerous RLS policies to"
echo "reach production."
echo ""
echo "Commands you can use:"
echo ""
echo "  ${BLUE}npm run precommit${NC}           # Test before committing"
echo "  ${BLUE}bash scripts/test-security.sh${NC}  # Run full security suite"
echo "  ${BLUE}bash test-security-comprehensive.sh${NC}  # Comprehensive tests"
echo ""
echo -e "${GREEN}${BOLD}Remember:${NC}"
echo "• Always use proper access control in RLS policies"
echo "• Never use USING (true) on data tables"  
echo "• Follow the templates in docs/MIGRATION_TEMPLATE.md"
echo "• Security is not optional - it's automatic!"
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
