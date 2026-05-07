import { json, methodNotAllowed, onOptions } from "../../_lib/http.js";
import { listOpportunities } from "../../_lib/opportunities.js";
import { requireRemoteFixPermission } from "../../_lib/remotefix.js";

export const onRequestOptions = (context) => onOptions(context.env, "GET, OPTIONS");

export const onRequestGet = async (context) => {
  try {
    if (!context.env?.DATABASE_URL) {
      return json({ ok: false, message: "Base Postgres non configurée." }, { status: 503 });
    }
    const auth = requireRemoteFixPermission(context.request, context.env, "cases.read");
    if (!auth.ok) return json({ ok: false, message: "Permission insuffisante." }, { status: 403 });

    const url = new URL(context.request.url);
    const status = url.searchParams.get("status") || "open";
    const result = await listOpportunities(context.env, status);
    return json({ ok: true, ...result });
  } catch (error) {
    return json({ ok: false, message: error.message || "Liste d'opportunités indisponible." }, { status: 400 });
  }
};

export const onRequest = methodNotAllowed;
