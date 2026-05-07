import { describe, it, expect, vi } from "vitest";

import {
  quoteRequestSchema,
  quoteClientActionSchema,
  createQuoteFromOpportunity,
  setClientQuoteStatus,
  listClientQuotes
} from "../../functions/_lib/quotes.js";

// ─── schemas ─────────────────────────────────────────────────

describe("quoteRequestSchema", () => {
  it("accepts an empty object (all fields optional)", () => {
    expect(() => quoteRequestSchema.parse({})).not.toThrow();
  });

  it("rejects negative amounts", () => {
    expect(() => quoteRequestSchema.parse({ amountCad: -5 })).toThrow();
  });

  it("rejects extra unknown keys (strict)", () => {
    expect(() => quoteRequestSchema.parse({ secret: "x" })).toThrow();
  });

  it("clamps line-items to 20", () => {
    const items = Array.from({ length: 21 }, (_, i) => ({ label: `L${i}`, amountCad: 1, quantity: 1 }));
    expect(() => quoteRequestSchema.parse({ lineItems: items })).toThrow();
  });
});

describe("quoteClientActionSchema", () => {
  it("requires an accessCode", () => {
    expect(() => quoteClientActionSchema.parse({})).toThrow();
  });

  it("rejects unknown keys", () => {
    expect(() => quoteClientActionSchema.parse({ accessCode: "ABCD", other: 1 })).toThrow();
  });

  it("accepts a valid 4-20 char code", () => {
    expect(quoteClientActionSchema.parse({ accessCode: "AB12-CD" })).toEqual({ accessCode: "AB12-CD" });
  });
});

// ─── createQuoteFromOpportunity ──────────────────────────────

const makeSqlMock = (responses) => {
  const calls = [];
  const fn = (strings, ...values) => {
    calls.push({ sql: strings.join("?"), values });
    if (responses.length === 0) return Promise.resolve([]);
    return Promise.resolve(responses.shift());
  };
  fn.calls = calls;
  return fn;
};

const stubEnv = (sql) => ({ DATABASE_URL: "postgres://stub" }) && { DATABASE_URL: "postgres://stub", __sql: sql };

vi.mock("../../functions/_lib/db.js", () => ({
  getDb: (env) => env.__sql
}));

describe("createQuoteFromOpportunity", () => {
  it("returns null when opportunity is missing", async () => {
    const sql = makeSqlMock([[]]);
    const env = { DATABASE_URL: "x", __sql: sql };
    const result = await createQuoteFromOpportunity(env, "opp_missing", {});
    expect(result).toBeNull();
  });

  it("inserts a quote when opportunity exists", async () => {
    const opp = {
      id: "opp_abc", case_id: "ND-2026-0001", client_id: null,
      title: "Service Triage", recommended_service: "RemoteLab Diagnose",
      estimated_value_min: 49, estimated_value_max: 199, status: "open"
    };
    const sql = makeSqlMock([[opp], [], []]);
    const env = { DATABASE_URL: "x", __sql: sql };
    const result = await createQuoteFromOpportunity(env, "opp_abc", { expiresInDays: 7 });
    expect(result).toBeTruthy();
    expect(result.quote.id).toMatch(/^quote_[0-9a-f]{16}$/);
    expect(result.quote.amountCad).toBe(199);
    expect(result.quote.status).toBe("sent");
    expect(result.quote.lineItems).toHaveLength(1);
    expect(sql.calls.length).toBe(3); // select, insert, update
  });

  it("uses payload override for amountCad and lineItems", async () => {
    const opp = {
      id: "opp_xyz", case_id: "ND-2026-0099", client_id: null,
      title: "Server Triage", recommended_service: "Server Triage",
      estimated_value_min: 499, estimated_value_max: 1999, status: "open"
    };
    const sql = makeSqlMock([[opp], [], []]);
    const env = { DATABASE_URL: "x", __sql: sql };
    const lineItems = [{ label: "On-site recovery", amountCad: 850, quantity: 2 }];
    const result = await createQuoteFromOpportunity(env, "opp_xyz", { lineItems });
    expect(result.quote.amountCad).toBe(1700);
    expect(result.quote.lineItems).toEqual(lineItems);
  });
});

// ─── setClientQuoteStatus ───────────────────────────────────

describe("setClientQuoteStatus", () => {
  it("rejects invalid action", async () => {
    const env = { DATABASE_URL: "x", ACCESS_CODE_SECRET: "s", __sql: makeSqlMock([]) };
    await expect(setClientQuoteStatus(env, "ND-1", "ABCD", "quote_x", "paid")).rejects.toThrow();
  });

  it("returns unauthorized when caseId or hash mismatch", async () => {
    const sql = makeSqlMock([[]]); // no case row
    const env = { DATABASE_URL: "x", ACCESS_CODE_SECRET: "shhh", __sql: sql };
    const result = await setClientQuoteStatus(env, "ND-NOPE", "ABCD", "quote_x", "approved");
    expect(result).toEqual({ error: "unauthorized" });
  });
});

describe("listClientQuotes", () => {
  it("returns null when credentials are invalid", async () => {
    const sql = makeSqlMock([[]]);
    const env = { DATABASE_URL: "x", ACCESS_CODE_SECRET: "shhh", __sql: sql };
    const result = await listClientQuotes(env, "ND-1", "ABCD");
    expect(result).toBeNull();
  });
});
