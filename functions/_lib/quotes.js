import { z } from "zod";
import { getDb } from "./db.js";
import { createCasePaymentRequest, hashAccessCode, normalizeText as normalizeCaseId } from "./cases.js";

const normalizeText = (value, maxLength = 500) => {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
};

const stripAccents = (...values) => normalizeText(values.filter((value) => typeof value === "string").join(" "), 1200)
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "");

export const quotePriceCatalog = [
  { key: "deleted_files", label: "Fichiers supprimés", amountCents: 19900 },
  { key: "external_media", label: "USB / disque externe / carte mémoire", amountCents: 29900 },
  { key: "hdd_ssd", label: "HDD / SSD interne", amountCents: 64900 },
  { key: "phone", label: "Téléphone", amountCents: 29900 },
  { key: "phone_physical", label: "Téléphone physique", amountCents: 69900 },
  { key: "raid_server", label: "RAID / NAS / serveur", amountCents: 120000 },
  { key: "forensic", label: "Forensique / légal", amountCents: 250000 }
];

export const suggestBasePriceCents = (detail = {}) => {
  const text = stripAccents(detail.support, detail.symptom, detail.message, detail.clientType, detail.client_type, detail.handlingFlags);

  if (/forensic|forensique|legal|preuve|litige|police|enquete|assurance|avocat/.test(text)) return 250000;
  if (/raid|nas|serveur|server/.test(text)) return 120000;
  if (/telephone|phone|iphone|android|mobile/.test(text)) {
    return /physique|bruit|clic|eau|feu|choc|casse|brise|liquide|water|shock/.test(text) ? 69900 : 29900;
  }
  if (/hdd|ssd|nvme|interne|non detecte|clic|bruit|choc|eau|feu/.test(text)) return 64900;
  if (/usb|cle|carte|sd|externe|memoire/.test(text)) return 29900;
  if (/supprime|supprimes|format/.test(text)) return 19900;

  return 29900;
};

export const formatQuoteCurrency = (amountCents, currency = "cad") =>
  new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: `${currency || "cad"}`.toUpperCase()
  }).format((Number(amountCents) || 0) / 100);

export const buildQuoteNumber = (detail = {}) => {
  const existing = normalizeText(detail.quoteNumber || detail.quote_number, 40);
  if (existing) return existing;

  const year = new Date(detail.createdAt || detail.created_at || Date.now()).getUTCFullYear();
  const numericId = Number(detail.databaseId || detail.id) || 0;
  const sequence = numericId > 0
    ? String(numericId).padStart(4, "0")
    : normalizeText(detail.caseId || detail.case_id || "0001", 40).replace(/[^A-Z0-9]/gi, "").slice(-4).padStart(4, "0");

  return `NX-${year}-${sequence}`;
};

export const buildQuoteDocument = (detail = {}, requestUrl = "https://nexuradata.ca/") => {
  const origin = new URL(requestUrl).origin.replace(/\/+$/, "");
  const quoteNumber = buildQuoteNumber(detail);
  const amountCents = Number(detail.quoteAmountCents ?? detail.quote_amount_cents ?? 0) || suggestBasePriceCents(detail);
  const diagnosticSummary = normalizeText(detail.diagnosticSummary || detail.diagnostic_summary || detail.clientSummary || detail.client_summary || "Diagnostic à confirmer après analyse interne.", 900);
  const recoveryProbability = normalizeText(detail.recoveryProbability || detail.recovery_probability || "À confirmer selon l'état réel du média.", 160);
  const estimatedTimeline = normalizeText(detail.estimatedTimeline || detail.estimated_timeline || "À confirmer après approbation.", 160);
  const approvalLink = `${origin}/suivi-dossier-client-montreal.html?caseId=${encodeURIComponent(detail.caseId || detail.case_id || "")}`;
  const conditions = normalizeText(
    detail.quoteConditions || detail.quote_conditions || "Aucun travail facturable ne sera effectué sans approbation écrite. Aucune donnée récupérée = aucune facture.",
    700
  );

  return {
    quoteNumber,
    title: `Soumission #${quoteNumber}`,
    caseId: detail.caseId || detail.case_id || "",
    client: detail.name || "Client NEXURADATA",
    email: detail.email || "",
    phone: detail.phone || "",
    support: detail.support || "À confirmer",
    symptom: detail.symptom || "À confirmer",
    diagnosticSummary,
    recoveryProbability,
    amountCents,
    amountFormatted: formatQuoteCurrency(amountCents),
    estimatedTimeline,
    conditions,
    approvalLink,
    signatureLabel: "Signature électronique du client",
    generatedAt: new Date().toISOString()
  };
};

const pdfEscape = (value) => normalizeText(value, 1800)
  .replace(/[()\\]/g, "\\$&")
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u201C\u201D]/g, '"')
  .replace(/[\u2013\u2014]/g, "-")
  .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "?");

const wrapLine = (line, max = 82) => {
  const words = `${line || ""}`.split(" ");
  const lines = [];
  let current = "";

  for (const word of words) {
    if ((current + " " + word).trim().length > max && current) {
      lines.push(current);
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [""];
};

export const renderQuotePdfBytes = (document) => {
  const contentLines = [
    document.title,
    "",
    `Dossier: ${document.caseId}`,
    `Client: ${document.client}`,
    document.email ? `Courriel: ${document.email}` : "",
    document.phone ? `Téléphone: ${document.phone}` : "",
    "",
    `Type de média: ${document.support}`,
    `Symptôme: ${document.symptom}`,
    "",
    "Diagnostic:",
    document.diagnosticSummary,
    "",
    `Probabilité de récupération: ${document.recoveryProbability}`,
    `Prix ferme: ${document.amountFormatted}`,
    `Délai estimé: ${document.estimatedTimeline}`,
    "",
    "Conditions:",
    document.conditions,
    "Aucune donnée récupérée = aucune facture.",
    "",
    "Approbation client:",
    document.approvalLink,
    "",
    document.signatureLabel,
    "Signature: ________________________________  Date: ________________"
  ].filter((line) => typeof line === "string");

  const renderedLines = contentLines.flatMap((line) => wrapLine(line));
  let y = 760;
  const textCommands = ["BT", "/F1 18 Tf", "1 0 0 1 50 790 Tm", `(${pdfEscape(document.title)}) Tj`, "/F1 10 Tf"];

  for (const line of renderedLines.slice(1, 54)) {
    textCommands.push(`1 0 0 1 50 ${y} Tm`);
    textCommands.push(`(${pdfEscape(line)}) Tj`);
    y -= 14;
  }

  textCommands.push("ET");
  const stream = textCommands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(pdf);
};

export const quotePdfBase64 = (document) => {
  const bytes = renderQuotePdfBytes(document);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  if (typeof btoa === "function") return btoa(binary);
  return Buffer.from(binary, "binary").toString("base64");
};
// ============================================================
// Phase 0004: opportunity → quote → client accept/decline
// ============================================================

const toHex = (buffer) =>
  Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join("");

const makeQuoteId = () => {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return `quote_${toHex(bytes.buffer)}`;
};

export const quoteRequestSchema = z.object({
  amountCad: z.number().int().positive().optional(),
  title: z.string().trim().min(2).max(160).optional(),
  expiresInDays: z.number().int().min(1).max(90).optional(),
  lineItems: z.array(z.object({
    label: z.string().trim().min(1).max(160),
    amountCad: z.number().int().nonnegative(),
    quantity: z.number().int().positive().default(1)
  })).max(20).optional(),
  notes: z.string().trim().max(800).optional()
}).strict();

const opportunityToLineItems = (opportunity, override) => {
  if (override && override.length) return override;
  const amountCad = Math.max(
    Number(opportunity.estimated_value_min || 0),
    Number(opportunity.estimated_value_max || 0)
  ) || Number(opportunity.estimated_value_min || 0) || 199;
  return [{
    label: opportunity.recommended_service || opportunity.title || "Service NEXURA",
    amountCad,
    quantity: 1
  }];
};

const sumLineItems = (items) =>
  items.reduce((acc, item) => acc + Number(item.amountCad || 0) * Number(item.quantity || 1), 0);

export const createQuoteFromOpportunity = async (env, opportunityId, payload = {}) => {
  const sql = getDb(env);
  const rows = await sql`select id, case_id, client_id, title, recommended_service,
    estimated_value_min, estimated_value_max, status
    from service_opportunities where id = ${opportunityId} limit 1`;
  if (!rows.length) return null;
  const opp = rows[0];

  const lineItems = opportunityToLineItems(opp, payload.lineItems);
  const amountCad = Number(payload.amountCad) > 0 ? Number(payload.amountCad) : sumLineItems(lineItems);
  const title = (payload.title || opp.title || `Soumission ${opp.recommended_service || "NEXURA"}`).slice(0, 160);
  const expiresInDays = Number(payload.expiresInDays) > 0 ? Number(payload.expiresInDays) : 14;
  const expiresAt = new Date(Date.now() + expiresInDays * 86400000).toISOString();
  const id = makeQuoteId();

  await sql`insert into quotes (
      id, case_id, opportunity_id, client_id, title, amount_cad, status,
      line_items, sent_at, expires_at
    ) values (
      ${id}, ${opp.case_id || null}, ${opp.id}, ${opp.client_id || null},
      ${title}, ${amountCad}, 'sent', ${JSON.stringify(lineItems)}::jsonb,
      now(), ${expiresAt}
    )`;
  await sql`update service_opportunities set status = 'quoted', updated_at = now()
            where id = ${opportunityId} and status = 'open'`;

  return {
    quote: { id, caseId: opp.case_id, opportunityId: opp.id, title, amountCad, status: "sent", lineItems, expiresAt }
  };
};

const verifyClientCredentials = async (env, caseId, accessCode) => {
  const sql = getDb(env);
  const id = normalizeCaseId(caseId, 40).toUpperCase().replace(/[^A-Z0-9-]/g, "");
  if (!id) return null;
  const rows = await sql`select case_id, access_code_hash from cases where case_id = ${id} limit 1`;
  if (!rows.length) return null;
  const hashed = await hashAccessCode(accessCode, env);
  if (hashed !== rows[0].access_code_hash) return null;
  return rows[0].case_id;
};

export const quoteClientActionSchema = z.object({
  accessCode: z.string().trim().min(4).max(20)
}).strict();

export const listClientQuotes = async (env, caseId, accessCode) => {
  const verified = await verifyClientCredentials(env, caseId, accessCode);
  if (!verified) return null;
  const sql = getDb(env);
  const rows = await sql`select id, title, amount_cad, status, line_items,
      sent_at, approved_at, paid_at, expires_at, created_at
    from quotes where case_id = ${verified} order by created_at desc limit 20`;
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    amountCad: Number(row.amount_cad || 0),
    status: row.status,
    lineItems: row.line_items || [],
    sentAt: row.sent_at,
    approvedAt: row.approved_at,
    paidAt: row.paid_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at
  }));
};

export const setClientQuoteStatus = async (env, caseId, accessCode, quoteId, action) => {
  if (action !== "approved" && action !== "declined") {
    throw new Error("Action invalide.");
  }
  const verified = await verifyClientCredentials(env, caseId, accessCode);
  if (!verified) return { error: "unauthorized" };
  const sql = getDb(env);
  const rows = await sql`select id, status, expires_at from quotes
    where id = ${quoteId} and case_id = ${verified} limit 1`;
  if (!rows.length) return { error: "not_found" };
  const current = rows[0];
  if (current.status !== "sent") {
    return { error: "invalid_state", currentStatus: current.status };
  }
  if (current.expires_at && new Date(current.expires_at).getTime() < Date.now()) {
    await sql`update quotes set status = 'expired', updated_at = now() where id = ${quoteId}`;
    return { error: "expired" };
  }
  if (action === "approved") {
    await sql`update quotes set status = 'approved', approved_at = now(), updated_at = now() where id = ${quoteId}`;
  } else {
    await sql`update quotes set status = 'declined', updated_at = now() where id = ${quoteId}`;
  }
  return { ok: true, quoteId, status: action };
};

// Mint a Stripe Checkout session for a freshly approved client quote.
// Safe to call only after setClientQuoteStatus(...) returns { ok: true, status: "approved" }.
// Returns null if the env is missing Stripe config or the quote/case has insufficient data.
export const createCheckoutForApprovedQuote = async (env, caseId, quoteId, requestUrl) => {
  if (!env?.STRIPE_SECRET_KEY) return null;
  const sql = getDb(env);
  const rows = await sql`select id, title, amount_cad from quotes
    where id = ${quoteId} and case_id = ${caseId} and status = 'approved' limit 1`;
  if (!rows.length) return null;
  const quote = rows[0];
  const amountCad = Number(quote.amount_cad || 0);
  if (!Number.isFinite(amountCad) || amountCad <= 0) return null;

  const label = normalizeText(quote.title, 120) || `Soumission ${quoteId}`;
  const description = `Soumission acceptée par le client (${quoteId}) — dossier ${caseId}.`;

  try {
    const payment = await createCasePaymentRequest(
      env,
      {
        caseId,
        paymentKind: "custom",
        label,
        description,
        amount: amountCad,
        currency: "cad",
        sendEmail: false
      },
      "client-portal",
      requestUrl
    );
    return {
      paymentRequestId: payment?.paymentRequestId || null,
      checkoutUrl: payment?.checkoutUrl || null
    };
  } catch {
    return null;
  }
};
