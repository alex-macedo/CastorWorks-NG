#!/bin/bash

# Comprehensive Security Prevention System Test
# Demonstrates both failing (insecure) and passing (secure) scenarios

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     🧪 Security Prevention System - Comprehensive Test        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Track test results
TESTS_PASSED=0
TESTS_FAILED=0

# ============================================================================
# Test 1: Insecure Migration Should Be BLOCKED
# ============================================================================

echo -e "${BLUE}${BOLD}Test 1: Insecure Migration Detection${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Testing file: test-insecure-migration.sql"
echo ""
echo -e "${YELLOW}Contains dangerous patterns:${NC}"
echo "  • USING (true) - Line 19"
echo "  • WITH CHECK (true) - Line 25"
echo "  • Policy named 'Anyone can...' - Lines 36, 42"
echo "  • FOR ALL without WITH CHECK - Line 51"
echo ""
echo -e "${BLUE}Running security scanner...${NC}"
echo ""

# Run the scanner - should FAIL (exit code 1)
if node scripts/check-migration-security.js test-insecure-migration.sql 2>&1; then
  echo ""
  echo -e "${RED}${BOLD}❌ Test 1 FAILED${NC}"
  echo -e "${RED}Scanner should have detected violations but passed${NC}"
  TESTS_FAILED=$((TESTS_FAILED + 1))
else
  echo ""
  echo -e "${GREEN}${BOLD}✅ Test 1 PASSED${NC}"
  echo -e "${GREEN}Scanner correctly detected and blocked dangerous patterns${NC}"
  TESTS_PASSED=$((TESTS_PASSED + 1))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ============================================================================
# Test 2: Secure Migration Should PASS
# ============================================================================

echo -e "${BLUE}${BOLD}Test 2: Secure Migration Validation${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Testing file: test-secure-migration.sql"
echo ""
echo -e "${GREEN}Contains secure patterns:${NC}"
echo "  • USING (user_id = auth.uid()) - User-scoped"
echo "  • WITH CHECK (user_id = auth.uid()) - Proper validation"
echo "  • Separate policies for SELECT, INSERT, UPDATE, DELETE"
echo "  • Proper indexes and triggers"
echo ""
echo -e "${BLUE}Running security scanner...${NC}"
echo ""

# Run the scanner - should PASS (exit code 0)
if node scripts/check-migration-security.js test-secure-migration.sql 2>&1; then
  echo ""
  echo -e "${GREEN}${BOLD}✅ Test 2 PASSED${NC}"
  echo -e "${GREEN}Scanner correctly approved secure migration${NC}"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo ""
  echo -e "${RED}${BOLD}❌ Test 2 FAILED${NC}"
  echo -e "${RED}Scanner rejected a secure migration (false positive)${NC}"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ============================================================================
# Test 3: Pre-commit Hook Integration Test
# ============================================================================

echo -e "${BLUE}${BOLD}Test 3: Pre-commit Hook Integration${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Verifying pre-commit hook configuration..."
echo ""

if [ -f "scripts/pre-commit.js" ]; then
  if grep -q "check-migration-security" scripts/pre-commit.js; then
    echo -e "${GREEN}✅ Pre-commit hook includes migration security check${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${RED}❌ Pre-commit hook missing migration security check${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
else
  echo -e "${RED}❌ Pre-commit hook file not found${NC}"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ============================================================================
# Test 4: CI/CD Integration Test
# ============================================================================

echo -e "${BLUE}${BOLD}Test 4: CI/CD Pipeline Integration${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Verifying CI/CD pipeline configuration..."
echo ""

if [ -f ".github/workflows/ci-cd.yml" ]; then
  if grep -q "check-migration-security" .github/workflows/ci-cd.yml; then
    echo -e "${GREEN}✅ CI/CD workflow includes migration security scan${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${RED}❌ CI/CD workflow missing migration security scan${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
else
  echo -e "${RED}❌ CI/CD workflow file not found${NC}"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ============================================================================
# Test 5: Documentation Test
# ============================================================================

echo -e "${BLUE}${BOLD}Test 5: Documentation Availability${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Verifying security documentation..."
echo ""

DOCS_FOUND=0
if [ -f "docs/MIGRATION_TEMPLATE.md" ]; then
  echo -e "${GREEN}✅ Migration template documentation exists${NC}"
  DOCS_FOUND=$((DOCS_FOUND + 1))
else
  echo -e "${RED}❌ Migration template documentation missing${NC}"
fi

if [ -f "docs/SECURITY_PREVENTION.md" ]; then
  echo -e "${GREEN}✅ Security prevention documentation exists${NC}"
  DOCS_FOUND=$((DOCS_FOUND + 1))
else
  echo -e "${RED}❌ Security prevention documentation missing${NC}"
fi

if [ -f "docs/SECURITY_TESTING.md" ]; then
  echo -e "${GREEN}✅ Security testing documentation exists${NC}"
  DOCS_FOUND=$((DOCS_FOUND + 1))
else
  echo -e "${RED}❌ Security testing documentation missing${NC}"
fi

if [ $DOCS_FOUND -eq 3 ]; then
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ============================================================================
# Final Results
# ============================================================================

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                      📊 Test Results Summary                   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Total Tests:  $TOTAL_TESTS"
echo -e "${GREEN}Passed:       $TESTS_PASSED${NC}"
echo -e "${RED}Failed:       $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}${BOLD}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}${BOLD}║  🎉 ALL TESTS PASSED - Security Prevention System Active!    ║${NC}"
  echo -e "${GREEN}${BOLD}╚════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${GREEN}✅ Insecure migrations will be BLOCKED${NC}"
  echo -e "${GREEN}✅ Secure migrations will be APPROVED${NC}"
  echo -e "${GREEN}✅ Pre-commit hooks are configured${NC}"
  echo -e "${GREEN}✅ CI/CD pipeline includes security checks${NC}"
  echo -e "${GREEN}✅ Documentation is available${NC}"
  echo ""
  echo -e "${YELLOW}What this means for your development workflow:${NC}"
  echo ""
  echo "  1. 🛡️  Dangerous RLS patterns are automatically detected"
  echo "  2. 🚫 Git commits with insecure migrations will be blocked"
  echo "  3. ⚠️  CI/CD will reject pull requests with security issues"
  echo "  4. 📚 Developers have templates and guides for secure patterns"
  echo "  5. 🔒 Production is protected from permissive RLS policies"
  echo ""
  echo -e "${BLUE}Next steps:${NC}"
  echo "  • Review docs/MIGRATION_TEMPLATE.md for secure patterns"
  echo "  • Train team on security prevention system"
  echo "  • Use 'npm run precommit' before committing"
  echo "  • Monitor CI/CD for any attempted security violations"
  echo ""
  
  # Cleanup test files
  echo -e "${YELLOW}Cleaning up test files...${NC}"
  rm -f test-insecure-migration.sql test-secure-migration.sql
  echo -e "${GREEN}✅ Test files removed${NC}"
  echo ""
  
  exit 0
else
  echo -e "${RED}${BOLD}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}${BOLD}║        ❌ SOME TESTS FAILED - Action Required                 ║${NC}"
  echo -e "${RED}${BOLD}╚════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${YELLOW}Please review the failures above and ensure:${NC}"
  echo "  • Migration security scanner is working correctly"
  echo "  • Pre-commit hooks are properly configured"
  echo "  • CI/CD pipeline includes security checks"
  echo "  • All documentation is available"
  echo ""
  
  exit 1
fi
