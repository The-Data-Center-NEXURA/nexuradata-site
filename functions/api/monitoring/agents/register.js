import { json, methodNotAllowed, onOptions, parsePayload } from "../../../_lib/http.js";
import { registerMonitoringAgent, registerMonitoringAgentSchema } from "../../../_lib/monitor.js";
import { requireRemoteFixPermission } from "../../../_lib/remotefix.js";

export const onRequestOptions = (context) => onOptions(context.env, "POST, OPTIONS");

export const onRequestPost = async (context) => {
  try {
    if (!context.env?.DATABASE_URL) {
      return json({ ok: false, message: "Base Postgres non configurée." }, { status: 503 });
    }
    const auth = requireRemoteFixPermission(context.request, context.env, "cases.write");
    if (!auth.ok) return json({ ok: false, message: "Permission insuffisante." }, { status: 403 });

    const payload = await parsePayload(context.request);
    const parsed = registerMonitoringAgentSchema.safeParse(payload);
    if (!parsed.success) {
      return json({ ok: false, message: "Charge utile invalide.", issues: parsed.error.issues }, { status: 400 });
    }

    const result = await registerMonitoringAgent(context.env, parsed.data);
    return json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    return json({ ok: false, message: error.message || "Enregistrement agent impossible." }, { status: 400 });
  }
};

export const onRequest = methodNotAllowed;
