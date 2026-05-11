import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Cloud,
  CreditCard,
  Database,
  Download,
  FileText,
  Gauge,
  HardDrive,
  KeyRound,
  Laptop,
  Loader2,
  Lock,
  Mail,
  MonitorDot,
  RefreshCw,
  Send,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  Wrench,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * NEXURA RemoteLab Client Portal
 * ------------------------------------------------------------
 * React customer-facing portal for the Node/npm + Neon API.
 *
 * Expected env:
 *   VITE_API_BASE_URL=http://localhost:8787
 *
 * Consumes:
 *   POST /api/cases
 *   POST /api/sessions
 *   POST /api/consent
 *   POST /api/agent/diagnostics
 *   POST /api/reports/cases/:caseId
 *   POST /api/cases/:caseId/opportunities/rebuild
 *
 * This component includes demo fallback so the UX can be previewed
 * before the backend is running.
 */

const API_BASE = import.meta?.env?.VITE_API_BASE_URL || "http://localhost:8787";

const deviceOptions = [
  { id: "external_drive", label: "External drive / USB / SD card", icon: HardDrive },
  { id: "ssd_nvme", label: "SSD / NVMe", icon: Database },
  { id: "windows_pc", label: "Windows computer", icon: Laptop },
  { id: "mac", label: "Mac", icon: Laptop },
  { id: "cloud", label: "OneDrive / Google Drive / Dropbox / iCloud", icon: Cloud },
  { id: "outlook", label: "Outlook / Email / PST / OST", icon: Mail },
  { id: "nas_server", label: "NAS / RAID / Server", icon: Server },
  { id: "ransomware", label: "Ransomware / encrypted files", icon: ShieldAlert },
];

const symptomOptions = [
  { id: "drive_detected_inaccessible", label: "The drive is detected but inaccessible" },
  { id: "format_prompt", label: "Windows asks me to format" },
  { id: "deleted_files", label: "Files were deleted recently" },
  { id: "cloud_sync_stuck", label: "Cloud sync is stuck or files disappeared" },
  { id: "outlook_missing_mail", label: "Outlook emails or archives are missing" },
  { id: "system_slow_errors", label: "Computer is slow or showing system errors" },
  { id: "nas_raid_warning", label: "NAS / RAID has a warning" },
  { id: "clicking_drive", label: "Drive clicks or makes unusual noise" },
  { id: "ssd_not_detected", label: "SSD is completely not detected" },
  { id: "encrypted_files", label: "Files are encrypted / ransomware suspected" },
  { id: "unknown", label: "I am not sure" },
];

const urgencyOptions = [
  { id: "standard", label: "Standard" },
  { id: "priority", label: "Priority" },
  { id: "emergency", label: "Emergency 24–48h" },
];

const clientTypeOptions = [
  { id: "individual", label: "Individual" },
  { id: "business", label: "Business" },
  { id: "lawyer", label: "Legal / lawyer" },
  { id: "insurance", label: "Insurance" },
];

const stepOrder = ["intake", "assessment", "session", "consent", "diagnostic", "result"];

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

function riskTone(scoreOrLabel) {
  const raw = String(scoreOrLabel || "").toLowerCase();
  const score = Number(scoreOrLabel);
  if (score >= 85 || raw.includes("critical")) return "red";
  if (score >= 70 || raw.includes("high")) return "amber";
  if (score >= 50 || raw.includes("medium-high")) return "amber";
  if (score >= 30 || raw.includes("medium")) return "blue";
  return "green";
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
  return <span className={cx("inline-flex items-center rounded-full px-3 py-1 text-xs font-black ring-1", styles[tone])}>{children}</span>;
}

function Field({ label, children }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-black text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function Input(props) {
  return <input {...props} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-slate-950" />;
}

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-slate-950">
      {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
    </select>
  );
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={cx(
      "rounded-2xl border p-4 text-left transition",
      checked ? "border-slate-950 bg-white shadow-sm" : "border-slate-200 bg-slate-50 hover:bg-white"
    )}>
      <div className="flex items-start gap-3">
        <div className={cx("mt-0.5 rounded-full p-1", checked ? "bg-slate-950 text-white" : "bg-white text-slate-400 ring-1 ring-slate-200")}>
          {checked ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
        </div>
        <div>
          <p className="font-black text-slate-950">{label}</p>
          {description && <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>}
        </div>
      </div>
    </button>
  );
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
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start gap-3">
        <div className={cx("rounded-xl p-2", iconStyles[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
          <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
          {subvalue && <p className="mt-1 text-xs font-semibold text-slate-500">{subvalue}</p>}
        </div>
      </div>
    </div>
  );
}

function ProgressSteps({ step }) {
  const current = stepOrder.indexOf(step);
  return (
    <div className="flex flex-wrap gap-2">
      {stepOrder.map((id, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <div key={id} className={cx(
            "inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-black capitalize",
            done ? "bg-emerald-50 text-emerald-700" : active ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-500"
          )}>
            {done ? <CheckCircle2 className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-current" />}
            {id}
          </div>
        );
      })}
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

function buildDemoTriage(form) {
  const highRisk = ["clicking_drive", "ssd_not_detected", "nas_raid_warning", "encrypted_files"].includes(form.symptom);
  const cloud = form.deviceType === "cloud" || form.symptom === "cloud_sync_stuck";
  const outlook = form.deviceType === "outlook" || form.symptom === "outlook_missing_mail";
  const server = form.deviceType === "nas_server" || form.symptom === "nas_raid_warning";
  const ransomware = form.deviceType === "ransomware" || form.symptom === "encrypted_files";
  const formatPrompt = form.symptom === "format_prompt";

  let service = "RemoteLab Diagnose";
  let riskScore = 42;
  let priceMin = 49;
  let priceMax = 149;
  let mode = "remote_diagnose";
  let remoteEligible = true;
  let autoRepairAllowed = false;
  let nextAction = "Run secure read-only diagnostic.";
  let reason = "RemoteLab should verify risk before recommending repair.";
  let doNotDo = ["Do not format", "Do not run CHKDSK", "Do not install recovery software on the affected drive"];

  if (cloud) {
    service = "RemoteLab CloudRescue";
    riskScore = 18;
    priceMin = 149;
    priceMax = 399;
    mode = "remote_fix";
    autoRepairAllowed = true;
    nextAction = "Check cloud trash, versions, conflicts and sync state.";
    reason = "Cloud issues can often be resolved remotely with low physical risk.";
  } else if (outlook) {
    service = "RemoteLab OutlookRescue";
    riskScore = 22;
    priceMin = 199;
    priceMax = 499;
    mode = "remote_fix";
    autoRepairAllowed = true;
    nextAction = "Inspect Outlook profile, archives and indexing status.";
    reason = "Outlook issues are often profile, index or archive related.";
  } else if (server) {
    service = "RemoteLab Server Triage";
    riskScore = 78;
    priceMin = 399;
    priceMax = 1200;
    mode = "server_triage";
    autoRepairAllowed = false;
    nextAction = "Collect RAID state, logs, disk health and backup status.";
    reason = "NAS/RAID issues require read-only triage. Automatic rebuild is blocked.";
    doNotDo = ["Do not rebuild RAID", "Do not initialize drives", "Do not write to the array"];
  } else if (ransomware) {
    service = "RemoteLab Ransomware First Response";
    riskScore = 92;
    priceMin = 499;
    priceMax = 2500;
    mode = "ransomware_response";
    autoRepairAllowed = false;
    nextAction = "Isolate systems and run read-only incident triage.";
    reason = "Ransomware requires containment, evidence preservation and recovery planning.";
    doNotDo = ["Do not delete ransom notes", "Do not wipe machines", "Do not reconnect shares"];
  } else if (formatPrompt) {
    service = "RemoteLab SafeScan";
    riskScore = 56;
    priceMin = 79;
    priceMax = 199;
    mode = "remote_diagnose";
    autoRepairAllowed = false;
    reason = "A format prompt may indicate filesystem damage. Only read-only scanning is allowed.";
  } else if (form.symptom === "drive_detected_inaccessible") {
    service = "RemoteLab DiskFix";
    riskScore = 34;
    priceMin = 99;
    priceMax = 149;
    mode = "remote_fix";
    autoRepairAllowed = true;
    reason = "A visible inaccessible drive may be safe to repair after disk health verification.";
    nextAction = "Check disk health and offer safe mount repair if stable.";
  }

  if (highRisk && !server && !ransomware) {
    service = form.symptom === "ssd_not_detected" ? "NEXURA SSD Advanced Lab Diagnostic" : "NEXURA Laboratory Recovery";
    riskScore = form.symptom === "clicking_drive" ? 95 : 88;
    priceMin = form.symptom === "clicking_drive" ? 649 : 900;
    priceMax = form.symptom === "clicking_drive" ? 5000 : 2800;
    mode = "lab_recovery";
    remoteEligible = false;
    autoRepairAllowed = false;
    nextAction = "Stop using the device and escalate to the NEXURA laboratory.";
    reason = "Physical or electronic failure may worsen if remote software actions are attempted.";
    doNotDo = ["Do not power cycle repeatedly", "Do not format", "Do not run recovery software", "Do not open the device"];
  }

  if (form.containsCriticalData) riskScore += 8;
  if (form.attemptedFix) riskScore += 10;
  if (form.legalMatter) riskScore += 12;
  if (form.clientType === "business") riskScore += 5;
  riskScore = Math.min(100, riskScore);

  return {
    id: "triage_demo",
    service,
    mode,
    riskScore,
    riskLabel: riskScore >= 85 ? "Critical" : riskScore >= 70 ? "High" : riskScore >= 50 ? "Medium-high" : riskScore >= 30 ? "Medium" : "Low",
    priceMin,
    priceMax,
    remoteEligible,
    autoRepairAllowed: autoRepairAllowed && riskScore <= 35,
    requiresLab: !remoteEligible,
    nextAction,
    reason,
    doNotDo,
  };
}

export default function NexuraClientPortal() {
  const [step, setStep] = useState("intake");
  const [apiOnline, setApiOnline] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [caseId, setCaseId] = useState("");
  const [clientId, setClientId] = useState("");
  const [triage, setTriage] = useState(null);
  const [session, setSession] = useState(null);
  const [token, setToken] = useState("");
  const [consent, setConsent] = useState(false);
  const [diagnosticReport, setDiagnosticReport] = useState(null);
  const [generatedReport, setGeneratedReport] = useState(null);

  const [form, setForm] = useState({
    name: "Jean Tremblay",
    email: "client@example.com",
    phone: "514-555-0101",
    clientType: "individual",
    deviceType: "external_drive",
    symptom: "drive_detected_inaccessible",
    urgency: "standard",
    containsCriticalData: true,
    attemptedFix: false,
    legalMatter: false,
    notes: "External drive appears in Windows but does not open.",
  });

  const selectedDevice = useMemo(() => deviceOptions.find((d) => d.id === form.deviceType) || deviceOptions[0], [form.deviceType]);
  const DeviceIcon = selectedDevice.icon;

  const setFormField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const createCase = async () => {
    setLoading(true);
    setError("");
    setGeneratedReport(null);
    try {
      const payload = {
        client: {
          name: form.name,
          email: form.email,
          phone: form.phone,
          type: form.clientType,
        },
        intake: {
          deviceType: form.deviceType,
          symptom: form.symptom,
          urgency: form.urgency,
          containsCriticalData: form.containsCriticalData,
          attemptedFix: form.attemptedFix,
          legalMatter: form.legalMatter,
          notes: form.notes,
        },
      };
      const result = await apiFetch("/api/cases", { method: "POST", body: JSON.stringify(payload) });
      setClientId(result.clientId);
      setCaseId(result.caseId);
      setTriage(result.triage);
      setApiOnline(true);
      setStep("assessment");
    } catch (err) {
      const demoCaseId = `NX_demo_${Date.now()}`;
      setCaseId(demoCaseId);
      setClientId("client_demo");
      setTriage(buildDemoTriage(form));
      setApiOnline(false);
      setError("API not reachable. Showing demo assessment until your Node/Neon backend is running.");
      setStep("assessment");
    } finally {
      setLoading(false);
    }
  };

  const createSession = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiFetch("/api/sessions", { method: "POST", body: JSON.stringify({ caseId }) });
      const url = result.publicUrl || result.email?.body || "";
      const extractedToken = String(url).match(/token=([^\s&]+)/)?.[1] || "";
      setSession({ id: result.sessionId, publicUrl: result.publicUrl, email: result.email });
      setToken(extractedToken);
      setApiOnline(true);
      setStep("session");
    } catch (err) {
      const demoToken = "demo_token_" + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      const demoSession = {
        id: "session_demo",
        publicUrl: `${API_BASE}/remotelab/session/${caseId}?session=session_demo&token=${demoToken}`,
        email: {
          subject: `Secure RemoteLab diagnostic available - case ${caseId}`,
          body: `Your secure RemoteLab link is ready. Do not format, run CHKDSK, or copy files to affected media.`,
        },
      };
      setSession(demoSession);
      setToken(demoToken);
      setApiOnline(false);
      setError("Session simulated because API is not reachable.");
      setStep("session");
    } finally {
      setLoading(false);
    }
  };

  const giveConsent = async () => {
    setLoading(true);
    setError("");
    try {
      await apiFetch("/api/consent", {
        method: "POST",
        body: JSON.stringify({ caseId, sessionId: session.id, token }),
      });
      setApiOnline(true);
      setStep("consent");
    } catch (err) {
      setApiOnline(false);
      setError("Consent simulated because API is not reachable.");
      setStep("consent");
    } finally {
      setLoading(false);
    }
  };

  const runDiagnostic = async () => {
    setLoading(true);
    setError("");
    const payload = {
      caseId,
      sessionId: session?.id || "session_demo",
      token: token || "demo_token",
      agentVersion: "0.1.0",
      platform: form.deviceType === "mac" ? "macos" : "windows",
      diagnostics: {
        disks: [
          {
            model: form.deviceType === "ssd_nvme" ? "NVMe SSD" : "External USB Drive",
            serial: "DEMO-SERIAL-001",
            sizeGb: 1000,
            smartStatus: ["clicking_drive", "ssd_not_detected"].includes(form.symptom) ? "failed" : "passed",
            isDetected: form.symptom !== "ssd_not_detected",
            hasMountPoint: form.symptom !== "drive_detected_inaccessible",
            fileSystem: form.symptom === "format_prompt" ? "RAW" : "NTFS",
            isReadOnly: form.symptom === "format_prompt",
          },
        ],
        cloud: form.deviceType === "cloud" ? { provider: "onedrive", syncStatus: "stuck", deletedItemsFound: 4, previousVersionsFound: 12 } : undefined,
        outlook: form.deviceType === "outlook" ? { profileDetected: true, pstFilesFound: 2, ostFilesFound: 1, indexingHealthy: false } : undefined,
        system: form.deviceType === "ransomware" ? { freeSpaceGb: 120, criticalEventsLast24h: 17, malwareIndicators: 3, ransomwareExtensionsDetected: [".locked"] } : { freeSpaceGb: 120, criticalEventsLast24h: 1, malwareIndicators: 0 },
      },
    };

    try {
      const result = await apiFetch("/api/agent/diagnostics", { method: "POST", body: JSON.stringify(payload) });
      setDiagnosticReport(result.report);
      setApiOnline(true);
      setStep("result");
    } catch (err) {
      const demoReport = {
        id: "report_demo",
        severity: triage?.requiresLab ? "critical" : triage?.autoRepairAllowed ? "low" : "medium",
        title: "NEXURA RemoteLab Diagnostic Report",
        summary: triage?.requiresLab
          ? "High risk indicators detected. Remote repair is blocked and laboratory escalation is recommended."
          : triage?.autoRepairAllowed
            ? "No critical risk indicators detected. A safe non-destructive repair may be offered."
            : "Diagnostic completed. Read-only analysis is recommended before any repair action.",
        recommendedStatus: triage?.requiresLab ? "lab_required" : triage?.autoRepairAllowed ? "remote_repair_allowed" : "diagnostic_received",
        safeActionsToOffer: triage?.autoRepairAllowed ? ["assign_drive_letter", "mount_volume"] : ["read_diagnostics"],
        blockedActions: triage?.requiresLab ? ["format", "chkdsk_write", "partition_write", "mount_volume"] : ["format", "chkdsk_write", "partition_write"],
      };
      setDiagnosticReport(demoReport);
      setApiOnline(false);
      setError("Diagnostic simulated because API is not reachable.");
      setStep("result");
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiFetch(`/api/reports/cases/${caseId}`, { method: "POST" });
      setGeneratedReport(result);
      setApiOnline(true);
    } catch (err) {
      const markdown = `# NEXURA RemoteLab Report\n\n## Case\n- Case ID: ${caseId}\n- Client: ${form.name}\n- Service: ${triage?.service}\n- Risk: ${triage?.riskLabel} (${triage?.riskScore}/100)\n\n## Diagnostic\n${diagnosticReport?.summary || "No diagnostic available."}\n\n## Recommendation\n${triage?.nextAction}\n\n## Do Not Do\n${(triage?.doNotDo || []).map((x) => `- ${x}`).join("\n")}\n`;
      setGeneratedReport({ reportId: "report_demo", markdown });
      setApiOnline(false);
      setError("Report simulated because API is not reachable.");
    } finally {
      setLoading(false);
    }
  };

  const rebuildOpportunities = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiFetch(`/api/cases/${caseId}/opportunities/rebuild`, { method: "POST" });
      setError(`Opportunities created: ${result.opportunities?.map((o) => o.id).join(", ")}`);
      setApiOnline(true);
    } catch (err) {
      setError("Opportunity rebuild requires the API. Demo flow continued.");
      setApiOnline(false);
    } finally {
      setLoading(false);
    }
  };

  const currentTone = riskTone(triage?.riskScore || triage?.riskLabel);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm ring-1 ring-slate-200">
              <ShieldCheck className="h-4 w-4" /> NEXURA RemoteLab
            </div>
            <h1 className="text-3xl font-black tracking-tight md:text-5xl">
              Secure remote diagnostic before data loss gets worse.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              Diagnose the issue, block dangerous actions, run a secure consent-based session, and escalate to NEXURA’s laboratory when remote repair is unsafe.
            </p>
          </div>

          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Connection</p>
                  <p className="mt-1 break-all text-sm font-bold text-slate-950">{API_BASE}</p>
                </div>
                <Badge tone={apiOnline ? "green" : "amber"}>{apiOnline ? "API" : "Demo"}</Badge>
              </div>
              <ProgressSteps step={step} />
              {error && <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-800 ring-1 ring-amber-200">{error}</p>}
            </CardContent>
          </Card>
        </header>

        {step === "intake" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardContent className="p-5 md:p-6">
                <h2 className="mb-5 flex items-center gap-2 text-2xl font-black"><ClipboardCheck className="h-6 w-6" /> Start secure assessment</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Full name">
                    <Input value={form.name} onChange={(e) => setFormField("name", e.target.value)} />
                  </Field>
                  <Field label="Email">
                    <Input value={form.email} onChange={(e) => setFormField("email", e.target.value)} />
                  </Field>
                  <Field label="Phone">
                    <Input value={form.phone} onChange={(e) => setFormField("phone", e.target.value)} />
                  </Field>
                  <Field label="Client type">
                    <Select value={form.clientType} onChange={(value) => setFormField("clientType", value)} options={clientTypeOptions} />
                  </Field>
                  <Field label="Device / environment">
                    <Select value={form.deviceType} onChange={(value) => setFormField("deviceType", value)} options={deviceOptions} />
                  </Field>
                  <Field label="Main problem">
                    <Select value={form.symptom} onChange={(value) => setFormField("symptom", value)} options={symptomOptions} />
                  </Field>
                  <Field label="Urgency">
                    <Select value={form.urgency} onChange={(value) => setFormField("urgency", value)} options={urgencyOptions} />
                  </Field>
                  <Field label="Notes">
                    <Input value={form.notes} onChange={(e) => setFormField("notes", e.target.value)} />
                  </Field>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <Toggle checked={form.containsCriticalData} onChange={(value) => setFormField("containsCriticalData", value)} label="Critical data" description="Business, legal, financial or irreplaceable data." />
                  <Toggle checked={form.attemptedFix} onChange={(value) => setFormField("attemptedFix", value)} label="Already tried repair" description="CHKDSK, formatting, recovery software or rebuild attempts." />
                  <Toggle checked={form.legalMatter} onChange={(value) => setFormField("legalMatter", value)} label="Legal / evidence matter" description="Requires careful documentation and chain of custody." />
                </div>

                <div className="mt-6 rounded-2xl bg-slate-950 p-5 text-slate-100">
                  <p className="flex items-center gap-2 font-black"><AlertTriangle className="h-5 w-5" /> Before continuing</p>
                  <div className="mt-3 grid gap-2 text-sm leading-6 text-slate-300 md:grid-cols-2">
                    <p>Do not format the device.</p>
                    <p>Do not run CHKDSK or random repair tools.</p>
                    <p>Do not copy new files to affected media.</p>
                    <p>Do not rebuild RAID without expert review.</p>
                  </div>
                </div>

                <Button onClick={createCase} disabled={loading} className="mt-6 rounded-xl bg-slate-950 px-5 py-6 text-white hover:bg-slate-800">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Analyze my problem
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === "assessment" && triage && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard icon={DeviceIcon} label="Service" value={triage.service} tone="slate" />
              <MetricCard icon={Gauge} label="Risk" value={`${triage.riskLabel} (${triage.riskScore}/100)`} tone={currentTone} />
              <MetricCard icon={CreditCard} label="Estimate" value={`${formatCad(triage.priceMin)} - ${formatCad(triage.priceMax)}`} tone="green" />
              <MetricCard icon={Wrench} label="Remote repair" value={triage.autoRepairAllowed ? "Possible" : triage.remoteEligible ? "Diagnostic only" : "Blocked"} tone={triage.autoRepairAllowed ? "green" : triage.remoteEligible ? "amber" : "red"} />
            </div>

            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardContent className="p-5 md:p-6">
                <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
                  <div>
                    <h2 className="flex items-center gap-2 text-2xl font-black"><ShieldCheck className="h-6 w-6" /> Assessment result</h2>
                    <p className="mt-4 text-sm leading-7 text-slate-700"><span className="font-black text-slate-950">Reason:</span> {triage.reason}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-700"><span className="font-black text-slate-950">Next action:</span> {triage.nextAction}</p>

                    <div className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                      <p className="mb-3 font-black text-slate-950">Do not do this</p>
                      <div className="grid gap-2">
                        {(triage.doNotDo || []).map((item) => (
                          <div key={item} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <XCircle className="h-4 w-4 text-red-600" /> {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
                    <h3 className="flex items-center gap-2 text-xl font-black"><Lock className="h-5 w-5" /> Trust & safety</h3>
                    <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                      <p>RemoteLab starts with a temporary secure session.</p>
                      <p>No destructive action is allowed automatically.</p>
                      <p>Any repair action must be authorized by the backend and shown to you first.</p>
                      <p>If risk is high, RemoteLab stops and recommends laboratory handling.</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Button onClick={createSession} disabled={loading} className="rounded-xl bg-slate-950 px-5 py-6 text-white hover:bg-slate-800">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                    Create secure session
                  </Button>
                  {triage.requiresLab && <Button variant="outline" className="rounded-xl border-red-300 px-5 py-6 text-red-700 hover:bg-red-50">Send to laboratory</Button>}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === "session" && session && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardContent className="p-5 md:p-6">
                <h2 className="mb-5 flex items-center gap-2 text-2xl font-black"><Mail className="h-6 w-6" /> Secure session created</h2>
                <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                  <div className="rounded-2xl bg-slate-950 p-5 text-slate-100">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Session link</p>
                    <p className="mt-3 break-all text-sm font-bold leading-6">{session.publicUrl}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Email preview</p>
                    <p className="mt-2 font-black text-slate-950">{session.email?.subject || `Secure RemoteLab diagnostic available - case ${caseId}`}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{session.email?.body || "Your secure RemoteLab link is ready."}</p>
                  </div>
                </div>

                <Button onClick={() => setStep("consent")} className="mt-6 rounded-xl bg-slate-950 px-5 py-6 text-white hover:bg-slate-800">
                  Continue to consent <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === "consent" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardContent className="p-5 md:p-6">
                <h2 className="mb-5 flex items-center gap-2 text-2xl font-black"><Lock className="h-6 w-6" /> Consent required</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-emerald-50 p-5 ring-1 ring-emerald-200">
                    <p className="mb-3 font-black text-emerald-900">RemoteLab can collect</p>
                    {[
                      "Device type and operating system",
                      "Disk and volume state",
                      "SMART health when available",
                      "Relevant system logs",
                      "Cloud or Outlook status when applicable",
                    ].map((item) => <p key={item} className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-800"><CheckCircle2 className="h-4 w-4" /> {item}</p>)}
                  </div>
                  <div className="rounded-2xl bg-red-50 p-5 ring-1 ring-red-200">
                    <p className="mb-3 font-black text-red-900">RemoteLab will not automatically</p>
                    {[
                      "Format your drive",
                      "Delete your files",
                      "Modify partitions",
                      "Rebuild RAID",
                      "Upload personal files without explicit authorization",
                    ].map((item) => <p key={item} className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-800"><XCircle className="h-4 w-4" /> {item}</p>)}
                  </div>
                </div>

                <button onClick={() => setConsent(!consent)} className="mt-5 flex w-full items-start gap-3 rounded-2xl bg-white p-4 text-left ring-1 ring-slate-200">
                  <div className={cx("mt-0.5 rounded-full p-1", consent ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-400")}>
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-black text-slate-950">I authorize NEXURA DATA to run a secure diagnostic.</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">I understand that the session is temporary and no destructive action will be performed automatically.</p>
                  </div>
                </button>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Button onClick={giveConsent} disabled={!consent || loading} className="rounded-xl bg-slate-950 px-5 py-6 text-white hover:bg-slate-800 disabled:opacity-50">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                    Confirm consent
                  </Button>
                  <Button onClick={runDiagnostic} disabled={!consent || loading} variant="outline" className="rounded-xl border-slate-300 px-5 py-6 disabled:opacity-50">
                    Run diagnostic simulation
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === "result" && diagnosticReport && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard icon={FileText} label="Report" value={diagnosticReport.id || diagnosticReport.reportId || "Generated"} tone="slate" />
              <MetricCard icon={AlertTriangle} label="Severity" value={diagnosticReport.severity} tone={riskTone(diagnosticReport.severity)} />
              <MetricCard icon={Wrench} label="Status" value={diagnosticReport.recommendedStatus || "diagnostic_received"} tone={diagnosticReport.recommendedStatus === "lab_required" ? "red" : "green"} />
              <MetricCard icon={CreditCard} label="Estimate" value={`${formatCad(triage?.priceMin)} - ${formatCad(triage?.priceMax)}`} tone="green" />
            </div>

            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardContent className="p-5 md:p-6">
                <h2 className="mb-4 flex items-center gap-2 text-2xl font-black"><Gauge className="h-6 w-6" /> Diagnostic result</h2>
                <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold leading-7 text-slate-700 ring-1 ring-slate-200">{diagnosticReport.summary}</p>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
                    <p className="mb-3 font-black text-slate-950">Safe actions offered</p>
                    {(diagnosticReport.safeActionsToOffer || []).length ? diagnosticReport.safeActionsToOffer.map((action) => (
                      <p key={action} className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> {action}</p>
                    )) : <p className="text-sm text-slate-500">No safe repair actions offered.</p>}
                  </div>
                  <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
                    <p className="mb-3 font-black text-slate-950">Blocked actions</p>
                    {(diagnosticReport.blockedActions || []).map((action) => (
                      <p key={action} className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-700"><XCircle className="h-4 w-4" /> {action}</p>
                    ))}
                  </div>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-3">
                  <Card className="rounded-2xl border-slate-200 shadow-sm">
                    <CardContent className="p-5">
                      <Wrench className="h-7 w-7 text-slate-950" />
                      <h3 className="mt-3 font-black">Approve secure repair</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">Available only when RemoteLab identifies non-destructive actions.</p>
                      <Button disabled={!triage?.autoRepairAllowed} className="mt-4 w-full rounded-xl bg-slate-950 text-white disabled:opacity-50">Pay & repair</Button>
                    </CardContent>
                  </Card>
                  <Card className="rounded-2xl border-slate-200 shadow-sm">
                    <CardContent className="p-5">
                      <Server className="h-7 w-7 text-slate-950" />
                      <h3 className="mt-3 font-black">Send to laboratory</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">Recommended for physical, RAID, legal or high-risk cases.</p>
                      <Button variant="outline" className="mt-4 w-full rounded-xl border-slate-300">Request lab intake</Button>
                    </CardContent>
                  </Card>
                  <Card className="rounded-2xl border-slate-200 shadow-sm">
                    <CardContent className="p-5">
                      <MonitorDot className="h-7 w-7 text-slate-950" />
                      <h3 className="mt-3 font-black">Prevent future loss</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">Add NEXURA Monitor for alerts before failure happens again.</p>
                      <Button variant="outline" className="mt-4 w-full rounded-xl border-slate-300">View monitoring</Button>
                    </CardContent>
                  </Card>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Button onClick={generateReport} disabled={loading} className="rounded-xl bg-slate-950 px-5 py-6 text-white hover:bg-slate-800">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Generate report
                  </Button>
                  <Button onClick={rebuildOpportunities} disabled={loading} variant="outline" className="rounded-xl border-slate-300 px-5 py-6">
                    Create revenue opportunities
                  </Button>
                  <Button onClick={() => { setStep("intake"); setDiagnosticReport(null); setGeneratedReport(null); }} variant="outline" className="rounded-xl border-slate-300 px-5 py-6">
                    <RefreshCw className="mr-2 h-4 w-4" /> New assessment
                  </Button>
                </div>
              </CardContent>
            </Card>

            {generatedReport && (
              <Card className="rounded-2xl border-slate-200 shadow-sm">
                <CardContent className="p-5 md:p-6">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <h3 className="flex items-center gap-2 text-xl font-black"><FileText className="h-5 w-5" /> Customer report</h3>
                    <Badge tone="green">{generatedReport.reportId}</Badge>
                  </div>
                  <pre className="max-h-[420px] overflow-auto rounded-2xl bg-slate-950 p-5 text-sm leading-6 text-slate-100">{generatedReport.markdown}</pre>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </div>
    </main>
  );
}
