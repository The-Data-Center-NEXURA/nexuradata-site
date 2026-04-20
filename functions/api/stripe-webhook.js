import { syncPaymentRequestFromStripe } from "../_lib/cases.js";
import { json, methodNotAllowed, onOptions } from "../_lib/http.js";
import { verifyStripeWebhook } from "../_lib/stripe.js";

export const onRequestOptions = () => onOptions("POST, OPTIONS");

export const onRequestPost = async (context) => {
  if (!context.env?.DATABASE_URL) {
    return json({ ok: false, message: "Service temporairement indisponible." }, { status: 503 });
  }

  let event;

  try {
    event = await verifyStripeWebhook(context.env, context.request);
  } catch {
    return json(
      { ok: false, message: "Signature invalide." },
      { status: 400 }
    );
  }

  try {
    const payment = await syncPaymentRequestFromStripe(context.env, event);

    return json({
      ok: true,
      received: true,
      paymentRequestId: payment?.paymentRequestId || null
    });
  } catch (err) {
    console.error("stripe-webhook processing error:", err);

    return json(
      { ok: false, message: "Erreur interne." },
      { status: 500 }
    );
  }
};

export const onRequest = methodNotAllowed;
