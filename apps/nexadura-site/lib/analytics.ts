import { track as trackVercelEvent } from "@vercel/analytics";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

type VercelEventProperties = Record<string, string | number | boolean | null>;

const getVercelProperties = (properties: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value === null || ["string", "number", "boolean"].includes(typeof value)),
  ) as VercelEventProperties;

export const trackConversion = (eventName: string, properties: Record<string, unknown> = {}) => {
  if (typeof window === "undefined") return;

  if (window.gtag) {
    window.gtag("event", eventName, properties);
  } else {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(["event", eventName, properties]);
  }

  window.fbq?.("trackCustom", eventName, properties);
  trackVercelEvent(eventName, getVercelProperties(properties));
};

export const getPageType = (path: string) => {
  if (path === "/") return "home";
  if (path === "/services") return "commercial";
  if (path === "/automation-audit" || path === "/contact") return "conversion";
  if (path.startsWith("/case-studies")) return "proof";
  if (path === "/about") return "trust";
  return "other";
};
