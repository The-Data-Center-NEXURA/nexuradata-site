// Access-code crypto: hashing (SHA-256), AES-GCM encryption, and code generation.
// Self-contained — only depends on Web Crypto. Re-exported from `cases.js` for
// backward compatibility with existing callers.

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const accessCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const trimSlice = (value, maxLength) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
};

const toHex = (buffer) =>
  Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");

const toBase64 = (buffer) => {
  let binary = "";

  for (const byte of new Uint8Array(buffer)) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
};

const fromBase64 = (value) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};

const getSecretBytes = async (env) => {
  const secret = trimSlice(env?.ACCESS_CODE_SECRET, 256);
  if (!secret) {
    throw new Error("ACCESS_CODE_SECRET n'est pas configurée. Configuration requise: ACCESS_CODE_SECRET dans les variables d'environnement.");
  }
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return new Uint8Array(digest);
};

const getAesKey = async (env) =>
  crypto.subtle.importKey(
    "raw",
    await getSecretBytes(env),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );

export const hashAccessCode = async (accessCode, env) => {
  const secretBytes = await getSecretBytes(env);
  const payload = new Uint8Array(secretBytes.length + accessCode.length + 1);
  payload.set(secretBytes);
  payload.set(encoder.encode(`:${accessCode}`), secretBytes.length);
  const digest = await crypto.subtle.digest("SHA-256", payload);
  return toHex(digest);
};

export const encryptAccessCode = async (accessCode, env) => {
  if (!trimSlice(env?.ACCESS_CODE_SECRET, 256)) {
    return "";
  }

  const key = await getAesKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv
    },
    key,
    encoder.encode(accessCode)
  );

  return `${toBase64(iv)}.${toBase64(cipher)}`;
};

export const decryptAccessCode = async (ciphertext, env) => {
  const normalizedCiphertext = trimSlice(ciphertext, 4096);

  if (!normalizedCiphertext || !trimSlice(env?.ACCESS_CODE_SECRET, 256)) {
    return "";
  }

  const [ivBase64, encryptedBase64] = normalizedCiphertext.split(".");

  if (!ivBase64 || !encryptedBase64) {
    return "";
  }

  try {
    const key = await getAesKey(env);
    const iv = fromBase64(ivBase64);
    const payload = fromBase64(encryptedBase64);
    const decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv
      },
      key,
      payload
    );

    return decoder.decode(decrypted);
  } catch {
    return "";
  }
};

const randomCodeSegment = (length) => {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => accessCodeAlphabet[byte % accessCodeAlphabet.length]).join("");
};

export const generateAccessCode = () => `${randomCodeSegment(4)}-${randomCodeSegment(4)}`;

export const normalizeAccessCode = (value) =>
  trimSlice(value, 24).toUpperCase().replace(/[^A-Z0-9-]/g, "");
