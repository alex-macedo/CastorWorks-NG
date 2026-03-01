#!/bin/bash

# =============================================================================
# Local CI Check Script
# =============================================================================
# Runs the exact same commands as GitHub Actions CI
# This ensures local development matches CI environment
# =============================================================================

set -e  # Exit on any error

echo "🚀 Running Local CI Checks (matching GitHub Actions)"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to run command with timing and error handling
run_check() {
    local name="$1"
    local command="$2"

    echo -e "\n${BLUE}🔍 $name${NC}"
    echo "   Command: $command"

    if eval "$command"; then
        echo -e "${GREEN}✅ $name PASSED${NC}"
        return 0
    else
        echo -e "${RED}❌ $name FAILED${NC}"
        return 1
    fi
}

# Track overall success
all_passed=true

# ============================================
# 1. Linting (same as CI lint job)
# ============================================
if ! run_check "ESLint" "npm run lint"; then
    all_passed=false
fi

if ! run_check "JSON Validation" "npm run validate:json"; then
    all_passed=false
fi

# ============================================
# 2. Bun Lockfile Sync (Prevent CI failures)
# ============================================
if command -v bun > /dev/null 2>&1 && [ -f "bun.lockb" ]; then
    if ! run_check "Bun Lockfile Sync" "bun install --frozen-lockfile"; then
        echo -e "${YELLOW}💡 Run 'bun install' to update the lockfile${NC}"
        all_passed=false
    fi
else
    echo -e "\n${YELLOW}ℹ️  Bun not installed or bun.lockb missing, skipping sync check${NC}"
fi

# ============================================
# 3. Testing (same as CI test job)
# ============================================
if ! run_check "Unit Tests" "npm run test:run"; then
    all_passed=false
fi

# ============================================
# Summary
# ============================================
echo -e "\n=================================================="

if [ "$all_passed" = true ]; then
    echo -e "${GREEN}🎉 ALL LOCAL CI CHECKS PASSED!${NC}"
    echo -e "${GREEN}✅ Ready to commit and push${NC}"
    echo -e "${GREEN}✅ GitHub Actions CI should also pass${NC}"
    exit 0
else
    echo -e "${RED}💥 SOME LOCAL CI CHECKS FAILED!${NC}"
    echo -e "${RED}❌ Fix the issues above before committing${NC}"
    echo -e "${YELLOW}💡 Run 'npm run ci:check' again after fixing${NC}"
    exit 1
fi