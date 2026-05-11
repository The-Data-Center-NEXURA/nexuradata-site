import { describe, it, expect, vi } from "vitest";
import { onRequestPost as intakeHandler, onRequestOptions as intakeOptions } from "../../functions/api/intake.js";
import { onRequestPost as diagnosticHandler, onRequestOptions as diagnosticOptions, onRequest as diagnosticFallback } from "../../functions/api/diagnostic.js";
import { onRequestPost as statusHandler, onRequestOptions as statusOptions, onRequest as statusFallback } from "../../functions/api/status.js";
import { onRequestPost as authorizationHandler, onRequestOptions as authorizationOptions, onRequest as authorizationFallback } from "../../functions/api/authorization.js";
import { isAllowedStripeWebhookEvent, onRequestPost as webhookHandler } from "../../functions/api/stripe-webhook.js";

// ─── Helpers ────────────────────────────────────────────────

let requestCounter = 0;

const makeContext = (body, env = {}, method = "POST") => {
  requestCounter += 1;
  return {
  request: new Request("https://nexuradata.ca/api/intake", {
    method,
    headers: { "content-type": "application/json", "cf-connecting-ip": `203.0.113.${requestCounter}` },
    body: JSON.stringify(body)
  }),
  env
  };
};

const makeSignedStripeRequest = async (body, secret = "whsec_test_secret") => {
  const rawBody = JSON.stringify(body);
  const timestamp = Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${rawBody}`));
  const signature = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");

  return new Request("https://nexuradata.ca/api/stripe-webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "Stripe-Signature": `t=${timestamp},v1=${signature}`
    },
    body: rawBody
  });
};

const validIntakePayload = {
  nom: "Jean Dupont",
  courriel: "jean@example.com",
  telephone: "514-555-0100",
  support: "Disque dur",
  urgence: "Standard",
  profil: "Particulier",
  impact: "Planifié / non urgent",
  sensibilite: "Standard",
  message: "Mon disque ne démarre plus.",
  consentement: true
};

// ─── intake endpoint ────────────────────────────────────────

describe("POST /api/intake", () => {
  it("returns 503 when DATABASE_URL is not configured", async () => {
    const ctx = makeContext({}, {});
    const res = await intakeHandler(ctx);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.fallback).toBe("mailto");
  });

  it("returns 503 when ACCESS_CODE_SECRET is missing", async () => {
    const ctx = makeContext({}, { DATABASE_URL: "postgresql://test" });
    const res = await intakeHandler(ctx);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it("returns 400 for invalid submission (missing fields)", async () => {
    const env = { DATABASE_URL: "postgresql://test", ACCESS_CODE_SECRET: "test-secret" };
    const ctx = makeContext({ nom: "" }, env);
    const res = await intakeHandler(ctx);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it("returns mail fallback when backend processing fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const ctx = makeContext(validIntakePayload, { DATABASE_URL: "wrong-test-url", ACCESS_CODE_SECRET: "test-secret" });

    try {
      const res = await intakeHandler(ctx);
      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.fallback).toBe("mailto");
      expect(body.message).toContain("courriel préparé");
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("OPTIONS handler returns 204", () => {
    const res = intakeOptions({ env: {} });
    expect(res.status).toBe(204);
  });
});

// ─── diagnostic endpoint ────────────────────────────────────

describe("POST /api/diagnostic", () => {
  it("returns a server-side automation plan without creating a case", async () => {
    const ctx = makeContext({
      support: "drive",
      symptom: "deleted",
      urgency: "standard",
      history: "software",
      value: "personal",
      state: "powered_off",
      context: "NAS Synology payroll down. CHKDSK and rebuild already attempted. BitLocker recovery key not confirmed. Insurance evidence may be needed."
    });
    ctx.request = new Request("https://nexuradata.ca/api/diagnostic", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.55" },
      body: JSON.stringify(await ctx.request.json())
    });

    const res = await diagnosticHandler(ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.diagnostic.servicePath).toBe("/forensique-numerique-montreal.html");
    expect(body.diagnostic.brief.recommendedPath).toBe("Mandat probatoire ou incident sensible");
    expect(body.diagnostic.brief.operatorFocus.length).toBeGreaterThan(0);
    expect(body.diagnostic.brief.boundary).toContain("Aucune");
    expect(body.diagnostic.expertSignals.signals).toEqual(expect.arrayContaining([
      "support-context-mismatch",
      "repair-tool-attempted",
      "credential-dependent",
      "forensic-context-hidden"
    ]));
    expect(body.diagnostic.automationActions).toContain("expert-signal-layer-applied");
  });

  it("OPTIONS handler returns 204", () => {
    const res = diagnosticOptions({ env: {} });
    expect(res.status).toBe(204);
  });

  it("fallback handler returns 405", async () => {
    const res = diagnosticFallback();
    expect(res.status).toBe(405);
  });
});

// ─── status endpoint ────────────────────────────────────────

describe("POST /api/status", () => {
  it("returns 503 when DATABASE_URL is not configured", async () => {
    const ctx = makeContext({}, {});
    ctx.request = new Request("https://nexuradata.ca/api/status", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    });
    const res = await statusHandler(ctx);
    expect(res.status).toBe(503);
  });

  it("returns 503 for missing credentials", async () => {
    const env = { DATABASE_URL: "postgresql://test" };
    const ctx = makeContext({}, env);
    ctx.request = new Request("https://nexuradata.ca/api/status", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    });
    const res = await statusHandler(ctx);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it("OPTIONS handler returns 204", () => {
    const res = statusOptions({ env: {} });
    expect(res.status).toBe(204);
  });

  it("fallback handler returns 405", async () => {
    const res = statusFallback();
    expect(res.status).toBe(405);
  });
});

// ─── authorization endpoint ────────────────────────────────

describe("POST /api/authorization", () => {
  it("returns 503 when DATABASE_URL is not configured", async () => {
    const ctx = makeContext({}, {});
    ctx.request = new Request("https://nexuradata.ca/api/authorization", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    });
    const res = await authorizationHandler(ctx);
    expect(res.status).toBe(503);
  });

  it("returns 503 when ACCESS_CODE_SECRET is missing", async () => {
    const ctx = makeContext({}, { DATABASE_URL: "postgresql://test" });
    ctx.request = new Request("https://nexuradata.ca/api/authorization", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    });
    const res = await authorizationHandler(ctx);
    expect(res.status).toBe(503);
  });

  it("OPTIONS handler returns 204", () => {
    const res = authorizationOptions({ env: {} });
    expect(res.status).toBe(204);
  });

  it("fallback handler returns 405", async () => {
    const res = authorizationFallback();
    expect(res.status).toBe(405);
  });
});

// ─── stripe webhook endpoint ────────────────────────────────

describe("POST /api/stripe-webhook", () => {
  it("accepts the Stripe Checkout events used by the payment workflow", () => {
    expect(isAllowedStripeWebhookEvent("checkout.session.completed")).toBe(true);
    expect(isAllowedStripeWebhookEvent("checkout.session.async_payment_succeeded")).toBe(true);
    expect(isAllowedStripeWebhookEvent("checkout.session.async_payment_failed")).toBe(true);
    expect(isAllowedStripeWebhookEvent("checkout.session.expired")).toBe(true);
    expect(isAllowedStripeWebhookEvent("async_payment_succeeded")).toBe(false);
  });

  it("returns 503 when a processable event arrives without DATABASE_URL", async () => {
    const env = { STRIPE_MODE: "live", STRIPE_WEBHOOK_SECRET: "whsec_test_secret" };
    const ctx = makeContext({}, env);
    ctx.request = await makeSignedStripeRequest({
      id: "evt_live_missing_db",
      type: "checkout.session.completed",
      livemode: true,
      data: {
        object: {
          id: "cs_live_missing_db",
          object: "checkout.session",
          client_reference_id: "PAY-20260507-MISSINGDB"
        }
      }
    }, env.STRIPE_WEBHOOK_SECRET);
    const res = await webhookHandler(ctx);
    expect(res.status).toBe(503);
  });

  it("acknowledges signed sandbox events sent to the live endpoint without processing", async () => {
    const env = { STRIPE_MODE: "live", STRIPE_WEBHOOK_SECRET: "whsec_test_secret" };
    const ctx = makeContext({}, env);
    ctx.request = await makeSignedStripeRequest({
      id: "evt_test_to_live",
      type: "checkout.session.completed",
      livemode: false,
      data: {
        object: {
          id: "cs_test_to_live",
          object: "checkout.session",
          client_reference_id: "PAY-20260507-TESTTOLIVE"
        }
      }
    }, env.STRIPE_WEBHOOK_SECRET);

    const res = await webhookHandler(ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, received: true, ignored: true, reason: "mode_mismatch" });
  });

  it("returns 400 when signature verification fails", async () => {
    const env = { DATABASE_URL: "postgresql://test", STRIPE_WEBHOOK_SECRET: "whsec_test" };
    const ctx = {
      request: new Request("https://nexuradata.ca/api/stripe-webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Stripe-Signature": "t=12345,v1=badsig"
        },
        body: JSON.stringify({ type: "checkout.session.completed" })
      }),
      env
    };
    const res = await webhookHandler(ctx);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });
});
