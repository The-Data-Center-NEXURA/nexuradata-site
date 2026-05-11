import { afterEach, describe, it, expect, vi } from "vitest";
import { createHostedCheckoutSession, getStripeObjectModeMismatch, verifyStripeWebhook } from "../../functions/_lib/stripe.js";

const checkoutPayload = {
  caseId: "NX-20260507-STRIPE1",
  paymentRequestId: "PAY-20260507-STRIPE1",
  paymentKind: "deposit",
  label: "Acompte intervention NEXURADATA",
  description: "Ouverture dossier laboratoire",
  amountCents: 15000,
  currency: "cad",
  customerEmail: "client@example.com",
  successUrl: "https://nexuradata.ca/paiement-reussi.html",
  cancelUrl: "https://nexuradata.ca/paiement-annule.html"
};

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── createHostedCheckoutSession ───────────────────────────

describe("createHostedCheckoutSession()", () => {
  const fakeLiveSecretKey = ["sk", "live", "123"].join("_");
  const fakeLiveRestrictedKey = ["rk", "live", "123"].join("_");
  const fakeTestSecretKey = ["sk", "test", "123"].join("_");

  it("creates a live Checkout Session with the current Stripe API version", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      id: "cs_live_123",
      object: "checkout.session",
      url: "https://checkout.stripe.com/c/live-session",
      livemode: true,
      status: "open",
      payment_status: "unpaid"
    }), { status: 200, headers: { "content-type": "application/json" } }));

    const result = await createHostedCheckoutSession({
      STRIPE_MODE: "live",
      STRIPE_SECRET_KEY: fakeLiveSecretKey
    }, checkoutPayload);

    expect(result.id).toBe("cs_live_123");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.stripe.com/v1/checkout/sessions");
    expect(options.headers["Stripe-Version"]).toBe("2026-04-22.dahlia");
    expect(options.headers.Authorization).toBe(`Bearer ${fakeLiveSecretKey}`);
    expect(options.body.get("mode")).toBe("payment");
    expect(options.body.get("metadata[case_id]")).toBe(checkoutPayload.caseId);
  });

  it("blocks test keys when production is configured for live mode", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));

    await expect(createHostedCheckoutSession({
      STRIPE_MODE: "live",
      STRIPE_SECRET_KEY: fakeTestSecretKey
    }, checkoutPayload)).rejects.toThrow("mode test");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks test Checkout Sessions returned under live mode", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      id: "cs_test_123",
      object: "checkout.session",
      url: "https://checkout.stripe.com/c/test-session",
      livemode: false
    }), { status: 200, headers: { "content-type": "application/json" } }));

    await expect(createHostedCheckoutSession({
      STRIPE_MODE: "live",
      STRIPE_SECRET_KEY: fakeLiveRestrictedKey
    }, checkoutPayload)).rejects.toThrow("mode test");
  });
});

// ─── verifyStripeWebhook ────────────────────────────────────

describe("verifyStripeWebhook()", () => {
  const WEBHOOK_SECRET = "whsec_test_secret";
  const env = { STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET };

  const makeSignedRequest = async (body, secret = WEBHOOK_SECRET, timestampOffset = 0) => {
    const rawBody = typeof body === "string" ? body : JSON.stringify(body);
    const timestamp = Math.floor(Date.now() / 1000) + timestampOffset;
    const signedPayload = `${timestamp}.${rawBody}`;

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
    const signature = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");

    return new Request("https://example.com/api/stripe-webhook", {
      method: "POST",
      headers: {
        "Stripe-Signature": `t=${timestamp},v1=${signature}`,
        "Content-Type": "application/json"
      },
      body: rawBody
    });
  };

  it("verifies valid webhook signature and returns parsed body", async () => {
    const body = { type: "checkout.session.completed", data: { object: { id: "cs_test" } } };
    const request = await makeSignedRequest(body);
    const result = await verifyStripeWebhook(env, request);
    expect(result).toEqual(body);
  });

  it("throws when signature is missing", async () => {
    const request = new Request("https://example.com/api/stripe-webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "test" })
    });
    await expect(verifyStripeWebhook(env, request)).rejects.toThrow("Signature Stripe absente");
  });

  it("throws when webhook secret is not configured", async () => {
    const request = await makeSignedRequest({ type: "test" });
    await expect(verifyStripeWebhook({}, request)).rejects.toThrow("n'est pas encore configuré");
  });

  it("throws for expired signature (>5 min old)", async () => {
    const request = await makeSignedRequest({ type: "test" }, WEBHOOK_SECRET, -400);
    await expect(verifyStripeWebhook(env, request)).rejects.toThrow("Signature Stripe expirée");
  });

  it("throws for invalid signature", async () => {
    const body = { type: "test" };
    const request = await makeSignedRequest(body, "wrong-secret");
    await expect(verifyStripeWebhook(env, request)).rejects.toThrow("Signature Stripe non valide");
  });

  it("throws for malformed Stripe-Signature header", async () => {
    const request = new Request("https://example.com/api/stripe-webhook", {
      method: "POST",
      headers: {
        "Stripe-Signature": "garbage",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ type: "test" })
    });
    await expect(verifyStripeWebhook(env, request)).rejects.toThrow("Signature Stripe absente");
  });

  it("accepts signatures within 5-minute tolerance", async () => {
    const body = { type: "checkout.session.completed", data: {} };
    const request = await makeSignedRequest(body, WEBHOOK_SECRET, -100);
    const result = await verifyStripeWebhook(env, request);
    expect(result).toEqual(body);
  });

  it("verifies signed webhook events without enforcing runtime mode", async () => {
    const body = { type: "checkout.session.completed", livemode: false, data: { object: { id: "cs_test_123" } } };
    const request = await makeSignedRequest(body);
    const result = await verifyStripeWebhook({ ...env, STRIPE_MODE: "live" }, request);

    expect(result).toEqual(body);
    expect(getStripeObjectModeMismatch({ STRIPE_MODE: "live" }, result)).toContain("mode test");
  });
});
