import { json, methodNotAllowed, onOptions } from "../../../../_lib/http.js";
import { convertAlertToCase } from "../../../../_lib/monitor.js";
import { requireRemoteFixPermission } from "../../../../_lib/remotefix.js";

export const onRequestOptions = (context) => onOptions(context.env, "POST, OPTIONS");

export const onRequestPost = async (context) => {
  try {
    if (!context.env?.DATABASE_URL) {
      return json({ ok: false, message: "Base Postgres non configurée." }, { status: 503 });
    }
    const auth = requireRemoteFixPermission(context.request, context.env, "cases.write");
    if (!auth.ok) return json({ ok: false, message: "Permission insuffisante." }, { status: 403 });

    const alertId = String(context.params?.alertId || "").trim();
    if (!alertId) return json({ ok: false, message: "alertId manquant." }, { status: 400 });

    const result = await convertAlertToCase(context.env, alertId);
    if (!result) return json({ ok: false, message: "Alerte introuvable." }, { status: 404 });

    return json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    return json({ ok: false, message: error.message || "Conversion d'alerte impossible." }, { status: 400 });
  }
};

export const onRequest = methodNotAllowed;
