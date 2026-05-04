import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const releaseDir = path.join(projectRoot, "release-cloudflare");
// Legacy URLs handled by _redirects only; do not publish stale source files if they reappear.
const redirectOnlyHtmlFiles = new Set(["index2.html"]);

const rootFiles = new Set([
  "_headers",
  "_redirects",
  ".nojekyll",
  "robots.txt",
  "site.webmanifest",
  "merchant-feed.xml",
  "sitemap.xml"
]);

const shouldCopyRootEntry = (entry) => {
  if (entry === "assets") {
    return true;
  }

  if (entry === "en") {
    return true;
  }

  if (entry === "operations") {
    return true;
  }

  if (entry === ".well-known") {
    return true;
  }

  if (rootFiles.has(entry)) {
    return true;
  }

  if (path.extname(entry).toLowerCase() === ".html") {
    return !redirectOnlyHtmlFiles.has(entry);
  }

  return false;
};

const walkHtmlFiles = async (dir, files = []) => {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await walkHtmlFiles(fullPath, files);
    } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === ".html") {
      files.push(fullPath);
    }
  }

  return files;
};

const collectJsonLdCspHashes = (content) => {
  const hashes = new Set();
  const jsonLdScriptPattern = /<script\b(?=[^>]*\btype=["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi;

  for (const match of content.matchAll(jsonLdScriptPattern)) {
    hashes.add(`'sha256-${createHash("sha256").update(match[1], "utf8").digest("base64")}'`);
  }

  return [...hashes].sort();
};

const addCspHashesToDirective = (headersContent, directive, hashes) => {
  if (hashes.length === 0) {
    return headersContent;
  }

  const directivePattern = new RegExp(`(^|;\\s*)(${directive}\\s+)([^;]+)`, "m");

  return headersContent.replace(directivePattern, (full, separator, prefix, value) => {
    const tokens = value.trim().split(/\s+/);
    const existing = new Set(tokens);
    const missing = hashes.filter((hash) => !existing.has(hash));

    if (missing.length === 0) {
      return full;
    }

    const selfIndex = tokens.indexOf("'self'");

    if (selfIndex >= 0) {
      tokens.splice(selfIndex + 1, 0, ...missing);
    } else {
      tokens.unshift(...missing);
    }

    return `${separator}${prefix}${tokens.join(" ")}`;
  });
};

const injectJsonLdCspHashes = async () => {
  const headersPath = path.join(releaseDir, "_headers");
  let headersContent = await readFile(headersPath, "utf8");
  const cspMatch = headersContent.match(/^\s{2}Content-Security-Policy:\s*(.+)$/m);

  if (!cspMatch) {
    return;
  }

  const baseCsp = cspMatch[1].trim();
  const pageRules = [];

  headersContent = headersContent.replace(/^\s{2}Content-Security-Policy:.+\n/m, "");

  for (const file of await walkHtmlFiles(releaseDir)) {
    const content = await readFile(file, "utf8");
    const hashes = collectJsonLdCspHashes(content);
    const relativePath = path.relative(releaseDir, file).replaceAll(path.sep, "/");
    const csp = addCspHashesToDirective(
      addCspHashesToDirective(baseCsp, "script-src", hashes),
      "script-src-elem",
      hashes
    );
    const routes = relativePath === "index.html"
      ? ["/", "/index.html"]
      : relativePath.endsWith("/index.html")
        ? [`/${relativePath.replace(/index\.html$/, "")}`, `/${relativePath}`]
        : [`/${relativePath}`];

    for (const route of routes) {
      pageRules.push(`${route}\n  Content-Security-Policy: ${csp}`);
    }
  }

  await writeFile(headersPath, `${headersContent.trimEnd()}\n\n# Generated per-page CSP rules for inline JSON-LD hashes.\n${pageRules.join("\n\n")}\n`);
};

await rm(releaseDir, { recursive: true, force: true });
await mkdir(releaseDir, { recursive: true });

const entries = await readdir(projectRoot, { withFileTypes: true });

for (const entry of entries) {
  if (!shouldCopyRootEntry(entry.name)) {
    continue;
  }

  const source = path.join(projectRoot, entry.name);
  const destination = path.join(releaseDir, entry.name);

  await cp(source, destination, { recursive: true });
}

await injectJsonLdCspHashes();

console.log("Generated release-cloudflare/ from the tracked site source.");
