/**
 * Cloudflare Pages Middleware — runs before every Pages Function.
 *
 * Order matters:
 *   1. UA blocker (rejects known scanners, scrapers, AI bots)
 *   2. Security headers for dynamic Function responses
 */

const FUNCTION_SECURITY_HEADERS = {
    "Cache-Control": "no-store",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-site",
    "Origin-Agent-Cluster": "?1",
    "Permissions-Policy": "accelerometer=(), autoplay=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-Permitted-Cross-Domain-Policies": "none",
    "X-Robots-Tag": "noindex, nofollow"
};

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

export const withFunctionSecurityHeaders = (response) => {
    const headers = new Headers(response.headers);

    for (const [name, value] of Object.entries(FUNCTION_SECURITY_HEADERS)) {
        if (!headers.has(name)) {
            headers.set(name, value);
        }
    }

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
    });
};

export const blockBots = async (context) => {
    const ua = (context.request.headers.get("user-agent") || "").toLowerCase();

    for (const fragment of BLOCKED_UA_FRAGMENTS) {
        if (ua.includes(fragment)) {
            return withFunctionSecurityHeaders(new Response(null, { status: 403 }));
        }
    }

    return context.next();
};

export const secureFunctionResponses = async (context) => withFunctionSecurityHeaders(await context.next());

export const onRequest = [
    blockBots,
    secureFunctionResponses,
];
