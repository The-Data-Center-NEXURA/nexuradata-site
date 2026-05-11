#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SKIP = new Set([".git", ".next", ".wrangler", "coverage", "docs", "functions", "migrations", "node_modules", "out", "release-cloudflare", "scripts", "tests"]);
const ROOT_EXCLUDES = new Set(["404.html"]);
const errors = [];

const fail = (rule, detail) => errors.push({ rule, detail });
const rel = (file) => relative(ROOT, file).replaceAll("\\", "/");
const lineAt = (content, index) => content.slice(0, index).split("\n").length;
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const attr = (tag, name) => new RegExp(`(?:^|\\s)${escapeRegex(name)}\\s*=\\s*(["'])(.*?)\\1`, "i").exec(tag)?.[2]?.trim() || "";
const visibleText = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

function htmlFiles(dir = ROOT, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP.has(entry.name)) continue;

    const path = join(dir, entry.name);
    if (entry.isDirectory()) htmlFiles(path, files);
    if (entry.isFile() && entry.name.endsWith(".html")) files.push(path);
  }
  return files;
}

function idsFor(content) {
  const ids = new Map();
  for (const match of content.matchAll(/(?:^|\s)id\s*=\s*(["'])(.*?)\1/gi)) {
    const id = match[2].trim();
    if (id) ids.set(id, [...(ids.get(id) || []), lineAt(content, match.index || 0)]);
  }
  return ids;
}

function hasName(content, tag, index) {
  const id = attr(tag, "id");
  const explicitLabel = id && new RegExp(`<label\\b[^>]*\\bfor\\s*=\\s*(["'])${escapeRegex(id)}\\1`, "i").test(content);
  const before = content.slice(0, index).toLowerCase();
  const wrappedLabel = before.lastIndexOf("<label") > before.lastIndexOf("</label>");
  return Boolean(attr(tag, "aria-label") || attr(tag, "aria-labelledby") || attr(tag, "title") || explicitLabel || wrappedLabel);
}

function checkPage(file) {
  const content = readFileSync(file, "utf8");
  const path = rel(file);
  const ids = idsFor(content);

  if (!/<html\b[^>]*\blang\s*=\s*(["']).+?\1/i.test(content)) fail("HTML_LANG_MISSING", `${path}: missing <html lang>`);
  if (!/<title>\s*[^<]+\s*<\/title>/i.test(content)) fail("TITLE_MISSING", `${path}: missing non-empty <title>`);

  for (const [id, lines] of ids.entries()) if (lines.length > 1) fail("DUPLICATE_ID", `${path}: '${id}' appears on lines ${lines.join(", ")}`);
  for (const match of content.matchAll(/<img\b[^>]*>/gi)) if (!/(?:^|\s)alt\s*=/i.test(match[0])) fail("IMAGE_ALT_MISSING", `${path}:${lineAt(content, match.index || 0)}: image missing alt`);
  for (const match of content.matchAll(/\bautofocus\b/gi)) fail("AUTOFOCUS_BLOCKED", `${path}:${lineAt(content, match.index || 0)}: autofocus is blocked`);
  for (const match of content.matchAll(/\btabindex\s*=\s*(["']?)(-?\d+)\1/gi)) if (Number(match[2]) > 0) fail("POSITIVE_TABINDEX", `${path}:${lineAt(content, match.index || 0)}: positive tabindex`);

  for (const match of content.matchAll(/<(input|select|textarea)\b[^>]*>/gi)) {
    const tag = match[0];
    if (attr(tag, "type").toLowerCase() === "hidden" || attr(tag, "aria-hidden").toLowerCase() === "true") continue;
    if (!hasName(content, tag, match.index || 0)) fail("FORM_CONTROL_NAME_MISSING", `${path}:${lineAt(content, match.index || 0)}: ${match[1]} missing name`);
  }

  for (const match of content.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)) {
    const tag = `<button${match[1]}>`;
    if (!attr(tag, "aria-label") && !attr(tag, "aria-labelledby") && !visibleText(match[2])) fail("BUTTON_NAME_MISSING", `${path}:${lineAt(content, match.index || 0)}: button missing name`);
  }

  for (const match of content.matchAll(/\baria-labelledby\s*=\s*(["'])(.*?)\1/gi)) {
    for (const id of match[2].split(/\s+/).filter(Boolean)) if (!ids.has(id)) fail("ARIA_LABELLED_BY_BROKEN", `${path}:${lineAt(content, match.index || 0)}: missing id '${id}'`);
  }
}

function checkLocales() {
  const enDir = join(ROOT, "en");
  const enPages = existsSync(enDir) ? new Set(readdirSync(enDir, { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith(".html")).map((entry) => entry.name)) : new Set();
  const rootPages = readdirSync(ROOT, { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith(".html") && !ROOT_EXCLUDES.has(entry.name)).map((entry) => entry.name);

  for (const page of rootPages) {
    if (!enPages.has(page)) fail("LOCALE_MIRROR_MISSING", `${page}: missing en/${page}`);
    if (!/<html\b[^>]*\blang\s*=\s*(["'])fr-CA\1/i.test(readFileSync(join(ROOT, page), "utf8"))) fail("FR_LANG_MISMATCH", `${page}: expected lang=fr-CA`);
    if (enPages.has(page) && !/<html\b[^>]*\blang\s*=\s*(["'])en-CA\1/i.test(readFileSync(join(enDir, page), "utf8"))) fail("EN_LANG_MISMATCH", `en/${page}: expected lang=en-CA`);
  }
}

for (const file of htmlFiles()) checkPage(file);
checkLocales();

if (errors.length > 0) {
  console.error(`\nUI smoke failed with ${errors.length} issue(s):\n`);
  for (const error of errors) console.error(`  [${error.rule}] ${error.detail}`);
  process.exit(1);
}

console.log("UI smoke passed for accessibility and bilingual readiness.");
