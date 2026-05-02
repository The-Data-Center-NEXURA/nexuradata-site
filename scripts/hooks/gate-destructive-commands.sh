#!/usr/bin/env bash
# gate-destructive-commands.sh
# PreToolUse hook — asks for confirmation before dangerous terminal commands.
# Patterns: git push --force, git reset --hard, rm -rf, git push --force-with-lease

set -euo pipefail

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name',''))" 2>/dev/null || true)

# Only gate terminal commands
if [ "$TOOL_NAME" != "run_in_terminal" ]; then
  exit 0
fi

# Extract only the command string — avoids false positives from matching file content
COMMAND=$(echo "$INPUT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(d.get('tool_input', {}).get('command', ''))
" 2>/dev/null || true)

# Patterns that require user confirmation
DANGEROUS_PATTERNS="git push --force|git push -f |git push -f\$|git reset --hard|rm -rf|git push --force-with-lease|DROP TABLE|DROP DATABASE|TRUNCATE TABLE"

if echo "$COMMAND" | grep -qiE "$DANGEROUS_PATTERNS"; then
  MATCHED=$(echo "$COMMAND" | grep -oiE "$DANGEROUS_PATTERNS" | head -1)
  # Use printf to avoid heredoc variable injection risk
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"Destructive command detected (%s). This operation is hard to reverse — confirm you want to proceed."}}\n' "$MATCHED"
  exit 0
fi

exit 0
