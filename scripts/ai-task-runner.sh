#!/usr/bin/env bash
# ============================================================
# ai-task-runner.sh — Autonomous AI Roadmap Task Runner Agent
#
# Processes roadmap_items in backlog by priority:
#   1. Read AGENTS.md + READMEDev.md for context
#   2. Select task by priority, assign to open sprint, move to In Progress
#   3. Develop (writes task context; invokes agent hook if present)
#   4. Run QA pipeline (lint, validate, test, ci)
#   5. Move to User Review, run agent-browser E2E validation
#   6. If pass: commit, push, post comment, move to Done; else move to Blocked
#   7. Loop until no backlog items remain
#
# Usage:
#   ./scripts/ai-task-runner.sh              # Process all (interactive at develop phase)
#   ./scripts/ai-task-runner.sh --dry-run     # Preview items only
#   ./scripts/ai-task-runner.sh --max-items 1 # Process at most 1 item
#   ./scripts/ai-task-runner.sh <item_id>     # Process specific item
#
# Requires:
#   - .env with VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
#   - .env.testing with ACCOUNT_TEST_EMAIL, ACCOUNT_TEST_EMAIL_PASSWORD
#   - agent-browser, git, curl, node in PATH
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# --- Parse flags ---
DRY_RUN=false
MAX_ITEMS=""
SPECIFIC_ITEM=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)   DRY_RUN=true; shift ;;
    --max-items) MAX_ITEMS="$2"; shift 2 ;;
    *)           SPECIFIC_ITEM="$1"; shift ;;
  esac
done

# --- Load environment (safe: only export known vars from KEY=value lines) ---
load_env_file() {
  local f="$1"
  [[ ! -f "$f" ]] && return
  for key in VITE_SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY VITE_SUPABASE_SERVICE_ROLE_KEY ACCOUNT_TEST_EMAIL ACCOUNT_TEST_EMAIL_PASSWORD; do
    val=$(grep -m1 "^${key}=" "$f" 2>/dev/null | sed "s/^${key}=//" | sed 's/^"//;s/"$//' || true)
    [[ -n "$val" ]] && export "$key=$val"
  done
}
load_env_file .env
load_env_file .env.testing

runner_log()  { echo "$(date '+%H:%M:%S') [ai-task-runner] $*"; }
warn() { echo "$(date '+%H:%M:%S') [ai-task-runner] ⚠️  $*" >&2; }
err()  { echo "$(date '+%H:%M:%S') [ai-task-runner] ❌ $*" >&2; }

build_sprint_scoped_roadmap_url() {
  local status="$1"
  local select="${2:-id,title,description,category,priority,position}"
  printf '%s/rest/v1/roadmap_items?status=eq.%s&sprint_id=eq.%s&select=%s' \
    "$SUPABASE_URL" "$status" "$SPRINT_ID" "$select"
}

SUPABASE_URL="${VITE_SUPABASE_URL:-https://dev.castorworks.cloud}"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-${VITE_SUPABASE_SERVICE_ROLE_KEY:-}}"

if [[ -z "$SERVICE_KEY" ]]; then
  if [[ "$DRY_RUN" == true ]]; then
    runner_log "SUPABASE_SERVICE_ROLE_KEY / VITE_SUPABASE_SERVICE_ROLE_KEY not set — dry run will skip backlog fetch"
  else
    echo "❌ SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_SERVICE_ROLE_KEY is not set"
    exit 1
  fi
fi

API_HEADERS=(
  -H "apikey: ${SERVICE_KEY}"
  -H "Authorization: Bearer ${SERVICE_KEY}"
  -H "Content-Type: application/json"
  -H "Prefer: return=minimal"
)

MAX_QA_ATTEMPTS=3
ITEM_TIMEOUT_MINUTES=30

# ============================================================
# Helper Functions
# ============================================================

update_roadmap_status() {
  local item_id="$1" status="$2"
  local payload="{\"status\":\"${status}\",\"updated_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"
  curl -sS -X PATCH \
    "${SUPABASE_URL}/rest/v1/roadmap_items?id=eq.${item_id}" \
    "${API_HEADERS[@]}" \
    -d "$payload" > /dev/null
}

update_roadmap_to_done() {
  local item_id="$1"
  local now
  now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  curl -sS -X PATCH \
    "${SUPABASE_URL}/rest/v1/roadmap_items?id=eq.${item_id}" \
    "${API_HEADERS[@]}" \
    -d "{\"status\":\"done\",\"completed_at\":\"${now}\",\"updated_at\":\"${now}\"}" > /dev/null
}

assign_sprint_and_status() {
  local item_id="$1" sprint_id="$2" status="$3"
  local now
  now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  curl -sS -X PATCH \
    "${SUPABASE_URL}/rest/v1/roadmap_items?id=eq.${item_id}" \
    "${API_HEADERS[@]}" \
    -d "{\"sprint_id\":\"${sprint_id}\",\"status\":\"${status}\",\"updated_at\":\"${now}\"}" > /dev/null
}

get_admin_user_id() {
  curl -sS "${SUPABASE_URL}/rest/v1/user_roles?role=eq.admin&select=user_id&limit=1" \
    "${API_HEADERS[@]}" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data and len(data) > 0:
    print(data[0].get('user_id', ''))
" 2>/dev/null || echo ""
}

post_comment() {
  local item_id="$1" content="$2"
  local admin_id
  admin_id=$(get_admin_user_id)
  if [[ -z "$admin_id" ]]; then
    warn "No admin user found — cannot post comment"
    return
  fi
  local escaped_content
  escaped_content=$(printf '%s' "$content" | python3 -c "
import sys, json
s = sys.stdin.read()
print(json.dumps(s))
" 2>/dev/null)
  curl -sS -X POST \
    "${SUPABASE_URL}/rest/v1/roadmap_item_comments" \
    "${API_HEADERS[@]}" \
    -d "{\"roadmap_item_id\":\"${item_id}\",\"user_id\":\"${admin_id}\",\"content\":${escaped_content}}" > /dev/null
}

slugify() {
  local result
  result=$(echo "$1" | python3 -c "
import sys, re
s = sys.stdin.read().strip()
s = re.sub(r'[^a-zA-Z0-9]+', '-', s).strip('-').lower()[:40]
print(s)
" 2>/dev/null || echo "task")
  [[ -z "$result" ]] && echo "untitled" || echo "$result"
}

# ============================================================
# Phase 0: Bootstrap context
# ============================================================

runner_log "Phase 0: Bootstrap context"

for tool in agent-browser git curl node python3; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    err "Required tool missing: $tool"
    exit 1
  fi
done

if [[ -f AGENTS.md ]]; then
  runner_log "AGENTS.md present ($(wc -l < AGENTS.md) lines)"
else
  warn "AGENTS.md not found"
fi
if [[ -f READMEDev.md ]]; then
  runner_log "READMEDev.md present ($(wc -l < READMEDev.md) lines)"
else
  warn "READMEDev.md not found"
fi

if [[ "$DRY_RUN" == true ]]; then
  runner_log "Dry run — no DB or git changes"
fi

# ============================================================
# Fetch open sprint (for assignment)
# ============================================================

SPRINT_ID=""
SPRINT_IDENTIFIER=""
if [[ -z "$SERVICE_KEY" ]]; then
  runner_log "Skipping API calls (no key)"
else
SPRINT_JSON=$(curl -sS "${SUPABASE_URL}/rest/v1/sprints?status=eq.open&order=start_date.desc.nullslast,created_at.desc.nullslast,sprint_identifier.desc&limit=1&select=id,sprint_identifier,start_date,created_at" "${API_HEADERS[@]}")
SPRINT_ID=$(echo "$SPRINT_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data and len(data) > 0:
    print(data[0].get('id', ''))
" 2>/dev/null || echo "")
SPRINT_IDENTIFIER=$(echo "$SPRINT_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data and len(data) > 0:
    print((data[0].get('sprint_identifier') or '').replace(chr(10), ' '))
" 2>/dev/null || echo "")

if [[ -z "$SPRINT_ID" ]] && [[ -z "$SPECIFIC_ITEM" ]]; then
  warn "No open sprint found — exiting to avoid cross-sprint roadmap mutations"
  exit 0
fi
if [[ -n "$SPRINT_ID" ]]; then
  runner_log "Open sprint: ${SPRINT_IDENTIFIER:-${SPRINT_ID:0:8}...}"
fi
fi

# ============================================================
# Phase 1: Fetch and prioritize tasks (in_progress first, then backlog)
# ============================================================

if [[ -n "$SERVICE_KEY" ]]; then
if [[ -n "$SPECIFIC_ITEM" ]]; then
  BACKLOG_JSON=$(curl -sS "${SUPABASE_URL}/rest/v1/roadmap_items?id=eq.${SPECIFIC_ITEM}&select=id,title,description,category,priority,position,status" "${API_HEADERS[@]}")
  IN_PROGRESS_LINE=""
else
  # 1) Fetch in_progress items first (priority: finish open work before starting new)
  IN_PROGRESS_JSON=$(curl -sS "$(build_sprint_scoped_roadmap_url "in_progress")" "${API_HEADERS[@]}")
  IN_PROGRESS_LINE=$(echo "$IN_PROGRESS_JSON" | python3 -c "
import sys, json
pri = {'urgent': 4, 'high': 3, 'medium': 2, 'low': 1}
data = json.load(sys.stdin)
if not data:
    sys.exit(0)
data = [x for x in data if x.get('category') != 'bug_fix']
data.sort(key=lambda x: (-pri.get(x.get('priority') or 'medium', 2), x.get('position') or 0))
for x in data:
    title = (x.get('title') or '')[:80]
    desc = (x.get('description') or '')[:500].replace(chr(10), ' ')
    print(x['id'] + '|||' + title + '|||' + desc + '|||' + (x.get('priority') or 'medium') + '|||' + (x.get('category') or ''))
" 2>/dev/null)
  # 2) Fetch backlog items
  BACKLOG_JSON=$(curl -sS "$(build_sprint_scoped_roadmap_url "backlog")" "${API_HEADERS[@]}")
fi
else
  BACKLOG_JSON="[]"
  IN_PROGRESS_LINE=""
fi

# Sort backlog by priority; then combine: in_progress first, then backlog
BACKLOG_LINE=$(echo "$BACKLOG_JSON" | python3 -c "
import sys, json
pri = {'urgent': 4, 'high': 3, 'medium': 2, 'low': 1}
data = json.load(sys.stdin)
if not data:
    sys.exit(0)
# Exclude bug_fix (handled by ai-bug-fixer.sh)
data = [x for x in data if x.get('category') != 'bug_fix']
data.sort(key=lambda x: (-pri.get(x.get('priority') or 'medium', 2), x.get('position') or 0))
for x in data:
    title = (x.get('title') or '')[:80]
    desc = (x.get('description') or '')[:500].replace(chr(10), ' ')
    print(x['id'] + '|||' + title + '|||' + desc + '|||' + (x.get('priority') or 'medium') + '|||' + (x.get('category') or ''))
" 2>/dev/null)

# Prefer in_progress items, then backlog (tasks not closed yet get priority)
ITEMS_LINE=""
if [[ -n "$IN_PROGRESS_LINE" ]]; then
  ITEMS_LINE="$IN_PROGRESS_LINE"
  runner_log "Found $(echo "$IN_PROGRESS_LINE" | wc -l | tr -d ' ') item(s) already In Progress (priority)"
fi
if [[ -n "$BACKLOG_LINE" ]]; then
  [[ -n "$ITEMS_LINE" ]] && ITEMS_LINE="$ITEMS_LINE"$'\n'"$BACKLOG_LINE" || ITEMS_LINE="$BACKLOG_LINE"
  if [[ -z "$IN_PROGRESS_LINE" ]]; then
    runner_log "Found $(echo "$BACKLOG_LINE" | wc -l | tr -d ' ') backlog item(s) to process"
  else
    runner_log "Plus $(echo "$BACKLOG_LINE" | wc -l | tr -d ' ') backlog item(s)"
  fi
fi

ITEM_COUNT=0
if [[ -n "$ITEMS_LINE" ]]; then
  ITEM_COUNT=$(echo "$ITEMS_LINE" | wc -l | tr -d ' ')
fi

if [[ "$ITEM_COUNT" -eq 0 ]]; then
  runner_log "No items to process (no In Progress, no Backlog). Exiting."
  exit 0
fi

runner_log "Total ${ITEM_COUNT} item(s) to process"

if [[ "$DRY_RUN" == true ]]; then
  echo "$ITEMS_LINE" | while IFS= read -r line; do
    id=$(echo "$line" | awk -F'[|][|][|]' '{print $1}')
    title=$(echo "$line" | awk -F'[|][|][|]' '{print $2}')
    [[ -z "$id" ]] && continue
    runner_log "Would process: ${title:-Untitled task} (${id:0:8}...)"
  done
  exit 0
fi

# Apply --max-items
if [[ -n "$MAX_ITEMS" ]] && [[ "$MAX_ITEMS" =~ ^[0-9]+$ ]]; then
  ITEMS_LINE=$(echo "$ITEMS_LINE" | head -n "$MAX_ITEMS")
fi

# ============================================================
# Main loop: process each item
# ============================================================

echo "$ITEMS_LINE" | while IFS= read -r line; do
  ITEM_ID=$(echo "$line" | awk -F'[|][|][|]' '{print $1}')
  ITEM_TITLE=$(echo "$line" | awk -F'[|][|][|]' '{print $2}')
  ITEM_DESC=$(echo "$line" | awk -F'[|][|][|]' '{print $3}')
  ITEM_PRIORITY=$(echo "$line" | awk -F'[|][|][|]' '{print $4}')
  ITEM_CATEGORY=$(echo "$line" | awk -F'[|][|][|]' '{print $5}')
  [[ -z "$ITEM_ID" ]] && continue

  runner_log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  runner_log "Processing: ${ITEM_TITLE:-Untitled task} (${ITEM_ID:0:8}...)"
  runner_log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  # Emit task meta for the AI To Work UI (Task Summary, Priority, Category, Sprint)
  TITLE_ESC=$(echo "${ITEM_TITLE:-}" | sed 's/"/\\"/g')
  SPRINT_ESC=$(echo "${SPRINT_IDENTIFIER:-}" | sed 's/"/\\"/g')
  echo "AI_TASK_META|{\"id\":\"$ITEM_ID\",\"title\":\"$TITLE_ESC\",\"priority\":\"${ITEM_PRIORITY:-medium}\",\"category\":\"${ITEM_CATEGORY:-}\",\"sprint_id\":\"${SPRINT_ID:-}\",\"sprint_identifier\":\"$SPRINT_ESC\"}"

  # --- Phase 2: Claim and start task ---
  if [[ -n "$SPRINT_ID" ]] && [[ -z "$SPECIFIC_ITEM" ]]; then
    assign_sprint_and_status "$ITEM_ID" "$SPRINT_ID" "in_progress"
    runner_log "Assigned to sprint and moved to In Progress"
  else
    update_roadmap_status "$ITEM_ID" "in_progress"
    runner_log "Moved to In Progress (no sprint)"
  fi

  post_comment "$ITEM_ID" "🤖 **AI Task Runner** — Work started on this item. Context: AGENTS.md + READMEDev.md."

  BRANCH_SLUG=$(slugify "${ITEM_TITLE:-untitled}")
  BRANCH_SLUG="${BRANCH_SLUG:-untitled}"
  BRANCH_NAME="feat/auto-${ITEM_ID:0:8}--${BRANCH_SLUG}"
  git checkout main 2>/dev/null || true
  git pull origin main --rebase 2>/dev/null || warn "git pull failed"
  git checkout -b "$BRANCH_NAME" 2>/dev/null || git checkout "$BRANCH_NAME" 2>/dev/null || true

  # --- Phase 3: Develop — write context and invoke hook or wait ---
  mkdir -p .cursor
  TASK_TITLE="${ITEM_TITLE:-}"
  TASK_DESC="${ITEM_DESC:-}"
  HAS_CONTENT=true
  if [[ -z "$TASK_TITLE" && -z "$TASK_DESC" ]]; then
    HAS_CONTENT=false
    TASK_DESC="(No title or description in roadmap item — check database or provide task details manually)"
  fi
  if $HAS_CONTENT; then
    cat > .cursor/task-runner-context.md << TASKEOF
# Task Runner Context

- **Roadmap item ID:** ${ITEM_ID}
- **Title:** ${TASK_TITLE}
- **Description:** ${TASK_DESC}

## Instructions

1. Read AGENTS.md and READMEDev.md for full application context.
2. Implement the feature/fix described above.
3. Ensure code follows project conventions (lint, i18n, tests).
TASKEOF
  else
    cat > .cursor/task-runner-context.md << TASKEOF
# Task Runner Context

- **Roadmap item ID:** ${ITEM_ID}
- **Title:** ${TASK_TITLE}
- **Description:** ${TASK_DESC}

## Inferred scope (from codebase)

When title/description are empty, consider these areas:

- **AI To Work feature**: AiToWorkPage, Roadmap AI To Work button, task runner bridge (scripts/task-runner-bridge.js)
- **Task runner**: scripts/ai-task-runner.sh — handle empty title/description when writing context, commit messages, branch names
- **i18n**: roadmap strings (src/locales/*/roadmap.json), especially aiToWorkDialog keys
- **generate-task-validation.cjs**: Handles empty title/description for E2E validation script generation

## Instructions

1. Read AGENTS.md and READMEDev.md for full application context.
2. Implement the feature/fix described above.
3. Ensure code follows project conventions (lint, i18n, tests).
TASKEOF
  fi
  runner_log "Task context written to .cursor/task-runner-context.md"

  if [[ -x "$SCRIPT_DIR/task-runner-invoke-agent.sh" ]]; then
    runner_log "Invoking agent hook..."
    "$SCRIPT_DIR/task-runner-invoke-agent.sh" "$ITEM_ID" "$ITEM_TITLE" "$ITEM_DESC" || warn "Agent hook exited non-zero"
  else
    runner_log "No scripts/task-runner-invoke-agent.sh — implement the task (see .cursor/task-runner-context.md), then press Enter to continue"
    read -r
  fi

  # --- Phase 4: QA pipeline ---
  QA_PASS=false
  for attempt in $(seq 1 $MAX_QA_ATTEMPTS); do
    runner_log "QA attempt ${attempt}/${MAX_QA_ATTEMPTS}..."
    if npm run ci 2>/dev/null; then
      QA_PASS=true
      runner_log "✅ Full CI passed"
      break
    fi
    warn "CI failed — attempt ${attempt}/${MAX_QA_ATTEMPTS}"
  done

  if ! $QA_PASS; then
    err "QA pipeline failed after ${MAX_QA_ATTEMPTS} attempts"
    post_comment "$ITEM_ID" "🤖 **AI Task Runner — QA Failed**\n\nThe changes could not pass the QA pipeline (lint, validate, test, build) after ${MAX_QA_ATTEMPTS} attempts. Moving to blocked."
    update_roadmap_status "$ITEM_ID" "blocked"
    git checkout main 2>/dev/null || true
    continue
  fi

  # --- Phase 5: Move to User Review + E2E validation ---
  update_roadmap_status "$ITEM_ID" "user_review"
  runner_log "Moved to User Review"

  # Use __EMPTY__ placeholder so empty title/description are passed correctly (bash drops empty args)
  node "$SCRIPT_DIR/generate-task-validation.cjs" \
    --id "$ITEM_ID" \
    --title "${ITEM_TITLE:-__EMPTY__}" \
    --description "${ITEM_DESC:-__EMPTY__}" \
    --out-dir "test-results/task-${ITEM_ID:0:8}"

  E2E_SCRIPT="e2e/task-validation-${ITEM_ID:0:8}.agent-browser.cjs"
  E2E_PASS=false
  if [[ -f "$E2E_SCRIPT" ]]; then
    if node "$E2E_SCRIPT"; then
      E2E_PASS=true
      runner_log "✅ E2E validation passed"
    else
      warn "E2E validation failed"
    fi
    rm -f "$E2E_SCRIPT"
  else
    warn "E2E script not generated — skipping E2E step"
    E2E_PASS=true
  fi

  if ! $E2E_PASS; then
    post_comment "$ITEM_ID" "🤖 **AI Task Runner — E2E Failed**\n\nAgent-browser validation did not pass. Moving to blocked for manual review."
    update_roadmap_status "$ITEM_ID" "blocked"
    git checkout main 2>/dev/null || true
    continue
  fi

  # --- Phase 6: Finalize — commit, push, comment, done ---
  git add -A
  COMMIT_TITLE="${ITEM_TITLE:-Untitled task}"
  COMMIT_MSG="feat(roadmap): ${COMMIT_TITLE} (${ITEM_ID:0:8})

🤖 AI Task Runner
Co-Authored-By: AI Task Runner <ai-bot@castorworks.cloud>"
  git commit -m "$COMMIT_MSG" 2>/dev/null || runner_log "Nothing to commit"
  COMMIT_SHA=$(git rev-parse HEAD)
  git push origin "$BRANCH_NAME" 2>/dev/null || true

  CI_GREEN=false
  for i in $(seq 1 30); do
    CI_STATUS=$(gh run list --branch "$BRANCH_NAME" --limit 1 --json conclusion -q '.[0].conclusion' 2>/dev/null || echo "")
    if [[ "$CI_STATUS" == "success" ]]; then
      CI_GREEN=true
      runner_log "✅ GitHub CI passed"
      break
    elif [[ "$CI_STATUS" == "failure" ]]; then
      warn "GitHub CI failed"
      break
    fi
    sleep 20
  done

  post_comment "$ITEM_ID" "✅ **AI Task Runner — Done**\n\n- **Branch:** \`${BRANCH_NAME}\`\n- **Commit:** \`${COMMIT_SHA:0:7}\`\n- **CI:** $(if $CI_GREEN; then echo '✅ Passed'; else echo '⚠️ Check manually'; fi)\n\nReady for review and merge."
  update_roadmap_to_done "$ITEM_ID"
  runner_log "✅ Item ${ITEM_ID:0:8} complete!"

  git checkout main 2>/dev/null || true
done

runner_log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
runner_log "All items processed. Done!"
