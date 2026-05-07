// NEXURA admin dashboard aggregation — port of GET /api/admin/dashboard from
// apps/remotelab-api/src/server.ts. Mapped to local table names:
//   remote_sessions  -> remotefix_sessions
//   diagnostic_reports -> remotefix_diagnostic_reports
//
// Returns the same envelope shape consumed by the React admin console
// (apps/remotelab-portal/src/NexuraAdminConsole.jsx).

import { getDb } from "./db.js";

export const getAdminDashboard = async (env) => {
  const sql = getDb(env);

  const [cases, sessions, reports, alerts, opportunities, monitorAccounts, openPipelineRows, urgent] =
    await Promise.all([
      sql`select status, count(*)::int as count from cases group by status`,
      sql`select status, count(*)::int as count from remotefix_sessions group by status`,
      sql`select severity, count(*)::int as count from remotefix_diagnostic_reports group by severity`,
      sql`select severity, status, count(*)::int as count from health_alerts group by severity, status`,
      sql`select status, priority, count(*)::int as count,
                 coalesce(sum(estimated_value_min),0)::int as min_value,
                 coalesce(sum(estimated_value_max),0)::int as max_value
            from service_opportunities group by status, priority`,
      sql`select status, count(*)::int as count from monitoring_accounts group by status`,
      sql`select
            coalesce(sum(estimated_value_min),0)::int as min_value,
            coalesce(sum(estimated_value_max),0)::int as max_value,
            coalesce(sum((estimated_value_min * probability)::int),0)::int as weighted_value
          from service_opportunities
          where status in ('open','contacted','quoted')`,
      sql`select so.*
            from service_opportunities so
            where so.status in ('open','contacted') and so.priority in ('critical','high')
            order by case so.priority when 'critical' then 1 else 2 end, so.created_at desc
            limit 10`
    ]);

  return {
    overview: {
      casesByStatus: cases,
      sessionsByStatus: sessions,
      reportsBySeverity: reports,
      alertsBySeverityStatus: alerts,
      opportunitiesByStatusPriority: opportunities,
      monitoringAccountsByStatus: monitorAccounts,
      openPipeline: openPipelineRows[0] || { min_value: 0, max_value: 0, weighted_value: 0 }
    },
    urgentWork: urgent
  };
};
