#!/bin/bash
set -e

# Configuration
MIGRATION_FILE="supabase/migrations/20260127203000_fix_auto_assign_trigger.sql"
REMOTE_DIR="/root/supabase-CastorWorks/supabase/migrations"
REMOTE_HOST="root@dev.castorworks.cloud"
SSH_KEY="~/.ssh/castorworks_deploy"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "starting deployment..."

# Check key
if [ ! -f "$SSH_KEY" ]; then
    # Expand tilde if needed, usually shell handles it but in script it might strict
    # In bash ~ works.
    if [ ! -f ~/.ssh/castorworks_deploy ]; then
        echo -e "${RED}Error: SSH Key ~/.ssh/castorworks_deploy not found${NC}"
        exit 1
    fi
    SSH_KEY=~/.ssh/castorworks_deploy
fi

# 1. Upload the migration file
echo -e "${GREEN}Uploading migration file to ${REMOTE_HOST}...${NC}"

# Use strict host checking no to avoid prompts
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no "$MIGRATION_FILE" "${REMOTE_HOST}:${REMOTE_DIR}/"

if [ $? -ne 0 ]; then
    echo -e "${RED}Upload failed.${NC}"
    exit 1
fi

echo -e "${GREEN}Migration file uploaded.${NC}"

# 2. Execute the migration via Docker
echo -e "${GREEN}Executing migration on remote server...${NC}"

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "${REMOTE_HOST}" bash << 'EOF'
set -e
GREEN='\033[0;32m'
NC='\033[0m'

cd /root/supabase-CastorWorks

# Find DB container
DB_CONTAINER=$(docker ps --format '{{.Names}}' | grep 'db' | grep 'supabase' | head -n 1)

if [ -z "$DB_CONTAINER" ]; then
    # Fallback search
    DB_CONTAINER=$(docker ps --format '{{.Names}}' | grep 'db' | head -n 1)
fi

echo "Found DB Container: $DB_CONTAINER"

if [ -z "$DB_CONTAINER" ]; then
    echo "Error: Could not find database container"
    exit 1
fi

MIGRATION_FILE="supabase/migrations/20260127203000_fix_auto_assign_trigger.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "Error: Migration file not found at $PWD/$MIGRATION_FILE"
    exit 1
fi

echo -e "${GREEN}Applying SQL to $DB_CONTAINER...${NC}"

# Pipe the file content into psql inside the container
cat "$MIGRATION_FILE" | docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres

echo -e "${GREEN}Migration applied successfully.${NC}"
EOF
