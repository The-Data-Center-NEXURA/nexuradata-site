import { ZodError } from "zod";

import { json, methodNotAllowed, onOptions, parsePayload } from "../../_lib/http.js";
import { checkRateLimit, tooManyRequests } from "../../_lib/rate-limit.js";
import { createSignedAgentCommand, listAgentCommandsForSession, requireRemoteFixPermission } from "../../_lib/remotefix.js";

export const onRequestOptions = (context) => onOptions(context.env, "GET, POST, OPTIONS");

export const onRequestGet = async (context) => {
  const limit = checkRateLimit(context.request, 20);
  if (!limit.allowed) return tooManyRequests(limit.retryAfter);

  try {
    if (!context.env?.DATABASE_URL) return json({ ok: false, message: "Base Supabase/Postgres non configuree." }, { status: 503 });
    if (!context.env?.ACCESS_CODE_SECRET) return json({ ok: false, message: "Secret de session manquant." }, { status: 503 });
    const url = new URL(context.request.url);
    return json(await listAgentCommandsForSession(context.env, {
      caseId: url.searchParams.get("caseId"),
      sessionId: url.searchParams.get("sessionId"),
      token: url.searchParams.get("token")
    }));
  } catch (error) {
    return json({ ok: false, message: error.message || "Commandes indisponibles." }, { status: 403 });
  }
};

export const onRequestPost = async (context) => {
  try {
    if (!context.env?.DATABASE_URL) return json({ ok: false, message: "Base Supabase/Postgres non configuree." }, { status: 503 });
    const auth = requireRemoteFixPermission(context.request, context.env, "commands.create");
    if (!auth.ok) return json({ ok: false, message: "Permission insuffisante." }, { status: 403 });
    const payload = await parsePayload(context.request);
    return json(await createSignedAgentCommand(context.env, payload, auth.actor));
  } catch (error) {
    const message = error instanceof ZodError ? error.issues.map((issue) => issue.message).join(" ") : error.message;
    return json({ ok: false, message: message || "Commande refusee." }, { status: error instanceof ZodError ? 400 : 403 });
  }
};

export const onRequest = methodNotAllowed;