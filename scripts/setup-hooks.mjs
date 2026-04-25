#!/usr/bin/env node
/**
 * NEXURADATA — git hook installer
 *
 * Installs a pre-push hook that runs the full quality gate before any push.
 * Called automatically via the "prepare" npm lifecycle (npm install / npm ci).
 *
 * Safe to re-run: overwrites only the NEXURADATA section of an existing hook.
 */

import { writeFileSync, readFileSync, chmodSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const HOOKS_DIR = join(ROOT, ".git", "hooks");
const HOOK_PATH = join(HOOKS_DIR, "pre-push");

const NEXURA_MARKER_START = "# --- NEXURADATA quality gate ---";
const NEXURA_MARKER_END = "# --- end NEXURADATA quality gate ---";

const NEXURA_BLOCK = `${NEXURA_MARKER_START}
echo "Running NEXURADATA quality gate..."
npm run check --silent
if [ $? -ne 0 ]; then
  echo ""
  echo "Push blocked. Fix the issues above, then push again."
  echo "To skip in an emergency: git push --no-verify"
  exit 1
fi
${NEXURA_MARKER_END}`;

// Skip if .git/hooks doesn't exist (CI environments, submodule clones)
if (!existsSync(HOOKS_DIR)) {
    console.log("setup-hooks: .git/hooks not found — skipping (CI or submodule environment).");
    process.exit(0);
}

let existing = "";
if (existsSync(HOOK_PATH)) {
    existing = readFileSync(HOOK_PATH, "utf8");
}

// If no shebang at all, start fresh
if (!existing.startsWith("#!")) {
    existing = "#!/bin/sh\n";
}

// Remove any previous NEXURADATA block
const startIdx = existing.indexOf(NEXURA_MARKER_START);
const endIdx = existing.indexOf(NEXURA_MARKER_END);
if (startIdx !== -1 && endIdx !== -1) {
    existing = existing.slice(0, startIdx).trimEnd() + "\n" + existing.slice(endIdx + NEXURA_MARKER_END.length).trimStart();
}

// Append the updated block before the final newline
const updated = existing.trimEnd() + "\n\n" + NEXURA_BLOCK + "\n";

writeFileSync(HOOK_PATH, updated, "utf8");
chmodSync(HOOK_PATH, 0o755);

console.log("setup-hooks: pre-push hook installed.");
