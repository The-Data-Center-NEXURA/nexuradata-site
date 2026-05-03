export const apiSecurityHeaders = {
  "cache-control": "no-store",
  "cross-origin-opener-policy": "same-origin",
  "cross-origin-resource-policy": "same-site",
  "origin-agent-cluster": "?1",
  "permissions-policy": "accelerometer=(), autoplay=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "x-permitted-cross-domain-policies": "none",
  "x-robots-tag": "noindex, nofollow"
};

export const json = (payload, init = {}) =>
  new Response(JSON.stringify(payload), {
    headers: {
      "content-type": "application/json; charset=UTF-8",
      ...apiSecurityHeaders,
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
      ...apiSecurityHeaders,
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
