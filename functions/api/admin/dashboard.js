// GET /api/admin/dashboard — rich revenue dashboard aggregating cases, sessions,
// reports, alerts, opportunities, monitoring accounts and the open pipeline.
// Replaces the earlier alias that pointed to functions/api/remotefix/admin.js.

import { json, methodNotAllowed, onOptions } from "../../_lib/http.js";
import { getAdminDashboard } from "../../_lib/admin-dashboard.js";
import { requireRemoteFixPermission } from "../../_lib/remotefix.js";

export const onRequestOptions = (context) => onOptions(context.env, "GET, OPTIONS");

export const onRequestGet = async (context) => {
  try {
    if (!context.env?.DATABASE_URL) {
      return json({ ok: false, message: "Base Postgres non configurée." }, { status: 503 });
    }
    const auth = requireRemoteFixPermission(context.request, context.env, "cases.read");
    if (!auth.ok) return json({ ok: false, message: "Permission insuffisante." }, { status: 403 });

    const overview = await getAdminDashboard(context.env);
    return json({ ok: true, role: auth.role, ...overview });
  } catch (error) {
    return json({ ok: false, message: error.message || "Tableau de bord admin indisponible." }, { status: 400 });
  }
};

export const onRequest = methodNotAllowed;
