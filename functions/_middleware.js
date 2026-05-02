/**
 * Cloudflare Pages Middleware — runs before every Pages Function.
 *
 * Order matters:
 *   1. UA blocker (rejects known scanners, scrapers, AI bots)
 */

const BLOCKED_UA_FRAGMENTS = [
    // Attack / scanning tools
    "sqlmap",
    "nikto",
    "masscan",
    "zgrab",
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
    blockBots,
];
