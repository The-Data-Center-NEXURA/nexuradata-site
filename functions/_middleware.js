/**
 * Cloudflare Pages Middleware — runs before every Pages Function.
 *
 * Order matters:
 *   1. Sentry (must be first to capture errors from later middleware + functions)
 *   2. UA blocker (rejects known scanners, scrapers, AI bots)
 */

import * as Sentry from "@sentry/cloudflare";

const BLOCKED_UA_FRAGMENTS = [
    // Attack / scanning tools
    "sqlmap",
    "nikto",
    "masscan",
    "zgrab",
    // Raw scripted clients (no real browser sends these bare)
    "python-requests",
    "curl/",
    "go-http-client",
    "libwww-perl",
    // Scraping frameworks
    "scrapy",
    // Aggressive SEO crawlers
    "semrushbot",
    "ahrefsbot",
    "mj12bot",
    "dotbot",
    "petalbot",
    // AI training scrapers
    "bytespider",
    "gptbot",
    "ccbot",
];

export const blockBots = async (context) => {
    const ua = (context.request.headers.get("user-agent") || "").toLowerCase();

    for (const fragment of BLOCKED_UA_FRAGMENTS) {
        if (ua.includes(fragment)) {
            return new Response(null, { status: 403 });
        }
    }

    return context.next();
};

export const onRequest = [
    Sentry.sentryPagesPlugin((context) => ({
        dsn: context.env.SENTRY_DSN || "https://6bfe4bfc2d7e4c22429e701f269df612@o4511254844538880.ingest.us.sentry.io/4511254867345408",
        environment: context.env.SENTRY_ENVIRONMENT || "production",
        release: context.env.CF_PAGES_COMMIT_SHA || undefined,
        sendDefaultPii: false,
        tracesSampleRate: 0.1,
    })),
    blockBots,
];
