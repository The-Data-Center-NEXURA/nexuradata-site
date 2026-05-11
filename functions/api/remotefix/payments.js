import { createCasePaymentRequest } from "../../_lib/cases.js";
import { json, methodNotAllowed, onOptions, parsePayload } from "../../_lib/http.js";
import { computeRemoteFixDepositCents, getRemoteFixTriage, requireRemoteFixPermission } from "../../_lib/remotefix.js";

export const onRequestOptions = (context) => onOptions(context.env, "POST, OPTIONS");

export const onRequestPost = async (context) => {
  try {
    if (!context.env?.DATABASE_URL) return json({ ok: false, message: "Base Supabase/Postgres non configuree." }, { status: 503 });
    const auth = requireRemoteFixPermission(context.request, context.env, "payments.create");
    if (!auth.ok) return json({ ok: false, message: "Permission insuffisante." }, { status: 403 });
    const payload = await parsePayload(context.request);
    const triage = await getRemoteFixTriage(context.env, payload.caseId);
    if (!triage) return json({ ok: false, message: "Triage RemoteFix introuvable." }, { status: 404 });
    const amountCents = Number(payload.amountCents) || computeRemoteFixDepositCents(triage);
    if (!amountCents) return json({ ok: false, message: "Aucun paiement RemoteFix requis pour un dossier laboratoire." }, { status: 400 });
    const payment = await createCasePaymentRequest(context.env, {
      caseId: payload.caseId,
      paymentKind: "deposit",
      label: `NEXURA RemoteFix - ${triage.service}`,
      description: `Diagnostic ou intervention RemoteFix autorisee par le serveur. Decision: ${triage.requiresLab ? "laboratoire requis" : "remote"}.`,
      amountCents,
      currency: "cad"
    }, auth.actor, context.request.url);
    return json({ ok: true, payment });
  } catch (error) {
    return json({ ok: false, message: error.message || "Paiement impossible." }, { status: 400 });
  }
};

export const onRequest = methodNotAllowed;