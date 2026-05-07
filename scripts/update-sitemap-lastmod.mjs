#!/usr/bin/env node
// Refresh <lastmod> entries in sitemap.xml from the most recent git
// commit date of the matching source HTML file.
//
// URL → file mapping rules:
//   https://nexuradata.ca/                 → index.html
//   https://nexuradata.ca/en/              → en/index.html
//   https://nexuradata.ca/<slug>           → <slug>.html
//   https://nexuradata.ca/en/<slug>        → en/<slug>.html
//
// Usage: node scripts/update-sitemap-lastmod.mjs

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const sitemapPath = resolve(repoRoot, "sitemap.xml");
const ORIGIN = "https://nexuradata.ca";

const urlToFile = (loc) => {
  if (!loc.startsWith(ORIGIN)) return null;
  let path = loc.slice(ORIGIN.length);
  if (path === "" || path === "/") return "index.html";
  if (path === "/en" || path === "/en/") return "en/index.html";
  if (path.startsWith("/")) path = path.slice(1);
  if (path.endsWith("/")) path = path.slice(0, -1);
  return `${path}.html`;
};

const gitDateFor = (relPath) => {
  const abs = resolve(repoRoot, relPath);
  if (!existsSync(abs)) return null;
  try {
    const iso = execSync(`git log -1 --format=%cI -- "${relPath}"`, {
      cwd: repoRoot,
      encoding: "utf8"
    }).trim();
    if (!iso) return null;
    return iso.slice(0, 10);
  } catch {
    return null;
  }
};

const sitemap = readFileSync(sitemapPath, "utf8");
const urlBlockRe = /<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>\s*<\/url>/g;

let updates = 0;
let missing = [];

const next = sitemap.replace(urlBlockRe, (block, loc, oldDate) => {
  const file = urlToFile(loc);
  if (!file) return block;
  const newDate = gitDateFor(file);
  if (!newDate) {
    missing.push({ loc, file });
    return block;
  }
  if (newDate === oldDate) return block;
  updates += 1;
  return block.replace(`<lastmod>${oldDate}</lastmod>`, `<lastmod>${newDate}</lastmod>`);
});

writeFileSync(sitemapPath, next);

console.log(`sitemap.xml: ${updates} <lastmod> entries refreshed.`);
if (missing.length > 0) {
  console.log(`Skipped (no matching source file or no git history):`);
  for (const m of missing) console.log(`  - ${m.loc}  →  ${m.file}`);
}
