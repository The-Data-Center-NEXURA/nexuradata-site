/**
 * NEXURADATA CONCIERGE — multi-turn LLM-backed case assistant.
 *
 *   POST /api/concierge
 *
 * Request body:
 *   {
 *     "locale":   "fr" | "en",                     // optional, defaults "fr"
 *     "messages": [ { "role": "user"|"assistant", "content": "..." }, ... ]
 *   }
 *
 * Response body:
 *   {
 *     "ok": true,
 *     "provider": "openai" | "rules-fallback",
 *     "reply":     "<assistant text in caller's locale>",
 *     "triage":    { ...same shape as /api/diagnostic .diagnostic } | null,
 *     "suggestions": [ "<short next reply>", ... ]            // optional FR/EN quick chips
 *   }
 *
 * Design rules:
 *   - Brand voice: NEXURADATA, Montreal data-recovery + forensics lab.
 *     Calm, direct, never sensationalist, never promises recovery.
 *   - The LLM may call exactly one tool — `commit_triage` — when it has
 *     enough signal to lock in a verdict. The tool wraps the deterministic
 *     rule engine (`buildCaseAutomationDraft`) so the structured payload is
 *     identical to `/api/diagnostic` and the existing UI keeps working.
 *   - Hard fallback: when OPENAI_API_KEY is missing, the upstream call
 *     fails, or the model never commits, we synthesise a verdict from the
 *     last user message via the rule engine. The bot is never silent.
 *   - No PII is ever logged. The conversation envelope is forwarded only
 *     to OpenAI inference; nothing is persisted to Neon by this route.
 */

import { buildCaseAutomationDraft } from "../_lib/automation.js";
import { json, methodNotAllowed, onOptions, parsePayload } from "../_lib/http.js";
import { chatCompletion } from "../_lib/openai.js";
import { checkRateLimit, tooManyRequests } from "../_lib/rate-limit.js";

const MAX_HISTORY_MESSAGES = 12;
const MAX_MESSAGE_CHARS = 1800;
const MAX_REPLY_CHARS = 1400;

const SYSTEM_PROMPT_FR = `Tu es l'assistant principal de NEXURADATA — un laboratoire indépendant de récupération de données et de forensique numérique basé à Montréal. Tu réponds au nom de l'équipe d'Olivier Blanchet.

Voix:
- Calme, technique, direct. Pas de drame, pas d'exagération.
- Tu vouvoies. Tu utilises un français québécois naturel et professionnel.
- Phrases courtes. Une idée par phrase. Maximum 4 phrases par réponse.
- Tu n'utilises pas d'émojis, de listes à puces, ni de markdown sauf si le client en utilise d'abord.

Règles strictes:
- Tu ne promets jamais une récupération réussie.
- Tu ne donnes jamais de prix précis. Si pressé, tu indiques que la soumission part après évaluation et accord écrit.
- Tu rappelles toujours, dès le premier signal physique ou logique, d'arrêter d'utiliser le support et de ne plus rien y écrire.
- Pour les dossiers RAID/NAS/serveur tu insistes: aucune reconstruction tant qu'on n'a pas validé la séquence.
- Pour ransomware, vol, RH, assurance, juridique → tu bascules en revue humaine et tu réduis les consignes techniques.
- Tu n'invoques l'outil "commit_triage" que lorsque tu as au moins: type de support, symptôme principal, et un soupçon d'urgence ou de profil client. Avant ça, tu poses UNE question ciblée à la fois.
- Quand tu invoques l'outil, tu produis aussi une courte réponse écrite (1–3 phrases) qui résume au client la prochaine étape concrète.

Tu peux orienter vers ces parcours: dossier média (HDD/SSD/USB), continuité RAID/NAS/serveur, dossier mobile, dossier forensique/sensible, correction guidée. L'humain confirme toujours.`;

const SYSTEM_PROMPT_EN = `You are the front-line assistant for NEXURADATA — an independent data-recovery and digital-forensics lab in Montreal. You speak on behalf of Olivier Blanchet's team.

Voice:
- Calm, technical, direct. No drama. No hype.
- Use formal "you". Plain professional English.
- Short sentences, one idea each. Maximum 4 sentences per reply.
- No emojis, no bullet lists, no markdown unless the customer used them first.

Hard rules:
- Never promise successful recovery.
- Never give an exact price. If pushed, say the quote is sent after assessment and written approval.
- The moment you detect a physical or logical risk, tell the customer to stop using the device and write nothing new to it.
- For RAID/NAS/server cases: insist no rebuild happens until the sequence is validated.
- For ransomware, theft, HR, insurance, legal: switch to human review and tone down technical instructions.
- Only call the "commit_triage" tool once you have at least: media type, main symptom, and a hint of urgency or client profile. Before that, ask ONE focused question at a time.
- When you call the tool, also output a short text reply (1–3 sentences) telling the customer the next concrete step.

You may steer toward: media case (HDD/SSD/USB), RAID/NAS/server continuity, mobile case, forensic/sensitive case, guided fix. A human always confirms.`;

const TRIAGE_TOOL = {
  type: "function",
  function: {
    name: "commit_triage",
    description:
      "Commit the structured triage verdict for the case. Call this only once you have enough signal. Returns the canonical NEXURADATA case automation draft used by the operations console.",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["message"],
      properties: {
        support: {
          type: "string",
          enum: ["drive", "ssd", "raid", "server", "phone", "removable"],
          description: "Inferred media type."
        },
        symptom: {
          type: "string",
          enum: ["deleted", "slow", "not_detected", "physical", "water", "encrypted"],
          description: "Inferred primary symptom."
        },
        urgency: {
          type: "string",
          enum: ["standard", "business", "critical"],
          description: "Inferred urgency. critical = ops blocked / 24-48h."
        },
        history: {
          type: "string",
          enum: ["no_attempt", "software", "opened", "rebuild", "powered_on"],
          description: "What the customer already tried."
        },
        value: {
          type: "string",
          enum: ["personal", "business", "legal", "medical"],
          description: "Customer profile / data sensitivity."
        },
        state: {
          type: "string",
          enum: ["powered_off", "unplugged", "running", "unknown"],
          description: "Current physical state of the support."
        },
        message: {
          type: "string",
          maxLength: 1200,
          description:
            "Free-form summary of the case in the customer's words. Required. Used by the rule engine for risk-flag inference."
        }
      }
    }
  }
};

const sanitizeText = (value, max = MAX_MESSAGE_CHARS) => {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").trim().slice(0, max);
};

const normaliseLocale = (raw) => {
  const value = typeof raw === "string" ? raw.toLowerCase().slice(0, 5) : "";
  return value.startsWith("en") ? "en" : "fr";
};

const sanitizeHistory = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => {
      const role = entry.role === "assistant" ? "assistant" : "user";
      const content = sanitizeText(entry.content, MAX_MESSAGE_CHARS);
      return content ? { role, content } : null;
    })
    .filter(Boolean)
    .slice(-MAX_HISTORY_MESSAGES);
};

const lastUserMessage = (history) => {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (history[index].role === "user") return history[index].content;
  }
  return "";
};

/**
 * Run the deterministic triage rule engine.
 * Mirrors the response shape of /api/diagnostic so the existing UI renderer
 * (`applyServerDiagnostic` in assets/js/site.js) keeps working unchanged.
 */
const runTriage = (args) => {
  const submission = {
    support: sanitizeText(args.support, 40),
    symptom: sanitizeText(args.symptom, 40),
    urgence: sanitizeText(args.urgency, 40),
    urgency: sanitizeText(args.urgency, 40),
    history: sanitizeText(args.history, 40),
    value: sanitizeText(args.value, 40),
    state: sanitizeText(args.state, 40),
    profil:
      args.value === "business" || args.value === "medical"
        ? "Entreprise / TI"
        : args.value === "legal"
          ? "Cabinet juridique"
          : "Particulier",
    impact:
      args.urgency === "critical" || args.urgency === "business"
        ? "Opérations bloquées"
        : args.value === "business" || args.value === "medical"
          ? "Données importantes"
          : "Planifié / non urgent",
    sensibilite:
      args.symptom === "encrypted" || args.value === "legal"
        ? "Preuve / chaîne de possession"
        : args.value === "medical"
          ? "Données sensibles"
          : args.value === "business"
            ? "Confidentiel"
            : "Standard",
    message: sanitizeText(args.message, 1200)
  };

  const draft = buildCaseAutomationDraft(submission);

  return {
    category: draft.category,
    categoryLabel: draft.categoryLabel,
    riskLevel: draft.riskLevel,
    serviceLevel: draft.serviceLevel,
    serviceLevelLabel: draft.serviceLevelLabel,
    sla: draft.sla,
    recommendedPath: draft.recommendedPath,
    servicePath: draft.servicePath,
    statusPlan: draft.statusPlan,
    quotePlan: draft.quotePlan,
    proposal: draft.proposal,
    expertSignals: draft.expertSignals,
    clientNeed: draft.clientNeed,
    emotionalContext: draft.emotionalContext,
    missingInfo: draft.missingInfo,
    missingInfoLabels: draft.missingInfoLabels,
    clientActions: draft.clientActions,
    operatorTasks: draft.operatorTasks,
    automationActions: draft.automationActions,
    handlingFlags: draft.handlingFlags,
    brief: {
      title: draft.serviceLevelLabel || draft.recommendedPath,
      recommendedPath: draft.recommendedPath,
      serviceLevelLabel: draft.serviceLevelLabel,
      sla: draft.sla,
      nextStep: draft.statusPlan?.nextStep || draft.nextStep,
      quoteReadiness: draft.quotePlan?.readiness || "review-before-quote",
      quoteLabel: draft.quotePlan?.label || "Soumission à préparer",
      clientAction:
        draft.clientActions?.[0] ||
        "Conserver le support original dans son état actuel.",
      operatorFocus: (draft.operatorTasks || []).slice(0, 3),
      missingInfo: (draft.missingInfoLabels || []).slice(0, 4),
      boundary:
        draft.proposal?.boundary ||
        "Aucune intervention ne commence sans accord explicite.",
      auditFlags: draft.handlingFlags
    }
  };
};

const fallbackReply = (locale, triage) => {
  if (locale === "en") {
    if (!triage) {
      return "I'm here. Tell me what happened to the device — what kind of media is it, what it does or doesn't do right now, and how urgent this is for you.";
    }
    const action = triage.clientActions?.[0] || "Stop using the device and don't write anything new to it.";
    const next = triage.statusPlan?.nextStep || "I'll route this to the right path.";
    return `${action} ${next} A human at NEXURADATA will confirm the next step before any quote or work.`;
  }
  if (!triage) {
    return "Je suis là. Décrivez-moi ce qui est arrivé au support — quel type de média, ce qu'il fait ou ne fait plus, et l'urgence pour vous.";
  }
  const action = triage.clientActions?.[0] || "Cessez d'utiliser le support et n'y écrivez rien de nouveau.";
  const next = triage.statusPlan?.nextStep || "Je dirige le dossier vers le bon parcours.";
  return `${action} ${next} Un humain de NEXURADATA confirme la prochaine étape avant toute soumission ou intervention.`;
};

const buildSuggestions = (locale, triage) => {
  if (!triage) {
    return locale === "en"
      ? ["My drive isn't detected", "Server is down", "I deleted files by mistake"]
      : ["Mon disque n'est plus détecté", "Mon serveur ne démarre plus", "J'ai effacé des fichiers"];
  }
  const baseFr = ["Ouvrir le dossier maintenant", "Comment se passe la réception?", "Quel est le délai habituel?"];
  const baseEn = ["Open the case now", "How does intake work?", "What's the usual turnaround?"];
  return locale === "en" ? baseEn : baseFr;
};

const truncateReply = (value) => {
  const cleaned = sanitizeText(value, MAX_REPLY_CHARS);
  if (!cleaned) return "";
  return cleaned;
};

export const onRequestOptions = (context) => onOptions(context.env, "POST, OPTIONS");

export const onRequestPost = async (context) => {
  const limit = checkRateLimit(context.request, 30);
  if (!limit.allowed) return tooManyRequests(limit.retryAfter);

  let payload;
  try {
    payload = await parsePayload(context.request);
  } catch {
    return json({ ok: false, message: "Format de requête invalide." }, { status: 400 });
  }

  const locale = normaliseLocale(payload?.locale);
  const history = sanitizeHistory(payload?.messages);

  if (history.length === 0) {
    return json({ ok: false, message: "Conversation vide." }, { status: 400 });
  }

  const apiKey = context.env?.OPENAI_API_KEY;

  // ── Hard fallback: no key configured.
  if (!apiKey) {
    const triage = runTriage({ message: lastUserMessage(history) });
    return json({
      ok: true,
      provider: "rules-fallback",
      reply: fallbackReply(locale, triage),
      triage,
      suggestions: buildSuggestions(locale, triage)
    });
  }

  const systemPrompt = locale === "en" ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_FR;
  const messages = [{ role: "system", content: systemPrompt }, ...history];

  const completion = await chatCompletion({
    apiKey,
    messages,
    tools: [TRIAGE_TOOL],
    toolChoice: "auto",
    temperature: 0.4,
    maxTokens: 600
  });

  // ── Soft fallback: upstream failure.
  if (!completion.ok) {
    const triage = runTriage({ message: lastUserMessage(history) });
    return json({
      ok: true,
      provider: "rules-fallback",
      reply: fallbackReply(locale, triage),
      triage,
      suggestions: buildSuggestions(locale, triage),
      degraded: completion.error || "upstream-error"
    });
  }

  // ── Tool call → execute deterministic triage and re-prompt model for closer.
  if (completion.toolCall?.name === "commit_triage") {
    const triage = runTriage(completion.toolCall.args || {});
    let reply = truncateReply(completion.message?.content || "");

    // If the model emitted no closing text alongside the tool call, ask it
    // to produce one, feeding the triage result back into the conversation.
    if (!reply) {
      const followUp = await chatCompletion({
        apiKey,
        messages: [
          ...messages,
          {
            role: "assistant",
            content: "",
            tool_calls: [
              {
                id: completion.toolCall.id || "call_1",
                type: "function",
                function: {
                  name: "commit_triage",
                  arguments: JSON.stringify(completion.toolCall.args || {})
                }
              }
            ]
          },
          {
            role: "tool",
            tool_call_id: completion.toolCall.id || "call_1",
            content: JSON.stringify({
              recommendedPath: triage.recommendedPath,
              serviceLevel: triage.serviceLevelLabel,
              nextStep: triage.statusPlan?.nextStep,
              clientAction: triage.clientActions?.[0]
            })
          }
        ],
        temperature: 0.4,
        maxTokens: 220
      });
      reply = truncateReply(followUp.ok ? followUp.message?.content || "" : "") || fallbackReply(locale, triage);
    }

    return json({
      ok: true,
      provider: "openai",
      reply,
      triage,
      suggestions: buildSuggestions(locale, triage)
    });
  }

  // ── Plain assistant turn — no triage yet.
  return json({
    ok: true,
    provider: "openai",
    reply: truncateReply(completion.message?.content || "") || fallbackReply(locale, null),
    triage: null,
    suggestions: buildSuggestions(locale, null)
  });
};

export const onRequest = methodNotAllowed;
