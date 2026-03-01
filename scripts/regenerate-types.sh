#!/bin/bash

# Script to regenerate Supabase TypeScript types
# Usage: ./scripts/regenerate-types.sh

set -e

echo "🔄 Regenerating Supabase TypeScript types..."

# Try local first (if Supabase is running locally)
if command -v supabase &> /dev/null; then
  echo "Attempting to generate types from local Supabase instance..."
  if supabase gen types typescript --local > src/integrations/supabase/types.ts 2>/dev/null; then
    echo "✅ Types generated from local instance"
    exit 0
  fi
  
  echo "⚠️  Local generation failed, trying remote..."
  if supabase gen types typescript > src/integrations/supabase/types.ts 2>/dev/null; then
    echo "✅ Types generated from remote instance"
    exit 0
  fi
fi

echo "❌ Failed to generate types. Please ensure:"
echo "   1. Supabase CLI is installed: npm install -g supabase"
echo "   2. You're linked to your project: supabase link"
echo "   3. Or run manually: supabase gen types typescript > src/integrations/supabase/types.ts"
exit 1
