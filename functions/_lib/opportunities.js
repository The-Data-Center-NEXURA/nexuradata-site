// NEXURA Opportunity Engine — port of apps/remotelab-api/src/server.ts
// (priorityFromRisk, probabilityFromPriority, buildOpportunityFromTriage,
// buildMonitorUpsellOpportunity, insertOpportunity, list/update/rebuild)
// adapted to the local Neon schema: triage rows live in
// `remotefix_triage_results` (price stored in cents) and the cases table has
// `client_type` directly on the row (no separate `clients` join).

import { z } from "zod";

import { getDb } from "./db.js";

const toHex = (buffer) =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

const makeId = (prefix) => {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return `${prefix}_${toHex(bytes.buffer)}`;
};

export const priorityFromRisk = (riskScore) => {
  const score = Number(riskScore || 0);
  if (score >= 85) return "critical";
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  return "low";
};

export const probabilityFromPriority = (priority) => {
  if (priority === "critical") return 0.82;
  if (priority === "high") return 0.68;
  if (priority === "medium") return 0.46;
  return 0.28;
};

export const buildOpportunityFromTriage = (triage) => {
  const priority = priorityFromRisk(triage.risk_score);
  const requiresLab = Boolean(triage.requires_lab);
  const service = String(triage.service || "RemoteLab Diagnose");

  let nextBestAction = "Send secure RemoteLab diagnostic link.";
  if (requiresLab) nextBestAction = "Call client and send laboratory intake instructions.";
  if (service.includes("Server")) nextBestAction = "Call business client and propose Server Triage.";
  if (service.includes("Ransomware")) nextBestAction = "Call immediately and propose First Response.";

  const priceMinCad = Math.round(Number(triage.price_min_cents || 0) / 100) || 49;
  const priceMaxCad = Math.round(Number(triage.price_max_cents || 0) / 100) || 149;

  return {
    sourceType: "triage",
    sourceId: triage.id != null ? String(triage.id) : null,
    caseId: triage.case_id,
    title: `${service} opportunity`,
    recommendedService: service,
    description: `${triage.reason || "RemoteLab triage completed."} Next action: ${triage.next_action || nextBestAction}`,
    estimatedValueMin: priceMinCad,
    estimatedValueMax: priceMaxCad,
    probability: probabilityFromPriority(priority),
    priority,
    nextBestAction
  };
};

export const buildMonitorUpsellOpportunity = ({ caseId, clientType, service, riskScore }) => {
  const businessLike =
    clientType === "business" ||
    (service && service.includes("Server")) ||
    Number(riskScore || 0) >= 70;
  if (!businessLike) return null;

  const isServer = service && service.includes("Server");
  return {
    sourceType: "manual",
    caseId,
    title: "NEXURA Monitor upsell",
    recommendedService: isServer ? "NEXURA Monitor Server" : "NEXURA Monitor Business",
    description:
      "Client has a qualifying incident or business-critical risk. Offer recurring monitoring to prevent future data loss.",
    estimatedValueMin: isServer ? 499 : 199,
    estimatedValueMax: isServer ? 5988 : 2388,
    probability: isServer ? 0.58 : 0.42,
    priority: isServer ? "high" : "medium",
    nextBestAction: "Offer monthly monitoring after resolving the current issue."
  };
};

export const insertOpportunity = async (env, opportunity) => {
  const sql = getDb(env);
  const id = makeId("opp");
  await sql`insert into service_opportunities (
      id, source_type, source_id, case_id, monitoring_account_id, client_id,
      title, recommended_service, description,
      estimated_value_min, estimated_value_max, probability, priority,
      next_best_action, status
    ) values (
      ${id}, ${opportunity.sourceType}, ${opportunity.sourceId || null},
      ${opportunity.caseId || null}, ${opportunity.monitoringAccountId || null},
      ${opportunity.clientId || null},
      ${opportunity.title}, ${opportunity.recommendedService}, ${opportunity.description || ""},
      ${opportunity.estimatedValueMin}, ${opportunity.estimatedValueMax},
      ${opportunity.probability}, ${opportunity.priority},
      ${opportunity.nextBestAction || ""}, 'open'
    )`;
  return { id, ...opportunity, status: "open" };
};

export const recordCaseAudit = async (env, caseId, actor, event, metadata = {}) => {
  if (!caseId) return;
  const sql = getDb(env);
  await sql`insert into remotefix_audit_logs (id, case_id, actor, event, metadata)
            values (${makeId("audit")}, ${caseId}, ${actor}, ${event}, ${JSON.stringify(metadata)}::jsonb)`;
};

export const rebuildOpportunitiesForCase = async (env, caseId) => {
  const sql = getDb(env);
  const cases = await sql`select case_id, client_type from cases where case_id = ${caseId} limit 1`;
  if (!cases.length) return { error: "case_not_found" };
  const triageRows = await sql`select * from remotefix_triage_results where case_id = ${caseId} order by created_at desc limit 1`;
  if (!triageRows.length) return { error: "triage_not_found" };

  const triage = triageRows[0];
  const opportunities = [await insertOpportunity(env, buildOpportunityFromTriage(triage))];
  const upsell = buildMonitorUpsellOpportunity({
    caseId,
    clientType: cases[0].client_type,
    service: triage.service,
    riskScore: triage.risk_score
  });
  if (upsell) opportunities.push(await insertOpportunity(env, upsell));

  await recordCaseAudit(env, caseId, "system", "opportunities_rebuilt", {
    opportunities: opportunities.map((o) => o.id)
  });

  return { opportunities };
};

export const listOpportunities = async (env, status = "open") => {
  const sql = getDb(env);
  const rows = await sql`select so.*
        from service_opportunities so
        where so.status = ${status}
        order by
          case so.priority when 'critical' then 1 when 'high' then 2 when 'medium' then 3 else 4 end,
          so.created_at desc
        limit 100`;

  const pipeline = rows.reduce(
    (acc, opp) => {
      const min = Number(opp.estimated_value_min || 0);
      const max = Number(opp.estimated_value_max || 0);
      const probability = Number(opp.probability || 0);
      acc.min += min;
      acc.max += max;
      acc.weighted += Math.round(min * probability);
      return acc;
    },
    { min: 0, max: 0, weighted: 0 }
  );

  return { status, pipeline, opportunities: rows };
};

export const opportunityStatusSchema = z.object({
  status: z.enum(["open", "contacted", "quoted", "won", "lost", "dismissed"])
});

export const updateOpportunityStatus = async (env, opportunityId, status) => {
  const sql = getDb(env);
  const rows = await sql`update service_opportunities
        set status = ${status}, updated_at = now()
        where id = ${opportunityId}
        returning *`;
  if (!rows.length) return null;
  const opp = rows[0];
  if (opp.case_id) {
    await recordCaseAudit(env, opp.case_id, "operator", "opportunity_status_updated", {
      opportunityId,
      status
    });
  }
  return opp;
};
