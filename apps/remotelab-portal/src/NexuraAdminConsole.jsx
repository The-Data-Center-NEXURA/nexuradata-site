import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Database,
  DollarSign,
  FileText,
  Gauge,
  HardDrive,
  Layers3,
  LineChart,
  Loader2,
  Mail,
  MonitorDot,
  RefreshCw,
  Search,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wrench,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * NEXURA Admin Console
 * ------------------------------------------------------------
 * React admin UI for the Node/npm + Neon API.
 *
 * Expected API base:
 *   VITE_API_BASE_URL=http://localhost:8787
 *
 * Endpoints consumed:
 *   GET  /api/admin/dashboard
 *   GET  /api/admin/opportunities?status=open
 *   PATCH /api/admin/opportunities/:id
 *   POST /api/opportunities/:id/quote
 *   POST /api/reports/cases/:caseId
 *   GET  /api/monitoring/accounts/:accountId/dashboard
 *   GET  /api/cases/:caseId
 */

const API_BASE = import.meta?.env?.VITE_API_BASE_URL || "http://localhost:8787";

const mockDashboard = {
  overview: {
    casesByStatus: [
      { status: "triage_completed", count: 8 },
      { status: "remote_repair_allowed", count: 4 },
      { status: "lab_required", count: 5 },
      { status: "consent_given", count: 3 },
    ],
    sessionsByStatus: [
      { status: "waiting_for_consent", count: 6 },
      { status: "consent_given", count: 3 },
    ],
    reportsBySeverity: [
      { severity: "low", count: 7 },
      { severity: "medium", count: 9 },
      { severity: "high", count: 4 },
      { severity: "critical", count: 2 },
    ],
    alertsBySeverityStatus: [
      { severity: "critical", status: "open", count: 2 },
      { severity: "high", status: "open", count: 5 },
      { severity: "medium", status: "open", count: 11 },
    ],
    monitoringAccountsByStatus: [
      { status: "trial", count: 4 },
      { status: "active", count: 9 },
    ],
    openPipeline: {
      min_value: 12640,
      max_value: 47780,
      weighted_value: 18320,
    },
  },
  urgentWork: [
    {
      id: "opp_demo_1",
      priority: "critical",
      title: "RemoteLab Ransomware First Response opportunity",
      recommended_service: "RemoteLab Ransomware First Response",
      estimated_value_min: 1500,
      estimated_value_max: 2500,
      probability: "0.82",
      next_best_action: "Call immediately and propose First Response.",
      client_name: "Demo Manufacturing Inc.",
      client_email: "it@demo-mfg.com",
      case_id: "NX_demo_ransomware",
    },
    {
      id: "opp_demo_2",
      priority: "high",
      title: "RemoteLab Server Triage opportunity",
      recommended_service: "RemoteLab Server Triage",
      estimated_value_min: 799,
      estimated_value_max: 1200,
      probability: "0.68",
      next_best_action: "Call business client and propose Server Triage.",
      client_name: "North Shore Accounting",
      client_email: "admin@northshore.example",
      case_id: "NX_demo_server",
    },
  ],
};

const mockOpportunities = {
  status: "open",
  pipeline: { min: 12640, max: 47780, weighted: 18320 },
  opportunities: [
    ...mockDashboard.urgentWork,
    {
      id: "opp_demo_3",
      priority: "medium",
      title: "NEXURA Monitor Business upsell",
      recommended_service: "NEXURA Monitor Business",
      estimated_value_min: 199,
      estimated_value_max: 2388,
      probability: "0.42",
      next_best_action: "Offer monthly monitoring after resolving current issue.",
      client_name: "Jean Tremblay",
      client_email: "jean@example.com",
      case_id: "NX_demo_diskfix",
    },
  ],
};

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function formatCad(value) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function normalizeCount(rows, key, value) {
  return Number((rows || []).find((row) => row[key] === value)?.count || 0);
}

function priorityTone(priority) {
  if (priority === "critical") return "red";
  if (priority === "high") return "amber";
  if (priority === "medium") return "blue";
  return "slate";
}

function statusTone(status) {
  if (["won", "paid", "active", "resolved", "remote_repair_completed"].includes(status)) return "green";
  if (["critical", "lab_required", "payment_required"].includes(status)) return "red";
  if (["quoted", "contacted", "waiting_for_consent"].includes(status)) return "amber";
  return "slate";
}

function Badge({ children, tone = "slate" }) {
  const styles = {
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    red: "bg-red-50 text-red-700 ring-red-200",
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
    purple: "bg-purple-50 text-purple-700 ring-purple-200",
  };
  return <span className={cx("inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1", styles[tone])}>{children}</span>;
}

function MetricCard({ icon: Icon, label, value, subvalue, tone = "slate" }) {
  const iconStyles = {
    slate: "bg-slate-950 text-white",
    green: "bg-emerald-600 text-white",
    red: "bg-red-600 text-white",
    amber: "bg-amber-500 text-white",
    blue: "bg-blue-600 text-white",
    purple: "bg-purple-600 text-white",
  };

  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={cx("rounded-2xl p-3", iconStyles[tone])}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
            <p className="mt-1 truncate text-2xl font-black text-slate-950">{value}</p>
            {subvalue && <p className="mt-1 text-sm text-slate-500">{subvalue}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionHeader({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-950">
          <Icon className="h-6 w-6" /> {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  return response.json();
}

export default function NexuraAdminConsole() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [dashboard, setDashboard] = useState(null);
  const [opportunities, setOpportunities] = useState(null);
  const [selectedCaseId, setSelectedCaseId] = useState("NX_demo_server");
  const [caseDetail, setCaseDetail] = useState(null);
  const [generatedReport, setGeneratedReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiOnline, setApiOnline] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    setLoading(true);
    setError("");
    try {
      const [dash, opps] = await Promise.all([
        apiFetch("/api/admin/dashboard"),
        apiFetch("/api/admin/opportunities?status=open"),
      ]);
      setDashboard(dash);
      setOpportunities(opps);
      setApiOnline(true);
    } catch (err) {
      setDashboard(mockDashboard);
      setOpportunities(mockOpportunities);
      setApiOnline(false);
      setError("API not reachable. Showing demo data until your Node/Neon API is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const overview = dashboard?.overview || mockDashboard.overview;
  const urgentWork = dashboard?.urgentWork || [];
  const oppRows = opportunities?.opportunities || [];

  const metrics = useMemo(() => {
    const casesByStatus = overview.casesByStatus || [];
    const reportsBySeverity = overview.reportsBySeverity || [];
    const alerts = overview.alertsBySeverityStatus || [];
    const monitoringAccounts = overview.monitoringAccountsByStatus || [];
    const pipeline = overview.openPipeline || {};

    return {
      openPipeline: Number(pipeline.weighted_value || pipeline.weighted || 0),
      labRequired: normalizeCount(casesByStatus, "status", "lab_required"),
      remoteRepairAllowed: normalizeCount(casesByStatus, "status", "remote_repair_allowed"),
      criticalReports: normalizeCount(reportsBySeverity, "severity", "critical"),
      criticalAlerts: alerts.filter((a) => a.severity === "critical" && a.status === "open").reduce((sum, a) => sum + Number(a.count || 0), 0),
      activeMonitoring: normalizeCount(monitoringAccounts, "status", "active"),
      waitingConsent: normalizeCount(overview.sessionsByStatus || [], "status", "waiting_for_consent"),
    };
  }, [overview]);

  const updateOpportunityStatus = async (opportunityId, status) => {
    try {
      await apiFetch(`/api/admin/opportunities/${opportunityId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await loadDashboard();
    } catch (err) {
      setError(`Could not update opportunity: ${err.message}`);
    }
  };

  const createQuote = async (opportunityId, amountCad) => {
    try {
      const result = await apiFetch(`/api/opportunities/${opportunityId}/quote`, {
        method: "POST",
        body: JSON.stringify({ amountCad }),
      });
      setError(`Quote created: ${result.quoteId} for ${formatCad(result.amountCad)}`);
      await loadDashboard();
    } catch (err) {
      setError(`Could not create quote: ${err.message}`);
    }
  };

  const loadCase = async () => {
    if (!selectedCaseId.trim()) return;
    setLoading(true);
    setError("");
    setGeneratedReport(null);
    try {
      const result = await apiFetch(`/api/cases/${selectedCaseId.trim()}`);
      setCaseDetail(result);
      setApiOnline(true);
    } catch (err) {
      setCaseDetail(null);
      setError(`Case not found or API unavailable: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateCaseReport = async () => {
    if (!selectedCaseId.trim()) return;
    setLoading(true);
    try {
      const result = await apiFetch(`/api/reports/cases/${selectedCaseId.trim()}`, { method: "POST" });
      setGeneratedReport(result);
    } catch (err) {
      setError(`Could not generate report: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm ring-1 ring-slate-200">
              <ShieldCheck className="h-4 w-4" /> NEXURA DATA Platform
            </div>
            <h1 className="text-3xl font-black tracking-tight md:text-5xl">
              Admin command center for RemoteLab, Monitor, opportunities and revenue.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              Track urgent work, convert diagnostics into opportunities, generate quotes, review cases and monitor the recurring prevention pipeline.
            </p>
          </div>

          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">API</p>
                  <p className="mt-1 break-all text-sm font-bold text-slate-950">{API_BASE}</p>
                </div>
                <Badge tone={apiOnline ? "green" : "amber"}>{apiOnline ? "Connected" : "Demo mode"}</Badge>
              </div>
              {error && <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-800 ring-1 ring-amber-200">{error}</p>}
              <Button onClick={loadDashboard} className="mt-4 w-full rounded-xl bg-slate-950 py-6 text-white hover:bg-slate-800">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Refresh dashboard
              </Button>
            </CardContent>
          </Card>
        </header>

        <div className="mb-6 flex flex-wrap gap-2">
          {[
            ["dashboard", "Dashboard", BarChart3],
            ["opportunities", "Opportunities", DollarSign],
            ["urgent", "Urgent Work", Bell],
            ["cases", "Cases & Reports", FileText],
            ["monitor", "Monitor", MonitorDot],
          ].map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cx(
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black transition",
                activeTab === id ? "bg-slate-950 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
              )}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {activeTab === "dashboard" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard icon={TrendingUp} label="Weighted pipeline" value={formatCad(metrics.openPipeline)} subvalue="Open/contacted/quoted" tone="green" />
              <MetricCard icon={ShieldAlert} label="Lab escalations" value={metrics.labRequired} subvalue="High-value recovery cases" tone="red" />
              <MetricCard icon={Wrench} label="Safe repairs" value={metrics.remoteRepairAllowed} subvalue="Payment-ready RemoteLab fixes" tone="blue" />
              <MetricCard icon={MonitorDot} label="Active monitoring" value={metrics.activeMonitoring} subvalue="Recurring accounts" tone="purple" />
              <MetricCard icon={AlertTriangle} label="Critical alerts" value={metrics.criticalAlerts} subvalue="Open Monitor alerts" tone="red" />
              <MetricCard icon={Gauge} label="Critical reports" value={metrics.criticalReports} subvalue="Diagnostic severity" tone="amber" />
              <MetricCard icon={Mail} label="Waiting consent" value={metrics.waitingConsent} subvalue="Client sessions pending" tone="amber" />
              <MetricCard icon={BriefcaseBusiness} label="Open opportunities" value={oppRows.length} subvalue="Revenue actions" tone="slate" />
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
              <Card className="rounded-2xl border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <SectionHeader icon={LineChart} title="Pipeline summary" subtitle="Business view from service_opportunities." />
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Minimum</p>
                      <p className="mt-1 text-2xl font-black">{formatCad(opportunities?.pipeline?.min || overview.openPipeline?.min_value)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Maximum</p>
                      <p className="mt-1 text-2xl font-black">{formatCad(opportunities?.pipeline?.max || overview.openPipeline?.max_value)}</p>
                    </div>
                    <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Weighted</p>
                      <p className="mt-1 text-2xl font-black text-emerald-900">{formatCad(opportunities?.pipeline?.weighted || overview.openPipeline?.weighted_value)}</p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {(overview.casesByStatus || []).map((row) => (
                      <div key={row.status} className="flex items-center justify-between rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                        <span className="font-bold text-slate-700">{row.status}</span>
                        <Badge tone={statusTone(row.status)}>{row.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <SectionHeader icon={Sparkles} title="Next best actions" subtitle="High-priority work sorted by value and risk." />
                  <div className="space-y-3">
                    {urgentWork.slice(0, 5).map((work) => (
                      <div key={work.id} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <Badge tone={priorityTone(work.priority)}>{work.priority}</Badge>
                          <span className="text-sm font-black text-slate-950">{formatCad(work.estimated_value_min)}+</span>
                        </div>
                        <p className="font-black text-slate-950">{work.recommended_service}</p>
                        <p className="mt-1 text-sm text-slate-600">{work.client_name || "Unknown client"}</p>
                        <p className="mt-2 text-sm font-semibold text-slate-700">{work.next_best_action}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {activeTab === "opportunities" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <SectionHeader icon={DollarSign} title="Opportunity Engine" subtitle="Every triage, diagnostic and monitoring alert should become a tracked sales action." />
            <div className="grid gap-4">
              {oppRows.map((opp) => (
                <Card key={opp.id} className="rounded-2xl border-slate-200 shadow-sm">
                  <CardContent className="p-5">
                    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr_auto] lg:items-center">
                      <div>
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <Badge tone={priorityTone(opp.priority)}>{opp.priority}</Badge>
                          <Badge tone="blue">{opp.status || "open"}</Badge>
                          {opp.case_id && <Badge>Case {opp.case_id}</Badge>}
                        </div>
                        <h3 className="text-xl font-black text-slate-950">{opp.recommended_service}</h3>
                        <p className="mt-1 text-sm text-slate-600">{opp.title}</p>
                        <p className="mt-2 text-sm font-semibold text-slate-700">{opp.next_best_action}</p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Client</p>
                          <p className="mt-1 font-bold text-slate-950">{opp.client_name || "Unknown"}</p>
                          <p className="text-xs text-slate-500">{opp.client_email || "No email"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Value</p>
                          <p className="mt-1 font-black text-slate-950">{formatCad(opp.estimated_value_min)} - {formatCad(opp.estimated_value_max)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Probability</p>
                          <p className="mt-1 font-black text-slate-950">{Math.round(Number(opp.probability || 0) * 100)}%</p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button onClick={() => createQuote(opp.id, Number(opp.estimated_value_min || 0))} className="rounded-xl bg-slate-950 text-white hover:bg-slate-800">
                          Create quote <CreditCard className="ml-2 h-4 w-4" />
                        </Button>
                        <Button onClick={() => updateOpportunityStatus(opp.id, "contacted")} variant="outline" className="rounded-xl border-slate-300">
                          Mark contacted
                        </Button>
                        <Button onClick={() => updateOpportunityStatus(opp.id, "won")} variant="outline" className="rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                          Mark won
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === "urgent" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <SectionHeader icon={Bell} title="Urgent Work Queue" subtitle="Critical/high opportunities that deserve immediate action." />
            <div className="grid gap-4 lg:grid-cols-2">
              {urgentWork.map((work) => (
                <Card key={work.id} className="rounded-2xl border-slate-200 shadow-sm">
                  <CardContent className="p-5">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <Badge tone={priorityTone(work.priority)}>{work.priority}</Badge>
                      <div className="text-right">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Est. value</p>
                        <p className="font-black">{formatCad(work.estimated_value_min)} - {formatCad(work.estimated_value_max)}</p>
                      </div>
                    </div>
                    <h3 className="text-xl font-black text-slate-950">{work.recommended_service}</h3>
                    <p className="mt-2 text-sm text-slate-600">{work.client_name} · {work.client_email}</p>
                    <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                      <p className="text-sm font-bold text-slate-700">{work.next_best_action}</p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button onClick={() => createQuote(work.id, Number(work.estimated_value_min || 0))} className="rounded-xl bg-slate-950 text-white hover:bg-slate-800">
                        Quote now
                      </Button>
                      {work.case_id && (
                        <Button onClick={() => { setSelectedCaseId(work.case_id); setActiveTab("cases"); }} variant="outline" className="rounded-xl border-slate-300">
                          Open case <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === "cases" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardContent className="p-5">
                <SectionHeader icon={FileText} title="Case lookup & reports" subtitle="Load a case from the Node/Neon API, rebuild opportunities, or generate a report." />
                <div className="flex flex-col gap-3 md:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={selectedCaseId}
                      onChange={(e) => setSelectedCaseId(e.target.value)}
                      placeholder="NX_..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-10 py-3 text-sm font-semibold outline-none focus:border-slate-950"
                    />
                  </div>
                  <Button onClick={loadCase} className="rounded-xl bg-slate-950 px-5 py-6 text-white hover:bg-slate-800">
                    Load case
                  </Button>
                  <Button onClick={generateCaseReport} variant="outline" className="rounded-xl border-slate-300 px-5 py-6">
                    Generate report
                  </Button>
                </div>
              </CardContent>
            </Card>

            {caseDetail && (
              <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <Card className="rounded-2xl border-slate-200 shadow-sm">
                  <CardContent className="p-5">
                    <h3 className="mb-4 flex items-center gap-2 text-xl font-black"><ClipboardList className="h-5 w-5" /> Case summary</h3>
                    <div className="space-y-3">
                      {Object.entries(caseDetail.case || {}).slice(0, 12).map(([key, value]) => (
                        <div key={key} className="flex items-start justify-between gap-4 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                          <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{key}</span>
                          <span className="text-right text-sm font-bold text-slate-950">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 shadow-sm">
                  <CardContent className="p-5">
                    <h3 className="mb-4 flex items-center gap-2 text-xl font-black"><Activity className="h-5 w-5" /> Case activity</h3>
                    <div className="space-y-3">
                      {(caseDetail.audit || []).slice(0, 8).map((log) => (
                        <div key={log.id} className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-black text-slate-950">{log.event}</p>
                            <Badge>{log.actor}</Badge>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">{new Date(log.created_at).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {generatedReport && (
              <Card className="rounded-2xl border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <h3 className="flex items-center gap-2 text-xl font-black"><FileText className="h-5 w-5" /> Generated report</h3>
                    <Badge tone="green">{generatedReport.reportId}</Badge>
                  </div>
                  <pre className="max-h-[520px] overflow-auto rounded-2xl bg-slate-950 p-5 text-sm leading-6 text-slate-100">{generatedReport.markdown}</pre>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {activeTab === "monitor" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <SectionHeader icon={MonitorDot} title="NEXURA Monitor strategy" subtitle="The recurring prevention layer that feeds RemoteLab and Recovery Lab." />
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="rounded-2xl border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <HardDrive className="h-8 w-8 text-slate-950" />
                  <h3 className="mt-4 text-xl font-black">Monitor Basic</h3>
                  <p className="mt-2 text-sm text-slate-600">One workstation, disk space, SMART and critical event alerts.</p>
                  <p className="mt-4 text-2xl font-black">{formatCad(49)} / mo</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <Layers3 className="h-8 w-8 text-slate-950" />
                  <h3 className="mt-4 text-xl font-black">Monitor Business</h3>
                  <p className="mt-2 text-sm text-slate-600">Up to 10 assets, backups, cloud sync, monthly health report.</p>
                  <p className="mt-4 text-2xl font-black">{formatCad(199)} / mo</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <Server className="h-8 w-8 text-slate-950" />
                  <h3 className="mt-4 text-xl font-black">Monitor Server</h3>
                  <p className="mt-2 text-sm text-slate-600">NAS/RAID/server monitoring, backup checks and priority triage.</p>
                  <p className="mt-4 text-2xl font-black">{formatCad(499)} / mo</p>
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardContent className="p-5">
                <h3 className="mb-4 flex items-center gap-2 text-xl font-black"><Database className="h-5 w-5" /> Monitoring alert monetization</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    ["SMART failed", "Laboratory Recovery", "critical", "649 $ - 5,000 $"],
                    ["RAID degraded", "RemoteLab Server Triage", "high", "399 $ - 1,200 $"],
                    ["Backup failed", "Backup Readiness Check", "high", "199 $ - 799 $"],
                    ["Cloud sync conflict", "RemoteLab CloudRescue", "medium", "149 $ - 399 $"],
                    ["Ransomware indicators", "Ransomware First Response", "critical", "499 $ - 2,500 $"],
                    ["Low disk space", "System Health Repair", "medium", "99 $ - 249 $"],
                  ].map(([signal, service, priority, price]) => (
                    <div key={signal} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-black text-slate-950">{signal}</p>
                        <Badge tone={priorityTone(priority)}>{priority}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">Recommended: <span className="font-bold text-slate-950">{service}</span></p>
                      <p className="mt-1 text-sm font-black text-emerald-700">{price}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </main>
  );
}
