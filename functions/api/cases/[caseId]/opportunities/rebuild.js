import { json, methodNotAllowed, onOptions } from "../../../../_lib/http.js";
import { rebuildOpportunitiesForCase } from "../../../../_lib/opportunities.js";
import { requireRemoteFixPermission } from "../../../../_lib/remotefix.js";

export const onRequestOptions = (context) => onOptions(context.env, "POST, OPTIONS");

export const onRequestPost = async (context) => {
  try {
    if (!context.env?.DATABASE_URL) {
      return json({ ok: false, message: "Base Postgres non configurée." }, { status: 503 });
    }
    const auth = requireRemoteFixPermission(context.request, context.env, "cases.write");
    if (!auth.ok) return json({ ok: false, message: "Permission insuffisante." }, { status: 403 });

    const caseId = String(context.params?.caseId || "").trim();
    if (!caseId) return json({ ok: false, message: "caseId manquant." }, { status: 400 });

    const result = await rebuildOpportunitiesForCase(context.env, caseId);
    if (result.error === "case_not_found") return json({ ok: false, message: "Dossier introuvable." }, { status: 404 });
    if (result.error === "triage_not_found") return json({ ok: false, message: "Triage introuvable pour ce dossier." }, { status: 404 });

    return json({ ok: true, opportunities: result.opportunities }, { status: 201 });
  } catch (error) {
    return json({ ok: false, message: error.message || "Reconstruction d'opportunités impossible." }, { status: 400 });
  }
};

export const onRequest = methodNotAllowed;
