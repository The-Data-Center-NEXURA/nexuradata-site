import { json, methodNotAllowed, onOptions } from "../../../../_lib/http.js";
import { persistGeneratedReport } from "../../../../_lib/reports.js";
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

    const result = await persistGeneratedReport(context.env, caseId);
    return json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    if (error.message === "Case not found") {
      return json({ ok: false, message: "Dossier introuvable." }, { status: 404 });
    }
    return json({ ok: false, message: error.message || "Génération du rapport impossible." }, { status: 400 });
  }
};

export const onRequest = methodNotAllowed;
