import { ZodError } from "zod";

import { json, methodNotAllowed, onOptions, parsePayload } from "../../../../../_lib/http.js";
import { quoteClientActionSchema, setClientQuoteStatus } from "../../../../../_lib/quotes.js";

export const onRequestOptions = (context) => onOptions(context.env, "POST, OPTIONS");

export const onRequestPost = async (context) => {
  try {
    if (!context.env?.DATABASE_URL || !context.env?.ACCESS_CODE_SECRET) {
      return json({ ok: false, message: "Plateforme en configuration." }, { status: 503 });
    }
    const caseId = String(context.params?.caseId || "").trim();
    const quoteId = String(context.params?.quoteId || "").trim();
    if (!caseId || !quoteId) return json({ ok: false, message: "Paramètres manquants." }, { status: 400 });

    const payload = await parsePayload(context.request);
    const parsed = quoteClientActionSchema.parse(payload || {});

    const result = await setClientQuoteStatus(context.env, caseId, parsed.accessCode, quoteId, "declined");
    if (result.error === "unauthorized") return json({ ok: false, message: "Identifiants invalides." }, { status: 401 });
    if (result.error === "not_found") return json({ ok: false, message: "Soumission introuvable." }, { status: 404 });
    if (result.error === "expired") return json({ ok: false, message: "Soumission expirée." }, { status: 409 });
    if (result.error === "invalid_state") return json({ ok: false, message: `Statut actuel: ${result.currentStatus}.` }, { status: 409 });

    return json({ ok: true, quoteId: result.quoteId, status: result.status });
  } catch (error) {
    if (error instanceof ZodError) {
      return json({ ok: false, message: "Charge utile invalide.", issues: error.issues }, { status: 400 });
    }
    return json({ ok: false, message: error.message || "Décline impossible." }, { status: 400 });
  }
};

export const onRequest = methodNotAllowed;
