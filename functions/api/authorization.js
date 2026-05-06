import { approveCaseAuthorization } from "../_lib/cases.js";
import { json, methodNotAllowed, onOptions, parsePayload } from "../_lib/http.js";
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
      authorization: detail.authorization
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
