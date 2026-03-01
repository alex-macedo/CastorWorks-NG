#!/bin/bash

# Client Portal - Quick Start Script
# This script helps you generate your first client portal token

echo "🚀 Client Portal - Quick Start"
echo "================================"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "Please create a .env file with your database credentials"
    exit 1
fi

# Load database URL
export $(grep "^DATABASE_URL=" .env | xargs)

if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL not found in .env"
    exit 1
fi

echo "📊 Fetching available projects..."
echo ""

# Get list of projects
psql "$DATABASE_URL" -t -c "SELECT id, name FROM projects ORDER BY name LIMIT 10;" 2>/dev/null

if [ $? -ne 0 ]; then
    echo "❌ Error: Could not connect to database"
    echo "Please check your DATABASE_URL in .env"
    exit 1
fi

echo ""
echo "📝 To generate a token, you have two options:"
echo ""
echo "Option 1: Use the Web Interface (Recommended)"
echo "  1. Start your app: npm run dev"
echo "  2. Navigate to: /client-portal-tokens"
echo "  3. Click 'Generate Token'"
echo "  4. Select a project and set expiry"
echo "  5. Copy the generated URL"
echo ""
echo "Option 2: Use SQL (Advanced)"
echo "  Run this command (replace PROJECT_ID):"
echo ""
echo "  psql \"\$DATABASE_URL\" -c \""
echo "    INSERT INTO client_portal_tokens (project_id, token, expires_at, is_active)"
echo "    VALUES ("
echo "      'YOUR-PROJECT-ID',"
echo "      gen_random_uuid()::text,"
echo "      NOW() + INTERVAL '30 days',"
echo "      true"
echo "    )"
echo "    RETURNING token;"
echo "  \""
echo ""
echo "✅ Database connection successful!"
echo ""
echo "📖 For more information, see:"
echo "   - CLIENT_PORTAL_GUIDE.md"
echo "   - CLIENT_PORTAL_SUMMARY.md"
echo ""
