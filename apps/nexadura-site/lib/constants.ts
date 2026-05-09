import { CheckCircle2, DatabaseZap, ShieldCheck } from "lucide-react";

export const brand = {
  name: "NEXADURA",
  domain: "nexadura.ca",
  headline: "AI automation infrastructure for companies ready to remove operational bottlenecks.",
  subheadline:
    "Nexadura builds AI-powered operational systems that help companies automate workflows, scale execution, and eliminate bottlenecks.",
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
    slug: "b2b-service-firm-intake-cleanup",
    title: "B2B service firm intake cleanup",
    metric: "34% faster first response",
    summary: "Consolidated web inquiries, referrals, and inbox leads into one scored CRM workflow with owner alerts.",
    challenge: "The team had leads arriving through forms, referrals, and inbox threads, but no consistent owner or response priority.",
    system: "Nexadura mapped the intake workflow, normalized the required CRM fields, added scoring rules, and routed priority alerts to the right owner.",
    outcome: "First response time improved by 34% and weekly review moved from inbox archaeology to one clean pipeline view.",
  },
  {
    slug: "local-operator-follow-up-system",
    title: "Local operator follow-up system",
    metric: "22 manual tasks removed per week",
    summary: "Replaced spreadsheet reminders with timeline-based email alerts and follow-up sequences by lead state.",
    challenge: "Follow-up depended on manual reminders, which meant qualified opportunities were easy to miss during busy operating weeks.",
    system: "The workflow was rebuilt around lead state, owner responsibility, and automated reminder sequences triggered by urgency and timeline.",
    outcome: "The operator removed 22 manual tasks per week and gained a follow-up rhythm that did not depend on memory.",
  },
  {
    slug: "consulting-pipeline-reporting-layer",
    title: "Consulting pipeline reporting layer",
    metric: "1 source of truth for weekly review",
    summary: "Standardized lead stages, attribution, and conversion events so leadership could see pipeline quality clearly.",
    challenge: "Leadership had activity metrics but could not see pipeline quality, stalled handoffs, or conversion patterns across channels.",
    system: "Nexadura standardized stages, attribution fields, conversion events, and reporting views around weekly operating decisions.",
    outcome: "The team moved to one source of truth for pipeline review and clearer decisions about where to improve conversion.",
  },
];

export const trustSignals = [
  { icon: ShieldCheck, label: "No invasive rebuild required" },
  { icon: CheckCircle2, label: "Built around your current stack" },
  { icon: DatabaseZap, label: "CRM and reporting first" },
];

export const growthSystem = {
  seoPages: [
    "automation audit for service business",
    "crm automation consultant canada",
    "lead follow-up automation",
    "small business workflow automation",
    "sales operations automation audit",
  ],
  linkedinThemes: [
    "Missed-lead postmortems",
    "Before-and-after workflow maps",
    "CRM hygiene lessons",
    "Lead scoring teardown",
    "Automation mistakes that create operational debt",
  ],
  outboundLandingPages: [
    "home-services-automation-audit",
    "professional-services-crm-cleanup",
    "b2b-intake-follow-up-system",
  ],
};