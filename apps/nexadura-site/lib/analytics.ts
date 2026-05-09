declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export const trackConversion = (eventName: string, properties: Record<string, unknown> = {}) => {
  if (typeof window === "undefined") return;
  window.gtag?.("event", eventName, properties);
  window.fbq?.("trackCustom", eventName, properties);
};