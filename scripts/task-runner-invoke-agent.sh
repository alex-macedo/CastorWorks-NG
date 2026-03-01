#!/usr/bin/env bash
# ============================================================
# task-runner-invoke-agent.sh — Invoke agent for AI Task Runner
#
# Called by ai-task-runner.sh with: ITEM_ID ITEM_TITLE ITEM_DESC
# - If Cursor `agent`, `claude`, or `opencode` CLI is available,
#   runs the agent non-interactively (Cursor uses Composer 1.5).
# - Otherwise opens the context file and waits for Enter
#   (implement the task in Cursor, then continue).
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CONTEXT_FILE="$PROJECT_DIR/.cursor/task-runner-context.md"

ITEM_ID="${1:-}"
ITEM_TITLE="${2:-}"
ITEM_DESC="${3:-}"

log()  { echo "$(date '+%H:%M:%S') [invoke-agent] $*"; }
warn() { echo "$(date '+%H:%M:%S') [invoke-agent] ⚠️  $*" >&2; }

if [[ ! -f "$CONTEXT_FILE" ]]; then
  warn "Context file missing: $CONTEXT_FILE"
  exit 1
fi

# Build prompt from context file so the agent has full instructions
TASK_PROMPT="Implement the roadmap task described in the following context. Follow AGENTS.md and READMEDev.md. Ensure lint, i18n, and tests pass.

$(cat "$CONTEXT_FILE")"

# Prefer Cursor CLI (agent) with Composer 1.5, then claude/opencode
# Cursor agent: agent -p "prompt" --model "Composer 1.5"
# Claude/OpenCode: claude -p "prompt" --allowedTools "Read,Edit,Bash"
AGENT_CMD=""
AGENT_ARGS=()
if command -v agent >/dev/null 2>&1; then
  AGENT_CMD="agent"
  AGENT_ARGS=(-p "$TASK_PROMPT" --model "Composer 1.5" --output-format text --trust)
elif command -v claude >/dev/null 2>&1; then
  AGENT_CMD="claude"
  AGENT_ARGS=(-p "$TASK_PROMPT" --allowedTools "Read,Edit,Bash")
elif command -v opencode >/dev/null 2>&1; then
  AGENT_CMD="opencode"
  AGENT_ARGS=(-p "$TASK_PROMPT" --allowedTools "Read,Edit,Bash")
fi

if [[ -n "$AGENT_CMD" ]]; then
  log "Invoking agent via $AGENT_CMD..."
  if "$AGENT_CMD" "${AGENT_ARGS[@]}" 2>&1; then
    log "Agent finished successfully"
    exit 0
  fi
  warn "$AGENT_CMD exited non-zero — falling back to manual step"
fi

# Fallback: show instructions and wait for user to implement in Cursor
log "No agent CLI available or run failed. Implement the task manually."
echo ""
echo "  Context file: $CONTEXT_FILE"
echo "  Item: ${ITEM_TITLE:-Untitled task} (${ITEM_ID:0:8}...)"
echo ""
echo "  Open the context file in Cursor and implement the feature, then return here."
if [[ -n "${EDITOR:-}" ]]; then
  $EDITOR "$CONTEXT_FILE" 2>/dev/null || true
elif command -v cursor >/dev/null 2>&1; then
  cursor "$CONTEXT_FILE" 2>/dev/null || true
elif command -v code >/dev/null 2>&1; then
  code "$CONTEXT_FILE" 2>/dev/null || true
fi
echo ""
read -r -p "Press Enter when the task is implemented and you're ready for QA..."
log "Continuing to QA phase."
exit 0
