#!/bin/bash

# Deploy Voice Transcription Edge Function
# Usage: ./scripts/deploy-voice-function.sh [project-ref]

set -e

echo "🚀 Deploying Voice Transcription Edge Function"
echo "=============================================="

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install it with:"
    echo "   brew install supabase/tap/supabase"
    exit 1
fi

# Check if function exists
if [ ! -d "supabase/functions/transcribe-voice-input" ]; then
    echo "❌ Function directory not found: supabase/functions/transcribe-voice-input"
    exit 1
fi

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo "⚠️  Not logged in to Supabase. Logging in..."
    supabase login
fi

# Get project ref if provided
PROJECT_REF="${1:-}"

if [ -z "$PROJECT_REF" ]; then
    echo "📋 Available projects:"
    supabase projects list
    echo ""
    read -p "Enter your project reference (or press Enter to use linked project): " PROJECT_REF
fi

# Deploy function
echo ""
echo "📦 Deploying function..."
if [ -n "$PROJECT_REF" ]; then
    supabase functions deploy transcribe-voice-input --project-ref "$PROJECT_REF"
else
    supabase functions deploy transcribe-voice-input
fi

# Verify deployment
echo ""
echo "✅ Verifying deployment..."
supabase functions list ${PROJECT_REF:+--project-ref "$PROJECT_REF"}

echo ""
echo "🔍 Next steps:"
echo "1. Verify OPENAI_API_KEY secret is set in Supabase Dashboard"
echo "2. Test the function in the browser"
echo "3. Monitor logs: supabase functions logs transcribe-voice-input"
echo ""
echo "✨ Deployment complete!"

