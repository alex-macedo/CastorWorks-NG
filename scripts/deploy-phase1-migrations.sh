#!/bin/bash
# Phase 1 Remediation: Deploy Database Migrations
# Created: 2026-02-02

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}==================================================${NC}"
echo -e "${YELLOW}Phase 1 Remediation - Database Migration Deploy${NC}"
echo -e "${YELLOW}==================================================${NC}"
echo ""

# Check if SSH key exists
if [ ! -f ~/.ssh/castorworks_deploy ]; then
    echo -e "${RED}Error: SSH key not found at ~/.ssh/castorworks_deploy${NC}"
    exit 1
fi

# Migration files to deploy
MIGRATIONS=(
    "20260202000001_create_notifications_table.sql"
    "20260202000002_ensure_project_stakeholders_table.sql"
)

# Copy all migration files to server
echo -e "${YELLOW}Step 1: Copying migration files to server...${NC}"
for migration in "${MIGRATIONS[@]}"; do
    echo -e "  → Copying $migration"
    scp -i ~/.ssh/castorworks_deploy \
        "supabase/migrations/$migration" \
        castorworks:/tmp/ || {
        echo -e "${RED}Failed to copy $migration${NC}"
        exit 1
    }
done
echo -e "${GREEN}✓ All migrations copied successfully${NC}"
echo ""

# Execute migrations in order
echo -e "${YELLOW}Step 2: Executing migrations...${NC}"
for migration in "${MIGRATIONS[@]}"; do
    echo -e "  → Executing $migration"
    ssh -i ~/.ssh/castorworks_deploy castorworks \
        "docker exec -i supabase-db psql -U postgres -d postgres < /tmp/$migration" || {
        echo -e "${RED}Failed to execute $migration${NC}"
        exit 1
    }
    echo -e "${GREEN}✓ $migration completed${NC}"
done
echo ""

# Verify tables created
echo -e "${YELLOW}Step 3: Verifying tables...${NC}"
ssh -i ~/.ssh/castorworks_deploy castorworks \
    "docker exec -i supabase-db psql -U postgres -d postgres -c \"
        SELECT
            table_name,
            (SELECT COUNT(*) FROM pg_policies WHERE tablename = t.table_name) as policies_count
        FROM information_schema.tables t
        WHERE table_name IN ('notifications', 'project_stakeholders')
        AND table_schema = 'public';
    \""

echo ""
echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}Phase 1 Migrations Deployed Successfully!${NC}"
echo -e "${GREEN}==================================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Verify in Supabase dashboard"
echo "  2. Test notifications, stakeholders, and emails with real data"
echo "  3. Frontend components are already integrated -- reload app to verify"
echo ""
