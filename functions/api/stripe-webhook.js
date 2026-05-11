import { getCaseDetail, syncPaymentRequestFromStripe } from "../_lib/cases.js";
import { json, methodNotAllowed, onOptions } from "../_lib/http.js";
import { sendLifecycleNotifications } from "../_lib/notifications.js";
import { logError, logEvent } from "../_lib/observability.js";
import { getStripeMode, isStripeObjectModeMismatch, verifyStripeWebhook } from "../_lib/stripe.js";

export const allowedStripeWebhookEvents = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired"
]);

export const isAllowedStripeWebhookEvent = (eventType) => allowedStripeWebhookEvents.has(`${eventType || ""}`);

export const onRequestOptions = (context) => onOptions(context.env, "POST, OPTIONS");

export const onRequestPost = async (context) => {
  let event;

  try {
    event = await verifyStripeWebhook(context.env, context.request);
  } catch {
    return json(
      { ok: false, message: "Signature invalide." },
      { status: 400 }
    );
  }

  if (isStripeObjectModeMismatch(context.env, event)) {
    logEvent(context, "warn", "api.stripe_webhook.mode_mismatch_ignored", {
      eventId: event?.id,
      eventType: event?.type,
      eventLivemode: event?.livemode,
      stripeMode: getStripeMode(context.env)
    });

    return json({ ok: true, received: true, ignored: true, reason: "mode_mismatch" });
  }

  if (!isAllowedStripeWebhookEvent(event.type)) {
    logEvent(context, "warn", "api.stripe_webhook.unknown_event", {
      eventId: event.id,
      eventType: event.type
    });
    return json({ ok: true }); // Return 200 to acknowledge; Stripe will retry other event types
  }

  if (!context.env?.DATABASE_URL) {
    return json({ ok: false, message: "Service temporairement indisponible." }, { status: 503 });
  }

  try {
    const payment = await syncPaymentRequestFromStripe(context.env, event);

    if (payment?.status === "paid") {
      const detail = await getCaseDetail(context.env, payment.caseId);
      if (detail?.status === "Payé") {
        await sendLifecycleNotifications(context.env, detail, context.request.url, "Payé", "stripe-webhook");
      }
    }

    if (!payment) {
      const sessionId = event.data?.object?.id;
      logEvent(context, "warn", "api.stripe_webhook.payment_not_found", {
        eventId: event.id,
        eventType: event.type,
        sessionId
      });
    }

    return json({
      ok: true,
      received: true,
      paymentRequestId: payment?.paymentRequestId || null
    });
  } catch (error) {
    logError(context, "api.stripe_webhook.processing_error", error, {
      eventId: event.id,
      eventType: event.type
    });

    return json(
      { ok: false, message: "Erreur interne." },
      { status: 500 }
    );
  }
};

export const onRequest = methodNotAllowed;
