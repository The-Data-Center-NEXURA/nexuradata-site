import { json, methodNotAllowed, onOptions } from "../../../../_lib/http.js";
import { getMonitoringDashboard } from "../../../../_lib/monitor.js";
import { requireRemoteFixPermission } from "../../../../_lib/remotefix.js";

export const onRequestOptions = (context) => onOptions(context.env, "GET, OPTIONS");

export const onRequestGet = async (context) => {
  try {
    if (!context.env?.DATABASE_URL) {
      return json({ ok: false, message: "Base Postgres non configurée." }, { status: 503 });
    }
    const auth = requireRemoteFixPermission(context.request, context.env, "cases.read");
    if (!auth.ok) return json({ ok: false, message: "Permission insuffisante." }, { status: 403 });

    const accountId = String(context.params?.accountId || "").trim();
    if (!accountId) return json({ ok: false, message: "accountId manquant." }, { status: 400 });

    const dashboard = await getMonitoringDashboard(context.env, accountId);
    if (!dashboard) return json({ ok: false, message: "Compte Monitor introuvable." }, { status: 404 });

    return json({ ok: true, role: auth.role, ...dashboard });
  } catch (error) {
    return json({ ok: false, message: error.message || "Tableau de bord Monitor indisponible." }, { status: 400 });
  }
};

export const onRequest = methodNotAllowed;
