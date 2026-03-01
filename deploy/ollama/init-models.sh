#!/bin/bash
# OLLAMA Model Initialization Script
# Purpose: Download and prepare LLM models for CastorWorks AI features
# Usage: ./init-models.sh [--skip-large]

set -e  # Exit on error

CONTAINER_NAME="castorworks_ollama"
SKIP_LARGE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-large)
      SKIP_LARGE=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--skip-large]"
      exit 1
      ;;
  esac
done

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== OLLAMA Model Initialization ===${NC}"
echo ""

# Check if container is running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
  echo -e "${RED}Error: Container '$CONTAINER_NAME' is not running${NC}"
  echo "Start it with: docker compose -f docker-compose.ollama.yml up -d"
  exit 1
fi

echo -e "${GREEN}✓ Container is running${NC}"
echo ""

# Function to pull a model
pull_model() {
  local model=$1
  local size=$2
  echo -e "${YELLOW}Pulling model: $model (approx. $size)...${NC}"
  if docker exec "$CONTAINER_NAME" ollama pull "$model"; then
    echo -e "${GREEN}✓ Successfully pulled $model${NC}"
    return 0
  else
    echo -e "${RED}✗ Failed to pull $model${NC}"
    return 1
  fi
}

# Function to test a model
test_model() {
  local model=$1
  echo -e "${YELLOW}Testing model: $model...${NC}"
  local response=$(docker exec "$CONTAINER_NAME" ollama run "$model" "Hello" 2>&1 | head -n 1)
  if [ -n "$response" ]; then
    echo -e "${GREEN}✓ Model $model is working${NC}"
    echo "  Response: ${response:0:100}..."
    return 0
  else
    echo -e "${RED}✗ Model $model test failed${NC}"
    return 1
  fi
}

echo "=== Downloading Models ==="
echo ""

# Primary models (recommended for CastorWorks)
echo "--- Primary Models ---"

# Llama 3.1 8B - Fast and efficient, good for analytics
pull_model "llama3.1:8b" "4.7GB"

# Mistral 7B - Good balance of speed and quality
pull_model "mistral:7b" "4.1GB"

# Optional: Larger models (skip with --skip-large)
if [ "$SKIP_LARGE" = false ]; then
  echo ""
  echo "--- Additional Models (Optional) ---"

  # Gemma 2 9B - Google's model, good quality
  pull_model "gemma2:9b" "5.4GB"

  # Note: Uncomment below for even larger models if needed
  # pull_model "llama3.1:70b" "40GB"  # Very large, requires significant resources
fi

echo ""
echo "=== Testing Models ==="
echo ""

# Test each model with a simple prompt
test_model "llama3.1:8b"
test_model "mistral:7b"

if [ "$SKIP_LARGE" = false ]; then
  test_model "gemma2:9b"
fi

echo ""
echo -e "${GREEN}=== Model Initialization Complete ===${NC}"
echo ""

# List all installed models
echo "--- Installed Models ---"
docker exec "$CONTAINER_NAME" ollama list

echo ""
echo -e "${GREEN}OLLAMA is ready to use!${NC}"
echo ""
echo "You can now:"
echo "  1. Enable OLLAMA in CastorWorks Settings → AI Configuration"
echo "  2. Test the connection from the UI"
echo "  3. Start generating AI insights with local models"
echo ""
echo "To add more models later, run:"
echo "  docker exec $CONTAINER_NAME ollama pull <model-name>"
