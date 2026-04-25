export const json = (payload, init = {}) =>
  new Response(JSON.stringify(payload), {
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": "no-store",
      ...init.headers
    },
    ...init
  });

export const onOptions = (env, allow = "GET, POST, OPTIONS") =>
  new Response(null, {
    status: 204,
    headers: {
      allow,
      "access-control-allow-origin": env?.PUBLIC_SITE_ORIGIN || "https://nexuradata.ca",
      "access-control-allow-methods": allow,
      "access-control-allow-headers": "content-type",
      "cache-control": "no-store",
      "vary": "Origin"
    }
  });

export const parsePayload = async (request) => {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return request.json();
  }

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    return Object.fromEntries(formData.entries());
  }

  throw new Error("Format de requête non pris en charge.");
};

export const methodNotAllowed = () =>
  json(
    {
      ok: false,
      message: "Méthode non autorisée."
    },
    { status: 405 }
  );

export const authorizeOrReject = (request, env, authorizeFn) => {
  const auth = authorizeFn(request, env);

  if (!auth.ok) {
    return json(
      {
        ok: false,
        message: "Accès opérateur refusé."
      },
      { status: 403 }
    );
  }

  return auth;
};
