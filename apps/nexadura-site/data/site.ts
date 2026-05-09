import { BarChart3, Brain, ShieldCheck, Workflow } from "lucide-react";

export const problems = [
  "Manual follow-ups slow down revenue",
  "Teams waste hours moving data between tools",
  "Reporting is scattered, delayed, or unreliable",
  "Leads are lost because response time is too slow",
  "Operations depend too heavily on individual memory",
  "Growth creates complexity instead of leverage",
];

export const services = [
  {
    icon: Workflow,
    title: "Workflow Automation",
    description:
      "Replace repetitive manual processes with reliable AI-assisted systems across operations, sales, reporting, and fulfillment.",
  },
  {
    icon: Brain,
    title: "Business AI Copilots",
    description:
      "Deploy internal assistants that help teams retrieve knowledge, generate outputs, qualify leads, and execute faster.",
  },
  {
    icon: BarChart3,
    title: "Operational Intelligence",
    description:
      "Centralize performance data, surface bottlenecks, and give leadership clearer visibility into what needs action.",
  },
  {
    icon: ShieldCheck,
    title: "System Architecture",
    description:
      "Design scalable automation infrastructure with clean handoffs, documented processes, and measurable outcomes.",
  },
];

export const process = [
  {
    step: "01",
    title: "Audit",
    description:
      "We identify repetitive workflows, revenue leaks, process friction, and automation opportunities.",
  },
  {
    step: "02",
    title: "Architect",
    description:
      "We design the AI and automation system around your tools, team, data, and growth targets.",
  },
  {
    step: "03",
    title: "Deploy",
    description:
      "We build, test, document, and launch the system with clear ownership and measurable outputs.",
  },
  {
    step: "04",
    title: "Optimize",
    description:
      "We improve performance through feedback loops, analytics, and continuous operational refinement.",
  },
];

export const caseStudies = [
  {
    slug: "lead-qualification-automation",
    title: "Lead Qualification Automation",
    description: "Automated intake, scoring, routing, and follow-up for inbound leads.",
    outcomes: ["Faster first response", "Cleaner CRM routing", "Automated follow-up ownership"],
  },
  {
    slug: "ai-support-assistant",
    title: "AI Support Assistant",
    description: "Reduced repetitive support workload with an internal knowledge-based AI assistant.",
    outcomes: ["Reusable internal knowledge layer", "Reduced repeated questions", "Clearer escalation paths"],
  },
  {
    slug: "operational-reporting-dashboard",
    title: "Operational Reporting Dashboard",
    description: "Centralized fragmented reporting into a clear decision dashboard.",
    outcomes: ["One reporting source", "Clearer bottleneck visibility", "Better weekly operating rhythm"],
  },
];