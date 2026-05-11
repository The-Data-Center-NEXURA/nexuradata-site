import { createCase, validateSubmission } from "../_lib/cases.js";
import { sendClientAccessEmail, sendLabNotificationEmail } from "../_lib/email.js";
import { json, methodNotAllowed, onOptions, parsePayload } from "../_lib/http.js";
import { sendLifecycleNotifications } from "../_lib/notifications.js";
import { logError } from "../_lib/observability.js";
import { checkRateLimit, tooManyRequests } from "../_lib/rate-limit.js";

const isUserFacingValidationError = (error) => error instanceof Error && (
  error.message.includes("obligatoire") ||
  error.message.includes("requis") ||
  error.message.includes("invalide") ||
  error.message.includes("format") ||
  error.message.includes("courriel") ||
  error.message.includes("Requête rejetée")
);

export const onRequestOptions = (context) => onOptions(context.env, "POST, OPTIONS");

export const onRequestPost = async (context) => {
  const limit = checkRateLimit(context.request, 3);
  if (!limit.allowed) return tooManyRequests(limit.retryAfter);

  try {
    if (!context.env?.DATABASE_URL) {
      return json(
        {
          ok: false,
          fallback: "mailto",
          message: "Le backend de prise en charge n'est pas encore configuré. Le formulaire bascule vers le courriel préparé."
        },
        { status: 503 }
      );
    }

    if (!context.env?.ACCESS_CODE_SECRET) {
      return json(
        {
          ok: false,
          message: "Configuration incomplète. Contactez l'administrateur."
        },
        { status: 503 }
      );
    }

    const payload = await parsePayload(context.request);

    if (context.env?.TURNSTILE_SECRET_KEY) {
      const token = payload["cf-turnstile-response"] || "";
      if (!token) {
        return json({ ok: false, message: "Vérification de sécurité incomplète. Veuillez recharger la page et réessayer." }, { status: 400 });
      }
      const form = new URLSearchParams();
      form.set("secret", context.env.TURNSTILE_SECRET_KEY);
      form.set("response", token);
      const cfIp = context.request.headers.get("CF-Connecting-IP") || "";
      if (cfIp) form.set("remoteip", cfIp);
      const verification = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });
      const result = await verification.json();
      if (!result.success) {
        return json({ ok: false, message: "Vérification de sécurité échouée. Veuillez recharger et réessayer." }, { status: 400 });
      }
    }

    const submission = validateSubmission(payload);
    const intakeRecord = await createCase(context.env, submission);
    const [labDelivery, clientDelivery, lifecycleDelivery] = await Promise.all([
      sendLabNotificationEmail(context.env, intakeRecord, context.request.url),
      sendClientAccessEmail(
        context.env,
        {
          caseId: intakeRecord.caseId,
          accessCode: intakeRecord.accessCode,
          email: intakeRecord.courriel,
          name: intakeRecord.nom,
          status: intakeRecord.status,
          nextStep: intakeRecord.nextStep
        },
        context.request.url,
        "initial"
      ),
      sendLifecycleNotifications(context.env, {
        caseId: intakeRecord.caseId,
        updatedAt: intakeRecord.createdAt,
        name: intakeRecord.nom,
        email: intakeRecord.courriel,
        phone: intakeRecord.telephone,
        status: intakeRecord.status,
        nextStep: intakeRecord.nextStep,
        support: intakeRecord.support,
        symptom: intakeRecord.symptome,
        clientSummary: intakeRecord.clientSummary
      }, context.request.url, "Nouveau dossier", "system")
    ]);

    return json({
      ok: true,
      caseId: intakeRecord.caseId,
      message: "Demande reçue. Un numéro de dossier initial a été généré.",
      nextStep: "Le laboratoire peut maintenant qualifier le cas et préparer la suite.",
      concierge: {
        provider: intakeRecord.concierge?.provider,
        channel: intakeRecord.concierge?.channel,
        priority: intakeRecord.concierge?.priority,
        expertSignals: intakeRecord.concierge?.expertSignals || null,
        clientNeed: intakeRecord.concierge?.clientNeed || null,
        emotionalContext: intakeRecord.concierge?.emotionalContext || null,
        proposal: intakeRecord.concierge?.proposal || null,
        serviceLevel: intakeRecord.concierge?.serviceLevel,
        serviceLevelLabel: intakeRecord.concierge?.serviceLevelLabel,
        sla: intakeRecord.concierge?.sla,
        recommendedPath: intakeRecord.concierge?.recommendedPath,
        servicePath: intakeRecord.concierge?.servicePath,
        questions: intakeRecord.concierge?.questions || [],
        clientActions: intakeRecord.concierge?.clientActions || [],
        operatorTasks: intakeRecord.concierge?.operatorTasks || [],
        quotePlan: intakeRecord.concierge?.quotePlan || null,
        statusPlan: intakeRecord.concierge?.statusPlan || null,
        automationActions: intakeRecord.concierge?.automationActions || [],
        whatsappUrl: intakeRecord.concierge?.whatsappUrl || ""
      },
      automation: {
        category: intakeRecord.automation?.category,
        riskLevel: intakeRecord.automation?.riskLevel,
        expertSignals: intakeRecord.automation?.expertSignals || null,
        clientNeed: intakeRecord.automation?.clientNeed || null,
        emotionalContext: intakeRecord.automation?.emotionalContext || null,
        proposal: intakeRecord.automation?.proposal || null,
        serviceLevel: intakeRecord.automation?.serviceLevel,
        recommendedPath: intakeRecord.automation?.recommendedPath,
        servicePath: intakeRecord.automation?.servicePath,
        statusPlan: intakeRecord.automation?.statusPlan,
        quotePlan: intakeRecord.automation?.quotePlan,
        clientActions: intakeRecord.automation?.clientActions || [],
        operatorTasks: intakeRecord.automation?.operatorTasks || [],
        automationActions: intakeRecord.automation?.automationActions || []
      },
      delivery: {
        lab: labDelivery.sent ? "sent" : labDelivery.reason,
        client: clientDelivery.sent ? "sent" : clientDelivery.reason,
        lifecycleEmail: lifecycleDelivery.email.sent ? "sent" : lifecycleDelivery.email.reason,
        lifecycleWhatsApp: lifecycleDelivery.whatsapp.sent ? "sent" : lifecycleDelivery.whatsapp.reason
      }
    });
  } catch (error) {
    if (isUserFacingValidationError(error)) {
      return json({ ok: false, message: error.message }, { status: 400 });
    }

    logError(context, "api.intake.processing_error", error);
    return json(
      {
        ok: false,
        fallback: "mailto",
        message: "La création en ligne n'a pas pu être complétée. Le courriel préparé va s'ouvrir pour que le dossier ne soit pas perdu."
      },
      { status: 503 }
    );
  }
};

export const onRequest = methodNotAllowed;
