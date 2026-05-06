const SERVICE = "nexuradata-site";
const COMPONENT = "cloudflare-pages-functions";
const TENANT = "nexuradata";
const REQUEST_ID = "x-request-id";
const CORRELATION_ID = "x-correlation-id";
const TRACEPARENT = "traceparent";
const TRACE_PATTERN = /^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/i;
const SENSITIVE_KEY = /access.?code|api.?key|authorization|cookie|password|secret|token/i;

const compact = (record) => Object.fromEntries(
  Object.entries(record).filter(([, value]) => value !== undefined && value !== null && value !== "")
);

const safeHeader = (value) => {
  const text = `${value || ""}`.trim();
  return text.length <= 128 && /^[A-Za-z0-9:._/-]+$/.test(text) ? text : "";
};

const randomHex = (bytes) => {
  const values = new Uint8Array(bytes);
  const cryptoProvider = globalThis.crypto;
  if (cryptoProvider?.getRandomValues) {
    cryptoProvider.getRandomValues(values);
  } else {
    for (let index = 0; index < values.length; index += 1) values[index] = Math.floor(Math.random() * 256);
  }
  return [...values].map((value) => value.toString(16).padStart(2, "0")).join("");
};

const requestId = (request) => safeHeader(request?.headers?.get(REQUEST_ID))
  || safeHeader(request?.headers?.get(CORRELATION_ID))
  || safeHeader(request?.headers?.get("cf-ray"))
  || globalThis.crypto?.randomUUID?.()
  || `${Date.now().toString(36)}-${randomHex(8)}`;

const traceFor = (request) => {
  const inbound = `${request?.headers?.get(TRACEPARENT) || ""}`.trim().toLowerCase();
  const match = TRACE_PATTERN.exec(inbound);
  if (match) return { traceparent: inbound, traceId: match[1], spanId: match[2] };

  const traceId = randomHex(16);
  const spanId = randomHex(8);
  return { traceparent: `00-${traceId}-${spanId}-01`, traceId, spanId };
};

const routeFor = (request) => {
  try {
    return new URL(request.url).pathname;
  } catch {
    return "unknown";
  }
};

const environmentFor = (env = {}) => {
  if (env.ENVIRONMENT) return `${env.ENVIRONMENT}`;
  if (env.CF_PAGES_BRANCH) return env.CF_PAGES_BRANCH === "main" ? "production" : `${env.CF_PAGES_BRANCH}`;
  return "local";
};

const scrub = (key, value) => {
  if (SENSITIVE_KEY.test(key)) return "[redacted]";
  if (value instanceof Error) return { type: value.name || "Error", message: value.message || "Unknown error" };
  if (Array.isArray(value)) return value.slice(0, 10).map((item) => scrub(key, item));
  if (value && typeof value === "object") return "[object]";
  return typeof value === "string" ? value.slice(0, 300) : value;
};

const fieldsFor = (fields = {}) => Object.fromEntries(
  Object.entries(fields).map(([key, value]) => [key, scrub(key, value)])
);

export const createRequestTelemetry = (context, operation) => {
  const request = context?.request || context;
  const env = context?.env || {};
  const trace = traceFor(request);
  const id = requestId(request);
  const route = request ? routeFor(request) : "unknown";

  return {
    service: SERVICE,
    component: COMPONENT,
    tenant: TENANT,
    environment: environmentFor(env),
    version: `${env.SITE_VERSION || env.CF_PAGES_COMMIT_SHA || "local"}`.slice(0, 40),
    requestId: id,
    correlationId: id,
    ...trace,
    method: request?.method || "UNKNOWN",
    route,
    operation: operation || `${request?.method || "UNKNOWN"} ${route}`
  };
};

const telemetryFor = (contextOrTelemetry, operation) => {
  if (!contextOrTelemetry?.request) return contextOrTelemetry || {};
  return contextOrTelemetry.data?.observability || createRequestTelemetry(contextOrTelemetry, operation);
};

export const withObservabilityHeaders = (response, telemetry) => {
  const headers = new Headers(response.headers);
  headers.set(REQUEST_ID, telemetry.requestId);
  headers.set(CORRELATION_ID, telemetry.correlationId);
  headers.set(TRACEPARENT, telemetry.traceparent);
  headers.set("access-control-expose-headers", [REQUEST_ID, CORRELATION_ID, TRACEPARENT].join(", "));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
};

export const logEvent = (contextOrTelemetry, level, event, fields = {}) => {
  const telemetry = telemetryFor(contextOrTelemetry, event);
  const record = compact({
    timestamp: new Date().toISOString(),
    level,
    event,
    service: telemetry.service || SERVICE,
    component: telemetry.component || COMPONENT,
    tenant: telemetry.tenant || TENANT,
    environment: telemetry.environment,
    version: telemetry.version,
    requestId: telemetry.requestId,
    correlationId: telemetry.correlationId,
    traceId: telemetry.traceId,
    spanId: telemetry.spanId,
    method: telemetry.method,
    route: telemetry.route,
    operation: telemetry.operation,
    ...fieldsFor(fields)
  });
  const logger = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  logger(JSON.stringify(record));
};

export const logError = (contextOrTelemetry, event, error, fields = {}) => logEvent(contextOrTelemetry, "error", event, {
  ...fields,
  errorType: error?.name || "Error",
  errorMessage: error?.message || "Unknown error"
});

export const observeRequest = async (context) => {
  const telemetry = createRequestTelemetry(context);
  const startedAt = Date.now();
  if (context?.data) context.data.observability = telemetry;

  try {
    const response = withObservabilityHeaders(await context.next(), telemetry);
    const status = response.status;
    logEvent(telemetry, status >= 500 ? "error" : status >= 400 ? "warn" : "info", "http.request.completed", {
      status,
      durationMs: Date.now() - startedAt,
      outcome: status >= 400 ? "failure" : "success"
    });
    return response;
  } catch (error) {
    logError(telemetry, "http.request.exception", error, { durationMs: Date.now() - startedAt, outcome: "failure" });
    throw error;
  }
};
