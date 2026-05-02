#!/usr/bin/env bash
# build-before-commit.sh
# PreToolUse hook — warns before git commit so release output is rebuilt first.

set -euo pipefail

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name',''))" 2>/dev/null || true)

if [ "$TOOL_NAME" != "run_in_terminal" ]; then
  exit 0
fi

COMMAND=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null || true)

if echo "$COMMAND" | grep -qE '(^|[[:space:]])git[[:space:]]+commit([[:space:]]|$)'; then
  printf '{"systemMessage":"BUILD CHECK: Confirm that npm run build has been run since the last source edit. release-cloudflare must be in sync before committing."}\n'
fi

exit 0
