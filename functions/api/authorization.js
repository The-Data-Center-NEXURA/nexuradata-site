import { approveCaseAuthorization, createSmartCasePaymentRequest, getCaseDetail, recordCaseEvent } from "../_lib/cases.js";
import { sendClientPaymentLinkEmail } from "../_lib/email.js";
import { json, methodNotAllowed, onOptions, parsePayload } from "../_lib/http.js";
import { sendLifecycleNotifications } from "../_lib/notifications.js";
import { logError } from "../_lib/observability.js";
import { checkRateLimit, tooManyRequests } from "../_lib/rate-limit.js";

const genericErrorMessage = "L'autorisation n'a pas pu être confirmée. Vérifiez le dossier ou demandez une mise à jour.";

export const onRequestOptions = (context) => onOptions(context.env, "POST, OPTIONS");

export const onRequestPost = async (context) => {
  const limit = checkRateLimit(context.request, 8);
  if (!limit.allowed) return tooManyRequests(limit.retryAfter);

  try {
    if (!context.env?.DATABASE_URL) {
      return json({ ok: false, message: "Service temporairement indisponible." }, { status: 503 });
    }

    if (!context.env?.ACCESS_CODE_SECRET) {
      return json({ ok: false, message: "Service temporairement indisponible." }, { status: 503 });
    }

    const payload = await parsePayload(context.request);
    const detail = await approveCaseAuthorization(context.env, payload);
    let payment = null;
    let paymentDelivery = { sent: false, reason: "not-created" };

    try {
      const paymentResult = await createSmartCasePaymentRequest(context.env, { caseId: detail.caseId }, "client-portal", context.request.url);
      payment = paymentResult.payment;
      paymentDelivery = await sendClientPaymentLinkEmail(context.env, payment, context.request.url, "client-portal");
      const paymentDetail = await getCaseDetail(context.env, detail.caseId);
      await sendLifecycleNotifications(context.env, paymentDetail, context.request.url, paymentDetail.status, "client-portal");
    } catch (paymentError) {
      await recordCaseEvent(context.env, detail.caseId, "client-portal", "Paiement automatique bloqué", paymentError instanceof Error ? paymentError.message : "Erreur Stripe.");
    }

    return json({
      ok: true,
      caseId: detail.caseId,
      status: detail.status,
      updatedAt: detail.updatedAt,
      support: detail.support,
      nextStep: detail.nextStep,
      summary: detail.summary,
      steps: detail.steps,
      payments: detail.payments,
      authorization: detail.authorization,
      payment,
      paymentDelivery: paymentDelivery.sent ? "sent" : paymentDelivery.reason
    });
  } catch (error) {
    logError(context, "api.authorization.approval_error", error);
    return json(
      {
        ok: false,
        message: error instanceof Error ? error.message : genericErrorMessage
      },
      { status: 400 }
    );
  }
};

export const onRequest = methodNotAllowed;
