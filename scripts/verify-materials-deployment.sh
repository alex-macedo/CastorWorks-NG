#!/bin/bash
# Quick Deployment Verification Script
# Run this to check if the materials system is properly deployed

echo "🔍 CastorWorks Materials System - Deployment Verification"
echo "=========================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found${NC}"
    echo "   Create .env file with DATABASE_URL"
    exit 1
fi

# Load DATABASE_URL from .env
export $(grep -v '^#' .env | xargs)

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL not set in .env${NC}"
    echo "   Add: DATABASE_URL=postgresql://postgres:***@host:port/postgres"
    exit 1
fi

echo -e "${GREEN}✓${NC} Database connection configured"
echo ""

# Test 1: Check if table exists
echo "📊 Test 1: Checking project_materials table..."
TABLE_EXISTS=$(psql "$DATABASE_URL" -tAc "SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'project_materials');" 2>/dev/null)

if [ "$TABLE_EXISTS" = "t" ]; then
    echo -e "${GREEN}✓${NC} Table exists"
    
    # Check column count
    COL_COUNT=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'project_materials';" 2>/dev/null)
    if [ "$COL_COUNT" = "14" ]; then
        echo -e "${GREEN}✓${NC} All 14 columns present (includes factor, tgfa_applicable)"
    else
        echo -e "${YELLOW}⚠${NC}  Found $COL_COUNT columns (expected 14)"
    fi
else
    echo -e "${RED}❌ Table does not exist${NC}"
    echo "   Run: psql \"\$DATABASE_URL\" -f supabase/migrations/20251214000000_add_factor_columns_to_project_materials.sql"
    exit 1
fi
echo ""

# Test 2: Check RLS policies
echo "🔒 Test 2: Checking RLS policies..."
RLS_ENABLED=$(psql "$DATABASE_URL" -tAc "SELECT rowsecurity FROM pg_tables WHERE tablename = 'project_materials';" 2>/dev/null)

if [ "$RLS_ENABLED" = "t" ]; then
    echo -e "${GREEN}✓${NC} RLS enabled"
    
    POLICY_COUNT=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM pg_policies WHERE tablename = 'project_materials';" 2>/dev/null)
    if [ "$POLICY_COUNT" = "4" ]; then
        echo -e "${GREEN}✓${NC} All 4 RLS policies present"
    else
        echo -e "${YELLOW}⚠${NC}  Found $POLICY_COUNT policies (expected 4)"
    fi
else
    echo -e "${RED}❌ RLS not enabled${NC}"
fi
echo ""

# Test 3: Check template materials
echo "📦 Test 3: Checking template materials..."
TEMPLATE_COUNT=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM project_materials WHERE project_id = '00000000-0000-0000-0000-000000000000';" 2>/dev/null)

if [ "$TEMPLATE_COUNT" = "89" ]; then
    echo -e "${GREEN}✓${NC} All 89 template materials present"
    
    # Check TGFA items
    TGFA_COUNT=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM project_materials WHERE project_id = '00000000-0000-0000-0000-000000000000' AND tgfa_applicable = true;" 2>/dev/null)
    echo -e "${GREEN}✓${NC} $TGFA_COUNT TGFA-applicable items"
    
    # Check categories
    CATEGORY_COUNT=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(DISTINCT group_name) FROM project_materials WHERE project_id = '00000000-0000-0000-0000-000000000000';" 2>/dev/null)
    echo -e "${GREEN}✓${NC} $CATEGORY_COUNT material categories"
    
elif [ "$TEMPLATE_COUNT" = "0" ]; then
    echo -e "${RED}❌ No template materials found${NC}"
    echo "   Run: psql \"\$DATABASE_URL\" -f supabase/migrations/20251214000001_seed_template_materials.sql"
    exit 1
else
    echo -e "${YELLOW}⚠${NC}  Found $TEMPLATE_COUNT template materials (expected 89)"
    echo "   You may need to re-run the seed migration"
fi
echo ""

# Test 4: Check specific test cases
echo "🧪 Test 4: Validating sample materials..."
PEDREIRO=$(psql "$DATABASE_URL" -tAc "SELECT tgfa_applicable, price_per_unit FROM project_materials WHERE project_id = '00000000-0000-0000-0000-000000000000' AND description = 'Pedreiro';" 2>/dev/null)
if echo "$PEDREIRO" | grep -q "t|850"; then
    echo -e "${GREEN}✓${NC} Pedreiro: TGFA-applicable, R\$ 850/m²"
else
    echo -e "${YELLOW}⚠${NC}  Pedreiro validation failed"
fi

APROVACAO=$(psql "$DATABASE_URL" -tAc "SELECT tgfa_applicable, factor, price_per_unit FROM project_materials WHERE project_id = '00000000-0000-0000-0000-000000000000' AND description = 'Aprovação Condomínio';" 2>/dev/null)
if echo "$APROVACAO" | grep -q "f|1|500"; then
    echo -e "${GREEN}✓${NC} Aprovação Condomínio: Non-TGFA, factor=1, R\$ 500"
else
    echo -e "${YELLOW}⚠${NC}  Aprovação Condomínio validation failed"
fi
echo ""

# Test 5: Check frontend files
echo "💻 Test 5: Checking frontend files..."
if [ -f "src/hooks/useTemplateMaterialsDuplication.tsx" ]; then
    echo -e "${GREEN}✓${NC} Hook file exists"
    
    # Check for key functions
    if grep -q "checkAndDuplicateMaterials" src/hooks/useTemplateMaterialsDuplication.tsx; then
        echo -e "${GREEN}✓${NC} Duplication logic present"
    fi
    
    if grep -q "Summary row" src/hooks/useTemplateMaterialsDuplication.tsx; then
        echo -e "${GREEN}✓${NC} Summary row calculation present"
    fi
else
    echo -e "${RED}❌ Hook file missing${NC}"
fi

if grep -q "useTemplateMaterialsDuplication" src/pages/Projects.tsx; then
    echo -e "${GREEN}✓${NC} Hook imported in Projects.tsx"
else
    echo -e "${YELLOW}⚠${NC}  Hook not imported in Projects.tsx"
fi
echo ""

# Summary
echo "=========================================================="
echo "📋 Deployment Summary"
echo "=========================================================="
echo ""

if [ "$TABLE_EXISTS" = "t" ] && [ "$RLS_ENABLED" = "t" ] && [ "$TEMPLATE_COUNT" = "89" ]; then
    echo -e "${GREEN}✅ All critical checks passed!${NC}"
    echo ""
    echo "🎯 Next Steps:"
    echo "   1. Start/restart dev server: ./castorworks.sh restart"
    echo "   2. Access application: http://localhost:5173"
    echo "   3. Create test project with TGFA = 200"
    echo "   4. Verify 90 materials created (89 + 1 summary)"
    echo ""
    echo "📖 Documentation:"
    echo "   - Implementation: docs/PROJECT_MATERIALS_IMPLEMENTATION.md"
    echo "   - Testing Guide: docs/DEPLOYMENT_CHECKLIST_MATERIALS.md"
    echo ""
else
    echo -e "${RED}❌ Deployment incomplete${NC}"
    echo ""
    echo "🔧 Required Actions:"
    
    if [ "$TABLE_EXISTS" != "t" ]; then
        echo "   1. Apply table migration:"
        echo "      psql \"\$DATABASE_URL\" -f supabase/migrations/20251214000000_add_factor_columns_to_project_materials.sql"
    fi
    
    if [ "$TEMPLATE_COUNT" = "0" ]; then
        echo "   2. Apply seed migration:"
        echo "      psql \"\$DATABASE_URL\" -f supabase/migrations/20251214000001_seed_template_materials.sql"
    fi
    
    echo ""
fi

exit 0
