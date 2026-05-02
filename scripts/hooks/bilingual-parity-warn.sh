#!/usr/bin/env bash
# bilingual-parity-warn.sh
# PreToolUse hook — warns when a root-level FR HTML page is edited without its
# matching EN page in the same tool call.

set -euo pipefail

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name',''))" 2>/dev/null || true)

if ! echo "$TOOL_NAME" | grep -qE '^(create_file|replace_string_in_file|multi_replace_string_in_file)$'; then
  exit 0
fi

FILE_PATHS=$(echo "$INPUT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
ti = d.get('tool_input', {})
if isinstance(ti, dict):
    paths = [ti.get('filePath', ''), ti.get('file_path', ''), ti.get('path', '')]
    for replacement in ti.get('replacements', []):
        paths.append(replacement.get('filePath', ''))
    print('\\n'.join(p for p in paths if p))
" 2>/dev/null || true)

MISSING=""
while IFS= read -r path; do
  [ -z "$path" ] && continue
  base=$(basename "$path")
  case "$path" in
    */en/*|*/operations/*|*/release-cloudflare/*) continue ;;
  esac
  if echo "$base" | grep -qE '\.html$'; then
    parent=$(dirname "$path")
    if [ "$parent" = "." ] || [ "$parent" = "/workspaces/nexuradata-site" ]; then
      if ! echo "$FILE_PATHS" | grep -qF "/en/${base}" && ! echo "$FILE_PATHS" | grep -qxF "en/${base}"; then
        MISSING="${MISSING}${base}, "
      fi
    fi
  fi
done <<< "$FILE_PATHS"

if [ -n "$MISSING" ]; then
  MISSING=${MISSING%, }
  printf '{"systemMessage":"BILINGUAL CHECK: FR page edited without matching EN update: %s"}\n' "$MISSING"
fi

exit 0
