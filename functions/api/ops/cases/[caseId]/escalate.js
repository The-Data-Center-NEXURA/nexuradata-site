import {
  authorizeOpsRequest,
  normalizeCaseId,
  normalizeMultilineText,
  normalizeText,
  recordCaseEvent,
  recordNotificationOutbox
} from "../../../../_lib/cases.js";
import { getDb } from "../../../../_lib/db.js";
import { authorizeOrReject, json, methodNotAllowed, onOptions, parsePayload } from "../../../../_lib/http.js";
import { logError } from "../../../../_lib/observability.js";

export const onRequestOptions = (context) => onOptions(context.env, "POST, OPTIONS");

const LAB_ESCALATION_STATUS = "Escalation laboratoire";

export const onRequestPost = async (context) => {
  if (!context.env?.DATABASE_URL) {
    return json({ ok: false, message: "Service temporairement indisponible." }, { status: 503 });
  }

  const auth = authorizeOrReject(context.request, context.env, authorizeOpsRequest);
  if (auth instanceof Response) return auth;

  try {
    const caseId = normalizeCaseId(context.params?.caseId);
    if (!caseId) return json({ ok: false, message: "Identifiant de dossier requis." }, { status: 400 });

    const payload = await parsePayload(context.request);
    const reason = normalizeMultilineText(payload?.reason, 1200);
    if (!reason) return json({ ok: false, message: "Le motif d'escalation est requis." }, { status: 400 });

    const severity = ["standard", "urgent", "critique"].includes(payload?.severity)
      ? payload.severity
      : "standard";
    const actor = normalizeText(auth?.actor || payload?.actor, 120) || "ops";
    const labContact = normalizeText(payload?.labContact, 220);

    const sql = getDb(context.env);
    const rows = await sql`select case_id, status, name, email
      from cases where case_id = ${caseId} limit 1`;
    if (!rows.length) return json({ ok: false, message: "Dossier introuvable." }, { status: 404 });
    const row = rows[0];

    const nextStep = severity === "critique"
      ? "Le laboratoire prend le dossier en intervention prioritaire."
      : "Le laboratoire évalue le support et planifie la prochaine étape.";
    const summary = `Dossier escaladé au laboratoire (${severity}). Motif: ${reason.slice(0, 200)}`;

    await sql`update cases set
        status = ${LAB_ESCALATION_STATUS},
        next_step = ${nextStep},
        client_summary = ${summary},
        handling_flags = case when handling_flags = '' then 'lab_required'
                              when handling_flags like '%lab_required%' then handling_flags
                              else handling_flags || ',lab_required' end,
        updated_at = now()
      where case_id = ${caseId}`;

    await recordCaseEvent(
      context.env,
      caseId,
      actor,
      `Escalation laboratoire (${severity})`,
      reason
    );

    let notificationId = null;
    const recipient = labContact || normalizeText(context.env?.LAB_ESCALATION_INBOX, 220);
    if (recipient) {
      notificationId = await recordNotificationOutbox(context.env, {
        caseId,
        channel: "email",
        statusTrigger: "lab_required",
        recipient,
        subject: `[NEXURADATA] Escalation ${severity} — ${caseId}`,
        body: [
          `Dossier ${caseId} (${row.name})`,
          `Sévérité: ${severity}`,
          "",
          "Motif:",
          reason,
          "",
          `Action attendue: ${nextStep}`
        ].join("\n"),
        actor
      });
    }

    return json({
      ok: true,
      caseId,
      status: LAB_ESCALATION_STATUS,
      severity,
      notificationId
    });
  } catch (error) {
    logError(context, "api.ops.cases.escalate_error", error);
    return json({ ok: false, message: "Escalation impossible." }, { status: 400 });
  }
};

export const onRequest = methodNotAllowed;
