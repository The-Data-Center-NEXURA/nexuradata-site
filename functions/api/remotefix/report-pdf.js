import { json, methodNotAllowed, onOptions } from "../../_lib/http.js";
import { getRemoteFixClientOverview, getRemoteFixOverview, renderRemoteFixReportPdfBytes, requireRemoteFixPermission } from "../../_lib/remotefix.js";

const pdfResponse = (bytes, filename) => new Response(bytes, {
  status: 200,
  headers: {
    "content-type": "application/pdf",
    "content-disposition": `inline; filename=\"${filename}\"`,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "x-robots-tag": "noindex, nofollow"
  }
});

export const onRequestOptions = (context) => onOptions(context.env, "GET, OPTIONS");

export const onRequestGet = async (context) => {
  try {
    if (!context.env?.DATABASE_URL) return json({ ok: false, message: "Base Supabase/Postgres non configuree." }, { status: 503 });
    const url = new URL(context.request.url);
    const caseId = url.searchParams.get("caseId");
    const sessionId = url.searchParams.get("sessionId");
    const token = url.searchParams.get("token");
    let overview = null;

    if (sessionId && token) {
      const clientOverview = await getRemoteFixClientOverview(context.env, { caseId, sessionId, token });
      overview = {
        case: clientOverview.case,
        triage: clientOverview.triage,
        diagnostic: clientOverview.diagnostic
      };
    } else {
      const auth = requireRemoteFixPermission(context.request, context.env, "cases.read");
      if (!auth.ok) return json({ ok: false, message: "Permission insuffisante." }, { status: 403 });
      overview = await getRemoteFixOverview(context.env, caseId);
    }

    if (!overview) return json({ ok: false, message: "Dossier introuvable." }, { status: 404 });
    return pdfResponse(renderRemoteFixReportPdfBytes(overview), `remotefix-${caseId || "rapport"}.pdf`);
  } catch (error) {
    return json({ ok: false, message: error.message || "Rapport PDF indisponible." }, { status: 400 });
  }
};

export const onRequest = methodNotAllowed;