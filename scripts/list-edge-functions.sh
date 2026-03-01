#!/usr/bin/env bash
set -euo pipefail

# List all deployed Supabase Edge Functions and show their status

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

FUNCTIONS_DIR="/root/supabase-CastorWorks/volumes/functions"
API_URL="http://localhost:8000/functions/v1"

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Deployed Supabase Edge Functions          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

if [ ! -d "$FUNCTIONS_DIR" ]; then
  echo -e "${RED}Functions directory not found: $FUNCTIONS_DIR${NC}"
  exit 1
fi

# Get all function directories (excluding _shared)
mapfile -t functions < <(find "$FUNCTIONS_DIR" -mindepth 1 -maxdepth 1 -type d ! -name "_shared" -exec basename {} \; | sort)

echo -e "${GREEN}Total Functions: ${#functions[@]}${NC}"
echo ""

if [ "$#" -gt 0 ] && [ "$1" = "--test" ]; then
  echo -e "${YELLOW}Testing function endpoints...${NC}"
  echo ""

  for func in "${functions[@]}"; do
    printf "%-40s " "$func"

    response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/$func" \
      -H "Content-Type: application/json" \
      -d '{}' 2>&1 || echo "000")

    http_code=$(echo "$response" | tail -1)

    case "$http_code" in
      200)
        echo -e "${GREEN}✓ OK${NC}"
        ;;
      500)
        echo -e "${YELLOW}⚠ Runtime Error${NC}"
        ;;
      401|403)
        echo -e "${YELLOW}⚠ Auth Required${NC}"
        ;;
      404)
        echo -e "${RED}✗ Not Found${NC}"
        ;;
      *)
        echo -e "${RED}✗ Error ($http_code)${NC}"
        ;;
    esac
  done
else
  # Just list functions
  for func in "${functions[@]}"; do
    # Check if function has index.ts
    if [ -f "$FUNCTIONS_DIR/$func/index.ts" ]; then
      echo -e "  ${GREEN}●${NC} $func"
      echo -e "     ${BLUE}URL:${NC} $API_URL/$func"

      # Check for deno.json
      if [ -f "$FUNCTIONS_DIR/$func/deno.json" ]; then
        echo -e "     ${YELLOW}Config:${NC} deno.json present"
      fi
    else
      echo -e "  ${RED}○${NC} $func ${RED}(missing index.ts)${NC}"
    fi
    echo ""
  done

  echo ""
  echo -e "${BLUE}Usage:${NC}"
  echo "  List functions:     $0"
  echo "  Test all functions: $0 --test"
  echo ""
  echo -e "${BLUE}API Access:${NC}"
  echo "  Base URL: $API_URL"
  echo ""
  echo -e "${BLUE}Example:${NC}"
  echo "  curl -X POST '$API_URL/hello' \\"
  echo "    -H 'Content-Type: application/json' \\"
  echo "    -d '{}'"
fi
