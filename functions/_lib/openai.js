/**
 * Minimal OpenAI chat-completions client for Cloudflare Pages Functions.
 *
 * No SDK on Workers — direct fetch to the Chat Completions API.
 * Returns a normalized envelope: { ok, message, toolCall, raw }
 *   - ok:        true on 2xx, false on transport/auth/upstream error
 *   - message:   { role, content } when the model emits a text reply
 *   - toolCall:  { name, args } when the model requests a function call
 *   - raw:       the parsed upstream JSON (debug only — never logged)
 *
 * Caller is responsible for redaction. This helper never logs payloads.
 */

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_TIMEOUT_MS = 14_000;

const safeJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

/**
 * @param {Object} input
 * @param {string} input.apiKey
 * @param {Array<{role:string, content:string}>} input.messages
 * @param {string} [input.model]
 * @param {Array<Object>} [input.tools]
 * @param {string} [input.toolChoice]
 * @param {number} [input.temperature]
 * @param {number} [input.maxTokens]
 * @param {AbortSignal} [input.signal]
 */
export async function chatCompletion({
  apiKey,
  messages,
  model = DEFAULT_MODEL,
  tools,
  toolChoice = "auto",
  temperature = 0.4,
  maxTokens = 600,
  signal
}) {
  if (!apiKey) {
    return { ok: false, error: "missing-api-key" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort("timeout"), DEFAULT_TIMEOUT_MS);
  if (signal) {
    signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
  }

  const body = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens
  };

  if (Array.isArray(tools) && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = toolChoice;
  }

  let response;
  try {
    response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } catch (error) {
    clearTimeout(timer);
    return { ok: false, error: error?.name === "AbortError" ? "timeout" : "network-error" };
  }

  clearTimeout(timer);

  const parsed = await safeJson(response);

  if (!response.ok) {
    return { ok: false, error: `upstream-${response.status}`, raw: parsed };
  }

  const choice = parsed?.choices?.[0];
  if (!choice) {
    return { ok: false, error: "empty-completion", raw: parsed };
  }

  const toolCalls = choice.message?.tool_calls;
  if (Array.isArray(toolCalls) && toolCalls.length > 0) {
    const first = toolCalls[0];
    let args = {};
    try {
      args = first?.function?.arguments ? JSON.parse(first.function.arguments) : {};
    } catch {
      args = {};
    }
    return {
      ok: true,
      toolCall: {
        id: first?.id || "",
        name: first?.function?.name || "",
        args
      },
      message: choice.message?.content
        ? { role: "assistant", content: choice.message.content }
        : null,
      raw: parsed
    };
  }

  return {
    ok: true,
    message: { role: "assistant", content: choice.message?.content || "" },
    raw: parsed
  };
}
