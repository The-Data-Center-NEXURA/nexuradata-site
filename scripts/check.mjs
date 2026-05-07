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
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SITE_CSS_VERSION = "20260507e";
const SITE_JS_VERSION = "20260507e";
const errors = [];

function fail(rule, detail) {
    errors.push({ rule, detail });
}

function walkFiles(dir, files = []) {
    if (!existsSync(dir)) {
        return files;
    }

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if ([".git", "node_modules", ".wrangler", "coverage", "release-cloudflare"].includes(entry.name)) {
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

const jsonLdScriptPattern = /<script\b(?=[^>]*\btype=["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi;
const inlineScriptPattern = /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;

function collectJsonLdCspHashes(dir) {
    const hashes = new Set();

    for (const file of walkFiles(dir)) {
        if (extname(file).toLowerCase() !== ".html") continue;

        const content = readFileSync(file, "utf8");

        for (const match of content.matchAll(jsonLdScriptPattern)) {
            hashes.add(`'sha256-${createHash("sha256").update(match[1], "utf8").digest("base64")}'`);
        }
    }

    return [...hashes].sort();
}

// ─── 1. CSP — no unsafe directives ───────────────────────────────────────────
const headersPath = join(ROOT, "_headers");
let headersContent = "";
if (existsSync(headersPath)) {
    headersContent = readFileSync(headersPath, "utf8");
    if (/unsafe-inline|unsafe-eval/.test(headersContent)) {
        fail(
            "CSP_UNSAFE_DIRECTIVE",
            "_headers contains 'unsafe-inline' or 'unsafe-eval' in Content-Security-Policy. Remove them."
        );
    }
} else {
    fail("CSP_MISSING", "_headers file not found.");
}

for (const file of walkFiles(ROOT)) {
    if (extname(file).toLowerCase() !== ".html") continue;

    const rel = relative(ROOT, file).replaceAll("\\", "/");
    const content = readFileSync(file, "utf8");

    for (const match of content.matchAll(inlineScriptPattern)) {
        if (!/type=["']application\/ld\+json["']/i.test(match[0])) {
            fail("INLINE_SCRIPT_SOURCE", `${rel}: inline scripts must be externalized unless they are JSON-LD.`);
        }
    }
}

const homepageVideoMarkup = [join(ROOT, "index.html"), join(ROOT, "en", "index.html")]
    .filter((file) => existsSync(file))
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");

if (/<video\b/i.test(homepageVideoMarkup) && !/data-motion-video/i.test(homepageVideoMarkup)) {
    fail("HOMEPAGE_VIDEO_GUARD", "Homepage video must be marked as a controlled background motion layer with data-motion-video.");
}

const publicVideoDir = join(ROOT, "assets", "video");
if (existsSync(publicVideoDir)) {
    for (const entry of readdirSync(publicVideoDir, { withFileTypes: true })) {
        if (!entry.isFile() || !/\.(?:mp4|webm)$/i.test(entry.name)) continue;

        const size = readFileSync(join(publicVideoDir, entry.name)).byteLength;
        if (size > 900_000) {
            fail("PUBLIC_VIDEO_ASSET_SIZE", `assets/video/${entry.name}: background videos must stay below 900 KB.`);
        }
    }
}

const siteCssPath = join(ROOT, "assets", "css", "site.css");
if (existsSync(siteCssPath)) {
    const siteCss = readFileSync(siteCssPath, "utf8");
    if (!siteCss.includes('--font-display: "IBM Plex Sans"') || !siteCss.includes('--font-sans: "IBM Plex Sans"') || !siteCss.includes('--font-mono: "IBM Plex Mono"')) {
        fail("IBM_FONT_TOKENS", "assets/css/site.css must define IBM Plex Sans and IBM Plex Mono font tokens.");
    }

    if (/Georgia|Times New Roman/i.test(siteCss)) {
        fail("NON_IBM_SITE_CSS_FONT", "assets/css/site.css must not reference Georgia or Times New Roman.");
    }

    if (!/body\s*\{[\s\S]*font-family:\s*var\(--font-sans\)/.test(siteCss)) {
        fail("IBM_BODY_FONT", "assets/css/site.css body must use var(--font-sans).");
    }

    if (!siteCss.includes(".chatbot-dock") || !siteCss.includes(".chatbot-brand-tile") || !siteCss.includes(".chatbot-brand-logo") || /\.whatsapp-fab\b/.test(siteCss)) {
        fail("IBM_CHATBOT_CSS", "assets/css/site.css must expose the branded NEXURADATA square chatbot dock, not the old WhatsApp FAB.");
    }

    if (!siteCss.includes(".cookie-consent") || !siteCss.includes(".footer-cookie-button")) {
        fail("COOKIE_CONSENT_CSS", "assets/css/site.css must style the cookie consent bar and footer preference button.");
    }

    if (!siteCss.includes(".kinetic-canvas") || !siteCss.includes("@keyframes motion-grid-drift") || !siteCss.includes("@keyframes motion-critical-scan") || !siteCss.includes("prefers-reduced-motion: reduce")) {
        fail("CONTROLLED_MOTION_CSS", "assets/css/site.css must provide controlled modern background motion with reduced-motion handling.");
    }

    const baseResetCss = siteCss.slice(0, siteCss.indexOf("html {") > 0 ? siteCss.indexOf("html {") : 0);
    if (/animation:\s*none\s*!important/i.test(baseResetCss)) {
        fail("GLOBAL_ANIMATION_KILL", "assets/css/site.css must not globally disable every animation; use reduced-motion and controlled background layers.");
    }
} else {
    fail("SITE_CSS_MISSING", "assets/css/site.css file not found.");
}

const siteJsPath = join(ROOT, "assets", "js", "site.js");
if (existsSync(siteJsPath)) {
    const siteJs = readFileSync(siteJsPath, "utf8");
    if (!siteJs.includes("chatbot-dock") || !siteJs.includes("/assets/nexuradata-master.svg") || !siteJs.includes("/assets/nexuradata-icon.png") || !siteJs.includes("data-chatbot-diagnostic") || !siteJs.includes('data-chatbot-action="urgent_whatsapp"') || !siteJs.includes('data-chatbot-action="stripe_payment"') || !siteJs.includes('data-chatbot-action="copy_summary"') || !siteJs.includes("data-chatbot-protocol") || !siteJs.includes("data-chatbot-case-form") || !siteJs.includes("submitAutonomousCase")) {
        fail("IBM_CHATBOT_JS", "assets/js/site.js must render the branded NEXURADATA square superbot with autonomous case creation, protocol, Stripe handoff, copy summary, and urgent WhatsApp.");
    }

    if (!siteJs.includes("data-stripe-checkout-link") || !siteJs.includes("nexuradata:payments-rendered")) {
        fail("CHATBOT_STRIPE_HANDOFF", "assets/js/site.js must let the chatbot open existing Stripe Checkout links from the client portal.");
    }

    if (!siteJs.includes("CONSENT_STORAGE_KEY") || !siteJs.includes("renderCookieConsent") || !siteJs.includes("loadGa4") || !siteJs.includes("loadMetaPixel")) {
        fail("COOKIE_CONSENT_JS", "assets/js/site.js must gate GA4 and Meta Pixel behind the cookie consent bar.");
    }

    if (!siteJs.includes("initKineticCanvas") || !siteJs.includes("data-kinetic-canvas") || !siteJs.includes("requestAnimationFrame")) {
        fail("KINETIC_CANVAS_JS", "assets/js/site.js must render the homepage kinetic canvas background.");
    }

    if (/chatbot-meter[\s\S]{0,180}style=/.test(siteJs)) {
        fail("CHATBOT_CSP_INLINE_STYLE", "assets/js/site.js must not render inline style attributes for the chatbot meter.");
    }
} else {
    fail("SITE_JS_MISSING", "assets/js/site.js file not found.");
}

if (existsSync(join(ROOT, "assets", "js", "ga4-init.js"))) {
    fail("LEGACY_GA4_INIT", "assets/js/ga4-init.js must not exist. GA4 is loaded only by the consent manager.");
}

if (!existsSync(join(ROOT, "assets", "nexuradata-icon.png"))) {
    fail("IBM_CHATBOT_IMAGE", "assets/nexuradata-icon.png must exist for the branded square diagnostic chatbot.");
}

// ─── 2. No hardcoded secrets in functions/ ───────────────────────────────────
const wranglerPath = join(ROOT, "wrangler.jsonc");
if (existsSync(wranglerPath)) {
    const wranglerConfig = readFileSync(wranglerPath, "utf8");
    if (!/"STRIPE_MODE"\s*:\s*"live"/.test(wranglerConfig)) {
        fail("STRIPE_LIVE_MODE_MISSING", "wrangler.jsonc must set STRIPE_MODE to live for production Stripe Checkout.");
    }
} else {
    fail("WRANGLER_CONFIG_MISSING", "wrangler.jsonc is missing; Cloudflare Pages runtime vars cannot be verified.");
}

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

for (const file of [...rootHtmlPages.map((page) => join(ROOT, page)), ...enHtmlPages.map((page) => join(enDir, page))]) {
    const rel = relative(ROOT, file).replaceAll("\\", "/");
    const content = readFileSync(file, "utf8");

    if (content.includes("site.css?v=") && !content.includes(`site.css?v=${SITE_CSS_VERSION}`)) {
        fail("STALE_SITE_CSS_VERSION", `${rel}: update the site.css cache key to ${SITE_CSS_VERSION}.`);
    }

    if (content.includes("site.js") && !content.includes(`site.js?v=${SITE_JS_VERSION}`)) {
        fail("STALE_SITE_JS_VERSION", `${rel}: update the site.js cache key to ${SITE_JS_VERSION}.`);
    }

    if (content.includes("site.css") && !/IBM\+Plex\+Mono[\s\S]*IBM\+Plex\+Sans/.test(content)) {
        fail("IBM_FONT_LINK_MISSING", `${rel}: missing IBM Plex Sans/Mono Google Fonts link before site.css.`);
    }
}

for (const file of walkFiles(ROOT)) {
    const rel = relative(ROOT, file).replaceAll("\\", "/");
    if (extname(file).toLowerCase() !== ".html") continue;

    const content = readFileSync(file, "utf8");
    if (/googletagmanager\.com\/gtag|gtag\(['"]config['"],\s*['"]G-TC31YSS01P/i.test(content)) {
        fail("TRACKING_BEFORE_CONSENT", `${rel}: GA4 must be loaded by the consent manager, not inline in HTML.`);
    }

    if (/mailto:privacy@nexuradata\.ca/.test(content) && !content.includes("data-cookie-preferences")) {
        fail("COOKIE_PREFERENCES_FOOTER", `${rel}: privacy footer must include a cookie preference button.`);
    }

    if (/mailto:privacy\.ca|>privacy\.ca</i.test(content)) {
        fail("PRIVACY_EMAIL_BROKEN", `${rel}: privacy email must be privacy@nexuradata.ca.`);
    }
}

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
    const releaseHeadersPath = join(ROOT, "release-cloudflare", "_headers");
    const releaseHeadersContent = existsSync(releaseHeadersPath) ? readFileSync(releaseHeadersPath, "utf8") : "";
    const jsonLdHashes = collectJsonLdCspHashes(ROOT);

    if (releaseHeadersContent.split(/\r?\n/).some((line) => line.length > 2000)) {
        fail("HEADERS_LINE_LENGTH", "release-cloudflare/_headers has a line longer than Cloudflare's 2000-character limit.");
    }

    const globalHeadersBlock = releaseHeadersContent.match(/^\/\*\n(?:\s{2}.+\n)*/m)?.[0] || "";

    if (/^\s{2}Content-Security-Policy:/m.test(globalHeadersBlock)) {
        fail("GLOBAL_STATIC_CSP", "release-cloudflare/_headers must generate page-specific CSP rules so JSON-LD hashes stay under Cloudflare line limits.");
    }

    for (const hash of jsonLdHashes) {
        if (!releaseHeadersContent.includes(hash)) {
            fail("JSON_LD_CSP_HASH", `release-cloudflare/_headers is missing CSP hash ${hash} for inline JSON-LD.`);
        }
    }

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
