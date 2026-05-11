import { describe, it, expect, vi } from "vitest";

vi.mock("@neondatabase/serverless", () => ({
    neon: () => async () => [{ ok: 1 }]
}));

const { onRequestGet, onRequestOptions } = await import("../functions/api/platform-status.js");

function makeReq(headers = {}) {
    return new Request("https://nexuradata.ca/api/platform-status", {
        method: "GET",
        headers: { accept: "application/json", "user-agent": "vitest", ...headers }
    });
}

describe("functions/api/platform-status — preflight", () => {
    it("returns 204 to OPTIONS", async () => {
        const res = await onRequestOptions({ env: {} });
        expect(res.status).toBe(204);
    });
});

describe("functions/api/platform-status — empty env", () => {
    it("returns 200 with all secret-bound components marked down and database down", async () => {
        // No env → DATABASE_URL missing → getDb throws → database = down
        const ctx = { request: makeReq(), env: {} };
        const res = await onRequestGet(ctx);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.ok).toBe(true);
        expect(Array.isArray(data.components)).toBe(true);
        const map = Object.fromEntries(data.components.map((c) => [c.id, c]));
        expect(map.site.status).toBe("operational");
        expect(map.lab.status).toBe("operational");
        expect(map.intake.status).toBe("down");
        expect(map.status.status).toBe("down");
        expect(map.payments.status).toBe("down");
        expect(map.email.status).toBe("down");
        expect(map.database.status).toBe("down");
        expect(map.database.detail).toMatch(/DATABASE_URL\/SUPABASE_DATABASE_URL/);
        expect(data.overall).toBe("down");
    });
});

describe("functions/api/platform-status — fully configured env", () => {
    it("reports operational across the board with a successful Neon ping", async () => {
        const ctx = {
            request: makeReq(),
            env: {
                DATABASE_URL: "postgres://test",
                ACCESS_CODE_SECRET: "x",
                STRIPE_SECRET_KEY: "sk_test",
                STRIPE_WEBHOOK_SECRET: "whsec_x",
                RESEND_API_KEY: "re_x"
            }
        };
        const res = await onRequestGet(ctx);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.overall).toBe("operational");
        const map = Object.fromEntries(data.components.map((c) => [c.id, c]));
        expect(map.intake.status).toBe("operational");
        expect(map.payments.status).toBe("operational");
        expect(map.email.status).toBe("operational");
        expect(map.database.status).toBe("operational");
    });
});

describe("functions/api/platform-status — lab override", () => {
    it("respects LAB_STATUS_OVERRIDE=degraded with a custom detail", async () => {
        const ctx = {
            request: makeReq(),
            env: {
                DATABASE_URL: "postgres://test",
                ACCESS_CODE_SECRET: "x",
                STRIPE_SECRET_KEY: "sk_test",
                STRIPE_WEBHOOK_SECRET: "whsec_x",
                RESEND_API_KEY: "re_x",
                LAB_STATUS_OVERRIDE: "degraded",
                LAB_STATUS_DETAIL: "Maintenance préventive en cours."
            }
        };
        const res = await onRequestGet(ctx);
        const data = await res.json();
        const lab = data.components.find((c) => c.id === "lab");
        expect(lab.status).toBe("degraded");
        expect(lab.detail).toMatch(/Maintenance/);
        expect(data.overall).toBe("degraded");
    });
});

describe("functions/api/platform-status — Supabase URL alias", () => {
    it("reports database operational when only SUPABASE_DATABASE_URL is configured", async () => {
        const ctx = {
            request: makeReq(),
            env: {
                SUPABASE_DATABASE_URL: "postgres://test",
                ACCESS_CODE_SECRET: "x",
                STRIPE_SECRET_KEY: "sk_test",
                STRIPE_WEBHOOK_SECRET: "whsec_x",
                RESEND_API_KEY: "re_x"
            }
        };
        const res = await onRequestGet(ctx);
        expect(res.status).toBe(200);
        const data = await res.json();
        const map = Object.fromEntries(data.components.map((c) => [c.id, c]));
        expect(map.database.status).toBe("operational");
        expect(map.intake.status).toBe("operational");
        expect(map.status.status).toBe("operational");
    });

    it("reports operational when only SUPABASE_DB_URL is configured", async () => {
        const ctx = {
            request: makeReq(),
            env: {
                SUPABASE_DB_URL: "postgres://test",
                ACCESS_CODE_SECRET: "x",
                STRIPE_SECRET_KEY: "sk_test",
                STRIPE_WEBHOOK_SECRET: "whsec_x",
                RESEND_API_KEY: "re_x"
            }
        };
        const res = await onRequestGet(ctx);
        expect(res.status).toBe(200);
        const data = await res.json();
        const map = Object.fromEntries(data.components.map((c) => [c.id, c]));
        expect(map.database.status).toBe("operational");
        expect(map.intake.status).toBe("operational");
        expect(map.status.status).toBe("operational");
    });

    it("marks intake/status down when ACCESS_CODE_SECRET is missing", async () => {
        const ctx = {
            request: makeReq(),
            env: {
                SUPABASE_DATABASE_URL: "postgres://test",
                STRIPE_SECRET_KEY: "sk_test",
                STRIPE_WEBHOOK_SECRET: "whsec_x",
                RESEND_API_KEY: "re_x"
            }
        };
        const res = await onRequestGet(ctx);
        expect(res.status).toBe(200);
        const data = await res.json();
        const map = Object.fromEntries(data.components.map((c) => [c.id, c]));
        expect(map.database.status).toBe("operational");
        expect(map.intake.status).toBe("down");
        expect(map.status.status).toBe("down");
        expect(map.intake.detail).toMatch(/ACCESS_CODE_SECRET/);
    });
});
