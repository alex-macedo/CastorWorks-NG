#!/bin/bash

# =============================================================================
# GitHub Actions Workflow Security Validator
# =============================================================================
# Validates workflows for security best practices
# =============================================================================

set -e

echo "🔒 GitHub Actions Workflow Security Validator"
echo "=============================================="
echo ""

WORKFLOWS_DIR=".github/workflows"
ERRORS=0
WARNINGS=0

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

check_workflow() {
    local file=$1
    local filename=$(basename "$file")
    
    echo "📄 Checking: $filename"
    echo ""
    
    # Check 1: pull_request_target safety
    if grep -q "pull_request_target" "$file"; then
        echo "  ℹ️  Uses pull_request_target - checking safety..."
        
        # Check if it checks out code (dangerous)
        if grep -q "uses: actions/checkout" "$file"; then
            echo -e "  ${RED}❌ SECURITY RISK: Uses pull_request_target with code checkout${NC}"
            echo "     This can execute untrusted code from forks"
            echo "     Consider using pull_request or avoid code checkout"
            ((ERRORS++))
        else
            echo -e "  ${GREEN}✅ Safe: No code checkout with pull_request_target${NC}"
        fi
        
        # Check if permissions are restricted
        if grep -q "permissions:" "$file"; then
            echo -e "  ${GREEN}✅ Has explicit permissions defined${NC}"
        else
            echo -e "  ${YELLOW}⚠️  WARNING: No permissions defined (uses defaults)${NC}"
            ((WARNINGS++))
        fi
    fi
    
    # Check 2: Permissions
    if grep -q "permissions:" "$file"; then
        # Check for overly permissive settings
        if grep -A 2 "permissions:" "$file" | grep -q "write-all"; then
            echo -e "  ${RED}❌ SECURITY RISK: Uses write-all permissions${NC}"
            echo "     Use minimal permissions instead"
            ((ERRORS++))
        fi
        
        # Check for read-all (less severe but not ideal)
        if grep -A 2 "permissions:" "$file" | grep -q "read-all"; then
            echo -e "  ${YELLOW}⚠️  WARNING: Uses read-all permissions${NC}"
            echo "     Consider specifying only needed permissions"
            ((WARNINGS++))
        fi
    else
        echo -e "  ${YELLOW}⚠️  WARNING: No explicit permissions defined${NC}"
        ((WARNINGS++))
    fi
    
    # Check 3: Secrets handling
    if grep -q "\${{ secrets\." "$file"; then
        echo "  ℹ️  Uses secrets - checking usage..."

        # Check if secrets are directly echoed (more specific pattern)
        if grep "echo.*\${{ secrets\." "$file"; then
            echo -e "  ${RED}❌ SECURITY RISK: Secret might be exposed in logs${NC}"
            echo "     Avoid echoing secrets or use ::add-mask::"
            ((ERRORS++))
        else
            echo -e "  ${GREEN}✅ Secrets not directly echoed${NC}"
        fi
    fi
    
    # Check 4: Script injection risks
    if grep -q "\${{ github\." "$file" | grep -v "\${{ github.token }}"; then
        echo "  ℹ️  Uses GitHub context variables..."
        
        # Check for unquoted usage in shell commands
        if grep "run:" "$file" | grep -q "\${{ github\.event\." | grep -v '\".*\${{ github\.event\.'; then
            echo -e "  ${YELLOW}⚠️  WARNING: GitHub event data used in shell commands${NC}"
            echo "     Ensure proper quoting to prevent injection"
            ((WARNINGS++))
        fi
    fi
    
    # Check 5: Third-party actions
    if grep -q "uses: " "$file"; then
        echo "  ℹ️  Checking third-party actions..."
        
        # Count actions without version pins
        UNPINNED=$(grep "uses: " "$file" | grep -v "@v" | grep -v "@main" | grep -v "@master" | grep -v "actions/" | wc -l || echo "0")
        if [ "$UNPINNED" -gt 0 ]; then
            echo -e "  ${YELLOW}⚠️  WARNING: $UNPINNED unpinned third-party actions${NC}"
            echo "     Consider pinning to specific versions"
            ((WARNINGS++))
        fi
        
        # Check for @main or @master (not recommended)
        if grep "uses: " "$file" | grep -q "@main\|@master"; then
            echo -e "  ${YELLOW}⚠️  WARNING: Action pinned to main/master branch${NC}"
            echo "     Use version tags (e.g., @v2) for stability"
            ((WARNINGS++))
        fi
    fi
    
    # Check 6: YAML syntax (basic)
    if ! python3 -c "import yaml; yaml.safe_load(open('$file'))" 2>/dev/null; then
        echo -e "  ${RED}❌ YAML SYNTAX ERROR${NC}"
        ((ERRORS++))
    else
        echo -e "  ${GREEN}✅ Valid YAML syntax${NC}"
    fi
    
    echo ""
}

# Main validation
echo "Checking workflow files in $WORKFLOWS_DIR/"
echo ""

# Check all workflow files
for workflow in "$WORKFLOWS_DIR"/*.yml "$WORKFLOWS_DIR"/*.yaml; do
    [ -f "$workflow" ] || continue
    check_workflow "$workflow"
done

# Summary
echo "=============================================="
echo "📊 Summary:"
echo ""
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All workflows passed security validation!${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Found $WARNINGS warning(s) but no critical errors${NC}"
    echo "Consider addressing warnings for better security posture"
    exit 0
else
    echo -e "${RED}❌ Found $ERRORS error(s) and $WARNINGS warning(s)${NC}"
    echo "Please fix all errors before proceeding"
    exit 1
fi
