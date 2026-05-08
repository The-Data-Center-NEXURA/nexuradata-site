/**
 * Neon blinder — envelope encryption + deterministic blind index for PII
 * stored in Neon Postgres.
 *
 * Goal: keep equality lookups (`WHERE email_blind = $1`) working without
 * ever storing the plaintext in the row. Anyone with read-only access to
 * Neon (logical replica, leaked snapshot, support engineer) sees only
 * opaque base64 ciphertext + opaque hex blind indexes.
 *
 * Two primitives, two secrets:
 *
 *   1. encryptField(plaintext, env)
 *      AES-256-GCM, fresh 12-byte IV per call, 16-byte auth tag appended.
 *      Output format: `v1:<base64(iv|ciphertext|tag)>`. Non-deterministic:
 *      encrypting the same value twice yields different ciphertext.
 *      Key: env.NEON_FIELD_KEY (32 bytes, base64).
 *
 *   2. blindIndex(plaintext, env)
 *      HMAC-SHA256 over a normalised form (lowercased, trimmed), truncated
 *      to 16 bytes (32 hex chars). Deterministic: the same input always
 *      produces the same digest, which is what enables WHERE-equality
 *      lookups. NOT reversible — rainbow tables are mitigated by the
 *      separate HMAC key (env.NEON_BLIND_KEY).
 *
 * Threat model handled:
 *   - Database snapshot leak / replica access → attacker sees only
 *     ciphertext + truncated HMAC; no plaintext, no reversible mapping.
 *   - Compromise of NEON_FIELD_KEY alone → blind indexes still secret
 *     (they use a distinct key), so attacker cannot pivot from a known
 *     email to find which row.
 *   - Compromise of NEON_BLIND_KEY alone → attacker can confirm a
 *     guessed email is present (still no plaintext for unknown emails).
 *
 * NOT handled (by design):
 *   - LIKE / substring search on encrypted columns.
 *   - Sorting / range queries on encrypted columns.
 *   - Compromise of BOTH keys (out of scope; rotate via re-encrypt job).
 *
 * Key rotation: bump the version prefix (`v1:` → `v2:`) and decryptField
 * will dispatch on the prefix. Kept extension-ready below.
 */

const VERSION = "v1";
const IV_BYTES = 12;
const KEY_BYTES = 32;
const BLIND_BYTES = 16;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const fromBase64 = (value) => {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
};

const toBase64 = (bytes) => {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

const toHex = (bytes) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

const requireSecret = (env, name) => {
  const raw = env?.[name];
  if (typeof raw !== "string" || raw.length === 0) {
    throw new Error(`Missing secret: ${name}`);
  }
  return raw;
};

const importAesKey = async (env) => {
  const raw = fromBase64(requireSecret(env, "NEON_FIELD_KEY"));
  if (raw.length !== KEY_BYTES) {
    throw new Error(`NEON_FIELD_KEY must decode to ${KEY_BYTES} bytes`);
  }
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt"
  ]);
};

const importHmacKey = async (env) => {
  const raw = fromBase64(requireSecret(env, "NEON_BLIND_KEY"));
  if (raw.length < KEY_BYTES) {
    throw new Error(`NEON_BLIND_KEY must decode to at least ${KEY_BYTES} bytes`);
  }
  return crypto.subtle.importKey(
    "raw",
    raw,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
};

/**
 * Encrypt a single field value. Returns a versioned, base64-encoded string
 * safe to store in a TEXT column. Non-deterministic.
 *
 * @param {string} plaintext
 * @param {Record<string, string>} env
 * @returns {Promise<string>}
 */
export const encryptField = async (plaintext, env) => {
  if (typeof plaintext !== "string" || plaintext.length === 0) return "";
  const key = await importAesKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const cipherBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    textEncoder.encode(plaintext)
  );
  const cipher = new Uint8Array(cipherBuf);
  const out = new Uint8Array(iv.length + cipher.length);
  out.set(iv, 0);
  out.set(cipher, iv.length);
  return `${VERSION}:${toBase64(out)}`;
};

/**
 * Decrypt a value previously produced by `encryptField`. Returns the
 * plaintext string, or "" for empty input. Throws on bad version, wrong
 * key, or auth-tag failure (tampering).
 *
 * @param {string} ciphertext
 * @param {Record<string, string>} env
 * @returns {Promise<string>}
 */
export const decryptField = async (ciphertext, env) => {
  if (typeof ciphertext !== "string" || ciphertext.length === 0) return "";
  const colon = ciphertext.indexOf(":");
  if (colon < 0) throw new Error("Encrypted value missing version prefix");
  const version = ciphertext.slice(0, colon);
  if (version !== VERSION) {
    throw new Error(`Unsupported encrypted-value version: ${version}`);
  }
  const blob = fromBase64(ciphertext.slice(colon + 1));
  if (blob.length <= IV_BYTES) throw new Error("Encrypted blob too short");
  const iv = blob.slice(0, IV_BYTES);
  const cipher = blob.slice(IV_BYTES);
  const key = await importAesKey(env);
  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    cipher
  );
  return textDecoder.decode(plainBuf);
};

/**
 * Normalise a value before hashing so case differences and surrounding
 * whitespace don't produce different blind indexes. Keep this in sync
 * with the way the application stores the value.
 */
const normaliseForBlind = (value) => value.trim().toLowerCase();

/**
 * Produce a deterministic blind index for equality lookups. Truncated
 * to BLIND_BYTES so the index column stays compact (32 hex chars).
 *
 * @param {string} plaintext
 * @param {Record<string, string>} env
 * @returns {Promise<string>}
 */
export const blindIndex = async (plaintext, env) => {
  if (typeof plaintext !== "string" || plaintext.length === 0) return "";
  const key = await importHmacKey(env);
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    textEncoder.encode(normaliseForBlind(plaintext))
  );
  return toHex(new Uint8Array(sig).slice(0, BLIND_BYTES));
};

/**
 * Convenience helper: produce both the ciphertext and the blind index
 * in a single call. Use this at the write site:
 *
 *     const { cipher, blind } = await blindAndEncrypt(email, env);
 *     await sql`INSERT INTO cases (email_enc, email_blind) VALUES (${cipher}, ${blind})`;
 *
 * @param {string} plaintext
 * @param {Record<string, string>} env
 * @returns {Promise<{ cipher: string, blind: string }>}
 */
export const blindAndEncrypt = async (plaintext, env) => {
  const [cipher, blind] = await Promise.all([
    encryptField(plaintext, env),
    blindIndex(plaintext, env)
  ]);
  return { cipher, blind };
};
