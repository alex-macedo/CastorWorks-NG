#!/bin/bash
set -e

echo "🔒 Running Security Test Suite..."
echo "================================="
echo ""

EXIT_CODE=0

# Test 1: Scan migration files for security issues
echo "1️⃣  Scanning migration files for dangerous patterns..."
if node scripts/check-migration-security.js; then
  echo "   ✅ PASSED"
else
  echo "   ❌ FAILED"
  EXIT_CODE=1
fi
echo ""

# Test 2: Check for overly permissive RLS policies
echo "1️⃣  Checking for overly permissive RLS policies..."
if node scripts/check-rls-policies.js; then
  echo "   ✅ PASSED"
else
  echo "   ❌ FAILED"
  EXIT_CODE=1
fi
echo ""

# Test 3: Run comprehensive RLS security tests
echo "3️⃣  Running comprehensive RLS security tests..."
if npx vitest run src/__tests__/security/ --reporter=verbose --run; then
  echo "   ✅ PASSED - All security tests passed"
else
  echo "   ❌ FAILED - Security vulnerabilities detected"
  EXIT_CODE=1
fi
echo ""

# Test 4: Validate JSON localization files
echo "4️⃣  Validating JSON configuration files..."
if npm run validate:json; then
  echo "   ✅ PASSED"
else
  echo "   ❌ FAILED"
  EXIT_CODE=1
fi
echo ""

# Test 5: TypeScript compilation check
echo "5️⃣  Verifying TypeScript compilation..."
if npx tsc --noEmit; then
  echo "   ✅ PASSED"
else
  echo "   ❌ FAILED"
  EXIT_CODE=1
fi
echo ""

echo "================================="
if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ All security tests passed!"
else
  echo "❌ Some security tests failed"
  echo "   Please review the errors above and fix them before deploying"
fi
echo ""

exit $EXIT_CODE
