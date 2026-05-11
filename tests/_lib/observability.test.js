import { afterEach, describe, expect, it, vi } from "vitest";
import { createRequestTelemetry, logError, logEvent, withObservabilityHeaders } from "../../functions/_lib/observability.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("observability helpers", () => {
  it("reuses safe inbound identifiers", () => {
    const traceparent = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";
    const telemetry = createRequestTelemetry({
      request: new Request("https://nexuradata.ca/api/status?caseId=secret", {
        method: "POST",
        headers: { "x-request-id": "req-12345678", traceparent }
      }),
      env: { CF_PAGES_BRANCH: "main", CF_PAGES_COMMIT_SHA: "abcdef1234567890" }
    });

    expect(telemetry).toMatchObject({
      requestId: "req-12345678",
      correlationId: "req-12345678",
      traceparent,
      traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
      method: "POST",
      route: "/api/status",
      environment: "production",
      version: "abcdef1234567890"
    });
  });

  it("adds correlation headers", async () => {
    const telemetry = createRequestTelemetry({ request: new Request("https://nexuradata.ca/api/intake"), env: {} });
    const response = withObservabilityHeaders(new Response("ok"), telemetry);

    expect(response.headers.get("x-request-id")).toBe(telemetry.requestId);
    expect(response.headers.get("x-correlation-id")).toBe(telemetry.correlationId);
    expect(response.headers.get("traceparent")).toBe(telemetry.traceparent);
    expect(await response.text()).toBe("ok");
  });

  it("redacts sensitive fields and omits stacks", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const telemetry = createRequestTelemetry({ request: new Request("https://nexuradata.ca/api/intake"), env: {} });

    logEvent(telemetry, "warn", "test.event", { token: "secret-token-value", eventId: "evt_123" });
    logError(telemetry, "test.error", new TypeError("Bad input"));

    expect(JSON.parse(warn.mock.calls[0][0])).toMatchObject({ token: "[redacted]", eventId: "evt_123" });
    expect(JSON.parse(error.mock.calls[0][0])).toMatchObject({ errorType: "TypeError", errorMessage: "Bad input" });
    expect(JSON.parse(error.mock.calls[0][0]).stack).toBeUndefined();
  });
});
