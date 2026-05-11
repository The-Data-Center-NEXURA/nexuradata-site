import {
  authorizeOpsRequest,
  buildAndApplyAutomationDraft,
  buildAndLogConciergeDraft,
  createCasePaymentRequest,
  createSmartCasePaymentRequest,
  getCaseDetail,
  getResendableAccessCode,
  listCases,
  logReminder,
  normalizeCaseId,
  recordCaseEvent,
  regenerateCaseAccessCode,
  updateCaseRecord,
  updateQuoteStatus,
  validateCaseFilters
} from "../../_lib/cases.js";
import { sendClientAccessEmail, sendClientPaymentLinkEmail, sendClientStatusEmail } from "../../_lib/email.js";
import { authorizeOrReject, json, methodNotAllowed, onOptions, parsePayload } from "../../_lib/http.js";
import { sendLifecycleNotifications } from "../../_lib/notifications.js";
import { logError } from "../../_lib/observability.js";

export const onRequestOptions = (context) => onOptions(context.env, "GET, POST, OPTIONS");

export const onRequestGet = async (context) => {
  if (!context.env?.DATABASE_URL) {
    return json({ ok: false, message: "Service temporairement indisponible." }, { status: 503 });
  }

  const auth = authorizeOrReject(context.request, context.env, authorizeOpsRequest);

  if (auth instanceof Response) {
    return auth;
  }

  try {
    const url = new URL(context.request.url);
    const caseId = normalizeCaseId(url.searchParams.get("caseId"));

    if (caseId) {
      const detail = await getCaseDetail(context.env, caseId);

      if (!detail) {
        return json(
          {
            ok: false,
            message: "Dossier introuvable."
          },
          { status: 404 }
        );
      }

      return json({
        ok: true,
        case: detail
      });
    }

    // Validate query parameters before database call
    const filters = validateCaseFilters({
      status: url.searchParams.get("status"),
      quoteStatus: url.searchParams.get("quoteStatus"),
      urgency: url.searchParams.get("urgency")
    });

    const items = await listCases(context.env, url.searchParams.get("query") || "", filters);
    return json({
      ok: true,
      items
    });
  } catch (error) {
    logError(context, "api.ops.cases.get_error", error);
    return json(
      {
        ok: false,
        message: "Erreur opérateur."
      },
      { status: 400 }
    );
  }
};

export const onRequestPost = async (context) => {
  if (!context.env?.DATABASE_URL) {
    return json({ ok: false, message: "Service temporairement indisponible." }, { status: 503 });
  }

  const auth = authorizeOrReject(context.request, context.env, authorizeOpsRequest);

  if (auth instanceof Response) {
    return auth;
  }

  try {
    const payload = await parsePayload(context.request);
    const action = `${payload.action || ""}`.trim();

    if (action === "update") {
      const detail = await updateCaseRecord(context.env, payload, auth.actor);
      const shouldNotifyClient = payload.notifyClient === true || payload.notifyClient === "true";
      let clientDelivery = { sent: false, reason: "not-requested" };
      let lifecycleDelivery = { email: { sent: false, reason: "status-unchanged" }, whatsapp: { sent: false, reason: "status-unchanged" } };

      if (detail.statusChanged) {
        lifecycleDelivery = await sendLifecycleNotifications(context.env, detail, context.request.url, detail.status, auth.actor);
      }

      if (shouldNotifyClient) {
        const statusDelivery = await sendClientStatusEmail(context.env, detail.caseId, context.request.url, auth.actor);
        clientDelivery = statusDelivery.delivery;
      }

      return json({
        ok: true,
        case: detail,
        delivery: clientDelivery.sent ? "sent" : clientDelivery.reason,
        lifecycle: {
          email: lifecycleDelivery.email.sent ? "sent" : lifecycleDelivery.email.reason,
          whatsapp: lifecycleDelivery.whatsapp.sent ? "sent" : lifecycleDelivery.whatsapp.reason
        }
      });
    }

    if (action === "send-update") {
      const caseId = normalizeCaseId(payload.caseId);

      if (!caseId) {
        throw new Error("Numéro de dossier invalide.");
      }

      const statusDelivery = await sendClientStatusEmail(context.env, caseId, context.request.url, auth.actor);
      return json({
        ok: true,
        case: statusDelivery.detail,
        delivery: statusDelivery.delivery.sent ? "sent" : statusDelivery.delivery.reason
      });
    }

    if (action === "send-access") {
      const detail = await getResendableAccessCode(context.env, payload.caseId);
      const delivery = await sendClientAccessEmail(context.env, detail, context.request.url, "resent");

      if (!delivery.sent) {
        await recordCaseEvent(context.env, detail.caseId, auth.actor, "Renvoi du code impossible", `Échec d'envoi: ${delivery.reason}`);
      }

      return json({
        ok: true,
        caseId: detail.caseId,
        delivery: delivery.sent ? "sent" : delivery.reason
      });
    }

    if (action === "regenerate-access") {
      const detail = await regenerateCaseAccessCode(context.env, payload.caseId, auth.actor);
      const delivery = await sendClientAccessEmail(context.env, detail, context.request.url, "regenerated");

      if (!delivery.sent) {
        await recordCaseEvent(context.env, detail.caseId, auth.actor, "Nouveau code non envoyé", `Échec d'envoi: ${delivery.reason}`);
      }

      return json({
        ok: true,
        caseId: detail.caseId,
        accessCode: detail.accessCode,
        delivery: delivery.sent ? "sent" : delivery.reason
      });
    }

    if (action === "create-payment") {
      const payment = await createCasePaymentRequest(context.env, payload, auth.actor, context.request.url);
      let delivery = { sent: false, reason: "not-requested" };

      if (payload.sendEmail === true || payload.sendEmail === "true") {
        delivery = await sendClientPaymentLinkEmail(context.env, payment, context.request.url, auth.actor);
      }

      const detail = await getCaseDetail(context.env, payment.caseId);
      const lifecycleDelivery = await sendLifecycleNotifications(context.env, detail, context.request.url, detail.status, auth.actor);

      return json({
        ok: true,
        case: detail,
        payment,
        delivery: delivery.sent ? "sent" : delivery.reason,
        lifecycle: {
          email: lifecycleDelivery.email.sent ? "sent" : lifecycleDelivery.email.reason,
          whatsapp: lifecycleDelivery.whatsapp.sent ? "sent" : lifecycleDelivery.whatsapp.reason
        }
      });
    }

    if (action === "create-smart-payment") {
      const result = await createSmartCasePaymentRequest(context.env, payload, auth.actor, context.request.url);
      const delivery = await sendClientPaymentLinkEmail(context.env, result.payment, context.request.url, auth.actor);
      const detail = await getCaseDetail(context.env, result.payment.caseId);
      const lifecycleDelivery = await sendLifecycleNotifications(context.env, detail, context.request.url, detail.status, auth.actor);

      return json({
        ok: true,
        case: detail,
        payment: result.payment,
        pricingDecision: result.decision,
        delivery: delivery.sent ? "sent" : delivery.reason,
        lifecycle: {
          email: lifecycleDelivery.email.sent ? "sent" : lifecycleDelivery.email.reason,
          whatsapp: lifecycleDelivery.whatsapp.sent ? "sent" : lifecycleDelivery.whatsapp.reason
        }
      });
    }

    if (action === "quote-send" || action === "quote-approve" || action === "quote-expire" || action === "quote-decline") {
      const quoteStatusMap = {
        "quote-send": "sent",
        "quote-approve": "approved",
        "quote-expire": "expired",
        "quote-decline": "declined"
      };

      const detail = await updateQuoteStatus(context.env, {
        caseId: payload.caseId,
        quoteStatus: quoteStatusMap[action],
        quoteAmount: payload.quoteAmount,
        diagnosticSummary: payload.diagnosticSummary,
        recoveryProbability: payload.recoveryProbability,
        estimatedTimeline: payload.estimatedTimeline,
        quoteConditions: payload.quoteConditions
      }, auth.actor);

      let payment = null;
      let delivery = { sent: false, reason: "not-requested" };
      let lifecycleDelivery = await sendLifecycleNotifications(context.env, detail, context.request.url, detail.status, auth.actor);

      if (action === "quote-approve") {
        try {
          const result = await createSmartCasePaymentRequest(context.env, { caseId: detail.caseId }, auth.actor, context.request.url);
          payment = result.payment;
          delivery = await sendClientPaymentLinkEmail(context.env, payment, context.request.url, auth.actor);
          const paymentDetail = await getCaseDetail(context.env, detail.caseId);
          lifecycleDelivery = await sendLifecycleNotifications(context.env, paymentDetail, context.request.url, paymentDetail.status, auth.actor);
          return json({
            ok: true,
            case: paymentDetail,
            payment,
            delivery: delivery.sent ? "sent" : delivery.reason,
            lifecycle: {
              email: lifecycleDelivery.email.sent ? "sent" : lifecycleDelivery.email.reason,
              whatsapp: lifecycleDelivery.whatsapp.sent ? "sent" : lifecycleDelivery.whatsapp.reason
            }
          });
        } catch (paymentError) {
          await recordCaseEvent(context.env, detail.caseId, auth.actor, "Paiement automatique bloqué", paymentError instanceof Error ? paymentError.message : "Erreur Stripe.");
        }
      }

      return json({
        ok: true,
        case: detail,
        delivery: delivery.sent ? "sent" : delivery.reason,
        lifecycle: {
          email: lifecycleDelivery.email.sent ? "sent" : lifecycleDelivery.email.reason,
          whatsapp: lifecycleDelivery.whatsapp.sent ? "sent" : lifecycleDelivery.whatsapp.reason
        }
      });
    }

    if (action === "log-reminder") {
      const detail = await logReminder(context.env, payload, auth.actor);

      return json({
        ok: true,
        case: detail
      });
    }

    if (action === "concierge-draft") {
      const result = await buildAndLogConciergeDraft(context.env, payload.caseId, auth.actor);

      return json({
        ok: true,
        case: result.detail,
        concierge: result.draft
      });
    }

    if (action === "apply-automation") {
      const result = await buildAndApplyAutomationDraft(context.env, payload.caseId, auth.actor);

      return json({
        ok: true,
        case: result.detail,
        automation: result.draft
      });
    }

    throw new Error("Action opérateur inconnue.");
  } catch (error) {
    logError(context, "api.ops.cases.post_error", error);
    return json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Erreur opérateur."
      },
      { status: 400 }
    );
  }
};

export const onRequest = methodNotAllowed;
