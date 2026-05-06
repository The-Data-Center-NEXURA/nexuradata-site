#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { extname } from "node:path";

const args = new Set(process.argv.slice(2));
const scanHistory = args.has("--history");
const findings = [];
const maxFindingCount = 100;

const textExtensions = new Set([
  "",
  ".css",
  ".csv",
  ".env",
  ".example",
  ".html",
  ".js",
  ".json",
  ".jsonc",
  ".md",
  ".mjs",
  ".npmrc",
  ".sql",
  ".svg",
  ".toml",
  ".txt",
  ".xml",
  ".yaml",
  ".yml"
]);

const skippedPrefixes = [
  ".git/",
  ".wrangler/",
  "coverage/",
  "node_modules/",
  "release-cloudflare/"
];

const secretNames = [
  "ACCESS_CODE_SECRET",
  "CLOUDFLARE_API_TOKEN",
  "DATABASE_URL",
  "RESEND_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET"
];

const escapedSecretNames = secretNames.join("|");
const envAssignmentPattern = new RegExp(`\\b(${escapedSecretNames})\\s*=\\s*([^\\s#]+)`, "gi");
const keyedAssignmentPattern = new RegExp(`["']?(${escapedSecretNames})["']?\\s*:\\s*["']([^"'\\n]+)["']`, "gi");

const prefixes = {
  github: "gh" + "[pousr]" + "_",
  resend: "re" + "_",
  stripeRestricted: ["rk", "live"].join("_") + "_",
  stripeSecretLive: ["sk", "live"].join("_") + "_",
  stripeSecretTest: ["sk", "test"].join("_") + "_",
  stripeWebhook: "wh" + "sec" + "_"
};

const detectors = [
  { label: "Stripe live secret key", pattern: new RegExp(`${prefixes.stripeSecretLive}[A-Za-z0-9]{16,}`) },
  { label: "Stripe test secret key", pattern: new RegExp(`${prefixes.stripeSecretTest}[A-Za-z0-9]{16,}`) },
  { label: "Stripe restricted key", pattern: new RegExp(`${prefixes.stripeRestricted}[A-Za-z0-9]{16,}`) },
  { label: "Stripe webhook secret", pattern: new RegExp(`${prefixes.stripeWebhook}[A-Za-z0-9]{16,}`) },
  { label: "Resend API key", pattern: new RegExp(`${prefixes.resend}[A-Za-z0-9]{20,}`) },
  { label: "GitHub token", pattern: new RegExp(`${prefixes.github}[A-Za-z0-9_]{30,}`) },
  { label: "AWS access key", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { label: "Google API key", pattern: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { label: "private key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/ }
];

function git(argsList, options = {}) {
  return execFileSync("git", argsList, {
    encoding: options.encoding || "utf8",
    maxBuffer: options.maxBuffer || 32 * 1024 * 1024,
    stdio: ["ignore", "pipe", "ignore"]
  });
}

function shouldScanPath(filePath) {
  const normalized = filePath.replaceAll("\\\\", "/");
  if (skippedPrefixes.some((prefix) => normalized.startsWith(prefix))) {
    return false;
  }

  return textExtensions.has(extname(normalized).toLowerCase());
}

function lineForIndex(content, index) {
  return content.slice(0, index).split("\n").length;
}

function cleanValue(value) {
  return `${value || ""}`.trim().replace(/^['"]|['",]$/g, "");
}

function isFixtureLocation(location) {
  const filePath = location.split(" (git object ")[0];
  return filePath.startsWith("tests/") || filePath.startsWith(".github/prompts/");
}

function isPlaceholderOrReference(value, location) {
  const normalized = cleanValue(value);
  if (!normalized) return true;
  if (/^<[^>]+>$/.test(normalized)) return true;
  if (/^\$\{\{/.test(normalized) || /^\$\{/.test(normalized)) return true;
  if (/^(context\.env|env|secrets)\./i.test(normalized)) return true;
  if (/^(test|test-secret|example|placeholder|null|undefined)$/i.test(normalized)) return true;
  if (/^(x+|X+)$/.test(normalized)) return true;
  if (/replace|example|placeholder|your-|xxxxx/i.test(normalized)) return true;
  if (/^postgres(?:ql)?:\/\/(?:user|username):password@/i.test(normalized)) return true;
  if (isFixtureLocation(location) && /^[A-Za-z0-9+/_:.-]+$/.test(normalized) && /test|mock|fixture|wrong|different|other|new|secret|key/i.test(normalized)) return true;

  return false;
}

function addFinding(location, label, line) {
  if (findings.length >= maxFindingCount) {
    return;
  }
  findings.push(`${location}:${line}: possible ${label}; value suppressed. Rotate it if real and move it to managed secret storage.`);
}

function scanAssignments(location, content) {
  for (const pattern of [envAssignmentPattern, keyedAssignmentPattern]) {
    pattern.lastIndex = 0;
    for (const match of content.matchAll(pattern)) {
      const secretName = match[1];
      const value = match[2];
      if (!isPlaceholderOrReference(value, location)) {
        addFinding(location, `${secretName} assignment`, lineForIndex(content, match.index || 0));
      }
    }
  }
}

function scanContent(location, content) {
  if (content.includes("\u0000")) {
    return;
  }

  for (const detector of detectors) {
    detector.pattern.lastIndex = 0;
    const match = detector.pattern.exec(content);
    if (match) {
      addFinding(location, detector.label, lineForIndex(content, match.index));
    }
  }

  scanAssignments(location, content);
}

function scanTrackedFiles() {
  const trackedOutput = git(["ls-files", "-z"], { encoding: "buffer" });
  const untrackedOutput = git(["ls-files", "--others", "--exclude-standard", "-z"], { encoding: "buffer" });
  const files = new Set([
    ...trackedOutput.toString("utf8").split("\0").filter(Boolean),
    ...untrackedOutput.toString("utf8").split("\0").filter(Boolean)
  ].filter(shouldScanPath));

  for (const file of files) {
    if (!existsSync(file)) {
      continue;
    }
    scanContent(file, readFileSync(file, "utf8"));
  }
}

function scanHistoryObjects() {
  const output = git(["rev-list", "--objects", "--all"], { maxBuffer: 128 * 1024 * 1024 });
  const seenObjects = new Set();

  for (const line of output.split("\n")) {
    const separatorIndex = line.indexOf(" ");
    if (separatorIndex < 0) {
      continue;
    }

    const objectId = line.slice(0, separatorIndex);
    const filePath = line.slice(separatorIndex + 1);
    if (seenObjects.has(objectId) || !shouldScanPath(filePath)) {
      continue;
    }
    seenObjects.add(objectId);

    const size = Number(git(["cat-file", "-s", objectId]).trim());
    if (!Number.isFinite(size) || size > 1_000_000) {
      continue;
    }

    const content = git(["cat-file", "-p", objectId], { maxBuffer: Math.max(size + 1024, 1024 * 1024) });
    scanContent(`${filePath} (git object ${objectId.slice(0, 12)})`, content);
  }
}

scanTrackedFiles();
if (scanHistory) {
  scanHistoryObjects();
}

if (findings.length > 0) {
  console.error(`\n✗ Secret scan found ${findings.length}${findings.length === maxFindingCount ? "+" : ""} finding(s):\n`);
  for (const finding of findings) {
    console.error(`  ${finding}`);
  }
  process.exit(1);
}

console.log(`✓ Secret scan passed for tracked and untracked committable files${scanHistory ? " and git history objects" : ""}.`);
