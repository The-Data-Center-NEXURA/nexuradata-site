import { json, methodNotAllowed, onOptions } from "../../_lib/http.js";
import { getRemoteFixOverview, listRemoteFixAdminCases, requireRemoteFixPermission } from "../../_lib/remotefix.js";

export const onRequestOptions = (context) => onOptions(context.env, "GET, OPTIONS");

export const onRequestGet = async (context) => {
  try {
    if (!context.env?.DATABASE_URL) return json({ ok: false, message: "Base Supabase/Postgres non configuree." }, { status: 503 });
    const auth = requireRemoteFixPermission(context.request, context.env, "cases.read");
    if (!auth.ok) return json({ ok: false, message: "Permission insuffisante." }, { status: 403 });
    const url = new URL(context.request.url);
    const caseId = url.searchParams.get("caseId");
    if (caseId) {
      const overview = await getRemoteFixOverview(context.env, caseId);
      if (!overview) return json({ ok: false, message: "Dossier introuvable." }, { status: 404 });
      return json({ ok: true, role: auth.role, ...overview });
    }
    return json({ ok: true, role: auth.role, items: await listRemoteFixAdminCases(context.env, url.searchParams.get("query") || "") });
  } catch (error) {
    return json({ ok: false, message: error.message || "Dashboard RemoteFix indisponible." }, { status: 400 });
  }
};

export const onRequest = methodNotAllowed;