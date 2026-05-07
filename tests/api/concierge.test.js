import { describe, it, expect, vi, afterEach } from "vitest";
import { onRequestPost, onRequestOptions, onRequest } from "../../functions/api/concierge.js";

let counter = 0;
const makeContext = (body, env = {}, method = "POST") => {
  counter += 1;
  return {
    request: new Request("https://nexuradata.ca/api/concierge", {
      method,
      headers: {
        "content-type": "application/json",
        "cf-connecting-ip": `203.0.113.${counter % 250}`
      },
      body: body ? JSON.stringify(body) : undefined
    }),
    env
  };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("api/concierge", () => {
  it("rejects empty conversation", async () => {
    const response = await onRequestPost(makeContext({ messages: [] }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.ok).toBe(false);
  });

  it("falls back to the rule engine when OPENAI_API_KEY is missing (FR)", async () => {
    const ctx = makeContext({
      locale: "fr",
      messages: [
        { role: "user", content: "Mon disque externe n'est plus détecté et j'ai des photos de famille dessus." }
      ]
    });
    const response = await onRequestPost(ctx);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.provider).toBe("rules-fallback");
    expect(typeof body.reply).toBe("string");
    expect(body.reply.length).toBeGreaterThan(10);
    expect(body.triage).toBeTruthy();
    expect(body.triage.recommendedPath).toBeTruthy();
    expect(body.triage.brief?.title).toBeTruthy();
  });

  it("returns an English fallback for English locales", async () => {
    const ctx = makeContext({
      locale: "en",
      messages: [{ role: "user", content: "My RAID array won't rebuild and the office is blocked." }]
    });
    const response = await onRequestPost(ctx);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.provider).toBe("rules-fallback");
    // English fallback message uses "device" / "NEXURADATA" / "human"
    expect(body.reply.toLowerCase()).toMatch(/nexuradata|human|device/);
    expect(body.triage).toBeTruthy();
  });

  it("calls OpenAI when a key is configured and forwards a triage tool call", async () => {
    const triageArgs = {
      support: "drive",
      symptom: "not_detected",
      urgency: "standard",
      history: "no_attempt",
      value: "personal",
      state: "powered_off",
      message: "External hard drive no longer detected, family photos."
    };
    const calls = [];
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body) });
      if (calls.length === 1) {
        // First call → tool request from model.
        return new Response(JSON.stringify({
          choices: [{
            message: {
              role: "assistant",
              content: "",
              tool_calls: [{
                id: "call_1",
                type: "function",
                function: {
                  name: "commit_triage",
                  arguments: JSON.stringify(triageArgs)
                }
              }]
            }
          }]
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      // Second call → closing assistant message.
      return new Response(JSON.stringify({
        choices: [{
          message: {
            role: "assistant",
            content: "Stop using the drive and we'll review it before any attempt."
          }
        }]
      }), { status: 200, headers: { "content-type": "application/json" } });
    });

    const ctx = makeContext(
      {
        locale: "en",
        messages: [{ role: "user", content: "External hard drive no longer detected, family photos." }]
      },
      { OPENAI_API_KEY: "sk-test" }
    );
    const response = await onRequestPost(ctx);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.provider).toBe("openai");
    expect(body.reply).toContain("Stop using the drive");
    expect(body.triage).toBeTruthy();
    expect(body.triage.brief?.title).toBeTruthy();
    expect(fetchMock).toHaveBeenCalled();
  });

  it("falls back gracefully when OpenAI returns an error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("nope", { status: 500 })
    );
    const ctx = makeContext(
      {
        locale: "fr",
        messages: [{ role: "user", content: "Mon SSD ne démarre plus." }]
      },
      { OPENAI_API_KEY: "sk-test" }
    );
    const response = await onRequestPost(ctx);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.provider).toBe("rules-fallback");
    expect(body.degraded).toMatch(/upstream/);
    expect(body.triage).toBeTruthy();
  });

  it("preflight responds to OPTIONS", async () => {
    const response = await onRequestOptions({
      env: { PUBLIC_SITE_ORIGIN: "https://nexuradata.ca" },
      request: new Request("https://nexuradata.ca/api/concierge", { method: "OPTIONS" })
    });
    expect([204, 200]).toContain(response.status);
  });

  it("rejects non-POST methods on the catch-all handler", async () => {
    const response = await onRequest({
      request: new Request("https://nexuradata.ca/api/concierge", { method: "GET" }),
      env: {}
    });
    expect(response.status).toBe(405);
  });

  it("forwards a valid image attachment as multimodal content to OpenAI", async () => {
    const tinyPng =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9ZWQ7CAAAAAASUVORK5CYII=";
    const captured = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      captured.push(JSON.parse(init.body));
      return new Response(JSON.stringify({
        choices: [{ message: { role: "assistant", content: "I see the drive. Send the case in." } }]
      }), { status: 200, headers: { "content-type": "application/json" } });
    });
    const ctx = makeContext(
      {
        locale: "en",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: "Here is a photo of the drive." },
            { type: "image_url", image_url: { url: `data:image/png;base64,${tinyPng}` } }
          ]
        }]
      },
      { OPENAI_API_KEY: "sk-test" }
    );
    const response = await onRequestPost(ctx);
    expect(response.status).toBe(200);
    expect(captured.length).toBeGreaterThan(0);
    const userMsg = captured[0].messages.find((m) => m.role === "user");
    expect(Array.isArray(userMsg.content)).toBe(true);
    const imagePart = userMsg.content.find((p) => p.type === "image_url");
    expect(imagePart).toBeTruthy();
    expect(imagePart.image_url.url).toMatch(/^data:image\/png;base64,/);
  });

  it("drops image attachments with disallowed mime types", async () => {
    const captured = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      captured.push(JSON.parse(init.body));
      return new Response(JSON.stringify({
        choices: [{ message: { role: "assistant", content: "Tell me more." } }]
      }), { status: 200, headers: { "content-type": "application/json" } });
    });
    const ctx = makeContext(
      {
        locale: "fr",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: "Voici une image" },
            { type: "image_url", image_url: { url: "data:application/pdf;base64,AAAA" } }
          ]
        }]
      },
      { OPENAI_API_KEY: "sk-test" }
    );
    await onRequestPost(ctx);
    const userMsg = captured[0].messages.find((m) => m.role === "user");
    // Disallowed mime → image dropped, content collapses back to plain text.
    if (Array.isArray(userMsg.content)) {
      expect(userMsg.content.find((p) => p.type === "image_url")).toBeUndefined();
    } else {
      expect(typeof userMsg.content).toBe("string");
    }
  });

  it("flags priorityIntake on critical triage", async () => {
    const ctx = makeContext({
      locale: "fr",
      messages: [{
        role: "user",
        content: "RAID de production en panne, opérations bloquées, dossier juridique critique 24h."
      }]
    });
    const response = await onRequestPost(ctx);
    const body = await response.json();
    expect(body.triage).toBeTruthy();
    expect(typeof body.priorityIntake).toBe("boolean");
    // The deterministic rule engine assigns priority/critical risk to this prompt.
    if (["critical", "priority", "high"].includes(body.triage.riskLevel)) {
      expect(body.priorityIntake).toBe(true);
    }
  });
});
