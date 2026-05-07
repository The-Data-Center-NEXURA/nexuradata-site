import { json, methodNotAllowed, onOptions, parsePayload } from "../../_lib/http.js";
import { healthCheckSchema, recordHealthCheck, requireMonitoringAgent } from "../../_lib/monitor.js";

export const onRequestOptions = (context) => onOptions(context.env, "POST, OPTIONS");

// Authenticated by `Authorization: Bearer <agentKey>` paired with the
// agentId in the payload. Operator Cloudflare Access is NOT required here —
// this is the unattended agent ingest endpoint.
export const onRequestPost = async (context) => {
  try {
    if (!context.env?.DATABASE_URL) {
      return json({ ok: false, message: "Base Postgres non configurée." }, { status: 503 });
    }

    const payload = await parsePayload(context.request);
    const parsed = healthCheckSchema.safeParse(payload);
    if (!parsed.success) {
      return json({ ok: false, message: "Charge utile invalide.", issues: parsed.error.issues }, { status: 400 });
    }

    const auth = await requireMonitoringAgent(context.request, context.env, parsed.data.agentId);
    if (!auth.ok) return json({ ok: false, message: auth.message }, { status: 401 });
    if (auth.agent.monitoring_account_id !== parsed.data.monitoringAccountId) {
      return json({ ok: false, message: "Compte Monitor incohérent pour cet agent." }, { status: 403 });
    }

    const result = await recordHealthCheck(context.env, parsed.data);
    return json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    return json({ ok: false, message: error.message || "Ingestion santé impossible." }, { status: 400 });
  }
};

export const onRequest = methodNotAllowed;
