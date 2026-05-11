import { ZodError } from "zod";

import { json, methodNotAllowed, onOptions, parsePayload } from "../../../_lib/http.js";
import { listClientQuotes, quoteClientActionSchema } from "../../../_lib/quotes.js";

export const onRequestOptions = (context) => onOptions(context.env, "POST, OPTIONS");

export const onRequestPost = async (context) => {
  try {
    if (!context.env?.DATABASE_URL || !context.env?.ACCESS_CODE_SECRET) {
      return json({ ok: false, message: "Plateforme en configuration." }, { status: 503 });
    }
    const caseId = String(context.params?.caseId || "").trim();
    if (!caseId) return json({ ok: false, message: "caseId manquant." }, { status: 400 });

    const payload = await parsePayload(context.request);
    const parsed = quoteClientActionSchema.parse(payload || {});

    const quotes = await listClientQuotes(context.env, caseId, parsed.accessCode);
    if (quotes === null) return json({ ok: false, message: "Identifiants invalides." }, { status: 401 });

    return json({ ok: true, quotes });
  } catch (error) {
    if (error instanceof ZodError) {
      return json({ ok: false, message: "Charge utile invalide.", issues: error.issues }, { status: 400 });
    }
    return json({ ok: false, message: error.message || "Lecture des soumissions impossible." }, { status: 400 });
  }
};

export const onRequest = methodNotAllowed;
