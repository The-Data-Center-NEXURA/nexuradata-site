#!/usr/bin/env node
/**
 * Bump the `?v=YYYYMMDD<letter>` query-string suffix on every HTML file so the
 * Cloudflare CDN + browsers fetch the latest /assets/css/* and /assets/js/*
 * after a deploy. The cache headers ship as `immutable, max-age=1y`, so the
 * version token is the only knob that forces a fresh download.
 *
 * Run on its own with `node scripts/bump-asset-version.mjs` or as part of
 * `npm run deploy`. Idempotent: bumps to the next letter for the current day,
 * or starts back at `a` when the day rolls over.
 */
import { readFile, writeFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKIP_DIRS = new Set([
  "release-cloudflare",
  "node_modules",
  "coverage",
  "apps",
  ".git",
  ".venv",
]);
const VERSION_RE = /\?v=(\d{8})([a-z])/g;

const walk = async (dir, out) => {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, out);
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      out.push(full);
    }
  }
};

const todayToken = () => {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
};

const nextLetter = (letter) => {
  if (!letter || letter === "z") return "a";
  return String.fromCharCode(letter.charCodeAt(0) + 1);
};

const main = async () => {
  const files = [];
  await walk(projectRoot, files);

  const today = todayToken();
  let highestLetter = null;
  for (const file of files) {
    const txt = await readFile(file, "utf8");
    for (const m of txt.matchAll(VERSION_RE)) {
      if (m[1] === today && (!highestLetter || m[2] > highestLetter)) {
        highestLetter = m[2];
      }
    }
  }
  const nextToken = `${today}${highestLetter ? nextLetter(highestLetter) : "a"}`;

  let changed = 0;
  for (const file of files) {
    const txt = await readFile(file, "utf8");
    const next = txt.replace(VERSION_RE, `?v=${nextToken}`);
    if (next !== txt) {
      await writeFile(file, next, "utf8");
      changed += 1;
    }
  }
  console.log(`✓ Asset version bumped to ${nextToken} across ${changed} file(s).`);
};

main().catch((err) => {
  console.error("✗ bump-asset-version failed:", err);
  process.exit(1);
});
