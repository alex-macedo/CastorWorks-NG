#!/bin/bash

# ========================================
# AI Platform Secrets Setup Script
# ========================================
# This script helps configure Supabase secrets for AI features

set -e

echo "========================================="
echo "AI Platform Secrets Setup"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.ai-platform exists
if [ ! -f .env.ai-platform ]; then
    echo -e "${YELLOW}Warning: .env.ai-platform not found${NC}"
    echo "Please copy .env.ai-platform.example to .env.ai-platform and fill in your API keys"
    echo ""
    echo "Run:"
    echo "  cp .env.ai-platform.example .env.ai-platform"
    echo "  nano .env.ai-platform  # or use your preferred editor"
    echo ""
    exit 1
fi

# Source the AI platform environment variables
export $(cat .env.ai-platform | grep -v '^#' | xargs)

echo "Checking API keys..."
echo ""

# Check Anthropic API Key
if [ -z "$ANTHROPIC_API_KEY" ] || [ "$ANTHROPIC_API_KEY" = "sk-ant-api03-your-key-here" ]; then
    echo -e "${RED}✗ ANTHROPIC_API_KEY not configured${NC}"
    echo "  Get your key from: https://console.anthropic.com/settings/keys"
    MISSING_KEYS=true
else
    echo -e "${GREEN}✓ ANTHROPIC_API_KEY configured${NC}"
fi

# Check OpenAI API Key
if [ -z "$OPENAI_API_KEY" ] || [ "$OPENAI_API_KEY" = "sk-your-openai-key-here" ]; then
    echo -e "${RED}✗ OPENAI_API_KEY not configured${NC}"
    echo "  Get your key from: https://platform.openai.com/api-keys"
    MISSING_KEYS=true
else
    echo -e "${GREEN}✓ OPENAI_API_KEY configured${NC}"
fi

# Check OCR API Key
if [ -z "$OCR_API_KEY" ] || [ "$OCR_API_KEY" = "your-ocr-space-key-here" ]; then
    echo -e "${RED}✗ OCR_API_KEY not configured${NC}"
    echo "  Get your key from: https://ocr.space/ocrapi"
    MISSING_KEYS=true
else
    echo -e "${GREEN}✓ OCR_API_KEY configured${NC}"
fi

echo ""

if [ "$MISSING_KEYS" = true ]; then
    echo -e "${RED}Please configure missing API keys in .env.ai-platform${NC}"
    exit 1
fi

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Error: Supabase CLI not found${NC}"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

echo "========================================="
echo "Setting Supabase Secrets"
echo "========================================="
echo ""

# Set secrets
echo "Setting ANTHROPIC_API_KEY..."
supabase secrets set ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" 2>/dev/null || {
    echo -e "${YELLOW}Note: Make sure you're logged in to Supabase CLI${NC}"
    echo "Run: supabase login"
    exit 1
}

echo "Setting OPENAI_API_KEY..."
supabase secrets set OPENAI_API_KEY="$OPENAI_API_KEY"

echo "Setting OCR_API_KEY..."
supabase secrets set OCR_API_KEY="$OCR_API_KEY"

echo "Setting USE_CLAUDE_AI..."
supabase secrets set USE_CLAUDE_AI="${USE_CLAUDE_AI:-true}"

echo ""
echo -e "${GREEN}✓ All secrets configured successfully!${NC}"
echo ""

# List secrets (without values)
echo "Current secrets:"
supabase secrets list

echo ""
echo "========================================="
echo "Next Steps"
echo "========================================="
echo "1. Create shared AI infrastructure files (run setup-ai-infrastructure.sh)"
echo "2. Create Week 1 database migrations"
echo "3. Deploy Edge Functions"
echo ""
