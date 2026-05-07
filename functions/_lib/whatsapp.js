import { normalizeText } from "./cases.js";

const normalizePhoneForWhatsApp = (value) => {
  const raw = normalizeText(value, 40);
  if (!raw) return "";

  const digits = raw.replace(/\D/g, "");
  if (raw.trim().startsWith("+") && digits.length >= 10) return digits;
  if (digits.length === 10) return `1${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return "";
};

export const sendWhatsAppBusinessMessage = async (env, payload = {}) => {
  const token = normalizeText(env?.WHATSAPP_BUSINESS_TOKEN, 500);
  const phoneNumberId = normalizeText(env?.WHATSAPP_PHONE_NUMBER_ID, 120);
  const version = normalizeText(env?.WHATSAPP_API_VERSION || "v20.0", 20);
  const to = normalizePhoneForWhatsApp(payload.to);
  const body = normalizeText(payload.body, 3500);

  if (!token || !phoneNumberId) {
    return { sent: false, reason: "not-configured" };
  }

  if (!to) {
    return { sent: false, reason: "missing-phone" };
  }

  if (!body) {
    return { sent: false, reason: "missing-message" };
  }

  try {
    const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: {
          preview_url: true,
          body
        }
      })
    });

    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      return {
        sent: false,
        reason: `api-${response.status}`,
        error: data?.error?.message || text || "Erreur WhatsApp Business API."
      };
    }

    return {
      sent: true,
      id: data?.messages?.[0]?.id || "",
      raw: data
    };
  } catch (error) {
    return {
      sent: false,
      reason: "network-error",
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
};