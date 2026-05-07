import { ZodError } from "zod";

import { json, methodNotAllowed, onOptions, parsePayload } from "../../_lib/http.js";
import { checkRateLimit, tooManyRequests } from "../../_lib/rate-limit.js";
import { createRemoteFixCase, getRemoteFixClientOverview } from "../../_lib/remotefix.js";

const validationMessage = (error) => error instanceof ZodError
  ? error.issues.map((issue) => issue.message).join(" ")
  : error instanceof Error ? error.message : "Requete invalide.";

export const onRequestOptions = (context) => onOptions(context.env, "GET, POST, OPTIONS");

export const onRequestGet = async (context) => {
  const limit = checkRateLimit(context.request, 20);
  if (!limit.allowed) return tooManyRequests(limit.retryAfter);

  try {
    if (!context.env?.DATABASE_URL) return json({ ok: false, message: "Base Supabase/Postgres non configuree." }, { status: 503 });
    if (!context.env?.ACCESS_CODE_SECRET) return json({ ok: false, message: "Secret de session manquant." }, { status: 503 });
    const url = new URL(context.request.url);
    return json(await getRemoteFixClientOverview(context.env, {
      caseId: url.searchParams.get("caseId"),
      sessionId: url.searchParams.get("sessionId"),
      token: url.searchParams.get("token")
    }));
  } catch (error) {
    return json({ ok: false, message: error.message || "Lien RemoteFix invalide." }, { status: 403 });
  }
};

export const onRequestPost = async (context) => {
  const limit = checkRateLimit(context.request, 4);
  if (!limit.allowed) return tooManyRequests(limit.retryAfter);

  try {
    if (!context.env?.DATABASE_URL) return json({ ok: false, message: "Base Supabase/Postgres non configuree." }, { status: 503 });
    if (!context.env?.ACCESS_CODE_SECRET) return json({ ok: false, message: "Secret de session manquant." }, { status: 503 });

    const payload = await parsePayload(context.request);
    const result = await createRemoteFixCase(context.env, payload, context.request.url);

    if (result.conflict) return json({ ok: false, message: "Cle d'idempotence deja utilisee avec un contenu different." }, { status: 409 });
    return json(result.response, { status: result.statusCode || 200 });
  } catch (error) {
    return json({ ok: false, message: validationMessage(error) }, { status: error instanceof ZodError ? 400 : 503 });
  }
};

export const onRequest = methodNotAllowed;