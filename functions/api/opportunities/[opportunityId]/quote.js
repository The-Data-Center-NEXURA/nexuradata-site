import { ZodError } from "zod";

import { json, methodNotAllowed, onOptions, parsePayload } from "../../../_lib/http.js";
import { createQuoteFromOpportunity, quoteRequestSchema } from "../../../_lib/quotes.js";
import { requireRemoteFixPermission } from "../../../_lib/remotefix.js";

export const onRequestOptions = (context) => onOptions(context.env, "POST, OPTIONS");

export const onRequestPost = async (context) => {
  try {
    if (!context.env?.DATABASE_URL) {
      return json({ ok: false, message: "Base Postgres non configurée." }, { status: 503 });
    }
    const auth = requireRemoteFixPermission(context.request, context.env, "cases.write");
    if (!auth.ok) return json({ ok: false, message: "Permission insuffisante." }, { status: 403 });

    const opportunityId = String(context.params?.opportunityId || "").trim();
    if (!opportunityId) return json({ ok: false, message: "opportunityId manquant." }, { status: 400 });

    const payload = await parsePayload(context.request);
    const parsed = quoteRequestSchema.parse(payload || {});

    const result = await createQuoteFromOpportunity(context.env, opportunityId, parsed);
    if (!result) return json({ ok: false, message: "Opportunité introuvable." }, { status: 404 });

    return json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return json({ ok: false, message: "Charge utile invalide.", issues: error.issues }, { status: 400 });
    }
    return json({ ok: false, message: error.message || "Création de devis impossible." }, { status: 400 });
  }
};

export const onRequest = methodNotAllowed;
