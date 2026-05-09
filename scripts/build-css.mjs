#!/usr/bin/env node
// Concatenate the source partials in assets/css/src/ (sorted lexicographically)
// into the built artifact assets/css/site.css. Source partials are the
// authoritative editable files; site.css is a generated artifact.
// See CHANGELOG.md and assets/css/src/README.md.

import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const srcDir = path.join(projectRoot, "assets/css/src");
const target = path.join(projectRoot, "assets/css/site.css");

async function main() {
  let entries;
  try {
    entries = await readdir(srcDir);
  } catch (error) {
    if (error?.code === "ENOENT") {
      console.log(`build-css: no ${path.relative(projectRoot, srcDir)} folder; skipping.`);
      return;
    }
    throw error;
  }

  const partials = entries
    .filter((name) => name.endsWith(".css"))
    .sort((a, b) => a.localeCompare(b, "en"));

  if (partials.length === 0) {
    console.log("build-css: no .css partials found; skipping.");
    return;
  }

  const chunks = [];
  for (const name of partials) {
    const contents = await readFile(path.join(srcDir, name), "utf8");
    chunks.push(contents);
  }

  const output = chunks.join("");

  // Compare to the existing site.css for safety: a silent mismatch would mean
  // the partials drifted from the served artifact. We still write, but log.
  let prevHash = null;
  try {
    const prev = await readFile(target, "utf8");
    prevHash = createHash("sha256").update(prev).digest("hex");
  } catch {
    /* first build */
  }
  const newHash = createHash("sha256").update(output).digest("hex");

  await writeFile(target, output, "utf8");

  const rel = path.relative(projectRoot, target);
  if (prevHash && prevHash !== newHash) {
    console.log(`build-css: ${rel} regenerated from ${partials.length} partials (sha256 ${newHash.slice(0, 12)}…, was ${prevHash.slice(0, 12)}…).`);
  } else {
    console.log(`build-css: ${rel} concatenated from ${partials.length} partials (sha256 ${newHash.slice(0, 12)}…).`);
  }
}

main().catch((error) => {
  console.error("build-css: failed.", error);
  process.exit(1);
});
