#!/usr/bin/env bash
# quality-assurance.sh
# PreToolUse + Stop hook — asks before Cloudflare deploys and injects a
# closeout reminder when high-risk source/customization files changed.

set -euo pipefail

INPUT=$(cat || true)
MARKER_MAX_AGE_SECONDS=$((6 * 60 * 60))

high_risk_changes() {
  { git diff --name-only -- . ':!release-cloudflare' 2>/dev/null; git ls-files --others --exclude-standard 2>/dev/null; } |
    sort -u |
    grep -E '^(assets/|functions/|operations/|tests/|scripts/|migrations/|\.github/hooks/|\.github/instructions/|en/|[^/]+\.html$|_headers$|_redirects$|wrangler\.jsonc$|package(-lock)?\.json$|vitest\.config\.js$|site\.webmanifest$|robots\.txt$|sitemap\.xml$)' || true
}

TOOL_NAME=$(printf '%s' "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name',''))" 2>/dev/null || true)
COMMAND=$(printf '%s' "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null || true)
HOOK_EVENT=$(printf '%s' "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('hook_event_name') or d.get('hookEventName') or d.get('event') or '')" 2>/dev/null || true)

if [ "$TOOL_NAME" = "run_in_terminal" ] && echo "$COMMAND" | grep -qE '(^|[;&|[:space:]])((npm[[:space:]]+run[[:space:]]+cf:(deploy|pages:deploy|pages:deploy:prod))|(npx[[:space:]]+wrangler[[:space:]]+pages[[:space:]]+deploy)|(wrangler[[:space:]]+pages[[:space:]]+deploy)|(node[[:space:]]+\./scripts/pages-cli\.mjs[[:space:]]+deploy-prod))([[:space:]]|$)'; then
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null || (cd "$SCRIPT_DIR/../.." && pwd))"
  cd "$REPO_ROOT"

  HIGH_RISK=$(high_risk_changes)

  if [ -z "$HIGH_RISK" ]; then
    exit 0
  fi

  MARKER_PATH="$REPO_ROOT/.git/nexuradata-quality-gate.json"
  MARKER_EPOCH=$(python3 - "$MARKER_PATH" <<'PY' 2>/dev/null || true
import json
import sys
from datetime import datetime, timezone

path = sys.argv[1]
with open(path, "r", encoding="utf-8") as handle:
    data = json.load(handle)
if data.get("status") != "passed":
    raise SystemExit(1)
generated_at = data.get("generatedAt", "")
stamp = datetime.fromisoformat(generated_at.replace("Z", "+00:00"))
print(int(stamp.timestamp()))
PY
)

  NOW_EPOCH=$(date +%s)
  MAX_CHANGED_EPOCH=0
  while IFS= read -r path; do
    [ -z "$path" ] && continue
    if [ -e "$path" ]; then
      FILE_EPOCH=$(stat -c %Y "$path" 2>/dev/null || echo 0)
      if [ "$FILE_EPOCH" -gt "$MAX_CHANGED_EPOCH" ]; then
        MAX_CHANGED_EPOCH="$FILE_EPOCH"
      fi
    fi
  done <<< "$HIGH_RISK"

  REASON=""
  if [ -z "$MARKER_EPOCH" ]; then
    REASON="No successful local quality marker was found."
  elif [ $((NOW_EPOCH - MARKER_EPOCH)) -gt "$MARKER_MAX_AGE_SECONDS" ]; then
    REASON="The local quality marker is older than 6 hours."
  elif [ "$MAX_CHANGED_EPOCH" -gt "$MARKER_EPOCH" ]; then
    REASON="High-risk files changed after the last quality marker."
  fi

  if [ -n "$REASON" ]; then
    export REASON
    python3 - <<'PY'
import json
import os
print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": f"DEPLOY QUALITY GATE: {os.environ['REASON']} Run `npm run quality:gate`, then rerun the deploy command."
    }
}))
PY
    exit 0
  fi

  python3 - <<'PY'
import json
print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "allow",
        "permissionDecisionReason": "DEPLOY QUALITY GATE: Recent local quality marker found for current high-risk changes."
    }
}))
PY
  exit 0
fi

if [ -n "$TOOL_NAME" ] && [ "$HOOK_EVENT" != "Stop" ]; then
  exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null || (cd "$SCRIPT_DIR/../.." && pwd))"
cd "$REPO_ROOT"

HIGH_RISK=$(high_risk_changes)

if [ -z "$HIGH_RISK" ]; then
  exit 0
fi

export HIGH_RISK
python3 - <<'PY'
import json
import os

paths = [line for line in os.environ.get("HIGH_RISK", "").splitlines() if line]
sample = ", ".join(paths[:8])
if len(paths) > 8:
    sample += f", +{len(paths) - 8} more"

message = (
    "QUALITY CLOSEOUT: High-risk NEXURADATA files changed. Before the final response, "
    "report whether `npm run quality:gate` ran successfully. "
    "For HTML/CSS/JS/operations changes, also report desktop/tablet/phone responsive verification. "
    f"Touched: {sample}."
)

print(json.dumps({"systemMessage": message}))
PY

exit 0