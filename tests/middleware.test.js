import { afterEach, describe, it, expect, vi } from "vitest";
import { blockBots, observeFunctionRequests, secureFunctionResponses } from "../functions/_middleware.js";

afterEach(() => {
    vi.restoreAllMocks();
});

function makeContext(ua, url = "https://nexuradata.ca/api/intake") {
    return {
        request: new Request(url, {
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

    it("adds security headers to blocked responses", async () => {
        const res = await blockBots(makeContext("sqlmap/1.7"));

        expect(res.status).toBe(403);
        expect(res.headers.get("cache-control")).toBe("no-store");
        expect(res.headers.get("x-content-type-options")).toBe("nosniff");
        expect(res.headers.get("x-frame-options")).toBe("DENY");
        expect(res.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    });
});

describe("_middleware — dynamic response hardening", () => {
    it("adds security headers to Function responses", async () => {
        const res = await secureFunctionResponses({
            next: () => new Response(JSON.stringify({ ok: true }), {
                status: 200,
                headers: { "content-type": "application/json" }
            })
        });

        expect(res.status).toBe(200);
        expect(res.headers.get("content-type")).toBe("application/json");
        expect(res.headers.get("cache-control")).toBe("no-store");
        expect(res.headers.get("cross-origin-opener-policy")).toBe("same-origin");
        expect(res.headers.get("cross-origin-resource-policy")).toBe("same-site");
        expect(res.headers.get("origin-agent-cluster")).toBe("?1");
        expect(res.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
        expect(res.headers.get("permissions-policy")).toContain("autoplay=()");
        expect(res.headers.get("permissions-policy")).toContain("camera=()");
        expect(res.headers.get("x-content-type-options")).toBe("nosniff");
        expect(res.headers.get("x-frame-options")).toBe("DENY");
        expect(res.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    });

    it("does not overwrite explicit response headers", async () => {
        const res = await secureFunctionResponses({
            request: new Request("https://nexuradata.ca/api/intake"),
            next: () => new Response("ok", {
                headers: {
                    "cache-control": "private",
                    "x-robots-tag": "none"
                }
            })
        });

        expect(res.headers.get("cache-control")).toBe("private");
        expect(res.headers.get("x-robots-tag")).toBe("none");
        expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    });

    it("does not add noindex headers to public static pages", async () => {
        const res = await secureFunctionResponses({
            request: new Request("https://nexuradata.ca/"),
            next: () => new Response("ok", {
                status: 200,
                headers: { "cache-control": "public, max-age=0, must-revalidate" }
            })
        });

        expect(res.status).toBe(200);
        expect(res.headers.get("cache-control")).toBe("public, max-age=0, must-revalidate");
        expect(res.headers.get("x-robots-tag")).toBeNull();
        expect(res.headers.get("x-content-type-options")).toBeNull();
    });
});

describe("_middleware — observability", () => {
    it("adds correlation headers and logs API request outcomes", async () => {
        const spy = vi.spyOn(console, "log").mockImplementation(() => {});
        const traceparent = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";
        const res = await observeFunctionRequests({
            request: new Request("https://nexuradata.ca/api/intake", {
                method: "POST",
                headers: {
                    "x-request-id": "req-abcdef12",
                    traceparent
                }
            }),
            env: {
                CF_PAGES_BRANCH: "main",
                CF_PAGES_COMMIT_SHA: "abcdef123456"
            },
            data: {},
            next: () => new Response("ok", { status: 200 })
        });

        expect(res.headers.get("x-request-id")).toBe("req-abcdef12");
        expect(res.headers.get("x-correlation-id")).toBe("req-abcdef12");
        expect(res.headers.get("traceparent")).toBe(traceparent);

        const record = JSON.parse(spy.mock.calls[0][0]);
        expect(record.event).toBe("http.request.completed");
        expect(record.service).toBe("nexuradata-site");
        expect(record.tenant).toBe("nexuradata");
        expect(record.environment).toBe("production");
        expect(record.method).toBe("POST");
        expect(record.route).toBe("/api/intake");
        expect(record.status).toBe(200);
        expect(record.outcome).toBe("success");
    });

    it("leaves static public pages out of request logging", async () => {
        const spy = vi.spyOn(console, "log").mockImplementation(() => {});
        const res = await observeFunctionRequests({
            request: new Request("https://nexuradata.ca/"),
            next: () => new Response("ok", { status: 200 })
        });

        expect(res.headers.get("x-request-id")).toBeNull();
        expect(spy).not.toHaveBeenCalled();
    });

    it("normalizes SUPABASE_DATABASE_URL into DATABASE_URL", async () => {
        const env = { SUPABASE_DATABASE_URL: "postgres://supabase-primary" };

        await observeFunctionRequests({
            request: new Request("https://nexuradata.ca/api/status"),
            env,
            data: {},
            next: () => new Response("ok", { status: 200 })
        });

        expect(env.DATABASE_URL).toBe("postgres://supabase-primary");
    });

    it("normalizes SUPABASE_DB_URL into DATABASE_URL", async () => {
        const env = { SUPABASE_DB_URL: "postgres://supabase-short" };

        await observeFunctionRequests({
            request: new Request("https://nexuradata.ca/api/status"),
            env,
            data: {},
            next: () => new Response("ok", { status: 200 })
        });

        expect(env.DATABASE_URL).toBe("postgres://supabase-short");
    });

    it("does not override DATABASE_URL when already defined", async () => {
        const env = {
            DATABASE_URL: "postgres://existing-primary",
            SUPABASE_DATABASE_URL: "postgres://supabase-primary"
        };

        await observeFunctionRequests({
            request: new Request("https://nexuradata.ca/api/status"),
            env,
            data: {},
            next: () => new Response("ok", { status: 200 })
        });

        expect(env.DATABASE_URL).toBe("postgres://existing-primary");
    });
});
