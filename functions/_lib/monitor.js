// NEXURA Monitor — preventive monitoring helpers.
// Ports apps/remotelab-api/src/server.ts (planDetails, classifyHealthAlert,
// agent-key auth) onto Cloudflare Pages Functions + Neon HTTP.
// Tables live in migrations/neon/0004_remotelab_platform.sql.

import { z } from "zod";

import { getDb } from "./db.js";

const encoder = new TextEncoder();

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

export const planDetails = (plan) => {
  if (plan === "server") {
    return { id: "plan_server", name: "NEXURA Monitor Server", monthly: 499, maxAssets: 25 };
  }
  if (plan === "business") {
    return { id: "plan_business", name: "NEXURA Monitor Business", monthly: 199, maxAssets: 10 };
  }
  return { id: "plan_basic", name: "NEXURA Monitor Basic", monthly: 49, maxAssets: 1 };
};

// ---------------------------------------------------------------------------
// Schemas (zod) — mirror the reference API contracts.
// ---------------------------------------------------------------------------

export const createMonitoringAccountSchema = z.object({
  client: z.object({
    name: z.string().min(1).max(160),
    email: z.string().email().max(160),
    phone: z.string().max(40).optional().default(""),
    type: z.enum(["individual", "business", "reseller"]).default("individual")
  }),
  plan: z.enum(["basic", "business", "server"])
});

export const registerMonitoringAgentSchema = z.object({
  monitoringAccountId: z.string().min(1).max(80),
  hostname: z.string().min(1).max(160),
  platform: z.enum(["windows", "macos", "linux", "nas", "server"]),
  agentVersion: z.string().min(1).max(40)
});

export const healthCheckSchema = z.object({
  monitoringAccountId: z.string().min(1).max(80),
  agentId: z.string().min(1).max(80),
  asset: z.object({
    assetId: z.string().min(1).max(80).optional(),
    assetType: z.enum(["workstation", "server", "nas", "external_drive", "cloud_account", "mailbox"]),
    displayName: z.string().min(1).max(160),
    serial: z.string().max(120).optional(),
    model: z.string().max(160).optional()
  }),
  metrics: z
    .object({
      smartStatus: z.enum(["ok", "warning", "failed", "unknown"]).optional(),
      freeSpacePercent: z.number().min(0).max(100).optional(),
      backupStatus: z.enum(["ok", "stale", "failed", "unknown"]).optional(),
      raidStatus: z.enum(["ok", "degraded", "failed", "unknown"]).optional(),
      cloudSyncStatus: z.enum(["ok", "stuck", "conflict", "unknown"]).optional(),
      ransomwareIndicators: z.number().int().min(0).optional(),
      criticalEventsLast24h: z.number().int().min(0).optional()
    })
    .passthrough()
});

// ---------------------------------------------------------------------------
// Web-Crypto agent-key helpers (no Node crypto on Workers).
// ---------------------------------------------------------------------------

const toHex = (buffer) =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

export const generateAgentKey = () => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `nxa_${toHex(bytes.buffer)}`;
};

export const hashAgentKey = async (token) => {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(String(token || "")));
  return toHex(digest);
};

const safeJson = (value) => JSON.stringify(value ?? {});

const makeId = (prefix) => {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return `${prefix}_${toHex(bytes.buffer)}`;
};

// ---------------------------------------------------------------------------
// Bearer-token auth for agent posts.
// ---------------------------------------------------------------------------

export const requireMonitoringAgent = async (request, env, agentId) => {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return { ok: false, message: "Jeton agent manquant." };
  const provided = match[1].trim();
  if (!provided) return { ok: false, message: "Jeton agent invalide." };
  if (!agentId) return { ok: false, message: "agentId manquant." };

  const sql = getDb(env);
  const rows = await sql`select id, agent_key_hash, status, monitoring_account_id from monitoring_agents where id = ${agentId} limit 1`;
  if (!rows.length) return { ok: false, message: "Agent inconnu." };
  const agent = rows[0];
  if (agent.status === "revoked" || agent.status === "disabled") {
    return { ok: false, message: "Agent désactivé." };
  }

  const expected = String(agent.agent_key_hash || "");
  const providedHash = await hashAgentKey(provided);
  if (expected.length !== providedHash.length) return { ok: false, message: "Jeton agent invalide." };
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ providedHash.charCodeAt(i);
  }
  if (diff !== 0) return { ok: false, message: "Jeton agent invalide." };

  return { ok: true, agent };
};

// ---------------------------------------------------------------------------
// Health-alert classifier — verbatim port from the reference TS API.
// ---------------------------------------------------------------------------

export const classifyHealthAlert = (metrics, _assetType) => {
  const alerts = [];

  if (metrics?.smartStatus === "failed") {
    alerts.push({
      severity: "critical",
      title: "Critical disk health failure detected",
      description: "SMART reports a failed disk. Continued use may reduce recovery chances.",
      recommendedService: "NEXURA Laboratory Recovery / Emergency Disk Replacement",
      priceMin: 649,
      priceMax: 5000
    });
  }

  if (metrics?.smartStatus === "warning") {
    alerts.push({
      severity: "high",
      title: "Disk health warning detected",
      description: "SMART warning indicates a possible upcoming drive failure.",
      recommendedService: "RemoteLab Diagnose + Backup Verification",
      priceMin: 49,
      priceMax: 399
    });
  }

  if (typeof metrics?.freeSpacePercent === "number" && metrics.freeSpacePercent < 8) {
    alerts.push({
      severity: metrics.freeSpacePercent < 3 ? "critical" : "medium",
      title: "Low free disk space",
      description: `Only ${metrics.freeSpacePercent}% free space remains. This can break backups, sync and databases.`,
      recommendedService: "NEXURA System Health Repair",
      priceMin: 99,
      priceMax: 249
    });
  }

  if (metrics?.backupStatus === "failed" || metrics?.backupStatus === "stale") {
    alerts.push({
      severity: metrics.backupStatus === "failed" ? "high" : "medium",
      title: "Backup problem detected",
      description: `Backup status is ${metrics.backupStatus}. This increases business data-loss exposure.`,
      recommendedService: "NEXURA Backup Recovery Readiness Check",
      priceMin: 199,
      priceMax: 799
    });
  }

  if (metrics?.raidStatus === "degraded" || metrics?.raidStatus === "failed") {
    alerts.push({
      severity: metrics.raidStatus === "failed" ? "critical" : "high",
      title: "RAID/NAS health issue detected",
      description: `RAID status is ${metrics.raidStatus}. Automatic rebuild should not be attempted without expert review.`,
      recommendedService: "RemoteLab Server Triage",
      priceMin: 399,
      priceMax: 1200
    });
  }

  if (metrics?.cloudSyncStatus === "stuck" || metrics?.cloudSyncStatus === "conflict") {
    alerts.push({
      severity: "medium",
      title: "Cloud sync issue detected",
      description: `Cloud sync status is ${metrics.cloudSyncStatus}. Files may be missing, duplicated or stale.`,
      recommendedService: "RemoteLab CloudRescue",
      priceMin: 149,
      priceMax: 399
    });
  }

  if ((metrics?.ransomwareIndicators || 0) > 0) {
    alerts.push({
      severity: "critical",
      title: "Possible ransomware indicators detected",
      description: `${metrics.ransomwareIndicators} ransomware indicators were reported by the monitoring agent.`,
      recommendedService: "RemoteLab Ransomware First Response",
      priceMin: 499,
      priceMax: 2500
    });
  }

  if (alerts.length === 0 && (metrics?.criticalEventsLast24h || 0) > 10) {
    alerts.push({
      severity: "medium",
      title: "Elevated system errors detected",
      description: `${metrics.criticalEventsLast24h} critical events were reported in the last 24 hours.`,
      recommendedService: "RemoteLab Diagnose",
      priceMin: 49,
      priceMax: 149
    });
  }

  return alerts;
};

// ---------------------------------------------------------------------------
// Persistence — uses Neon HTTP (sql tagged template + sql.transaction).
// ---------------------------------------------------------------------------

export const createMonitoringAccount = async (env, body) => {
  const plan = planDetails(body.plan);
  const clientId = makeId("client");
  const accountId = makeId("monacct");
  const sql = getDb(env);

  await sql.transaction([
    sql`insert into clients (id, name, email, phone, type)
        values (${clientId}, ${body.client.name}, ${body.client.email}, ${body.client.phone || ""}, ${body.client.type})`,
    sql`insert into monitoring_plans (id, name, monthly_price_cad, max_assets, features)
        values (${plan.id}, ${plan.name}, ${plan.monthly}, ${plan.maxAssets},
                ${safeJson(["health_alerts", "monthly_report", "remote_lab_upsell"])}::jsonb)
        on conflict (id) do update set
          name = excluded.name,
          monthly_price_cad = excluded.monthly_price_cad,
          max_assets = excluded.max_assets`,
    sql`insert into monitoring_accounts (id, client_id, plan_id, status)
        values (${accountId}, ${clientId}, ${plan.id}, 'trial')`
  ]);

  return { clientId, monitoringAccountId: accountId, plan };
};

export const registerMonitoringAgent = async (env, body) => {
  const agentId = makeId("agent");
  const agentKey = generateAgentKey();
  const agentKeyHash = await hashAgentKey(agentKey);
  const sql = getDb(env);

  await sql`insert into monitoring_agents (
      id, monitoring_account_id, agent_key_hash, hostname, platform, agent_version, status, last_seen_at
    ) values (
      ${agentId}, ${body.monitoringAccountId}, ${agentKeyHash},
      ${body.hostname}, ${body.platform}, ${body.agentVersion}, 'active', now()
    )`;

  return {
    agentId,
    agentKey,
    warning: "Store this key once. In production it is shown only on creation."
  };
};

export const recordHealthCheck = async (env, body) => {
  const sql = getDb(env);
  const assetId = body.asset.assetId || makeId("asset");
  const alerts = classifyHealthAlert(body.metrics, body.asset.assetType);
  const worstSeverity = alerts[0]?.severity || "info";
  const assetStatus = alerts.some((a) => a.severity === "critical")
    ? "critical"
    : alerts.some((a) => a.severity === "high" || a.severity === "medium")
      ? "warning"
      : "healthy";
  const checkId = makeId("check");
  const summary = alerts.length ? `${alerts.length} alert(s) generated.` : "Asset is healthy.";

  const statements = [
    sql`insert into monitored_assets (
        id, monitoring_account_id, agent_id, asset_type, display_name, serial, model, metadata, status
      ) values (
        ${assetId}, ${body.monitoringAccountId}, ${body.agentId}, ${body.asset.assetType},
        ${body.asset.displayName}, ${body.asset.serial || null}, ${body.asset.model || null},
        ${safeJson(body.metrics)}::jsonb, ${assetStatus}
      )
      on conflict (id) do update set
        display_name = excluded.display_name,
        serial = excluded.serial,
        model = excluded.model,
        metadata = excluded.metadata,
        status = excluded.status,
        updated_at = now()`,
    sql`insert into health_checks (
        id, monitoring_account_id, asset_id, agent_id, check_type, severity, summary, metrics
      ) values (
        ${checkId}, ${body.monitoringAccountId}, ${assetId}, ${body.agentId},
        'agent_health_snapshot', ${worstSeverity}, ${summary}, ${safeJson(body.metrics)}::jsonb
      )`
  ];

  const createdAlerts = [];
  for (const alert of alerts) {
    const alertId = makeId("alert");
    statements.push(sql`insert into health_alerts (
        id, monitoring_account_id, asset_id, source_check_id, severity, title, description,
        recommended_service, recommended_price_min, recommended_price_max, status
      ) values (
        ${alertId}, ${body.monitoringAccountId}, ${assetId}, ${checkId}, ${alert.severity},
        ${alert.title}, ${alert.description}, ${alert.recommendedService},
        ${alert.priceMin}, ${alert.priceMax}, 'open'
      )`);
    createdAlerts.push({ alertId, ...alert });
  }

  statements.push(
    sql`update monitoring_agents set last_seen_at = now(), status = 'active' where id = ${body.agentId}`
  );

  await sql.transaction(statements);

  return { assetId, checkId, assetStatus, alerts: createdAlerts };
};

export const getMonitoringDashboard = async (env, accountId) => {
  const sql = getDb(env);
  const [accountRows, assets, alerts, checks] = await Promise.all([
    sql`select ma.*, c.name as client_name, c.email as client_email,
               mp.name as plan_name, mp.monthly_price_cad
        from monitoring_accounts ma
        join clients c on c.id = ma.client_id
        left join monitoring_plans mp on mp.id = ma.plan_id
        where ma.id = ${accountId}`,
    sql`select * from monitored_assets where monitoring_account_id = ${accountId} order by updated_at desc`,
    sql`select * from health_alerts where monitoring_account_id = ${accountId} order by created_at desc limit 50`,
    sql`select * from health_checks where monitoring_account_id = ${accountId} order by created_at desc limit 50`
  ]);

  if (!accountRows.length) return null;

  const openAlerts = alerts.filter((a) => a.status === "open");
  const criticalAlerts = openAlerts.filter((a) => a.severity === "critical");
  const highAlerts = openAlerts.filter((a) => a.severity === "high");

  return {
    account: accountRows[0],
    summary: {
      assets: assets.length,
      openAlerts: openAlerts.length,
      criticalAlerts: criticalAlerts.length,
      highAlerts: highAlerts.length,
      estimatedServiceOpportunityCad: openAlerts.reduce(
        (sum, a) => sum + Number(a.recommended_price_min || 0),
        0
      )
    },
    assets,
    alerts,
    recentChecks: checks
  };
};

export const convertAlertToCase = async (env, alertId) => {
  const sql = getDb(env);
  const rows = await sql`select ha.*, ma.client_id
        from health_alerts ha
        join monitoring_accounts ma on ma.id = ha.monitoring_account_id
        where ha.id = ${alertId} limit 1`;
  if (!rows.length) return null;
  const alert = rows[0];

  const caseId = makeId("NX").replace(/^NX_/, "NX");
  const deviceType = String(alert.recommended_service || "").includes("Server") ? "nas_server" : "windows_pc";
  const symptom = String(alert.recommended_service || "").includes("Ransomware")
    ? "encrypted_files"
    : "system_slow_errors";
  const urgency = alert.severity === "critical" ? "emergency" : "priority";
  const notes = `Created from NEXURA Monitor alert ${alertId}: ${alert.title}. ${alert.description}`;

  await sql.transaction([
    sql`insert into cases (
        case_id, client_id, status, device_type, symptom, urgency,
        contains_critical_data, attempted_fix, legal_matter, notes
      ) values (
        ${caseId}, ${alert.client_id}, 'case_created', ${deviceType}, ${symptom}, ${urgency},
        true, false, false, ${notes}
      )`,
    sql`update health_alerts set status = 'converted_to_case', created_case_id = ${caseId}, updated_at = now() where id = ${alertId}`
  ]);

  return { caseId, alertId };
};
