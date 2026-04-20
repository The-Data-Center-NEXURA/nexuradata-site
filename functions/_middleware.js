/**
 * Cloudflare Pages Middleware — runs before every Pages Function.
 * Blocks known scanners, scrapers, and bot user agents.
 */

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

export const onRequest = async (context) => {
    const ua = (context.request.headers.get("user-agent") || "").toLowerCase();

    for (const fragment of BLOCKED_UA_FRAGMENTS) {
        if (ua.includes(fragment)) {
            return new Response(null, { status: 403 });
        }
    }

    return context.next();
};
