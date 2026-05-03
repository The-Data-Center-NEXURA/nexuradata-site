#!/usr/bin/env node
/**
 * NEXURADATA — pre-push / CI quality gate
 *
 * Checks that cannot be caught by unit tests:
 *   1. CSP does not contain unsafe-inline or unsafe-eval
 *   2. No secrets hardcoded in functions/ (API keys, tokens, passwords)
 *   3. Functions handlers use correct onRequestOptions signature (env-aware CORS)
 *   4. GitHub metadata does not contain generated/local agent exports or placeholder templates
 *   5. release-cloudflare/ is in sync with source after build
 *   6. Public files do not expose private address/name markers
 *   7. Public HTML pages stay paired FR/EN and do not include draft/backup variants
 *   8. Internal HTML templates do not live under public assets/
 *
 * Run: node ./scripts/check.mjs
 * Exit 0 = all clear. Exit 1 = violations found (with details).
 */

import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const errors = [];

function fail(rule, detail) {
    errors.push({ rule, detail });
}

function walkFiles(dir, files = []) {
    if (!existsSync(dir)) {
        return files;
    }

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if ([".git", "node_modules", ".wrangler", "release-cloudflare"].includes(entry.name)) {
            continue;
        }

        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
            walkFiles(fullPath, files);
        } else if (entry.isFile()) {
            files.push(fullPath);
        }
    }

    return files;
}

// ─── 1. CSP — no unsafe directives ───────────────────────────────────────────
const headersPath = join(ROOT, "_headers");
if (existsSync(headersPath)) {
    const headers = readFileSync(headersPath, "utf8");
    if (/unsafe-inline|unsafe-eval/.test(headers)) {
        fail(
            "CSP_UNSAFE_DIRECTIVE",
            "_headers contains 'unsafe-inline' or 'unsafe-eval' in Content-Security-Policy. Remove them."
        );
    }
} else {
    fail("CSP_MISSING", "_headers file not found.");
}

// ─── 2. No hardcoded secrets in functions/ ───────────────────────────────────
const SECRET_PATTERNS = [
    // Generic high-entropy patterns for known key formats
    { pattern: /sk_live_[A-Za-z0-9]{20,}/, label: "Stripe live secret key" },
    { pattern: /sk_test_[A-Za-z0-9]{20,}/, label: "Stripe test secret key" },
    { pattern: /re_[A-Za-z0-9]{20,}/, label: "Resend API key" },
    { pattern: /whsec_[A-Za-z0-9]{20,}/, label: "Stripe webhook secret" },
    // Generic: any assignment to common secret var names with a quoted value
    { pattern: /(?:api.?key|secret.?key|password|token)\s*[=:]\s*['"][A-Za-z0-9+/=_\-]{16,}['"]/i, label: "Hardcoded credential assignment" },
];

const funcFiles = [];
function walk(dir) {
    if (!existsSync(dir)) {
        return;
    }

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(fullPath);
        } else if (entry.isFile() && entry.name.endsWith(".js")) {
            funcFiles.push(fullPath);
        }
    }
}
walk(join(ROOT, "functions"));

for (const file of funcFiles) {
    const content = readFileSync(file, "utf8");
    const rel = relative(ROOT, file).replaceAll("\\", "/");
    for (const { pattern, label } of SECRET_PATTERNS) {
        if (pattern.test(content)) {
            fail("SECRET_IN_CODE", `${rel}: possible ${label} detected. Use context.env.SECRET_NAME instead.`);
        }
    }
}

// ─── 3. onRequestOptions signature — must pass env ───────────────────────────
for (const file of funcFiles) {
    const content = readFileSync(file, "utf8");
    const rel = relative(ROOT, file).replaceAll("\\", "/");
    // Detect old signature: () => onOptions(  (no env argument)
    if (/onRequestOptions\s*=\s*\(\s*\)\s*=>\s*onOptions\s*\(/.test(content)) {
        fail(
            "CORS_STALE_SIGNATURE",
            `${rel}: onRequestOptions uses old signature () => onOptions(...). Update to (context) => onOptions(context.env, ...) for dynamic CORS origin.`
        );
    }
}

// ─── 4. GitHub repo hygiene ──────────────────────────────────────────────────
const agentsDir = join(ROOT, ".github", "agents");
for (const file of walkFiles(agentsDir)) {
    const rel = relative(ROOT, file).replaceAll("\\", "/");
    const content = readFileSync(file, "utf8");
    if (/Agent Discovery Results/i.test(rel) || /(?:\b[A-Z]:\/Users|\/C:\/Users|\/workspaces\/|\/home\/codespace)/i.test(content)) {
        fail("GITHUB_LOCAL_AGENT_ARTIFACT", `${rel}: local agent discovery output or machine-specific paths do not belong in the repo.`);
    }

    if (rel.endsWith(".html")) {
        fail("GITHUB_GENERATED_EXPORT", `${rel}: generated HTML exports do not belong in .github/agents/. Keep only agent Markdown files.`);
    }
}

const prTemplatePath = join(ROOT, ".github", "pull_request_template.md");
if (existsSync(prTemplatePath)) {
    const template = readFileSync(prTemplatePath, "utf8");
    if (/Sample Pull Request Template|customize it to fit|Don't forget to commit your template/i.test(template)) {
        fail("PR_TEMPLATE_PLACEHOLDER", ".github/pull_request_template.md still contains placeholder template text.");
    }
} else {
    fail("PR_TEMPLATE_MISSING", ".github/pull_request_template.md is missing.");
}

// ─── 4b. Site source hygiene ────────────────────────────────────────────────
const ROOT_HTML_EXCLUDES = new Set(["404.html"]);
const DRAFT_HTML_PATTERN = /(?:^|[-_.])(copy|old|backup|bak|draft|test|tmp|v[0-9]+)(?:[-_.]|$)|^index[0-9]+\.html$/i;
const rootHtmlPages = readdirSync(ROOT, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".html") && !ROOT_HTML_EXCLUDES.has(entry.name))
    .map((entry) => entry.name);
const enDir = join(ROOT, "en");
const enHtmlPages = existsSync(enDir)
    ? readdirSync(enDir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
        .map((entry) => entry.name)
    : [];
const enHtmlSet = new Set(enHtmlPages);
const rootHtmlSet = new Set(rootHtmlPages);

for (const page of rootHtmlPages) {
    if (DRAFT_HTML_PATTERN.test(page)) {
        fail("DRAFT_HTML_SOURCE", `${page}: draft, backup, versioned or redirect-only HTML pages should not be kept as public source.`);
    }
    if (!enHtmlSet.has(page)) {
        fail("BILINGUAL_PAGE_PAIR", `${page}: missing matching en/${page}. Keep FR and EN public pages paired.`);
    }
}

for (const page of enHtmlPages) {
    if (DRAFT_HTML_PATTERN.test(page)) {
        fail("DRAFT_HTML_SOURCE", `en/${page}: draft, backup, versioned or redirect-only HTML pages should not be kept as public source.`);
    }
    if (!rootHtmlSet.has(page)) {
        fail("BILINGUAL_PAGE_PAIR", `en/${page}: missing matching root ${page}. Keep FR and EN public pages paired.`);
    }
}

for (const file of walkFiles(join(ROOT, "assets"))) {
    const rel = relative(ROOT, file).replaceAll("\\", "/");
    if (extname(file).toLowerCase() === ".html") {
        fail("PUBLIC_ASSET_HTML", `${rel}: internal HTML templates do not belong under public assets/. Move them to docs/ or a non-published folder.`);
    }
}

// ─── 5. release-cloudflare/ in sync with source ──────────────────────────────
try {
    execSync("npm run build --silent", { cwd: ROOT, stdio: "pipe" });
    const dirty = execSync("git status --porcelain release-cloudflare/", { cwd: ROOT, encoding: "utf8" }).trim();
    if (dirty) {
        fail(
            "BUILD_OUT_OF_SYNC",
            "release-cloudflare/ is out of sync with source. Run 'npm run build' and commit the result.\n" + dirty
        );
    }
} catch (e) {
    fail("BUILD_FAILED", "npm run build failed: " + (e.message || e));
}

// ─── 6. Public sensitive content guard ───────────────────────────────────────
const TEXT_EXTENSIONS = new Set([".css", ".html", ".js", ".json", ".jsonc", ".md", ".txt", ".xml"]);
const SENSITIVE_SCAN_EXCLUDE = new Set(["scripts/check.mjs"]);
const PRIVATE_CONTENT_PATTERNS = [
    { pattern: /o\.blanchet13@gmail\.com/i, label: "personal email" },
    { pattern: /(?:\b[A-Z]:\/Users|\/C:\/Users|\/workspaces\/nexuradata-site|\/home\/codespace)/i, label: "machine-specific local path" },
    { pattern: /Giacomo\s+Navarro/i, label: "personal name" },
    { pattern: /\b1102\b/i, label: "private street number" },
    { pattern: /J4K\s*1W6/i, label: "private postal code" },
    { pattern: /C[oô]teau[-\s]Rouge/i, label: "private street name" },
    { pattern: /ch\.\s*du\s*C[oô]teau/i, label: "private street abbreviation" },
    { pattern: /chemin\s+du\s+C[oô]teau/i, label: "private street wording" },
];

for (const file of walkFiles(ROOT)) {
    const rel = relative(ROOT, file).replaceAll("\\", "/");
    if (SENSITIVE_SCAN_EXCLUDE.has(rel) || !TEXT_EXTENSIONS.has(extname(file).toLowerCase())) {
        continue;
    }

    const content = readFileSync(file, "utf8");
    for (const { pattern, label } of PRIVATE_CONTENT_PATTERNS) {
        if (pattern.test(content)) {
            fail("SENSITIVE_PUBLIC_CONTENT", `${rel}: blocked ${label}. Use public business contact language only.`);
        }
    }
}

// ─── Report ───────────────────────────────────────────────────────────────────
if (errors.length === 0) {
    console.log("✓ All checks passed.");
    process.exit(0);
} else {
    console.error(`\n✗ ${errors.length} check(s) failed:\n`);
    for (const { rule, detail } of errors) {
        console.error(`  [${rule}]\n  ${detail}\n`);
    }
    process.exit(1);
}
