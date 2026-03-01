#!/bin/bash

# Supabase Edge Functions Deployment Helper
# This script helps update secrets and restart Edge Functions in local Docker setup

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUPABASE_DIR="$SCRIPT_DIR/supabase"
ENV_FILE="$SUPABASE_DIR/.env"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Supabase Edge Functions Deployment Helper ===${NC}\n"

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: .env file not found at $ENV_FILE${NC}"
    exit 1
fi

# Function to update or add environment variable
update_env_var() {
    local key=$1
    local value=$2
    
    if grep -q "^${key}=" "$ENV_FILE"; then
        # Update existing key
        sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
        echo -e "${GREEN}✓${NC} Updated $key"
    else
        # Add new key
        echo "${key}=${value}" >> "$ENV_FILE"
        echo -e "${GREEN}✓${NC} Added $key"
    fi
}

# Main menu
echo "What would you like to do?"
echo "1) Set ANTHROPIC_API_KEY"
echo "2) View current secrets"
echo "3) Restart Edge Functions container"
echo "4) View Edge Functions logs"
echo "5) Test AI Chat Assistant function"
echo "6) Exit"
echo ""
read -p "Choose an option (1-6): " choice

        # Run security suite before any deploy operations
        echo "Running security suite..."
        bash scripts/test-security.sh
        echo "Security suite passed. Proceeding with deploy."
case $choice in
    1)
        echo ""
        read -p "Enter your Anthropic API key: " api_key
        update_env_var "ANTHROPIC_API_KEY" "$api_key"
        echo ""
        read -p "Restart Edge Functions container now? (y/n): " restart
        if [ "$restart" = "y" ] || [ "$restart" = "Y" ]; then
            echo -e "${YELLOW}Restarting Edge Functions...${NC}"
            docker compose -f "$SUPABASE_DIR/docker-compose.yml" restart edge-functions 2>/dev/null || \
            docker restart $(docker ps -qf "name=edge-functions") 2>/dev/null || \
            echo -e "${YELLOW}Could not restart automatically. Please restart manually.${NC}"
            echo -e "${GREEN}✓${NC} Done!"
        fi
        ;;
    2)
        echo ""
        echo -e "${YELLOW}Current secrets in .env:${NC}"
        cat "$ENV_FILE" | grep -v "^#" | grep -v "^$"
        ;;
    3)
        echo ""
        echo -e "${YELLOW}Restarting Edge Functions container...${NC}"
        docker compose -f "$SUPABASE_DIR/docker-compose.yml" restart edge-functions 2>/dev/null || \
        docker restart $(docker ps -qf "name=edge-functions") 2>/dev/null || \
        echo -e "${RED}Failed to restart. Check if Docker is running.${NC}"
        echo -e "${GREEN}✓${NC} Done!"
        ;;
    4)
        echo ""
        echo -e "${YELLOW}Edge Functions logs:${NC}"
        docker logs $(docker ps -qf "name=edge-functions") --tail 50
        ;;
    5)
        echo ""
        echo -e "${YELLOW}Testing AI Chat Assistant...${NC}"
        SUPABASE_URL=${SUPABASE_URL:-"http://localhost:54321"}
        ANON_KEY=$(grep "ANON_KEY" "$ENV_FILE" | cut -d '=' -f2)
        
        if [ -z "$ANON_KEY" ]; then
            echo -e "${RED}ANON_KEY not found in .env file${NC}"
            exit 1
        fi
        
        curl -X POST "${SUPABASE_URL}/functions/v1/ai-chat-assistant" \
          -H "Authorization: Bearer ${ANON_KEY}" \
          -H "Content-Type: application/json" \
          -d '{
            "message": "Hello, this is a test",
            "sessionId": "test-'$(date +%s)'",
            "context": {"currentPage": "/"}
          }' | jq '.' || echo -e "\n${YELLOW}Install jq for formatted output: apt install jq${NC}"
        ;;
    6)
        echo "Goodbye!"
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}=== Complete ===${NC}"
