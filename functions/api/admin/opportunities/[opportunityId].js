import { ZodError } from "zod";

import { json, methodNotAllowed, onOptions, parsePayload } from "../../../../_lib/http.js";
import { opportunityStatusSchema, updateOpportunityStatus } from "../../../../_lib/opportunities.js";
import { requireRemoteFixPermission } from "../../../../_lib/remotefix.js";

export const onRequestOptions = (context) => onOptions(context.env, "PATCH, OPTIONS");

export const onRequestPatch = async (context) => {
  try {
    if (!context.env?.DATABASE_URL) {
      return json({ ok: false, message: "Base Postgres non configurée." }, { status: 503 });
    }
    const auth = requireRemoteFixPermission(context.request, context.env, "cases.write");
    if (!auth.ok) return json({ ok: false, message: "Permission insuffisante." }, { status: 403 });

    const opportunityId = String(context.params?.opportunityId || "").trim();
    if (!opportunityId) return json({ ok: false, message: "opportunityId manquant." }, { status: 400 });

    const payload = await parsePayload(context.request);
    const parsed = opportunityStatusSchema.parse(payload);

    const opp = await updateOpportunityStatus(context.env, opportunityId, parsed.status);
    if (!opp) return json({ ok: false, message: "Opportunité introuvable." }, { status: 404 });

    return json({ ok: true, opportunity: opp });
  } catch (error) {
    if (error instanceof ZodError) {
      return json({ ok: false, message: "Statut invalide.", issues: error.issues }, { status: 400 });
    }
    return json({ ok: false, message: error.message || "Mise à jour d'opportunité impossible." }, { status: 400 });
  }
};

export const onRequest = methodNotAllowed;
