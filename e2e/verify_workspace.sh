#!/bin/bash
set -e

# Load env
ACCOUNT_TEST_EMAIL=$(sed -n 's/^ACCOUNT_TEST_EMAIL=//p' .env.testing | tr -d '\r')
ACCOUNT_TEST_EMAIL_PASSWORD=$(sed -n 's/^ACCOUNT_TEST_EMAIL_PASSWORD=//p' .env.testing | sed 's/^"//;s/"$//' | tr -d '\r')
BASE_URL="http://localhost:5173"

SESSION="verify-workspace-$(date +%s)"

echo "🚀 Starting verification on $BASE_URL"

# 1. Login
echo "🔑 Logging in..."
agent-browser --session "$SESSION" open "$BASE_URL/login"
agent-browser --session "$SESSION" wait 2000
agent-browser --session "$SESSION" fill '#email' "$ACCOUNT_TEST_EMAIL"
agent-browser --session "$SESSION" fill '#password' "$ACCOUNT_TEST_EMAIL_PASSWORD"
agent-browser --session "$SESSION" click 'button[type=submit]'
agent-browser --session "$SESSION" wait 3000

# Check if we are on dashboard or projects
CURRENT_URL=$(agent-browser --session "$SESSION" get url)
echo "📍 Current URL: $CURRENT_URL"

# 2. Navigate to /chat
echo "💬 Navigating to /chat..."
agent-browser --session "$SESSION" open "$BASE_URL/chat"
agent-browser --session "$SESSION" wait 2000

# Handle redirect to projects
CURRENT_URL=$(agent-browser --session "$SESSION" get url)
if [[ "$CURRENT_URL" == *"/projects"* ]]; then
  echo "📁 Redirected to projects, selecting first project..."
  agent-browser --session "$SESSION" click 'a[href*="/projects/"]'
  agent-browser --session "$SESSION" wait 2000
  echo "💬 Retrying /chat..."
  agent-browser --session "$SESSION" open "$BASE_URL/chat"
  agent-browser --session "$SESSION" wait 2000
fi

# Verify header
HEADER_TEXT=$(agent-browser --session "$SESSION" get text 'h1')
echo "✅ Header text: $HEADER_TEXT"

# Take screenshot
mkdir -p test-results
agent-browser --session "$SESSION" screenshot test-results/verify-chat.png --full

# 3. Navigate to /communicationlog
echo "📋 Navigating to /communicationlog..."
agent-browser --session "$SESSION" open "$BASE_URL/communicationlog"
agent-browser --session "$SESSION" wait 2000

HEADER_TEXT=$(agent-browser --session "$SESSION" get text 'h1')
echo "✅ Header text: $HEADER_TEXT"

agent-browser --session "$SESSION" screenshot test-results/verify-comm-log.png --full

echo "🏁 Verification complete!"
agent-browser --session "$SESSION" close
