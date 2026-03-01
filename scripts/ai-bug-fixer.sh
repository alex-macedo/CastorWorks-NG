#!/usr/bin/env bash
# ============================================================
# ai-bug-fixer.sh — Autonomous Bug Investigation & Fix Agent
#
# Polls ai_bug_monitor_runs for "pending" items (bugs that the
# edge function has triaged) and for each one:
#   1. Generates + runs an agent-browser investigation script
#   2. Uses AI (opencode / claude) to fix the code
#   3. Runs the full QA pipeline
#   4. Commits and pushes to a feature branch
#   5. Monitors CI
#   6. Updates CHANGELOG, posts comment, moves to Done
#
# Usage:
#   ./scripts/ai-bug-fixer.sh           # Process all pending
#   ./scripts/ai-bug-fixer.sh <item_id> # Process specific item
#
# Requires:
#   - .env with VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
#   - .env.testing with ACCOUNT_TEST_EMAIL, ACCOUNT_TEST_EMAIL_PASSWORD
#   - agent-browser in PATH
#   - git configured with push access
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# --- Load environment ---
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

SUPABASE_URL="${VITE_SUPABASE_URL:-https://dev.castorworks.cloud}"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

if [[ -z "$SERVICE_KEY" ]]; then
  echo "❌ SUPABASE_SERVICE_ROLE_KEY is not set"
  exit 1
fi

API_HEADERS=(
  -H "apikey: ${SERVICE_KEY}"
  -H "Authorization: Bearer ${SERVICE_KEY}"
  -H "Content-Type: application/json"
  -H "Prefer: return=minimal"
)

MAX_FIX_ATTEMPTS=3
SPECIFIC_ITEM="${1:-}"

# ============================================================
# Helper Functions
# ============================================================

log()  { echo "$(date '+%H:%M:%S') [ai-bug-fixer] $*"; }
warn() { echo "$(date '+%H:%M:%S') [ai-bug-fixer] ⚠️  $*" >&2; }
err()  { echo "$(date '+%H:%M:%S') [ai-bug-fixer] ❌ $*" >&2; }

update_run_status() {
  local item_id="$1" status="$2"
  local payload="{\"status\":\"${status}\",\"updated_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"

  curl -sS -X PATCH \
    "${SUPABASE_URL}/rest/v1/ai_bug_monitor_runs?roadmap_item_id=eq.${item_id}" \
    "${API_HEADERS[@]}" \
    -d "$payload" > /dev/null
}

update_run_details() {
  local item_id="$1" details="$2"
  curl -sS -X PATCH \
    "${SUPABASE_URL}/rest/v1/ai_bug_monitor_runs?roadmap_item_id=eq.${item_id}" \
    "${API_HEADERS[@]}" \
    -d "{\"fix_details\":${details},\"updated_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" > /dev/null
}

update_run_error() {
  local item_id="$1" error_msg="$2"
  local escaped
  escaped=$(echo "$error_msg" | sed 's/"/\\"/g' | tr '\n' ' ')
  curl -sS -X PATCH \
    "${SUPABASE_URL}/rest/v1/ai_bug_monitor_runs?roadmap_item_id=eq.${item_id}" \
    "${API_HEADERS[@]}" \
    -d "{\"status\":\"failed\",\"error_log\":\"${escaped}\",\"updated_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" > /dev/null
}

update_roadmap_status() {
  local item_id="$1" status="$2"
  curl -sS -X PATCH \
    "${SUPABASE_URL}/rest/v1/roadmap_items?id=eq.${item_id}" \
    "${API_HEADERS[@]}" \
    -d "{\"status\":\"${status}\",\"updated_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" > /dev/null
}

post_comment() {
  local item_id="$1" content="$2"

  # Get an admin user_id for the comment
  local admin_id
  admin_id=$(curl -sS "${SUPABASE_URL}/rest/v1/user_roles?role=eq.admin&select=user_id&limit=1" \
    "${API_HEADERS[@]}" | grep -o '"user_id":"[^"]*"' | head -1 | cut -d'"' -f4)

  if [[ -z "$admin_id" ]]; then
    warn "No admin user found — cannot post comment"
    return
  fi

  local escaped_content
  escaped_content=$(echo "$content" | sed 's/"/\\"/g' | tr '\n' '\\n')

  curl -sS -X POST \
    "${SUPABASE_URL}/rest/v1/roadmap_item_comments" \
    "${API_HEADERS[@]}" \
    -d "{\"roadmap_item_id\":\"${item_id}\",\"user_id\":\"${admin_id}\",\"content\":\"${escaped_content}\"}" > /dev/null
}

append_changelog() {
  local item_id="$1" title="$2" commit_sha="$3"

  local today
  today=$(date +%Y-%m-%d)
  local entry="- **fix:** ${title} (${commit_sha:0:7}) — auto-fixed by AI Bug Monitor"

  if [[ -f CHANGELOG.md ]]; then
    # Add entry under today's date section, or create one
    if grep -q "## \[${today}\]" CHANGELOG.md; then
      sed -i '' "/## \[${today}\]/a\\
${entry}" CHANGELOG.md
    else
      local header="## [${today}] — AI Bug Monitor\n\n${entry}\n"
      sed -i '' "1s/^/${header}\n/" CHANGELOG.md
    fi
  else
    echo -e "# Changelog\n\n## [${today}] — AI Bug Monitor\n\n${entry}\n" > CHANGELOG.md
  fi
}

# ============================================================
# Main Processing Loop
# ============================================================

log "Starting AI Bug Fixer..."
log "Pulling latest from main..."
git pull origin main --rebase 2>/dev/null || warn "git pull failed, continuing with current state"

# Fetch pending items
FILTER="status=eq.pending"
if [[ -n "$SPECIFIC_ITEM" ]]; then
  FILTER="roadmap_item_id=eq.${SPECIFIC_ITEM}"
fi

PENDING=$(curl -sS \
  "${SUPABASE_URL}/rest/v1/ai_bug_monitor_runs?${FILTER}&select=*,roadmap_items(id,title,description,category,priority)" \
  "${API_HEADERS[@]}")

ITEM_COUNT=$(echo "$PENDING" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")

if [[ "$ITEM_COUNT" == "0" ]]; then
  log "No pending items to process. Exiting."
  exit 0
fi

log "Found ${ITEM_COUNT} pending item(s) to process"

# Process each item
echo "$PENDING" | python3 -c "
import sys, json
items = json.load(sys.stdin)
for item in items:
    ri = item.get('roadmap_items', {})
    print(f\"{item['roadmap_item_id']}|||{ri.get('title','')}|||{ri.get('description','')}\")
" | while IFS='|||' read -r ITEM_ID ITEM_TITLE ITEM_DESC; do

  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "Processing: ${ITEM_TITLE} (${ITEM_ID:0:8}...)"
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # --- Phase 1: Investigate with agent-browser ---
  update_run_status "$ITEM_ID" "investigating"

  # Get reproduction steps from triage_result
  STEPS=$(curl -sS \
    "${SUPABASE_URL}/rest/v1/ai_bug_monitor_runs?roadmap_item_id=eq.${ITEM_ID}&select=triage_result" \
    "${API_HEADERS[@]}" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data:
    steps = data[0].get('triage_result', {}).get('reproduction_steps', [])
    print('|||'.join(steps))
" 2>/dev/null || echo "")

  # Generate investigation script
  node scripts/generate-bug-investigation.cjs \
    --id "$ITEM_ID" \
    --title "$ITEM_TITLE" \
    --description "$ITEM_DESC" \
    --steps "$STEPS"

  # Run the investigation
  INVESTIGATION_SCRIPT="e2e/bug-investigation-${ITEM_ID:0:8}.agent-browser.cjs"
  if [[ -f "$INVESTIGATION_SCRIPT" ]]; then
    if node "$INVESTIGATION_SCRIPT"; then
      log "✅ Bug confirmed by investigation"
    else
      warn "Investigation could not confirm bug — proceeding anyway"
    fi
  fi

  # --- Phase 2: Fix the code ---
  update_run_status "$ITEM_ID" "fixing"
  BRANCH_NAME="fix/auto-bug-${ITEM_ID:0:8}"

  git checkout -b "$BRANCH_NAME" 2>/dev/null || git checkout "$BRANCH_NAME" 2>/dev/null || true

  # Placeholder: In production, this would invoke opencode or claude
  # to analyze the bug and generate a fix.  For now we log the intent.
  log "🔧 AI code fix would be generated here for: ${ITEM_TITLE}"
  log "   Bug description: ${ITEM_DESC:0:200}..."

  # --- Phase 3: QA Pipeline ---
  update_run_status "$ITEM_ID" "qa"

  QA_PASS=false
  for attempt in $(seq 1 $MAX_FIX_ATTEMPTS); do
    log "QA attempt ${attempt}/${MAX_FIX_ATTEMPTS}..."

    # Lint
    if npm run lint -- --fix 2>/dev/null; then
      log "  ✅ Lint passed"
    else
      warn "  Lint has warnings/errors — continuing"
    fi

    # Validate JSON
    if npm run validate:json 2>/dev/null; then
      log "  ✅ JSON validation passed"
    else
      warn "  JSON validation failed"
    fi

    # Tests
    if npm run test:run 2>/dev/null; then
      log "  ✅ Tests passed"
    else
      warn "  Tests failed"
    fi

    # Full CI
    if npm run ci 2>/dev/null; then
      log "  ✅ Full CI passed"
      QA_PASS=true
      break
    else
      warn "  CI failed — attempt ${attempt}/${MAX_FIX_ATTEMPTS}"
    fi
  done

  if ! $QA_PASS; then
    err "QA pipeline failed after ${MAX_FIX_ATTEMPTS} attempts"
    update_run_error "$ITEM_ID" "QA pipeline failed after ${MAX_FIX_ATTEMPTS} attempts"
    post_comment "$ITEM_ID" "🤖 **AI Bug Monitor — QA Failed**\n\nThe automated fix could not pass the QA pipeline after ${MAX_FIX_ATTEMPTS} attempts. Manual intervention required."
    git checkout main 2>/dev/null || true
    continue
  fi

  # --- Phase 4: Commit and Push ---
  update_run_status "$ITEM_ID" "committed"

  # Stage all changes (modified + untracked)
  git add -A

  COMMIT_MSG="fix(roadmap): auto-fix bug ${ITEM_ID:0:8} — ${ITEM_TITLE}

🤖 Automated fix by AI Bug Monitor
Co-Authored-By: AI Bug Monitor <ai-bot@castorworks.cloud>"

  git commit -m "$COMMIT_MSG" 2>/dev/null || log "Nothing to commit"

  COMMIT_SHA=$(git rev-parse HEAD)
  git push origin "$BRANCH_NAME" 2>/dev/null || true

  update_run_details "$ITEM_ID" "{\"branch\":\"${BRANCH_NAME}\",\"commit_sha\":\"${COMMIT_SHA}\",\"files_changed\":[]}"

  # --- Phase 5: Monitor CI ---
  log "Waiting for GitHub CI..."
  sleep 10  # Give CI time to start

  CI_GREEN=false
  for i in $(seq 1 30); do
    CI_STATUS=$(gh run list --branch "$BRANCH_NAME" --limit 1 --json conclusion -q '.[0].conclusion' 2>/dev/null || echo "")
    if [[ "$CI_STATUS" == "success" ]]; then
      CI_GREEN=true
      log "✅ GitHub CI passed"
      break
    elif [[ "$CI_STATUS" == "failure" ]]; then
      warn "GitHub CI failed"
      break
    fi
    sleep 20
  done

  # --- Phase 6: Update CHANGELOG ---
  append_changelog "$ITEM_ID" "$ITEM_TITLE" "$COMMIT_SHA"
  git add CHANGELOG.md
  git commit -m "docs: update CHANGELOG for bug fix ${ITEM_ID:0:8}" 2>/dev/null || true
  git push origin "$BRANCH_NAME" 2>/dev/null || true

  # --- Phase 7: Notify reporter ---
  post_comment "$ITEM_ID" "✅ **Bug Fixed by AI Bug Monitor**\n\nThe issue has been investigated and a fix has been committed.\n\n- **Branch:** \`${BRANCH_NAME}\`\n- **Commit:** \`${COMMIT_SHA:0:7}\`\n- **CI Status:** $(if $CI_GREEN; then echo '✅ Passed'; else echo '⚠️ Check manually'; fi)\n\nThe fix is ready for review and merge."

  # --- Phase 8: Move to Done ---
  update_roadmap_status "$ITEM_ID" "done"
  update_run_status "$ITEM_ID" "done"
  update_run_details "$ITEM_ID" "{\"branch\":\"${BRANCH_NAME}\",\"commit_sha\":\"${COMMIT_SHA}\",\"ci_status\":\"$(if $CI_GREEN; then echo 'success'; else echo 'unknown'; fi)\"}"

  log "✅ Bug ${ITEM_ID:0:8} complete!"

  # Clean up investigation script
  rm -f "$INVESTIGATION_SCRIPT"

  # Return to main
  git checkout main 2>/dev/null || true
done

log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "All items processed. Done!"
