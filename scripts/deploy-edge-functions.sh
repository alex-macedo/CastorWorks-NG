#!/usr/bin/env bash
set -euo pipefail

# Deploy all Supabase Edge Functions to the local Supabase instance
# This script copies functions from supabase/functions/ to the Docker volume
# mounted by the supabase-edge-functions container.

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

SOURCE_DIR="supabase/functions"
TARGET_DIR="/root/supabase-CastorWorks/volumes/functions"
CONTAINER_NAME="supabase-edge-functions"

# Check if source directory exists
if [ ! -d "${SOURCE_DIR}" ]; then
  echo -e "${RED}❌ Source directory '${SOURCE_DIR}' not found.${NC}" >&2
  exit 1
fi

# Check if target directory exists
if [ ! -d "${TARGET_DIR}" ]; then
  echo -e "${RED}❌ Target directory '${TARGET_DIR}' not found.${NC}" >&2
  echo "   Make sure Supabase is running with: ./castorworks.sh start" >&2
  exit 1
fi

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo -e "${YELLOW}⚠️  Warning: Container '${CONTAINER_NAME}' is not running.${NC}" >&2
  echo "   Functions will be copied but won't be available until the container is started." >&2
fi

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Deploying Supabase Edge Functions            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo "   Source: ${SOURCE_DIR}"
echo "   Target: ${TARGET_DIR}"
echo ""

# Find all function directories (excluding _shared)
mapfile -t FUNCTION_DIRS < <(
  find "${SOURCE_DIR}" -mindepth 1 -maxdepth 1 -type d ! -name "_shared" | sort
)

if [ ${#FUNCTION_DIRS[@]} -eq 0 ]; then
  echo -e "${YELLOW}⚠️  No function directories found in ${SOURCE_DIR}${NC}"
  exit 0
fi

echo -e "${GREEN}Found ${#FUNCTION_DIRS[@]} function(s) to deploy:${NC}"
for dir in "${FUNCTION_DIRS[@]}"; do
  func_name=$(basename "${dir}")
  echo "  • ${func_name}"
done
echo ""

# Check if _shared directory exists and copy it first
if [ -d "${SOURCE_DIR}/_shared" ]; then
  echo -e "${YELLOW}📦 Copying shared utilities...${NC}"
  rm -rf "${TARGET_DIR}/_shared"
  cp -r "${SOURCE_DIR}/_shared" "${TARGET_DIR}/_shared"
  echo -e "${GREEN}✅ Copied _shared directory${NC}"
  echo ""
fi

# Deployment counters
SUCCESS_COUNT=0
FAILED_COUNT=0
declare -a FAILED_FUNCTIONS
declare -a DEPLOYED_FUNCTIONS

# Copy each function
for dir in "${FUNCTION_DIRS[@]}"; do
  func_name=$(basename "${dir}")

  echo -e "${YELLOW}📦 Deploying: ${func_name}${NC}"

  # Check if index.ts exists
  if [ ! -f "${dir}/index.ts" ]; then
    echo -e "${YELLOW}   ⚠️  Skipping: no index.ts found${NC}"
    echo ""
    continue
  fi

  # Remove existing function directory if it exists
  if [ -d "${TARGET_DIR}/${func_name}" ]; then
    rm -rf "${TARGET_DIR}/${func_name}"
  fi

  # Copy the function directory
  if cp -r "${dir}" "${TARGET_DIR}/${func_name}"; then
    # Set proper permissions
    chmod -R 755 "${TARGET_DIR}/${func_name}"
    echo -e "${GREEN}   ✅ Successfully deployed${NC}"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    DEPLOYED_FUNCTIONS+=("${func_name}")
  else
    echo -e "${RED}   ❌ Failed to copy${NC}"
    FAILED_COUNT=$((FAILED_COUNT + 1))
    FAILED_FUNCTIONS+=("${func_name}")
  fi
  echo ""
done

echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Deployment Summary${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo "   Total functions: ${#FUNCTION_DIRS[@]}"
echo -e "   ${GREEN}Successfully deployed: ${SUCCESS_COUNT}${NC}"
if [ ${FAILED_COUNT} -gt 0 ]; then
  echo -e "   ${RED}Failed: ${FAILED_COUNT}${NC}"
fi
echo ""

if [ ${FAILED_COUNT} -gt 0 ]; then
  echo -e "${RED}❌ Failed functions:${NC}"
  for func in "${FAILED_FUNCTIONS[@]}"; do
    echo "   • ${func}"
  done
  echo ""
  exit 1
fi

# Restart edge functions container to pick up changes
if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo -e "${YELLOW}🔄 Restarting edge functions container...${NC}"
  if docker restart "${CONTAINER_NAME}" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Container restarted successfully${NC}"
  else
    echo -e "${YELLOW}⚠️  Failed to restart container. You may need to restart it manually.${NC}"
  fi
  echo ""
fi

echo -e "${GREEN}🎉 All edge functions deployed successfully!${NC}"
echo ""
echo -e "${BLUE}Deployed functions are now available at:${NC}"
echo "   http://localhost:54321/functions/v1/<function-name>"
echo ""
echo -e "${BLUE}Example:${NC}"
if [ ${#DEPLOYED_FUNCTIONS[@]} -gt 0 ]; then
  echo "   curl -i --location --request POST 'http://localhost:54321/functions/v1/${DEPLOYED_FUNCTIONS[0]}' \\"
  echo "     --header 'Authorization: Bearer YOUR_ANON_KEY' \\"
  echo "     --header 'Content-Type: application/json' \\"
  echo "     --data '{\"name\":\"Functions\"}'"
fi
