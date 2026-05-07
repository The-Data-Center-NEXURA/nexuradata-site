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
const MAX_IMAGES_PER_TURN = 2;
// 7 MB ceiling on base64-encoded image string => ~5.2 MB original payload.
const MAX_IMAGE_BASE64_BYTES = 7 * 1024 * 1024;
const ALLOWED_IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const PRIORITY_RISK_LEVELS = new Set(["priority", "critical", "high"]);

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

Tu peux orienter vers ces parcours: dossier média (HDD/SSD/USB), continuité RAID/NAS/serveur, dossier mobile, dossier forensique/sensible, correction guidée. L'humain confirme toujours.

Faits internes — utilise-les pour répondre, ne les invente pas:
- Adresse: laboratoire à Montréal. Réception sur rendez-vous. Coursier sécurisé partout au Canada disponible.
- Évaluation initiale gratuite après réception du support. Aucune intervention n'est facturée sans soumission écrite acceptée.
- Délais usuels: critique 24-48h, prioritaire 3-5 jours ouvrables, standard sous 10 jours ouvrables. Tout délai dépend du diagnostic réel.
- Support traité: HDD, SSD, NVMe, clés USB, cartes SD, RAID/NAS/serveurs, téléphones (iOS/Android), supports endommagés physiquement.
- Bandes de prix publiques observées: fichiers effacés à partir de 79$, externe simple à partir de 129$, téléphone simple à partir de 149$, HDD/SSD logique intermédiaire à partir de 350$, RAID/NAS/serveur et dommages mécaniques sur soumission. Ne donne jamais un prix exact: la soumission part après évaluation.
- RAID/NAS: aucune reconstruction ni resynchronisation tant que la séquence n'est pas validée. Toujours débrancher et étiqueter chaque disque dans son ordre original.
- Ransomware: ne paie aucune rançon, isole le poste du réseau, conserve les copies chiffrées. Bascule en revue humaine.
- Forensique: chaîne de possession documentée, supports en lecture seule, rapport admissible.
- Ouverture de dossier: formulaire intake → numéro de dossier + code d'accès → portail de suivi → soumission → approbation écrite → intervention.`;

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

You may steer toward: media case (HDD/SSD/USB), RAID/NAS/server continuity, mobile case, forensic/sensitive case, guided fix. A human always confirms.

Internal facts — use them to answer, do not invent:
- Address: lab in Montreal. Reception by appointment. Secure courier across Canada available.
- Initial assessment is free once the device is received. No work is billed without a written, accepted quote.
- Usual turnaround: critical 24-48h, priority 3-5 business days, standard within 10 business days. Any timeline depends on the real diagnosis.
- Media handled: HDD, SSD, NVMe, USB sticks, SD cards, RAID/NAS/servers, phones (iOS/Android), physically damaged media.
- Public price bands observed: deleted files from $79, external simple from $129, phone simple from $149, HDD/SSD intermediate logical from $350, RAID/NAS/server and mechanical damage on quote. Never give an exact price: the quote follows assessment.
- RAID/NAS: no rebuild or resync until the sequence is validated. Always unplug and label each drive in its original order.
- Ransomware: never pay the ransom, isolate the host from the network, keep the encrypted copies. Switch to human review.
- Forensic: documented chain of custody, read-only media, admissible report.
- Case opening: intake form → case number + access code → tracking portal → quote → written approval → work.`;

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

/**
 * Validate a single image attachment. Only data URLs of allowed mime types
 * pass through; the encoded body is size-capped before it ever reaches the
 * upstream API. Anything else is silently dropped.
 */
const sanitizeImageUrl = (raw) => {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("data:")) return null;
  const match = /^data:([a-z0-9.+/-]+);base64,([A-Za-z0-9+/=]+)$/i.exec(trimmed);
  if (!match) return null;
  const mime = match[1].toLowerCase();
  if (!ALLOWED_IMAGE_MIMES.has(mime)) return null;
  if (match[2].length > MAX_IMAGE_BASE64_BYTES) return null;
  return `data:${mime};base64,${match[2]}`;
};

/**
 * Multimodal-aware content sanitizer. Accepts either a plain string or an
 * OpenAI-style content parts array. Returns the same shape, with at most
 * MAX_IMAGES_PER_TURN images and one merged text part. Returns "" when
 * nothing usable remains.
 */
const sanitizeMessageContent = (raw) => {
  if (typeof raw === "string") return sanitizeText(raw, MAX_MESSAGE_CHARS);
  if (!Array.isArray(raw)) return "";
  const textParts = [];
  const imageParts = [];
  for (const part of raw) {
    if (!part || typeof part !== "object") continue;
    if (part.type === "text") {
      const text = sanitizeText(part.text, MAX_MESSAGE_CHARS);
      if (text) textParts.push(text);
    } else if (part.type === "image_url") {
      if (imageParts.length >= MAX_IMAGES_PER_TURN) continue;
      const url = sanitizeImageUrl(part?.image_url?.url);
      if (!url) continue;
      imageParts.push({ type: "image_url", image_url: { url, detail: "low" } });
    }
  }
  if (imageParts.length === 0) {
    return textParts.length > 0 ? textParts.join("\n\n").slice(0, MAX_MESSAGE_CHARS) : "";
  }
  const mergedText = textParts.join("\n\n").slice(0, MAX_MESSAGE_CHARS);
  return [
    { type: "text", text: mergedText || "(image attachment)" },
    ...imageParts
  ];
};

const sanitizeHistory = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => {
      const role = entry.role === "assistant" ? "assistant" : "user";
      const content = sanitizeMessageContent(entry.content);
      const empty = typeof content === "string" ? content.length === 0 : content.length === 0;
      return empty ? null : { role, content };
    })
    .filter(Boolean)
    .slice(-MAX_HISTORY_MESSAGES);
};

/**
 * Caller-supplied page context. Path is matched against an allow-list of
 * known site paths and the title is hard-truncated. Anything else is dropped.
 */
const sanitizePageContext = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  const rawPath = typeof raw.path === "string" ? raw.path : "";
  const path = /^\/[A-Za-z0-9._/-]{0,200}$/.test(rawPath) ? rawPath : "/";
  const title = sanitizeText(raw.title, 160);
  return { path, title };
};

const describePageContext = (page, locale) => {
  if (!page || page.path === "/") return "";
  const isEn = locale === "en";
  const heading = isEn ? "Page context" : "Contexte de la page";
  return `\n\n[${heading}: path=${page.path}${page.title ? `, title="${page.title}"` : ""}]`;
};

const lastUserMessage = (history) => {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (history[index].role !== "user") continue;
    const content = history[index].content;
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      const text = content.find((part) => part?.type === "text")?.text;
      if (text) return text;
    }
  }
  return "";
};

const isPriorityTriage = (triage) =>
  Boolean(triage && PRIORITY_RISK_LEVELS.has(triage.riskLevel));

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
  const priority = isPriorityTriage(triage);
  if (locale === "en") {
    return priority
      ? ["Open priority case now", "How does intake work?", "What's the usual turnaround?"]
      : ["Open the case now", "How does intake work?", "What's the usual turnaround?"];
  }
  return priority
    ? ["Ouvrir un dossier prioritaire", "Comment se passe la réception?", "Quel est le délai habituel?"]
    : ["Ouvrir le dossier maintenant", "Comment se passe la réception?", "Quel est le délai habituel?"];
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
  const pageContext = sanitizePageContext(payload?.page);

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
      priorityIntake: isPriorityTriage(triage),
      suggestions: buildSuggestions(locale, triage)
    });
  }

  const systemPrompt = (locale === "en" ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_FR)
    + describePageContext(pageContext, locale);
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
      priorityIntake: isPriorityTriage(triage),
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
      priorityIntake: isPriorityTriage(triage),
      suggestions: buildSuggestions(locale, triage)
    });
  }

  // ── Plain assistant turn — no triage yet.
  return json({
    ok: true,
    provider: "openai",
    reply: truncateReply(completion.message?.content || "") || fallbackReply(locale, null),
    triage: null,
    priorityIntake: false,
    suggestions: buildSuggestions(locale, null)
  });
};

export const onRequest = methodNotAllowed;
