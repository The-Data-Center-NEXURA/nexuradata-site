import { describe, it, expect, vi } from "vitest";

vi.mock("../../functions/_lib/db.js", () => ({
  getDb: (env) => env.__sql
}));

import { onRequestPost as acceptHandler } from "../../functions/api/cases/[caseId]/quotes/[quoteId]/accept.js";
import { onRequestPost as declineHandler } from "../../functions/api/cases/[caseId]/quotes/[quoteId]/decline.js";

const makeRequest = (body) =>
  new Request("https://localhost/api/cases/ND-1/quotes/quote_x/accept", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });

const sqlReturning = (responses) => {
  const fn = (..._args) => {
    if (responses.length === 0) return Promise.resolve([]);
    return Promise.resolve(responses.shift());
  };
  return fn;
};

const baseEnv = (sql) => ({
  DATABASE_URL: "postgres://stub",
  ACCESS_CODE_SECRET: "stub-secret",
  __sql: sql
});

describe("client quote accept endpoint", () => {
  it("503 when env missing", async () => {
    const res = await acceptHandler({ request: makeRequest({ accessCode: "ABCD" }), env: {}, params: { caseId: "ND-1", quoteId: "quote_x" } });
    expect(res.status).toBe(503);
  });

  it("400 on invalid payload (missing accessCode)", async () => {
    const res = await acceptHandler({
      request: makeRequest({}),
      env: baseEnv(sqlReturning([])),
      params: { caseId: "ND-1", quoteId: "quote_x" }
    });
    expect(res.status).toBe(400);
  });

  it("400 when caseId / quoteId path params are blank", async () => {
    const res = await acceptHandler({
      request: makeRequest({ accessCode: "ABCD" }),
      env: baseEnv(sqlReturning([])),
      params: { caseId: "", quoteId: "" }
    });
    expect(res.status).toBe(400);
  });

  it("401 when access code does not match (verifyClientCredentials returns null)", async () => {
    // setClientQuoteStatus → verifyClientCredentials → first sql returns no row
    const res = await acceptHandler({
      request: makeRequest({ accessCode: "WRONG" }),
      env: baseEnv(sqlReturning([[]])),
      params: { caseId: "ND-1", quoteId: "quote_x" }
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });
});

describe("client quote decline endpoint", () => {
  it("503 when env missing", async () => {
    const res = await declineHandler({ request: makeRequest({ accessCode: "ABCD" }), env: {}, params: { caseId: "ND-1", quoteId: "quote_x" } });
    expect(res.status).toBe(503);
  });

  it("400 on invalid payload", async () => {
    const res = await declineHandler({
      request: makeRequest({ accessCode: "" }),
      env: baseEnv(sqlReturning([])),
      params: { caseId: "ND-1", quoteId: "quote_x" }
    });
    expect(res.status).toBe(400);
  });

  it("401 when access code does not match", async () => {
    const res = await declineHandler({
      request: makeRequest({ accessCode: "WRONG" }),
      env: baseEnv(sqlReturning([[]])),
      params: { caseId: "ND-1", quoteId: "quote_x" }
    });
    expect(res.status).toBe(401);
  });
});
