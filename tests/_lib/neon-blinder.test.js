import { describe, expect, it } from "vitest";
import { webcrypto } from "node:crypto";
import {
  blindAndEncrypt,
  blindIndex,
  decryptField,
  encryptField
} from "../../functions/_lib/neon-blinder.js";

// Workers expose `crypto.subtle` globally; Node ≥ 20 needs the polyfill.
if (typeof globalThis.crypto === "undefined") {
  globalThis.crypto = webcrypto;
}

const b64 = (bytes) => Buffer.from(bytes).toString("base64");
const env = {
  NEON_FIELD_KEY: b64(webcrypto.getRandomValues(new Uint8Array(32))),
  NEON_BLIND_KEY: b64(webcrypto.getRandomValues(new Uint8Array(32)))
};

describe("encryptField() / decryptField()", () => {
  it("round-trips a string", async () => {
    const cipher = await encryptField("olivier@nexuradata.com", env);
    expect(cipher.startsWith("v1:")).toBe(true);
    expect(cipher).not.toContain("olivier");
    expect(await decryptField(cipher, env)).toBe("olivier@nexuradata.com");
  });

  it("is non-deterministic — same plaintext yields different ciphertext", async () => {
    const a = await encryptField("hello", env);
    const b = await encryptField("hello", env);
    expect(a).not.toBe(b);
    expect(await decryptField(a, env)).toBe("hello");
    expect(await decryptField(b, env)).toBe("hello");
  });

  it("returns empty string for empty input", async () => {
    expect(await encryptField("", env)).toBe("");
    expect(await decryptField("", env)).toBe("");
  });

  it("throws on tampered ciphertext", async () => {
    const cipher = await encryptField("secret", env);
    const tampered = cipher.slice(0, -2) + (cipher.endsWith("AA") ? "BB" : "AA");
    await expect(decryptField(tampered, env)).rejects.toThrow();
  });

  it("throws on unsupported version prefix", async () => {
    const cipher = await encryptField("secret", env);
    const bumped = "v9" + cipher.slice(2);
    await expect(decryptField(bumped, env)).rejects.toThrow(/version/i);
  });

  it("fails to decrypt under a different key", async () => {
    const cipher = await encryptField("secret", env);
    const otherEnv = {
      ...env,
      NEON_FIELD_KEY: b64(webcrypto.getRandomValues(new Uint8Array(32)))
    };
    await expect(decryptField(cipher, otherEnv)).rejects.toThrow();
  });

  it("throws when the field key is missing", async () => {
    await expect(encryptField("x", { NEON_BLIND_KEY: env.NEON_BLIND_KEY })).rejects.toThrow(
      /NEON_FIELD_KEY/
    );
  });
});

describe("blindIndex()", () => {
  it("is deterministic for the same plaintext", async () => {
    const a = await blindIndex("olivier@nexuradata.com", env);
    const b = await blindIndex("olivier@nexuradata.com", env);
    expect(a).toBe(b);
  });

  it("is case- and whitespace-insensitive", async () => {
    const a = await blindIndex("Olivier@Nexuradata.com", env);
    const b = await blindIndex("  olivier@nexuradata.com  ", env);
    expect(a).toBe(b);
  });

  it("differs for different inputs", async () => {
    const a = await blindIndex("a@b.co", env);
    const b = await blindIndex("c@d.co", env);
    expect(a).not.toBe(b);
  });

  it("differs under a different blind key", async () => {
    const a = await blindIndex("a@b.co", env);
    const otherEnv = {
      ...env,
      NEON_BLIND_KEY: b64(webcrypto.getRandomValues(new Uint8Array(32)))
    };
    const b = await blindIndex("a@b.co", otherEnv);
    expect(a).not.toBe(b);
  });

  it("returns 32 hex chars (16 bytes truncated)", async () => {
    const idx = await blindIndex("anything", env);
    expect(idx).toMatch(/^[0-9a-f]{32}$/);
  });

  it("returns empty string for empty input", async () => {
    expect(await blindIndex("", env)).toBe("");
  });
});

describe("blindAndEncrypt()", () => {
  it("returns a coherent { cipher, blind } pair", async () => {
    const { cipher, blind } = await blindAndEncrypt("Olivier@Nexura.com", env);
    expect(await decryptField(cipher, env)).toBe("Olivier@Nexura.com");
    expect(blind).toBe(await blindIndex("olivier@nexura.com", env));
  });
});
