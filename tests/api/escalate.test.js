import { describe, it, expect, vi } from "vitest";

import { onRequestPost as escalateHandler } from "../../functions/api/ops/cases/[caseId]/escalate.js";

const makeRequest = (body, headers = {}) =>
  new Request("https://localhost/api/ops/cases/ND-1/escalate", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body)
  });

describe("ops escalate endpoint", () => {
  it("returns 503 when DATABASE_URL missing", async () => {
    const res = await escalateHandler({
      request: makeRequest({ reason: "Lab needed" }),
      env: {},
      params: { caseId: "ND-1" }
    });
    expect(res.status).toBe(503);
  });

  it("returns 400 when reason missing", async () => {
    const sql = vi.fn();
    const res = await escalateHandler({
      request: makeRequest({}),
      env: { DATABASE_URL: "x", __sql: sql },
      params: { caseId: "ND-1" }
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/motif/i);
  });
});
