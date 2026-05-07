import { json, methodNotAllowed, onOptions, parsePayload } from "../../_lib/http.js";
import { createRemoteFixSessionForExistingCase, requireRemoteFixPermission } from "../../_lib/remotefix.js";

export const onRequestOptions = (context) => onOptions(context.env, "POST, OPTIONS");

export const onRequestPost = async (context) => {
  try {
    if (!context.env?.DATABASE_URL) return json({ ok: false, message: "Base Supabase/Postgres non configuree." }, { status: 503 });
    if (!context.env?.ACCESS_CODE_SECRET) return json({ ok: false, message: "Secret de session manquant." }, { status: 503 });
    const auth = requireRemoteFixPermission(context.request, context.env, "sessions.create");
    if (!auth.ok) return json({ ok: false, message: "Permission insuffisante." }, { status: 403 });
    const payload = await parsePayload(context.request);
    return json(await createRemoteFixSessionForExistingCase(context.env, payload.caseId, context.request.url));
  } catch (error) {
    return json({ ok: false, message: error.message || "Session RemoteFix impossible." }, { status: 400 });
  }
};

export const onRequest = methodNotAllowed;