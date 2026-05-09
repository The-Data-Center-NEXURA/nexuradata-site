// Public, unauthenticated platform health endpoint.
// Returns per-component status for the public statut page.
// Designed for low cost: env presence checks + a single `select 1` Neon ping.
// Cache: 60 s at the edge to avoid hammering Neon.

import { getDb } from "../_lib/db.js";
import { json, methodNotAllowed, onOptions } from "../_lib/http.js";
import { logError } from "../_lib/observability.js";
import { checkRateLimit, tooManyRequests } from "../_lib/rate-limit.js";

const STATUS_OK = "operational";
const STATUS_DEGRADED = "degraded";
const STATUS_DOWN = "down";
const DB_TIMEOUT_MS = 800;

const componentTemplate = (id, label) => ({ id, label, status: STATUS_OK, detail: "" });

const withTimeout = (promise, ms) => {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("timeout")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
};

const pingDatabase = async (env) => {
  if (!env?.DATABASE_URL && !env?.SUPABASE_DATABASE_URL && !env?.SUPABASE_DB_URL) {
    return { status: STATUS_DOWN, detail: "Configuration manquante: DATABASE_URL/SUPABASE_DATABASE_URL" };
  }

  try {
    const sql = getDb(env);
    const start = Date.now();
    const result = await withTimeout(
      sql`select 1 as ok`.then(
        (rows) => ({ ok: true, rows }),
        (error) => ({ ok: false, error })
      ),
      DB_TIMEOUT_MS
    );
    const ms = Date.now() - start;
    if (!result.ok) {
      return { status: STATUS_DOWN, detail: "Connexion base Postgres impossible", error: result.error };
    }
    const rows = result.rows;
    if (!rows?.length) return { status: STATUS_DEGRADED, detail: "Réponse vide", ms };
    return { status: STATUS_OK, detail: `Réponse en ${ms} ms`, ms };
  } catch (error) {
    if (error?.message === "timeout") {
      return { status: STATUS_DEGRADED, detail: `Latence > ${DB_TIMEOUT_MS} ms` };
    }
    return { status: STATUS_DOWN, detail: "Connexion base Postgres impossible", error };
  }
};

const checkEnvPresence = (env, keys) => {
  const missing = keys.filter((k) => !env?.[k]);
  if (missing.length === 0) return { status: STATUS_OK, detail: "" };
  return {
    status: STATUS_DOWN,
    detail: `Configuration manquante: ${missing.join(", ")}`
  };
};

export const onRequestOptions = (context) => onOptions(context.env, "GET, OPTIONS");

export const onRequestGet = async (context) => {
  const limit = checkRateLimit(context.request, 60);
  if (!limit.allowed) return tooManyRequests(limit.retryAfter);

  const env = context.env || {};
  const checkedAt = new Date().toISOString();

  const components = [
    componentTemplate("site", "Site public"),
    componentTemplate("intake", "Formulaire d'intake"),
    componentTemplate("status", "Suivi de dossier client"),
    componentTemplate("payments", "Paiements"),
    componentTemplate("email", "Courriels transactionnels"),
    componentTemplate("database", "Base de données"),
    componentTemplate("lab", "Laboratoire")
  ];

  const byId = Object.fromEntries(components.map((c) => [c.id, c]));

  // site: this response itself is proof the edge is serving.
  byId.site.detail = "Distribution edge Cloudflare Pages.";

  // intake / status both depend on Postgres + access secret
  {
    const r = (env?.DATABASE_URL || env?.SUPABASE_DATABASE_URL || env?.SUPABASE_DB_URL)
      ? { status: STATUS_OK, detail: "" }
      : { status: STATUS_DOWN, detail: "Configuration manquante: DATABASE_URL/SUPABASE_DATABASE_URL" };

    if (!env?.ACCESS_CODE_SECRET) {
      r.status = STATUS_DOWN;
      r.detail = r.detail
        ? `${r.detail}, ACCESS_CODE_SECRET`
        : "Configuration manquante: ACCESS_CODE_SECRET";
    }
    byId.intake.status = r.status;
    byId.intake.detail = r.status === STATUS_OK ? "Validation, persistance et email actifs." : r.detail;
    byId.status.status = r.status;
    byId.status.detail = r.status === STATUS_OK ? "Authentification par code et lecture du dossier." : r.detail;
  }

  // payments: Stripe secret + webhook secret
  {
    const r = checkEnvPresence(env, ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"]);
    byId.payments.status = r.status;
    byId.payments.detail = r.status === STATUS_OK ? "Stripe Checkout et webhooks armés." : r.detail;
  }

  // email: Resend
  {
    const r = checkEnvPresence(env, ["RESEND_API_KEY"]);
    byId.email.status = r.status;
    byId.email.detail = r.status === STATUS_OK ? "Envoi via Resend." : r.detail;
  }

  // database: live ping
  try {
    const r = await pingDatabase(env);
    if (r.error) logError(context, "api.platform_status.db_ping", r.error);
    byId.database.status = r.status;
    byId.database.detail = r.detail;
  } catch (error) {
    logError(context, "api.platform_status.db_unexpected", error);
    byId.database.status = STATUS_DOWN;
    byId.database.detail = "Vérification impossible.";
  }

  // lab: static signal — operational unless an operator overrides via env.
  if (env.LAB_STATUS_OVERRIDE) {
    const value = String(env.LAB_STATUS_OVERRIDE).toLowerCase();
    if (value === STATUS_DEGRADED || value === STATUS_DOWN) {
      byId.lab.status = value;
    }
    if (env.LAB_STATUS_DETAIL) {
      byId.lab.detail = String(env.LAB_STATUS_DETAIL).slice(0, 280);
    }
  } else {
    byId.lab.detail = "Réception, évaluation, intervention et restitution selon le calendrier.";
  }

  // overall = worst-of
  const order = { [STATUS_OK]: 0, [STATUS_DEGRADED]: 1, [STATUS_DOWN]: 2 };
  const overall = components.reduce((acc, c) => (order[c.status] > order[acc] ? c.status : acc), STATUS_OK);

  return json(
    {
      ok: true,
      checkedAt,
      overall,
      components
    },
    {
      headers: {
        // 60 s public cache + SWR; safe because data is non-sensitive.
        "cache-control": "public, max-age=60, stale-while-revalidate=120"
      }
    }
  );
};

export const onRequest = methodNotAllowed;
