/**
 * PII redaction for outbound LLM payloads.
 *
 * NEXURADATA contract: any user-supplied free text that leaves the edge
 * for a third-party inference provider (OpenAI etc.) MUST pass through
 * `redactPII` first. Personal identifiers are replaced with stable opaque
 * tokens so the model still understands the structure of the message
 * (e.g. "écris-moi à [EMAIL]") without ever seeing the real value.
 *
 * Patterns covered, in order of priority:
 *   - Email addresses          → [EMAIL]
 *   - 13–19 digit card numbers → [CARD]      (Luhn-like sequences)
 *   - North-American phones    → [PHONE]     (with or without separators)
 *   - Canadian postal codes    → [POSTAL]    (A1A 1A1 format)
 *   - Long digit runs ≥ 9      → [NUMBER]    (catches account/case IDs)
 *
 * This helper is intentionally conservative: false positives are preferred
 * over leaks. It never throws and always returns a string.
 */

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,24}\b/gi;
const CARD_RE = /\b\d(?:[ -]?\d){12,18}\b/g;
const PHONE_RE = /(?:\+?1[\s.-]?)?\(?\b[2-9]\d{2}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;
const POSTAL_RE = /\b[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ -]?\d[ABCEGHJ-NPRSTV-Z]\d\b/gi;
const LONG_NUMBER_RE = /\b\d{9,}\b/g;

/**
 * Redact obvious personal identifiers from a free-text string.
 * Order matters: emails first (so phone-like digits inside an address are
 * replaced as part of the email), then cards, then phones, then postal,
 * then any leftover long digit run.
 *
 * @param {string} value
 * @returns {string}
 */
export const redactPII = (value) => {
  if (typeof value !== "string" || value.length === 0) return "";
  return value
    .replace(EMAIL_RE, "[EMAIL]")
    .replace(CARD_RE, (match) => {
      const digits = match.replace(/\D/g, "");
      return digits.length >= 13 && digits.length <= 19 ? "[CARD]" : match;
    })
    .replace(PHONE_RE, "[PHONE]")
    .replace(POSTAL_RE, "[POSTAL]")
    .replace(LONG_NUMBER_RE, "[NUMBER]");
};

/**
 * Redact PII inside an OpenAI-style content value (string or parts array).
 * Image parts are passed through untouched — they are size-capped upstream
 * and not text-scannable here.
 *
 * @param {string | Array<object>} content
 * @returns {string | Array<object>}
 */
export const redactMessageContent = (content) => {
  if (typeof content === "string") return redactPII(content);
  if (!Array.isArray(content)) return content;
  return content.map((part) => {
    if (part && part.type === "text" && typeof part.text === "string") {
      return { ...part, text: redactPII(part.text) };
    }
    return part;
  });
};
