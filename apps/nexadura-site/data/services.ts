import { BarChart3, ClipboardCheck, DatabaseZap, MailCheck, Route, Workflow } from "lucide-react";

export const services = [
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