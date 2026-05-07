#!/usr/bin/env node
// Verify every relative import in functions/**/*.js resolves to a real file.
// This catches the recurring "wrong number of ../" bug class that vitest does
// not surface (because vitest only resolves files it imports itself).
import { readFileSync, existsSync, statSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const repoRoot = resolve(fileURLToPath(import.meta.url), "..", "..");
const functionsDir = join(repoRoot, "functions");

const tracked = execFileSync("git", ["ls-files", "functions"], {
  cwd: repoRoot,
  encoding: "utf8"
})
  .split("\n")
  .filter((f) => f.endsWith(".js"));

const importPattern = /(?:^|\s)(?:import|export)[^"'`;]*?(?:from\s+|\(\s*)["']([^"']+)["']/g;
const dynamicImportPattern = /\bimport\(\s*["']([^"']+)["']\s*\)/g;

const errors = [];
let checked = 0;

const tryResolve = (basePath, spec) => {
  const candidates = [];
  if (spec.endsWith(".js") || spec.endsWith(".mjs") || spec.endsWith(".json")) {
    candidates.push(resolve(basePath, spec));
  } else {
    candidates.push(resolve(basePath, spec + ".js"));
    candidates.push(resolve(basePath, spec + "/index.js"));
    candidates.push(resolve(basePath, spec));
  }
  for (const c of candidates) {
    if (existsSync(c)) {
      try {
        const s = statSync(c);
        if (s.isFile()) return c;
      } catch {
        // ignore
      }
    }
  }
  return null;
};

for (const relFile of tracked) {
  const absFile = join(repoRoot, relFile);
  let src;
  try {
    src = readFileSync(absFile, "utf8");
  } catch {
    continue;
  }
  const baseDir = dirname(absFile);
  const seen = new Set();
  for (const pattern of [importPattern, dynamicImportPattern]) {
    pattern.lastIndex = 0;
    for (const match of src.matchAll(pattern)) {
      const spec = match[1];
      if (!spec.startsWith(".") && !spec.startsWith("/")) continue; // skip bare specifiers
      if (seen.has(spec)) continue;
      seen.add(spec);
      checked++;
      const resolved = tryResolve(baseDir, spec);
      if (!resolved) {
        errors.push(`${relFile}: cannot resolve "${spec}"`);
      } else if (!resolved.startsWith(repoRoot)) {
        errors.push(`${relFile}: import "${spec}" escapes repo root → ${resolved}`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error(`\n✗ Import-resolution check found ${errors.length} broken import(s):`);
  for (const err of errors) console.error("  " + err);
  process.exit(1);
}
console.log(`✓ Import-resolution check passed (${checked} relative specifiers in ${tracked.length} files).`);
