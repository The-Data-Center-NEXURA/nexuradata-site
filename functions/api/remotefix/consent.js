import { ZodError } from "zod";

import { json, methodNotAllowed, onOptions, parsePayload } from "../../_lib/http.js";
import { checkRateLimit, tooManyRequests } from "../../_lib/rate-limit.js";
import { giveRemoteFixConsent } from "../../_lib/remotefix.js";

export const onRequestOptions = (context) => onOptions(context.env, "POST, OPTIONS");

export const onRequestPost = async (context) => {
  const limit = checkRateLimit(context.request, 10);
  if (!limit.allowed) return tooManyRequests(limit.retryAfter);

  try {
    if (!context.env?.DATABASE_URL) return json({ ok: false, message: "Base Supabase/Postgres non configuree." }, { status: 503 });
    if (!context.env?.ACCESS_CODE_SECRET) return json({ ok: false, message: "Secret de session manquant." }, { status: 503 });
    const payload = await parsePayload(context.request);
    return json(await giveRemoteFixConsent(context.env, payload, context.request));
  } catch (error) {
    const message = error instanceof ZodError ? error.issues.map((issue) => issue.message).join(" ") : error.message;
    return json({ ok: false, message: message || "Consentement impossible." }, { status: error instanceof ZodError ? 400 : 403 });
  }
};

export const onRequest = methodNotAllowed;