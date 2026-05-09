#!/usr/bin/env bash
# wrangler-config-guard.sh
# PreToolUse hook — requires user confirmation before any write/edit targeting
# wrangler.jsonc. That file is the single source of truth for env vars and the
# Cloudflare compatibility date; accidental edits can break Pages deploys and
# Functions runtime behavior across all environments.

set -euo pipefail

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name',''))" 2>/dev/null || true)

GUARDED_FILE="wrangler.jsonc"

ask() {
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"CONFIRM: %s is the single source of truth for env vars and Cloudflare compat date. Confirm intentional edit (and that secrets like DATABASE_URL stay in Cloudflare Pages, not in source)."}}\n' "$GUARDED_FILE"
  exit 0
}

# File-write tools: inspect file path fields only.
if echo "$TOOL_NAME" | grep -qE "^(create_file|replace_string_in_file|multi_replace_string_in_file)$"; then
  FILE_PATHS=$(echo "$INPUT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
ti = d.get('tool_input', {})
paths = []
if isinstance(ti, dict):
    paths += [ti.get('filePath', ''), ti.get('file_path', ''), ti.get('path', '')]
    for replacement in ti.get('replacements', []) or []:
        paths.append(replacement.get('filePath', ''))
print('\\n'.join(p for p in paths if p))
" 2>/dev/null || true)
  while IFS= read -r p; do
    [ -z "$p" ] && continue
    base=$(basename "$p")
    if [ "$base" = "$GUARDED_FILE" ]; then
      ask
    fi
  done <<< "$FILE_PATHS"
fi

# Terminal tool: catch redirects / sed -i / mv / rm targeting wrangler.jsonc.
if [ "$TOOL_NAME" = "run_in_terminal" ]; then
  COMMAND=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null || true)
  if echo "$COMMAND" | grep -qE "(>|>>|sed -i|tee|mv |rm |cp )[^|;&]*${GUARDED_FILE}"; then
    ask
  fi
fi

exit 0
