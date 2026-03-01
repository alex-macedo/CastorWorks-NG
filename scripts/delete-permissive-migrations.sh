#!/bin/bash

# delete-permissive-migrations.sh
#
# Purpose: Delete migration files containing permissive RLS policies
# After running, commit and push to remove them from Lovable
#
# Usage: bash scripts/delete-permissive-migrations.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

echo -e "${BOLD}${RED}⚠️  MIGRATION FILE DELETION SCRIPT${RESET}"
echo -e "${RED}This will PERMANENTLY DELETE migration files!${RESET}\n"

MIGRATIONS_DIR="supabase/migrations"

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo -e "${RED}Error: Migrations directory not found at $MIGRATIONS_DIR${RESET}"
  exit 1
fi

# Create backup directory
TIMESTAMP=$(date +%Y-%m-%d_%s)
BACKUP_DIR="$MIGRATIONS_DIR/.backup-$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

echo -e "${BLUE}📦 Created backup directory: $BACKUP_DIR${RESET}\n"
echo -e "${BLUE}🔍 Scanning for permissive RLS patterns...${RESET}\n"

# Patterns to search for (using grep)
PATTERNS=(
  "USING.*\(.*true.*\)"
  "WITH CHECK.*\(.*true.*\)"
  "Anyone can"
  "TO authenticated USING.*true"
  "TO public USING"
)

DELETED_COUNT=0
declare -a DELETED_FILES

# Scan each .sql file
for file in "$MIGRATIONS_DIR"/*.sql; do
  [ -e "$file" ] || continue
  
  FILENAME=$(basename "$file")
  HAS_VIOLATION=0
  
  # Check if file contains any dangerous pattern
  for pattern in "${PATTERNS[@]}"; do
    if grep -qi "$pattern" "$file"; then
      HAS_VIOLATION=1
      break
    fi
  done
  
  # If violation found, backup and delete
  if [ $HAS_VIOLATION -eq 1 ]; then
    echo -e "${RED}✗${RESET} Found violations in: $FILENAME"
    
    # Backup
    cp "$file" "$BACKUP_DIR/"
    
    # Delete
    rm "$file"
    
    DELETED_FILES+=("$FILENAME")
    DELETED_COUNT=$((DELETED_COUNT + 1))
  fi
done

echo ""

if [ $DELETED_COUNT -eq 0 ]; then
  echo -e "${GREEN}✅ No permissive policies found. Nothing to delete!${RESET}"
  rm -rf "$BACKUP_DIR"
  exit 0
fi

echo -e "${BOLD}${GREEN}✅ Deletion Complete${RESET}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"

# Summary
echo -e "${BOLD}Summary:${RESET}"
echo -e "  ${RED}•${RESET} Deleted: $DELETED_COUNT migration files"
echo -e "  ${BLUE}•${RESET} Backup: $(basename $BACKUP_DIR)\n"

echo -e "${BOLD}Deleted files:${RESET}"
for file in "${DELETED_FILES[@]}"; do
  echo -e "  ${RED}✗${RESET} $file"
done

echo ""
echo -e "${BOLD}${YELLOW}⚠️  CRITICAL NEXT STEPS:${RESET}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "  1. ${CYAN}Review backup:${RESET} Check $BACKUP_DIR"
echo -e "  2. ${CYAN}Commit changes:${RESET}"
echo -e "     ${BLUE}git add -A${RESET}"
echo -e "     ${BLUE}git commit -m \"Remove $DELETED_COUNT permissive RLS migration files\"${RESET}"
echo -e "  3. ${CYAN}Push to GitHub:${RESET}"
echo -e "     ${BLUE}git push origin main${RESET}"
echo -e "  4. ${CYAN}Lovable will sync${RESET} and remove these migrations"
echo -e "  5. ${CYAN}Generate secure replacement:${RESET}"
echo -e "     ${BLUE}node scripts/generate-corrective-migration.js${RESET}\n"

echo -e "${BOLD}${RED}⚠️  WARNING:${RESET}"
echo -e "${RED}These files are PERMANENTLY DELETED from your local filesystem!${RESET}"
echo -e "${RED}Restore from backup if needed: $(basename $BACKUP_DIR)${RESET}\n"

# List remaining migrations
REMAINING=$(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | wc -l)
if [ $REMAINING -gt 0 ]; then
  echo -e "${BOLD}Remaining migrations ($REMAINING):${RESET}"
  ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | head -10 | while read f; do
    echo -e "  ${GREEN}✓${RESET} $(basename $f)"
  done
  if [ $REMAINING -gt 10 ]; then
    echo -e "  ... and $((REMAINING - 10)) more"
  fi
else
  echo -e "${YELLOW}⚠️  No migration files remain!${RESET}"
  echo -e "${YELLOW}You MUST create a secure replacement migration before pushing.${RESET}"
fi

echo ""
