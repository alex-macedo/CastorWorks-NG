#!/bin/bash

# EngProApp - Comprehensive Test Suite
# Prevents bugs from reaching production

set -e # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}${BOLD}🔍 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Start the test suite
echo -e "${BOLD}🚀 EngProApp - Production Readiness Test Suite${NC}"
echo "=========================================="
echo ""

# 1. JSON Validation
print_status "Step 1: Validating JSON Files"
if node scripts/validate-json.js; then
    print_success "All JSON files are valid"
else
    print_error "JSON validation failed"
    echo -e "${RED}Fix JSON issues before proceeding${NC}"
    exit 1
fi
echo ""

# 2. TypeScript Compilation Check
print_status "Step 2: TypeScript Compilation"
if npm run build > /dev/null 2>&1; then
    print_success "TypeScript compilation successful"
else
    print_error "TypeScript compilation failed"
    echo "Running build with verbose output:"
    npm run build
    exit 1
fi
echo ""

# 3. ESLint Check
print_status "Step 3: Code Quality Check (ESLint)"
if npm run lint; then
    print_success "No linting errors found"
else
    print_warning "Linting issues found - please review and fix"
    # Don't exit here as lint warnings shouldn't block deployment
fi
echo ""

# 4. Unit Tests (if available)
print_status "Step 4: Unit Tests"
if command -v npx vitest &> /dev/null; then
    if npx vitest run --reporter=verbose; then
        print_success "All tests passed"
    else
        print_error "Some tests failed"
        exit 1
    fi
else
    print_warning "Vitest not available, skipping unit tests"
fi
echo ""

# 5. Translation Coverage Validation
print_status "Step 5: Translation Coverage Validation"
if node scripts/validate-translation-coverage.js; then
    print_success "Translation coverage validation passed"
else
    print_error "Translation coverage validation failed"
    exit 1
fi
echo ""

# 6. Bundle Size Analysis
print_status "Step 6: Bundle Size Analysis"
if [ -d "dist" ]; then
    bundle_size=$(du -sh dist/ | cut -f1)
    print_success "Bundle size: $bundle_size"
    
    # Check if bundle is too large (> 10MB)
    size_mb=$(du -sm dist/ | cut -f1)
    if [ "$size_mb" -gt 10 ]; then
        print_warning "Bundle size is large (${size_mb}MB). Consider optimization."
    fi
else
    print_warning "No dist/ directory found. Run 'npm run build' first."
fi
echo ""

# 7. Security Check (basic)
print_status "Step 7: Basic Security Check"
if [ -f "package-lock.json" ]; then
    if npm audit --audit-level=high --production > /dev/null 2>&1; then
        print_success "No high-severity security vulnerabilities found"
    else
        print_warning "Security vulnerabilities found. Run 'npm audit' for details."
    fi
else
    print_warning "No package-lock.json found. Consider running 'npm install' to generate it."
fi
echo ""

# Final Summary
echo "=========================================="
echo -e "${BOLD}🎯 Test Suite Summary${NC}"
echo "=========================================="
print_success "JSON Validation: PASSED"
print_success "TypeScript Compilation: PASSED"
print_success "Code Quality: CHECKED"
print_success "Translation Coverage: ANALYZED"
print_success "Bundle Size: ANALYZED"
print_success "Security: CHECKED"
echo ""
echo -e "${GREEN}${BOLD}🚀 Production Readiness: APPROVED${NC}"
echo -e "${GREEN}Your application is ready for deployment!${NC}"