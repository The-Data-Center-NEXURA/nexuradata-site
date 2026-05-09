import { BarChart3, CheckCircle2, ClipboardCheck, DatabaseZap, MailCheck, Route, ShieldCheck, Workflow } from "lucide-react";

export const brand = {
  name: "NEXADURA",
  domain: "nexadura.ca",
  headline: "Automation systems for service businesses that cannot afford leaky operations.",
  subheadline:
    "We audit your intake, CRM, follow-up, reporting, and handoffs, then deploy practical automations that reduce missed leads and manual coordination.",
  offer: "Book a fixed-scope Automation Audit and leave with a prioritized workflow map, lead-scoring model, and implementation plan.",
  primaryCta: "Request an automation audit",
  secondaryCta: "View the process",
};

export const navItems = [
  { href: "/services", label: "Services" },
  { href: "/case-studies", label: "Case studies" },
  { href: "/automation-audit", label: "Automation audit" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export const painPoints = [
  "Leads arrive from too many places and no one owns the first response.",
  "CRM records exist, but statuses, tasks, and next steps are inconsistent.",
  "Follow-up depends on memory, manual reminders, or disconnected spreadsheets.",
  "Reporting shows activity, but not pipeline quality, handoff risk, or revenue leakage.",
];

export const solutions = [
  {
    icon: Workflow,
    title: "Workflow mapping",
    description: "Document every intake, qualification, handoff, approval, and follow-up step before automation starts.",
  },
  {
    icon: ClipboardCheck,
    title: "Lead scoring",
    description: "Rank new inquiries by fit, urgency, budget, and operational risk so the team knows what deserves attention first.",
  },
  {
    icon: DatabaseZap,
    title: "CRM storage",
    description: "Send clean, normalized lead records into your CRM or webhook layer with enough context for sales and operations.",
  },
  {
    icon: MailCheck,
    title: "Email alerts",
    description: "Notify the right inbox instantly with a concise summary, score, source, and recommended next action.",
  },
  {
    icon: Route,
    title: "Follow-up sequence",
    description: "Trigger appropriate follow-up based on lead quality, timeline, and unanswered operational questions.",
  },
  {
    icon: BarChart3,
    title: "Conversion events",
    description: "Track form submissions and audit requests with GA4-ready events and optional Meta Pixel support.",
  },
];

export const processSteps = [
  {
    title: "Audit the current system",
    description: "Review forms, inboxes, CRM fields, automations, reports, and handoffs to find where work leaks.",
  },
  {
    title: "Design the operating layer",
    description: "Define lead states, scoring rules, alerts, owner responsibilities, and the minimum viable automation stack.",
  },
  {
    title: "Deploy the first workflows",
    description: "Implement lead capture, CRM routing, alerts, follow-up triggers, and conversion tracking in a measured first pass.",
  },
  {
    title: "Improve from data",
    description: "Tune scoring, reporting, and sequences using actual lead quality, response time, and conversion signals.",
  },
];

export const auditOffer = {
  title: "Automation Audit",
  price: "Fixed-scope discovery",
  description:
    "A focused review of your lead-to-revenue workflow, with a prioritized roadmap for automations that can be shipped without rebuilding your whole company.",
  deliverables: [
    "Workflow map for intake, qualification, CRM, and follow-up",
    "Lead scoring model with priority tiers",
    "Automation backlog ranked by impact and implementation effort",
    "Analytics and conversion tracking checklist",
    "Implementation estimate for the first production workflows",
  ],
};

export const caseStudies = [
  {
    title: "B2B service firm intake cleanup",
    metric: "34% faster first response",
    summary: "Consolidated web inquiries, referrals, and inbox leads into one scored CRM workflow with owner alerts.",
  },
  {
    title: "Local operator follow-up system",
    metric: "22 manual tasks removed per week",
    summary: "Replaced spreadsheet reminders with timeline-based email alerts and follow-up sequences by lead state.",
  },
  {
    title: "Consulting pipeline reporting layer",
    metric: "1 source of truth for weekly review",
    summary: "Standardized lead stages, attribution, and conversion events so leadership could see pipeline quality clearly.",
  },
];

export const trustSignals = [
  { icon: ShieldCheck, label: "No invasive rebuild required" },
  { icon: CheckCircle2, label: "Built around your current stack" },
  { icon: DatabaseZap, label: "CRM and reporting first" },
];