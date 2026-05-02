import { describe, it, expect } from "vitest";
import { blockBots } from "../functions/_middleware.js";

function makeContext(ua) {
    return {
        request: new Request("https://nexuradata.ca/api/intake", {
            headers: ua ? { "user-agent": ua } : {},
        }),
        next: () => new Response("ok", { status: 200 }),
    };
}

describe("_middleware — user agent blocking", () => {
    const blocked = [
        ["sqlmap", "sqlmap/1.7"],
        ["nikto", "Nikto/2.1.6"],
        ["masscan", "masscan/1.3"],
        ["zgrab", "zgrab/0.x"],
        ["scrapy", "Scrapy/2.11"],
        ["semrushbot", "SemrushBot/7~bl"],
        ["ahrefsbot", "AhrefsBot/7.0"],
        ["mj12bot", "MJ12bot/v1.4.8"],
        ["dotbot", "DotBot/1.2"],
        ["petalbot", "PetalBot;+https://aspiegel.com/petalbot"],
        ["bytespider", "Bytespider"],
        ["gptbot", "GPTBot/1.0"],
        ["ccbot", "CCBot/2.0"],
    ];

    for (const [name, ua] of blocked) {
        it(`blocks ${name}`, async () => {
            const res = await blockBots(makeContext(ua));
            expect(res.status).toBe(403);
        });
    }

    const allowed = [
        ["Googlebot", "Mozilla/5.0 (compatible; Googlebot/2.1)"],
        ["Bingbot", "Mozilla/5.0 (compatible; bingbot/2.0)"],
        ["Chrome", "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/124.0"],
        ["Firefox", "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko Firefox/109.0"],
        ["curl", "curl/7.88.1"],
        ["python-requests", "python-requests/2.28.0"],
        ["Go HTTP client", "Go-http-client/2.0"],
        ["no UA", ""],
    ];

    for (const [name, ua] of allowed) {
        it(`allows ${name}`, async () => {
            const res = await blockBots(makeContext(ua));
            expect(res.status).toBe(200);
        });
    }
});
