import { describe, it, expect } from "vitest";
import {
  hashAccessCode,
  encryptAccessCode,
  decryptAccessCode,
  generateAccessCode,
  normalizeAccessCode
} from "../../functions/_lib/access-code.js";

const env = { ACCESS_CODE_SECRET: "test-secret-please-replace-1234567890" };
const noSecret = {};

describe("access-code: generateAccessCode()", () => {
  it("returns NNNN-NNNN format using the safe alphabet", () => {
    const code = generateAccessCode();
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/);
  });

  it("never includes confusable characters (I, O, 0, 1)", () => {
    for (let i = 0; i < 50; i += 1) {
      const code = generateAccessCode();
      expect(code).not.toMatch(/[IO01]/);
    }
  });
});

describe("access-code: normalizeAccessCode()", () => {
  it("uppercases and strips invalid characters", () => {
    expect(normalizeAccessCode(" ab12-cd34 ")).toBe("AB12-CD34");
  });

  it("removes punctuation and whitespace inside the code", () => {
    expect(normalizeAccessCode("ab.12;cd@34")).toBe("AB12CD34");
  });

  it("returns empty string for non-string input", () => {
    expect(normalizeAccessCode(undefined)).toBe("");
    expect(normalizeAccessCode(null)).toBe("");
    expect(normalizeAccessCode(12345)).toBe("");
  });

  it("truncates to 24 characters", () => {
    expect(normalizeAccessCode("A".repeat(50))).toHaveLength(24);
  });
});

describe("access-code: hashAccessCode()", () => {
  it("returns a 64-char lowercase hex string", async () => {
    const hash = await hashAccessCode("ABCD-1234", env);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces a stable hash for the same code + secret", async () => {
    const a = await hashAccessCode("ABCD-1234", env);
    const b = await hashAccessCode("ABCD-1234", env);
    expect(a).toBe(b);
  });

  it("changes when the secret changes", async () => {
    const a = await hashAccessCode("ABCD-1234", env);
    const b = await hashAccessCode("ABCD-1234", { ACCESS_CODE_SECRET: "different-secret" });
    expect(a).not.toBe(b);
  });

  it("changes when the code changes", async () => {
    const a = await hashAccessCode("ABCD-1234", env);
    const b = await hashAccessCode("ABCD-5678", env);
    expect(a).not.toBe(b);
  });

  it("falls back to a deterministic key when no secret is set", async () => {
    const a = await hashAccessCode("ABCD-1234", noSecret);
    const b = await hashAccessCode("ABCD-1234", noSecret);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("access-code: encrypt/decrypt round-trip", () => {
  it("decrypts what it encrypts", async () => {
    const code = "WXYZ-7890";
    const ciphertext = await encryptAccessCode(code, env);
    expect(ciphertext).toMatch(/^[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/);
    const decrypted = await decryptAccessCode(ciphertext, env);
    expect(decrypted).toBe(code);
  });

  it("produces a different ciphertext each time (random IV)", async () => {
    const a = await encryptAccessCode("WXYZ-7890", env);
    const b = await encryptAccessCode("WXYZ-7890", env);
    expect(a).not.toBe(b);
  });

  it("returns empty string when no secret is configured (encrypt)", async () => {
    expect(await encryptAccessCode("WXYZ-7890", noSecret)).toBe("");
  });

  it("returns empty string when no secret is configured (decrypt)", async () => {
    const ciphertext = await encryptAccessCode("WXYZ-7890", env);
    expect(await decryptAccessCode(ciphertext, noSecret)).toBe("");
  });

  it("returns empty string for malformed ciphertext", async () => {
    expect(await decryptAccessCode("not-base64", env)).toBe("");
    expect(await decryptAccessCode("missingdot", env)).toBe("");
    expect(await decryptAccessCode("", env)).toBe("");
  });

  it("returns empty string when the secret has been rotated", async () => {
    const ciphertext = await encryptAccessCode("WXYZ-7890", env);
    const rotated = await decryptAccessCode(ciphertext, { ACCESS_CODE_SECRET: "new-secret" });
    expect(rotated).toBe("");
  });

  it("returns empty string when the ciphertext is tampered with", async () => {
    const ciphertext = await encryptAccessCode("WXYZ-7890", env);
    const [iv, payload] = ciphertext.split(".");
    // Flip the first base64 char of the payload to a different valid one
    const tampered = `${iv}.${payload[0] === "A" ? "B" : "A"}${payload.slice(1)}`;
    expect(await decryptAccessCode(tampered, env)).toBe("");
  });

  it("returns empty string for non-string ciphertext", async () => {
    expect(await decryptAccessCode(undefined, env)).toBe("");
    expect(await decryptAccessCode(null, env)).toBe("");
  });
});
