import { authorizeOpsRequest, listFollowUps } from "../../_lib/cases.js";
import { authorizeOrReject, json, methodNotAllowed, onOptions } from "../../_lib/http.js";

export const onRequestOptions = () => onOptions("GET, OPTIONS");

export const onRequestGet = async (context) => {
  if (!context.env?.DATABASE_URL) {
    return json({ ok: false, message: "Service temporairement indisponible." }, { status: 503 });
  }

  const auth = authorizeOrReject(context.request, context.env, authorizeOpsRequest);

  if (auth instanceof Response) {
    return auth;
  }

  try {
    const url = new URL(context.request.url);
    const items = await listFollowUps(context.env, {
      reason: url.searchParams.get("reason") || "",
      daysSinceLastContact: url.searchParams.get("days") || "",
      query: url.searchParams.get("query") || ""
    });

    return json({
      ok: true,
      items
    });
  } catch (error) {
    console.error("ops/follow-up GET error:", error);
    return json(
      {
        ok: false,
        message: "Erreur opérateur."
      },
      { status: 400 }
    );
  }
};

export const onRequest = methodNotAllowed;
