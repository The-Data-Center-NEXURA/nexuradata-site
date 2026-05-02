#!/usr/bin/env bash
# auto-build.sh
# PostToolUse hook — re-runs `npm run build` after any source file is modified,
# keeping the build output directory in sync automatically.

set -euo pipefail

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name',''))" 2>/dev/null || true)

# Only trigger on write tools
WRITE_TOOLS="create_file|replace_string_in_file|multi_replace_string_in_file"
if ! echo "$TOOL_NAME" | grep -qE "$WRITE_TOOLS"; then
  exit 0
fi

# Extract the target file path(s)
FILE_PATH=$(echo "$INPUT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
ti = d.get('tool_input', {})
if isinstance(ti, dict):
    paths = [ti.get('filePath',''), ti.get('file_path',''), ti.get('path','')]
    for r in ti.get('replacements', []):
        paths.append(r.get('filePath',''))
    print('\n'.join(p for p in paths if p))
" 2>/dev/null || true)

# Skip paths that are already inside the build output (blocked by separate hook)
BUILD_OUT="release-cloudflare"
if echo "$FILE_PATH" | grep -qF "${BUILD_OUT}/"; then
  exit 0
fi

# Only rebuild for source files that feed the build
TRIGGER_PATHS="\.html$|assets/|functions/|_headers|_redirects|site\.webmanifest|robots\.txt|sitemap\.xml|wrangler\.jsonc"
if ! echo "$FILE_PATH" | grep -qE "$TRIGGER_PATHS"; then
  exit 0
fi

cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null || echo /workspaces/nexuradata-site)"
echo "[auto-build] Source file changed — running npm run build..." >&2
npm run build --silent >&2

printf '{"systemMessage":"Build completed: build output regenerated from source."}\n'
exit 0
