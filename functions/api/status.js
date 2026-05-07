import { getPublicCaseByCredentials, validateStatusLookup } from "../_lib/cases.js";
import { json, methodNotAllowed, onOptions, parsePayload } from "../_lib/http.js";
import { logError } from "../_lib/observability.js";
import { checkRateLimit, tooManyRequests } from "../_lib/rate-limit.js";

const genericErrorMessage = "Aucun dossier n'a été trouvé avec cet accès. Vérifiez les identifiants transmis par NEXURADATA ou demandez une mise à jour.";

export const onRequestOptions = (context) => onOptions(context.env, "POST, OPTIONS");

export const onRequestPost = async (context) => {
  const limit = checkRateLimit(context.request, 10);
  if (!limit.allowed) return tooManyRequests(limit.retryAfter);

  try {
    if (!context.env?.DATABASE_URL) {
      return json({ ok: false, message: "Service temporairement indisponible." }, { status: 503 });
    }
    if (!context.env?.ACCESS_CODE_SECRET) {
      return json({ ok: false, message: "Service temporairement indisponible." }, { status: 503 });
    }
    const payload = await parsePayload(context.request);
    const { caseId, accessCode } = validateStatusLookup(payload);
    const detail = await getPublicCaseByCredentials(context.env, caseId, accessCode);

    if (!detail) {
      return json(
        {
          ok: false,
          message: genericErrorMessage
        },
        { status: 404 }
      );
    }

    return json({
      ok: true,
      caseId: detail.caseId,
      status: detail.status,
      updatedAt: detail.updatedAt,
      receivedAt: detail.receivedAt,
      support: detail.support,
      symptom: detail.symptom,
      nextStep: detail.nextStep,
      summary: detail.summary,
      steps: detail.steps,
      payments: detail.payments,
      authorization: detail.authorization
    });
  } catch (error) {
    logError(context, "api.status.lookup_error", error);
    return json(
      {
        ok: false,
        message: genericErrorMessage
      },
      { status: 400 }
    );
  }
};

export const onRequest = methodNotAllowed;
