import { json, methodNotAllowed, onOptions } from "../../_lib/http.js";
import { getGeneratedReport } from "../../_lib/reports.js";
import { requireRemoteFixPermission } from "../../_lib/remotefix.js";

export const onRequestOptions = (context) => onOptions(context.env, "GET, OPTIONS");

export const onRequestGet = async (context) => {
  try {
    if (!context.env?.DATABASE_URL) {
      return json({ ok: false, message: "Base Postgres non configurée." }, { status: 503 });
    }
    const auth = requireRemoteFixPermission(context.request, context.env, "cases.read");
    if (!auth.ok) return json({ ok: false, message: "Permission insuffisante." }, { status: 403 });

    const reportId = String(context.params?.reportId || "").trim();
    if (!reportId) return json({ ok: false, message: "reportId manquant." }, { status: 400 });

    const report = await getGeneratedReport(context.env, reportId);
    if (!report) return json({ ok: false, message: "Rapport introuvable." }, { status: 404 });

    return json({ ok: true, report });
  } catch (error) {
    return json({ ok: false, message: error.message || "Lecture du rapport impossible." }, { status: 400 });
  }
};

export const onRequest = methodNotAllowed;
