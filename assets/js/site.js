/*
  NEXURADATA site script map
  1. Analytics, Meta Pixel and contact intent tracking
  2. Public UI helpers: navigation, reveal effects, counters, FAQ, anchors
  3. Pricing/self-assessment paths and payment feedback
  4. Intake form and client status portal
  5. Client authorization and guided workroom rendering
  6. Operations console
  7. Filtered operations views: quotes, payments and follow-up
*/

const yearTarget = document.querySelector("[data-year]");
const documentLanguage = document.documentElement.lang?.toLowerCase() || "fr-ca";
const isEnglishDocument = documentLanguage.startsWith("en");
const GA_MEASUREMENT_ID = "G-TC31YSS01P";
const META_PIXEL_ID = "751859640106935";
const CONSENT_STORAGE_KEY = "nexuradata_cookie_consent_v1";
const CONSENT_VERSION = 1;

const readCookieConsent = () => {
  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    if (parsed?.version !== CONSENT_VERSION) return null;

    return {
      version: CONSENT_VERSION,
      analytics: parsed.analytics === true,
      marketing: parsed.marketing === true,
      updatedAt: parsed.updatedAt || ""
    };
  } catch {
    return null;
  }
};

let cookieConsent = readCookieConsent();
let ga4Loaded = false;
let metaPixelLoaded = false;

const buildConsentModeState = (consent = cookieConsent) => ({
  analytics_storage: consent?.analytics ? "granted" : "denied",
  ad_storage: consent?.marketing ? "granted" : "denied",
  ad_user_data: consent?.marketing ? "granted" : "denied",
  ad_personalization: consent?.marketing ? "granted" : "denied"
});

const setGtagConsent = () => {
  if (typeof gtag !== "function") return;
  gtag("consent", "update", buildConsentModeState());
};

const loadGa4 = () => {
  if (ga4Loaded || cookieConsent?.analytics !== true) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  gtag("consent", "default", buildConsentModeState());

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  gtag("js", new Date());
  gtag("config", GA_MEASUREMENT_ID, {
    anonymize_ip: true,
    allow_ad_personalization_signals: false
  });
  ga4Loaded = true;
};

const loadMetaPixel = () => {
  if (metaPixelLoaded || cookieConsent?.marketing !== true) return;

  (function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    if (!f._fbq) f._fbq = n;
    n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
    t = b.createElement(e); t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js"));

  fbq("consent", "grant");
  fbq("init", META_PIXEL_ID);
  fbq("track", "PageView");
  metaPixelLoaded = true;
};

const applyCookieConsent = () => {
  setGtagConsent();
  loadGa4();

  if (typeof fbq === "function") {
    fbq("consent", cookieConsent?.marketing ? "grant" : "revoke");
  }
  loadMetaPixel();
};

const saveCookieConsent = (choices) => {
  cookieConsent = {
    version: CONSENT_VERSION,
    analytics: choices.analytics === true,
    marketing: choices.marketing === true,
    updatedAt: new Date().toISOString()
  };

  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(cookieConsent));
  } catch {
    // Consent still applies for the current page even if localStorage is unavailable.
  }

  applyCookieConsent();
};

const cookieI18n = isEnglishDocument
  ? {
    title: "Privacy preferences",
    copy: "Essential storage keeps the site working. Audience measurement and Meta marketing tools stay off unless you allow them.",
    analytics: "Audience measurement (GA4)",
    marketing: "Marketing measurement (Meta Pixel)",
    privacy: "Privacy policy",
    reject: "Reject all",
    save: "Save choices",
    accept: "Accept all"
  }
  : {
    title: "Préférences de confidentialité",
    copy: "Le stockage essentiel garde le site fonctionnel. La mesure d'audience et les outils marketing Meta restent désactivés sans votre accord.",
    analytics: "Mesure d'audience (GA4)",
    marketing: "Mesure marketing (Meta Pixel)",
    privacy: "Politique de confidentialité",
    reject: "Tout refuser",
    save: "Enregistrer",
    accept: "Tout accepter"
  };

const renderCookieConsent = (force = false) => {
  if (window.location.pathname.startsWith("/operations")) return;

  const existing = document.querySelector("[data-cookie-consent]");
  if (existing) existing.remove();
  if (cookieConsent && !force) return;

  const privacyHref = isEnglishDocument ? "/en/politique-confidentialite.html" : "/politique-confidentialite.html";
  const banner = document.createElement("section");
  banner.className = "cookie-consent";
  banner.setAttribute("data-cookie-consent", "");
  banner.setAttribute("role", "dialog");
  banner.setAttribute("aria-label", cookieI18n.title);
  banner.innerHTML = `
    <div class="cookie-consent-panel">
      <div class="cookie-consent-copy">
        <p class="cookie-kicker">NEXURADATA</p>
        <h2>${cookieI18n.title}</h2>
        <p>${cookieI18n.copy} <a href="${privacyHref}">${cookieI18n.privacy}</a>.</p>
      </div>
      <div class="cookie-consent-options">
        <label><input type="checkbox" name="analytics" ${cookieConsent?.analytics ? "checked" : ""}> <span>${cookieI18n.analytics}</span></label>
        <label><input type="checkbox" name="marketing" ${cookieConsent?.marketing ? "checked" : ""}> <span>${cookieI18n.marketing}</span></label>
      </div>
      <div class="cookie-consent-actions">
        <button type="button" class="button button-outline" data-cookie-choice="reject">${cookieI18n.reject}</button>
        <button type="button" class="button button-secondary" data-cookie-choice="save">${cookieI18n.save}</button>
        <button type="button" class="button button-primary" data-cookie-choice="accept">${cookieI18n.accept}</button>
      </div>
    </div>
  `;
  document.body.appendChild(banner);

  banner.querySelectorAll("[data-cookie-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      const choice = button.dataset.cookieChoice;
      const analyticsInput = banner.querySelector('input[name="analytics"]');
      const marketingInput = banner.querySelector('input[name="marketing"]');
      const choices = choice === "accept"
        ? { analytics: true, marketing: true }
        : choice === "reject"
          ? { analytics: false, marketing: false }
          : { analytics: analyticsInput.checked, marketing: marketingInput.checked };

      saveCookieConsent(choices);
      banner.remove();
    });
  });
};

const normalizeAnalyticsValue = (value, fallback = "unknown") => {
  const normalized = `${value || fallback}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);

  return normalized || fallback;
};

const trackGaEvent = (eventName, params = {}) => {
  if (typeof gtag !== "function") return;
  gtag("event", eventName, params);
};

const trackMetaEvent = (eventName, params = {}) => {
  if (typeof fbq !== "function") return;
  fbq("track", eventName, params);
};

const trackContactIntent = (method) => {
  const contactMethod = normalizeAnalyticsValue(method, "contact_link");

  trackMetaEvent("Contact", { content_name: contactMethod });
  trackGaEvent("generate_lead", {
    event_category: "contact",
    method: contactMethod,
    contact_method: contactMethod
  });
  trackGaEvent("contact_intent", {
    event_category: "contact",
    method: contactMethod,
    contact_method: contactMethod
  });
};

const trackIntakeFormSubmit = (deliveryStatus = "unknown") => {
  const status = normalizeAnalyticsValue(deliveryStatus, "unknown");

  trackMetaEvent("Lead", { content_name: "intake_form" });
  trackGaEvent("form_submit", {
    event_category: "lead",
    form_name: "intake_form",
    delivery_status: status
  });
  trackGaEvent("generate_lead", {
    event_category: "lead",
    method: "intake_form",
    delivery_status: status
  });
};

const trackSelfAssessmentIntent = (method, context = {}) => {
  const normalizedMethod = normalizeAnalyticsValue(method, "self_assessment");
  const support = normalizeAnalyticsValue(context.support, "unknown_support");
  const urgency = normalizeAnalyticsValue(context.urgency, "unknown_urgency");
  const impact = normalizeAnalyticsValue(context.impact, "unknown_impact");
  const estimateType = normalizeAnalyticsValue(context.estimateType, "standard");

  trackGaEvent("self_assessment_intent", {
    event_category: "self_assessment",
    method: normalizedMethod,
    support,
    urgency,
    impact,
    estimate_type: estimateType
  });
};

const bindCookiePreferenceTriggers = () => {
  document.querySelectorAll("[data-cookie-preferences]").forEach((button) => {
    button.addEventListener("click", () => renderCookieConsent(true));
  });
};

const initKineticCanvas = () => {
  const canvases = Array.from(document.querySelectorAll("[data-kinetic-canvas]"));
  if (!canvases.length) return;

  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reducedMotionQuery.matches) return;

  canvases.forEach((canvas) => {
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    let animationFrame = 0;
    let isVisible = true;
    let canvasWidth = 0;
    let canvasHeight = 0;
    let pixelRatio = 1;
    const nodes = Array.from({ length: 34 }, (_, index) => ({
      column: (index * 37) % 100,
      row: (index * 61) % 100,
      size: 10 + ((index * 7) % 34),
      phase: index * 0.37,
      lane: index % 5
    }));

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.6);
      canvasWidth = Math.max(1, Math.floor(rect.width));
      canvasHeight = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(canvasWidth * pixelRatio);
      canvas.height = Math.floor(canvasHeight * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const drawGrid = (time) => {
      const gridSize = canvasWidth < 720 ? 48 : 72;
      const horizontalOffset = (time * 10) % gridSize;
      const verticalOffset = (time * 6) % gridSize;

      context.lineWidth = 1;
      context.strokeStyle = "rgba(232,228,220,0.07)";

      for (let columnPosition = -gridSize; columnPosition < canvasWidth + gridSize; columnPosition += gridSize) {
        context.beginPath();
        context.moveTo(columnPosition + horizontalOffset, 0);
        context.lineTo(columnPosition + horizontalOffset - canvasHeight * 0.12, canvasHeight);
        context.stroke();
      }

      context.strokeStyle = "rgba(132,184,204,0.055)";
      for (let rowPosition = -gridSize; rowPosition < canvasHeight + gridSize; rowPosition += gridSize) {
        context.beginPath();
        context.moveTo(0, rowPosition + verticalOffset);
        context.lineTo(canvasWidth, rowPosition + verticalOffset + canvasWidth * 0.04);
        context.stroke();
      }
    };

    const drawNodes = (time) => {
      nodes.forEach((node, index) => {
        const pulse = (Math.sin(time * 1.55 + node.phase) + 1) / 2;
        const laneOffset = Math.sin(time * 0.42 + node.lane) * 26;
        const nodeLeft = (node.column / 100) * canvasWidth + laneOffset;
        const nodeTop = (node.row / 100) * canvasHeight + Math.cos(time * 0.36 + node.phase) * 18;
        const nodeWidth = node.size * (1.1 + pulse * 0.35);
        const nodeHeight = Math.max(7, node.size * 0.42);

        context.strokeStyle = index % 3 === 0 ? "rgba(132,184,204,0.28)" : "rgba(232,228,220,0.18)";
        context.fillStyle = index % 4 === 0 ? "rgba(132,184,204,0.055)" : "rgba(232,228,220,0.04)";
        context.lineWidth = 1;
        context.beginPath();
        context.rect(nodeLeft, nodeTop, nodeWidth, nodeHeight);
        context.fill();
        context.stroke();

        if (index % 5 === 0) {
          context.beginPath();
          context.moveTo(nodeLeft + nodeWidth, nodeTop + nodeHeight / 2);
          context.lineTo(nodeLeft + nodeWidth + 58 + pulse * 42, nodeTop + nodeHeight / 2);
          context.strokeStyle = "rgba(232,228,220,0.13)";
          context.stroke();
        }
      });
    };

    const drawScan = (time) => {
      const scanProgress = (time * 0.11) % 1;
      const scanLeft = scanProgress * (canvasWidth + canvasWidth * 0.45) - canvasWidth * 0.28;
      const gradient = context.createLinearGradient(scanLeft, 0, scanLeft + canvasWidth * 0.24, 0);
      gradient.addColorStop(0, "rgba(132,184,204,0)");
      gradient.addColorStop(0.5, "rgba(132,184,204,0.18)");
      gradient.addColorStop(1, "rgba(232,228,220,0)");

      context.save();
      context.transform(1, 0, -0.22, 1, 0, 0);
      context.fillStyle = gradient;
      context.fillRect(scanLeft, -40, canvasWidth * 0.24, canvasHeight + 80);
      context.restore();
    };

    const drawFrame = (time) => {
      const pulse = (Math.sin(time * 0.9) + 1) / 2;
      context.lineWidth = 1;
      context.strokeStyle = `rgba(232,228,220,${0.12 + pulse * 0.12})`;
      context.strokeRect(canvasWidth * 0.54, canvasHeight * 0.18, canvasWidth * 0.28, canvasHeight * 0.28);
      context.strokeRect(canvasWidth * 0.62, canvasHeight * 0.53, canvasWidth * 0.22, canvasHeight * 0.16);
      context.fillStyle = "rgba(13,13,11,0.28)";
      context.fillRect(canvasWidth * 0.57, canvasHeight * 0.22, canvasWidth * 0.08, canvasHeight * 0.06);
      context.fillRect(canvasWidth * 0.68, canvasHeight * 0.58, canvasWidth * 0.06, canvasHeight * 0.045);
    };

    const render = (timestamp) => {
      if (!isVisible || reducedMotionQuery.matches) return;

      const time = timestamp / 1000;
      context.clearRect(0, 0, canvasWidth, canvasHeight);
      context.globalCompositeOperation = "source-over";
      drawGrid(time);
      context.globalCompositeOperation = "screen";
      drawNodes(time);
      drawScan(time);
      drawFrame(time);
      context.globalCompositeOperation = "source-over";

      animationFrame = window.requestAnimationFrame(render);
    };

    const start = () => {
      if (animationFrame || reducedMotionQuery.matches) return;
      animationFrame = window.requestAnimationFrame(render);
    };

    const stop = () => {
      if (!animationFrame) return;
      window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    };

    const observer = "IntersectionObserver" in window
      ? new IntersectionObserver((entries) => {
        isVisible = entries.some((entry) => entry.isIntersecting);
        if (isVisible) start(); else stop();
      }, { threshold: 0.05 })
      : null;

    resizeCanvas();
    if ("ResizeObserver" in window) {
      new ResizeObserver(() => resizeCanvas()).observe(canvas);
    } else {
      window.addEventListener("resize", resizeCanvas, { passive: true });
    }
    observer?.observe(canvas);
    start();

    reducedMotionQuery.addEventListener?.("change", () => {
      if (reducedMotionQuery.matches) {
        stop();
        context.clearRect(0, 0, canvasWidth, canvasHeight);
      } else {
        resizeCanvas();
        start();
      }
    });
  });
};

applyCookieConsent();
renderCookieConsent();
bindCookiePreferenceTriggers();
initKineticCanvas();

// ── IBM square chatbot dock ───────────────────────────────────
(function () {
  // Skip on operator console
  if (window.location.pathname.startsWith("/operations")) return;

  const waNumber = "14388130592"; // digits only, no +
  const labels = isEnglishDocument
    ? {
      aria: "NEXURADATA chatbot",
      openLabel: "Open diagnostic assistant",
      closeLabel: "Close diagnostic assistant",
      kicker: "NEXURA AI",
      status: "DIAGNOSTIC",
      title: "Diagnose before contact",
      copy: "The assistant qualifies, routes and prepares the next action before direct communication.",
      supportLabel: "Media",
      symptomLabel: "Symptom",
      urgencyLabel: "Urgency",
      historyLabel: "Attempt",
      valueLabel: "Value",
      stateLabel: "State",
      supportOptions: [["drive", "Hard drive"], ["ssd", "SSD"], ["raid", "RAID / NAS"], ["phone", "Phone"], ["server", "Server"], ["removable", "USB / card"]],
      symptomOptions: [["deleted", "Deleted files"], ["slow", "Slow / unstable"], ["not_detected", "Not detected"], ["physical", "Shock / noise"], ["water", "Liquid damage"], ["encrypted", "Encrypted / forensic"]],
      urgencyOptions: [["standard", "Standard"], ["business", "Business impact"], ["critical", "Critical now"]],
      historyOptions: [["no_attempt", "No attempt"], ["software", "Recovery app"], ["opened", "Opened device"], ["rebuild", "RAID rebuild"], ["powered_on", "Repeated power-on"]],
      valueOptions: [["personal", "Personal"], ["business", "Business"], ["legal", "Legal"], ["medical", "Sensitive"]],
      stateOptions: [["powered_off", "Powered off"], ["unplugged", "Unplugged"], ["running", "Still running"], ["unknown", "Unknown"]],
      resultAction: "Get diagnosis",
      risk: "Risk",
      confidence: "Confidence",
      route: "Route",
      avoid: "Avoid",
      protocol: "Protocol",
      cases: {
        logical: ["Logical recovery", "Open a structured case with file type, last known location and timeline.", "Do not save new files on the same media."],
        priority: ["Priority lab review", "Stop handling the media and send the diagnostic summary with the case.", "Do not run generic recovery tools again."],
        high: ["High-risk recovery", "Keep the device powered down and wait for lab instructions before any restart.", "Do not open, rebuild, initialize or format."],
        critical: ["Critical intervention", "Use the emergency channel only if operations are blocked right now.", "Do not power-cycle or attempt a RAID rebuild."]
      },
      protocols: {
        logical: ["Preserve the original media.", "Open a case with the diagnostic summary.", "Prepare a destination drive if recovery is approved."],
        priority: ["Stop recovery apps and writes.", "Document the timeline and last successful access.", "Use secure intake before any new attempt."],
        high: ["Keep the device isolated and stable.", "Do not initialize, format or repair volumes.", "Send the case to lab review before powering on."],
        critical: ["Freeze all manipulations now.", "Escalate only through the emergency channel.", "Wait for lab instructions before any rebuild or restart."]
      },
      case: "Open case",
      service: "Service route",
      reception: "Secure intake",
      rates: "Rates",
      statusLink: "Track",
      payment: "Stripe payment",
      emailSummary: "Email summary",
      copySummary: "Copy summary",
      copied: "Copied",
      copyFailed: "Copy failed",
      quickCase: "Autonomous case",
      fieldName: "Name",
      fieldEmail: "Email",
      fieldPhone: "Phone",
      consent: "Open and manage this case with the diagnostic summary.",
      submitCase: "Create case",
      openingCase: "Creating case...",
      caseOpened: (caseId) => `Case ${caseId} created. Client and lab notifications are queued.`,
      caseFallback: "Online creation is unavailable. The prepared email will open.",
      caseError: "Case creation failed.",
      emergency: "Urgent WhatsApp",
      emailSubject: "NEXURADATA diagnostic summary",
      waIntro: "Hello NEXURADATA, the diagnostic assistant classified this case as urgent."
    }
    : {
      aria: "Chatbot NEXURADATA",
      openLabel: "Ouvrir l'assistant diagnostic",
      closeLabel: "Fermer l'assistant diagnostic",
      kicker: "NEXURA AI",
      status: "DIAGNOSTIC",
      title: "Diagnostiquer avant contact",
      copy: "L'assistant qualifie, oriente et prépare la prochaine action avant tout contact direct.",
      supportLabel: "Support",
      symptomLabel: "Symptôme",
      urgencyLabel: "Urgence",
      historyLabel: "Tentative",
      valueLabel: "Valeur",
      stateLabel: "État",
      supportOptions: [["drive", "Disque dur"], ["ssd", "SSD"], ["raid", "RAID / NAS"], ["phone", "Téléphone"], ["server", "Serveur"], ["removable", "USB / carte"]],
      symptomOptions: [["deleted", "Fichiers supprimés"], ["slow", "Lent / instable"], ["not_detected", "Non détecté"], ["physical", "Choc / bruit"], ["water", "Liquide"], ["encrypted", "Chiffré / forensique"]],
      urgencyOptions: [["standard", "Standard"], ["business", "Impact entreprise"], ["critical", "Critique maintenant"]],
      historyOptions: [["no_attempt", "Aucune"], ["software", "Logiciel tenté"], ["opened", "Support ouvert"], ["rebuild", "RAID reconstruit"], ["powered_on", "Redémarrages"]],
      valueOptions: [["personal", "Personnel"], ["business", "Entreprise"], ["legal", "Juridique"], ["medical", "Sensible"]],
      stateOptions: [["powered_off", "Éteint"], ["unplugged", "Débranché"], ["running", "Encore allumé"], ["unknown", "Inconnu"]],
      resultAction: "Obtenir diagnostic",
      risk: "Risque",
      confidence: "Confiance",
      route: "Parcours",
      avoid: "À éviter",
      protocol: "Protocole",
      cases: {
        logical: ["Récupération logique", "Ouvrez un dossier structuré avec type de fichiers, dernier emplacement connu et chronologie.", "N'enregistrez rien de nouveau sur le même support."],
        priority: ["Révision prioritaire laboratoire", "Cessez toute manipulation et joignez le résumé diagnostic au dossier.", "Ne relancez pas d'outil de récupération générique."],
        high: ["Récupération à haut risque", "Gardez l'appareil éteint et attendez les consignes du laboratoire avant tout redémarrage.", "N'ouvrez pas, ne reconstruisez pas, n'initialisez pas et ne formatez pas."],
        critical: ["Intervention critique", "Utilisez le canal urgence seulement si les opérations sont bloquées maintenant.", "Ne redémarrez pas et ne tentez pas de reconstruction RAID."]
      },
      protocols: {
        logical: ["Préservez le support original.", "Ouvrez un dossier avec le résumé diagnostic.", "Préparez un disque de destination si la récupération est approuvée."],
        priority: ["Arrêtez les logiciels de récupération et toute écriture.", "Notez la chronologie et le dernier accès réussi.", "Passez par la réception sécurisée avant toute nouvelle tentative."],
        high: ["Gardez l'appareil isolé et stable.", "N'initialisez pas, ne formatez pas et ne réparez pas les volumes.", "Envoyez le dossier au laboratoire avant toute remise sous tension."],
        critical: ["Gelez toute manipulation maintenant.", "Escaladez seulement par le canal urgence.", "Attendez les consignes du laboratoire avant toute reconstruction ou redémarrage."]
      },
      case: "Ouvrir dossier",
      service: "Parcours service",
      reception: "Réception sécurisée",
      rates: "Tarifs",
      statusLink: "Suivi",
      payment: "Paiement Stripe",
      emailSummary: "Courriel résumé",
      copySummary: "Copier résumé",
      copied: "Copié",
      copyFailed: "Échec copie",
      quickCase: "Dossier autonome",
      fieldName: "Nom",
      fieldEmail: "Courriel",
      fieldPhone: "Téléphone",
      consent: "Ouvrir et gérer ce dossier avec le résumé diagnostic.",
      submitCase: "Créer dossier",
      openingCase: "Création du dossier...",
      caseOpened: (caseId) => `Dossier ${caseId} créé. Les notifications client et labo sont lancées.`,
      caseFallback: "Création en ligne indisponible. Le courriel préparé va s'ouvrir.",
      caseError: "Création du dossier impossible.",
      emergency: "WhatsApp urgence",
      emailSubject: "Résumé diagnostic NEXURADATA",
      waIntro: "Bonjour NEXURADATA, l'assistant diagnostic classe ce dossier comme urgent."
    };
  const homePrefix = isEnglishDocument ? "/en" : "";
  const caseHref = `${homePrefix}/#contact`;
  const statusHref = `${homePrefix}/suivi-dossier-client-montreal.html`;
  const receptionHref = `${homePrefix}/reception-securisee-donnees-montreal.html`;
  const ratesHref = `${homePrefix}/tarifs-recuperation-donnees-montreal.html`;
  const serviceHref = (path) => `${homePrefix}/${path}`;
  const whatsappHref = `https://wa.me/${waNumber}?text=${encodeURIComponent(labels.waIntro)}`;
  const optionMarkup = (options) => options.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
  const optionLabel = (options, value) => options.find(([optionValue]) => optionValue === value)?.[1] || value;
  const getServiceHref = (support, symptom, value) => {
    if (symptom === "encrypted" || value === "legal") {
      return serviceHref("forensique-numerique-montreal.html");
    }

    if (support === "raid" || support === "server" || support === "ssd") {
      return serviceHref("recuperation-raid-ssd-montreal.html");
    }

    if (support === "phone") {
      return serviceHref("recuperation-telephone-montreal.html");
    }

    return serviceHref("recuperation-donnees-montreal.html");
  };
  const mapCaseSupport = (support, symptom, value) => {
    if (symptom === "encrypted" || value === "legal") return "Forensique / preuve numérique";
    if (support === "raid" || support === "server") return "RAID / NAS / serveur";
    if (support === "phone") return "Téléphone / mobile";
    if (support === "ssd") return "SSD";
    if (support === "removable") return "USB / carte mémoire";
    return "Disque dur";
  };
  const mapCaseUrgency = (urgency, symptom, value) => {
    if (symptom === "encrypted" || value === "legal" || value === "medical") return "Très sensible";
    if (urgency === "critical") return "Urgent";
    if (urgency === "business") return "Rapide";
    return "Standard";
  };
  const mapCaseProfile = (value) => {
    if (value === "legal") return "Cabinet juridique";
    if (value === "business" || value === "medical") return "Entreprise / TI";
    return "Particulier";
  };
  const mapCaseImpact = (urgency, value) => {
    if (value === "legal") return "Client, juridique ou assurance impliqué";
    if (urgency === "critical" || urgency === "business") return "Opérations bloquées";
    if (value === "business" || value === "medical") return "Données importantes";
    return "Planifié / non urgent";
  };
  const mapCaseSensitivity = (symptom, value) => {
    if (symptom === "encrypted" || value === "legal") return "Preuve / chaîne de possession";
    if (value === "medical") return "Données sensibles";
    if (value === "business") return "Confidentiel";
    return "Standard";
  };
  const findActiveStripeCheckoutHref = () => {
    const checkoutLink = document.querySelector('[data-stripe-checkout-link][href*="checkout.stripe.com"], .status-payment-actions a[href*="checkout.stripe.com"]');
    return checkoutLink?.href || "";
  };

  const dock = document.createElement("aside");
  dock.className = "chatbot-dock";
  dock.id = "diagnostic-assistant";
  dock.tabIndex = -1;
  dock.dataset.chatbotOpen = "false";
  dock.setAttribute("aria-label", labels.aria);
  dock.innerHTML = `
    <button type="button" class="chatbot-toggle" data-chatbot-toggle aria-expanded="false" aria-controls="chatbot-panel" aria-label="${labels.openLabel}" title="${labels.openLabel}">
      <img class="chatbot-avatar" src="/assets/icons/chatbot-robot.svg" alt="" width="42" height="42" aria-hidden="true" decoding="async">
      <span class="chatbot-toggle-copy" aria-hidden="true">
        <span class="chatbot-kicker">${labels.kicker}</span>
        <span class="chatbot-status">${labels.status}</span>
      </span>
    </button>
    <section class="chatbot-panel" id="chatbot-panel" data-chatbot-panel hidden>
      <div class="chatbot-dock-header">
        <span class="chatbot-mark" aria-hidden="true"></span>
        <span class="chatbot-kicker">${labels.kicker}</span>
        <span class="chatbot-status">${labels.status}</span>
        <button type="button" class="chatbot-close" data-chatbot-close aria-label="${labels.closeLabel}">X</button>
      </div>
      <p class="chatbot-title">${labels.title}</p>
      <p class="chatbot-copy">${labels.copy}</p>
      <form class="chatbot-diagnostic" data-chatbot-diagnostic>
        <label><span>${labels.supportLabel}</span><select name="support">${optionMarkup(labels.supportOptions)}</select></label>
        <label><span>${labels.symptomLabel}</span><select name="symptom">${optionMarkup(labels.symptomOptions)}</select></label>
        <label><span>${labels.urgencyLabel}</span><select name="urgency">${optionMarkup(labels.urgencyOptions)}</select></label>
        <label><span>${labels.historyLabel}</span><select name="history">${optionMarkup(labels.historyOptions)}</select></label>
        <label><span>${labels.valueLabel}</span><select name="value">${optionMarkup(labels.valueOptions)}</select></label>
        <label><span>${labels.stateLabel}</span><select name="state">${optionMarkup(labels.stateOptions)}</select></label>
        <button type="submit" class="chatbot-diagnostic-submit" data-chatbot-diagnostic-submit>${labels.resultAction}</button>
      </form>
      <div class="chatbot-result" data-chatbot-result aria-live="polite" tabindex="-1"></div>
      <ul class="chatbot-protocol" data-chatbot-protocol aria-label="${labels.protocol}"></ul>
      <form class="chatbot-case-form" data-chatbot-case-form data-intake-endpoint="/api/intake">
        <p>${labels.quickCase}</p>
        <label><span>${labels.fieldName}</span><input type="text" name="nom" autocomplete="name" required></label>
        <label><span>${labels.fieldEmail}</span><input type="email" name="courriel" autocomplete="email" required></label>
        <label><span>${labels.fieldPhone}</span><input type="tel" name="telephone" autocomplete="tel"></label>
        <label class="chatbot-case-consent"><input type="checkbox" name="consentement" required><span>${labels.consent}</span></label>
        <input type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" hidden>
        <button type="submit" class="chatbot-execute" data-chatbot-case-submit>${labels.submitCase}</button>
        <span class="chatbot-case-status" data-chatbot-case-status aria-live="polite"></span>
      </form>
      <div class="chatbot-actions">
        <a class="chatbot-link chatbot-link-primary" href="${caseHref}" data-chatbot-action="case">${labels.case}</a>
        <a class="chatbot-link" href="${serviceHref("recuperation-donnees-montreal.html")}" data-chatbot-action="service_route" data-chatbot-service>${labels.service}</a>
        <a class="chatbot-link" href="${receptionHref}" data-chatbot-action="secure_intake">${labels.reception}</a>
        <a class="chatbot-link" href="${ratesHref}" data-chatbot-action="rates">${labels.rates}</a>
        <a class="chatbot-link" href="${statusHref}" data-chatbot-action="stripe_payment" data-chatbot-payment>${labels.payment}</a>
        <a class="chatbot-link" href="${statusHref}" data-chatbot-action="status">${labels.statusLink}</a>
        <button type="button" class="chatbot-link" data-chatbot-action="copy_summary" data-chatbot-copy>${labels.copySummary}</button>
        <a class="chatbot-link" href="mailto:contact@nexuradata.ca" data-chatbot-action="email_summary" data-chatbot-email>${labels.emailSummary}</a>
        <a class="chatbot-link" href="${whatsappHref}" target="_blank" rel="noopener noreferrer" data-chatbot-action="urgent_whatsapp" data-chatbot-emergency hidden>${labels.emergency}</a>
      </div>
    </section>
  `;
  document.body.appendChild(dock);

  const toggleButton = dock.querySelector("[data-chatbot-toggle]");
  const panel = dock.querySelector("[data-chatbot-panel]");
  const closeButton = dock.querySelector("[data-chatbot-close]");
  const diagnosticForm = dock.querySelector("[data-chatbot-diagnostic]");
  const result = dock.querySelector("[data-chatbot-result]");
  const protocolTarget = dock.querySelector("[data-chatbot-protocol]");
  const caseForm = dock.querySelector("[data-chatbot-case-form]");
  const caseStatus = dock.querySelector("[data-chatbot-case-status]");
  const caseSubmitButton = dock.querySelector("[data-chatbot-case-submit]");
  const emergencyLink = dock.querySelector("[data-chatbot-emergency]");
  const paymentLink = dock.querySelector("[data-chatbot-payment]");
  const serviceLink = dock.querySelector("[data-chatbot-service]");
  const statusLink = dock.querySelector('[data-chatbot-action="status"]');
  const emailLink = dock.querySelector("[data-chatbot-email]");
  const copyButton = dock.querySelector("[data-chatbot-copy]");
  let latestDiagnosticSummary = "";
  let latestServiceHref = serviceHref("recuperation-donnees-montreal.html");
  let latestCasePayload = {
    support: "Disque dur",
    urgence: "Standard",
    profil: "Particulier",
    impact: "Planifié / non urgent",
    sensibilite: "Standard"
  };
  const setDockOpen = (open, restoreFocus = false) => {
    const isOpen = Boolean(open);
    dock.dataset.chatbotOpen = isOpen ? "true" : "false";
    toggleButton?.setAttribute("aria-expanded", isOpen ? "true" : "false");
    if (panel) panel.hidden = !isOpen;

    if (!restoreFocus) return;

    window.setTimeout(() => {
      if (isOpen) {
        diagnosticForm?.querySelector("select")?.focus({ preventScroll: true });
      } else {
        toggleButton?.focus({ preventScroll: true });
      }
    }, 0);
  };
  const setCaseStatus = (state, message) => {
    if (!caseStatus) return;
    caseStatus.dataset.state = state || "";
    caseStatus.textContent = message || "";
  };
  const parseBotJsonResponse = async (response) => {
    try {
      return await response.json();
    } catch {
      return null;
    }
  };
  const syncSummaryActions = () => {
    if (serviceLink) {
      serviceLink.href = latestServiceHref;
    }

    if (emailLink) {
      emailLink.href = `mailto:contact@nexuradata.ca?subject=${encodeURIComponent(labels.emailSubject)}&body=${encodeURIComponent(latestDiagnosticSummary)}`;
    }
  };
  const syncPaymentLink = () => {
    if (!paymentLink) return;

    const checkoutHref = findActiveStripeCheckoutHref();
    paymentLink.href = checkoutHref || statusHref;

    if (checkoutHref) {
      paymentLink.target = "_blank";
      paymentLink.rel = "noopener noreferrer";
    } else {
      paymentLink.removeAttribute("target");
      paymentLink.removeAttribute("rel");
    }
  };
  const updateDiagnosis = () => {
    const formData = new FormData(diagnosticForm);
    const support = formData.get("support");
    const symptom = formData.get("symptom");
    const urgency = formData.get("urgency");
    const history = formData.get("history");
    const value = formData.get("value");
    const state = formData.get("state");
    const score =
      ({ raid: 3, server: 3, ssd: 2, phone: 1, drive: 0, removable: 0 }[support] || 0) +
      ({ water: 4, physical: 4, encrypted: 3, not_detected: 2, slow: 1, deleted: 0 }[symptom] || 0) +
      ({ critical: 4, business: 2, standard: 0 }[urgency] || 0) +
      ({ rebuild: 4, opened: 3, software: 2, powered_on: 2, no_attempt: 0 }[history] || 0) +
      ({ legal: 2, medical: 2, business: 1, personal: 0 }[value] || 0) +
      ({ running: 2, unknown: 1, powered_off: 0, unplugged: 0 }[state] || 0);
    const level = score >= 13 ? "critical" : score >= 9 ? "high" : score >= 5 ? "priority" : "logical";
    const isCritical = level === "critical";
    const confidence = Math.min(96, 62 + (score * 3));
    const [title, route, avoid] = labels.cases[level];
    const selections = [
      `${labels.supportLabel}: ${optionLabel(labels.supportOptions, support)}`,
      `${labels.symptomLabel}: ${optionLabel(labels.symptomOptions, symptom)}`,
      `${labels.urgencyLabel}: ${optionLabel(labels.urgencyOptions, urgency)}`,
      `${labels.historyLabel}: ${optionLabel(labels.historyOptions, history)}`,
      `${labels.valueLabel}: ${optionLabel(labels.valueOptions, value)}`,
      `${labels.stateLabel}: ${optionLabel(labels.stateOptions, state)}`
    ];

    latestDiagnosticSummary = `${title}. ${selections.join(" | ")}. ${labels.risk}: ${score}. ${labels.confidence}: ${confidence}%. ${labels.route}: ${route} ${labels.avoid}: ${avoid}`;
    result.innerHTML = `
      <div class="chatbot-result-head">
        <strong>${title}</strong>
        <span>${labels.confidence} ${confidence}%</span>
      </div>
      <div class="chatbot-meter chatbot-meter-${level}" aria-hidden="true"><span></span></div>
      <dl class="chatbot-decision">
        <div><dt>${labels.risk}</dt><dd>${score}</dd></div>
        <div><dt>${labels.route}</dt><dd>${route}</dd></div>
        <div><dt>${labels.avoid}</dt><dd>${avoid}</dd></div>
      </dl>
    `;
    const protocolItems = labels.protocols[level] || [];
    protocolTarget.replaceChildren(...protocolItems.map((item) => {
      const protocolItem = document.createElement("li");
      protocolItem.textContent = item;
      return protocolItem;
    }));
    latestServiceHref = getServiceHref(support, symptom, value);
    latestCasePayload = {
      support: mapCaseSupport(support, symptom, value),
      urgence: mapCaseUrgency(urgency, symptom, value),
      profil: mapCaseProfile(value),
      impact: mapCaseImpact(urgency, value),
      sensibilite: mapCaseSensitivity(symptom, value)
    };
    latestDiagnosticSummary = `${latestDiagnosticSummary} ${labels.protocol}: ${protocolItems.join(" / ")}`;
    syncSummaryActions();
    emergencyLink.hidden = !isCritical;
    emergencyLink.href = `https://wa.me/${waNumber}?text=${encodeURIComponent(`${labels.waIntro}\n${latestDiagnosticSummary}`)}`;
  };

  const showDiagnosisResult = () => {
    updateDiagnosis();
    result?.scrollIntoView({ block: "nearest" });
    result?.focus({ preventScroll: true });
  };

  const copyDiagnosticSummary = async () => {
    if (!copyButton || !latestDiagnosticSummary) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(latestDiagnosticSummary);
      } else {
        const buffer = document.createElement("textarea");
        buffer.className = "chatbot-copy-buffer";
        buffer.value = latestDiagnosticSummary;
        buffer.setAttribute("readonly", "");
        document.body.appendChild(buffer);
        buffer.select();
        document.execCommand("copy");
        buffer.remove();
      }

      copyButton.textContent = labels.copied;
    } catch {
      copyButton.textContent = labels.copyFailed;
    }

    setTimeout(() => {
      copyButton.textContent = labels.copySummary;
    }, 1400);
  };

  const submitAutonomousCase = async (event) => {
    event.preventDefault();

    if (!caseForm?.checkValidity()) {
      caseForm?.reportValidity();
      return;
    }

    const formData = new FormData(caseForm);
    const turnstileToken = document.querySelector('[name="cf-turnstile-response"]')?.value || "";
    const payload = {
      nom: `${formData.get("nom") || ""}`.trim(),
      courriel: `${formData.get("courriel") || ""}`.trim(),
      telephone: `${formData.get("telephone") || ""}`.trim(),
      support: latestCasePayload.support,
      urgence: latestCasePayload.urgence,
      profil: latestCasePayload.profil,
      impact: latestCasePayload.impact,
      sensibilite: latestCasePayload.sensibilite,
      message: latestDiagnosticSummary,
      consentement: formData.get("consentement") === "on",
      website: `${formData.get("website") || ""}`.trim(),
      "cf-turnstile-response": turnstileToken,
      sourcePath: window.location.pathname
    };

    setCaseStatus("loading", labels.openingCase);

    if (caseSubmitButton) {
      caseSubmitButton.disabled = true;
      caseSubmitButton.textContent = labels.openingCase;
    }

    try {
      const response = await fetch(caseForm.getAttribute("data-intake-endpoint") || "/api/intake", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = await parseBotJsonResponse(response);

      if (response.ok && data?.ok) {
        const caseId = data.caseId || "";
        setCaseStatus("success", labels.caseOpened(caseId));

        if (statusLink && caseId) {
          statusLink.href = `${statusHref}?caseId=${encodeURIComponent(caseId)}`;
        }

        try {
          sessionStorage.setItem("nexuradata_latest_case_id", caseId);
          sessionStorage.setItem("nexuradata_diagnostic_summary", latestDiagnosticSummary);
        } catch {
          // Optional browser handoff only.
        }

        trackIntakeFormSubmit(data?.delivery?.client || "superbot");
        trackContactIntent("chatbot_autonomous_case_created");
        return;
      }

      if (data?.fallback === "mailto" || response.status >= 500) {
        setCaseStatus("success", labels.caseFallback);
        syncSummaryActions();
        window.location.href = emailLink?.href || "mailto:contact@nexuradata.ca";
        return;
      }

      setCaseStatus("error", data?.message || labels.caseError);
    } catch {
      setCaseStatus("success", labels.caseFallback);
      syncSummaryActions();
      window.location.href = emailLink?.href || "mailto:contact@nexuradata.ca";
    } finally {
      if (caseSubmitButton) {
        caseSubmitButton.disabled = false;
        caseSubmitButton.textContent = labels.submitCase;
      }
    }
  };

  diagnosticForm.addEventListener("submit", (event) => {
    event.preventDefault();
    showDiagnosisResult();
    trackGaEvent("chatbot_diagnostic", { event_category: "diagnostic", method: "result_button" });
  });
  diagnosticForm.addEventListener("change", () => {
    updateDiagnosis();
    trackGaEvent("chatbot_diagnostic", { event_category: "diagnostic", method: "local_triage" });
  });
  caseForm?.addEventListener("submit", submitAutonomousCase);
  toggleButton?.addEventListener("click", () => {
    setDockOpen(dock.dataset.chatbotOpen !== "true", true);
  });
  closeButton?.addEventListener("click", () => {
    setDockOpen(false, true);
  });
  dock.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && dock.dataset.chatbotOpen === "true") {
      event.preventDefault();
      setDockOpen(false, true);
    }
  });
  document.addEventListener("click", (event) => {
    if (dock.dataset.chatbotOpen !== "true" || dock.contains(event.target)) return;
    setDockOpen(false);
  });
  updateDiagnosis();
  syncPaymentLink();

  document.querySelectorAll('a[href="#diagnostic-assistant"]').forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      setDockOpen(true, true);
      setTimeout(() => dock.focus({ preventScroll: true }), 0);
    });
  });

  dock.querySelectorAll("[data-chatbot-action]").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (link.dataset.chatbotAction === "copy_summary") {
        event.preventDefault();
        copyDiagnosticSummary();
      }

      if (link.dataset.chatbotAction === "stripe_payment") {
        syncPaymentLink();
      }

      if (link.dataset.chatbotAction === "email_summary" || link.dataset.chatbotAction === "service_route") {
        syncSummaryActions();
      }

      if (link.dataset.chatbotAction === "case") {
        try {
          sessionStorage.setItem("nexuradata_diagnostic_summary", latestDiagnosticSummary);
        } catch {
          // Optional handoff only.
        }

        const messageField = document.querySelector('[data-intake-form] textarea[name="message"]');
        if (messageField && !messageField.value.trim()) {
          messageField.value = latestDiagnosticSummary;
        }
      }
      trackContactIntent(`chatbot_${link.dataset.chatbotAction || "open"}`);
    });
  });

  document.addEventListener("nexuradata:payments-rendered", syncPaymentLink);
}());

document.querySelectorAll("[data-contact-intent]").forEach((link) => {
  link.addEventListener("click", () => {
    trackContactIntent(link.dataset.contactIntent || "contact_link");
  });
});

const escapeHtml = (text) => {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
};

// ── Public copy, labels and demo records ─────────────────────

const publicI18n = isEnglishDocument
  ? {
    locale: "en-CA",
    navOpen: "Open navigation",
    navClose: "Close navigation",
    navMenu: "Menu",
    navCloseLabel: "Close",
    intakeSubjectPrefix: "NEXURADATA inquiry",
    fieldName: "Name",
    fieldEmail: "Email",
    fieldPhone: "Phone",
    fieldSupport: "Support",
    fieldUrgency: "Urgency",
    fieldProfile: "Requester profile",
    fieldImpact: "Business impact",
    fieldSensitivity: "Case sensitivity",
    fieldDescription: "Issue description",
    intakeRequired: "Complete the required fields before opening a case.",
    intakeBusy: "Opening...",
    intakeOpening: "Opening your case...",
    intakeOpenedSent: (caseId) => `Case ${caseId} opened. The access code was sent to the client.`,
    intakeOpenedQueued: (caseId) => `Case ${caseId} opened. The lab can now review the request.`,
    intakeFallback: "The online form is temporarily unavailable. Your email app will open so you can send the request.",
    intakeError: "The request could not be processed.",
    intakeOffline: "The online form cannot be reached right now. Your email app will open so you can send the request.",
    statusRequired: "Enter a valid case number and access code.",
    statusNotFound: "No case matched this access. Check the credentials provided by NEXURADATA or request an update.",
    statusFound: "Case found.",
    statusBusy: "Searching...",
    statusSearching: "Searching for your case...",
    statusOffline: "The status portal is currently unavailable.",
    paymentKindDeposit: "Deposit",
    paymentKindFinal: "Balance",
    paymentKindCustom: "Payment",
    paymentStatusPaid: "Paid",
    paymentStatusExpired: "Expired",
    paymentStatusFailed: "Retry needed",
    paymentStatusOpen: "Open",
    paymentConfirmedOn: (timestamp) => `Payment confirmed on ${timestamp}`,
    paymentAvailableUntil: (timestamp) => `Link available until ${timestamp}`,
    paymentSentOn: (timestamp) => `Link sent on ${timestamp}`,
    paymentReference: (reference) => `Reference ${reference}`,
    paymentAction: "Pay online",
    authorizationReady: "Awaiting client approval",
    authorizationApproved: "Approved",
    authorizationNoAmount: "Amount shown in the transmitted scope",
    authorizationRequired: "Enter the authorizing name and confirm consent.",
    authorizationBusy: "Approving...",
    authorizationSending: "Approving the intervention request...",
    authorizationSuccess: "Authorization approved. The case has been updated.",
    authorizationError: "The authorization could not be confirmed.",
    authorizationOffline: "The authorization service is currently unavailable.",
    workroomLocked: "The lab is still qualifying the case. The guided workroom opens after payment or authorization.",
    workroomOpen: "Workroom open",
    workroomAwaiting: "Awaiting payment or authorization",
    workroomMailSubject: (caseId) => `NEXURADATA workroom - ${caseId}`,
    demoCaseOne: {
      status: "Assessment in progress",
      updatedAt: "April 4, 2026 11:40 AM",
      support: "USB external drive",
      nextStep: "Initial assessment update",
      summary: "The support was received and logged. Initial assessment is in progress before the quote or next steps are sent.",
      steps: [
        { title: "Case received", note: "Support received and logged.", state: "complete" },
        { title: "Assessment in progress", note: "Initial review and case qualification.", state: "active" },
        { title: "Quote", note: "To be issued after assessment.", state: "pending" },
        { title: "Recovery work", note: "Starts after authorization.", state: "pending" }
      ],
      payments: [],
      authorization: {
        available: false,
        approved: false,
        quoteStatus: "none",
        quoteAmountFormatted: "",
        quoteSentAt: "",
        quoteApprovedAt: ""
      }
    },
    demoCaseTwo: {
      status: "Quote sent",
      updatedAt: "April 4, 2026 10:15 AM",
      support: "RAID / NAS",
      nextStep: "Awaiting client authorization",
      summary: "Initial assessment is complete. The quote and intervention framework were sent to the client for approval.",
      steps: [
        { title: "Case received", note: "Support received and logged.", state: "complete" },
        { title: "Assessment complete", note: "Initial technical review completed.", state: "complete" },
        { title: "Quote sent", note: "Awaiting acceptance.", state: "active" },
        { title: "Recovery work", note: "Begins after authorization.", state: "pending" }
      ],
      payments: [
        {
          paymentRequestId: "PAY-20260404-A1B2C3",
          paymentKind: "deposit",
          status: "open",
          label: "Intervention deposit",
          description: "Opens the recovery work once the intervention is authorized.",
          amountCents: 65000,
          amountFormatted: "$650.00",
          currency: "cad",
          checkoutUrl: "https://checkout.stripe.com/pay/demo",
          createdAt: "2026-04-04T14:10:00.000Z",
          sentAt: "2026-04-04T14:11:00.000Z",
          paidAt: "",
          expiresAt: "2026-04-11T14:10:00.000Z"
        }
      ],
      authorization: {
        available: true,
        approved: false,
        quoteStatus: "sent",
        quoteAmountFormatted: "$650.00",
        quoteSentAt: "2026-04-04T14:10:00.000Z",
        quoteApprovedAt: ""
      }
    }
  }
  : {
    locale: "fr-CA",
    navOpen: "Ouvrir la navigation",
    navClose: "Fermer la navigation",
    navMenu: "Menu",
    navCloseLabel: "Fermer",
    intakeSubjectPrefix: "Demande NEXURADATA",
    fieldName: "Nom",
    fieldEmail: "Courriel",
    fieldPhone: "Téléphone",
    fieldSupport: "Support",
    fieldUrgency: "Urgence",
    fieldProfile: "Profil du demandeur",
    fieldImpact: "Impact d'affaires",
    fieldSensitivity: "Sensibilité du dossier",
    fieldDescription: "Description du problème",
    intakeRequired: "Complétez les champs requis avant d'ouvrir un dossier.",
    intakeBusy: "Ouverture...",
    intakeOpening: "Ouverture du dossier en cours...",
    intakeOpenedSent: (caseId) => `Dossier ${caseId} ouvert. Le code d'accès a été envoyé au client.`,
    intakeOpenedQueued: (caseId) => `Dossier ${caseId} ouvert. Le laboratoire peut maintenant qualifier le cas.`,
    intakeFallback: "Le formulaire en ligne est temporairement indisponible. Votre application courriel va s'ouvrir pour envoyer la demande.",
    intakeError: "La demande n'a pas pu être traitée.",
    intakeOffline: "Le formulaire en ligne n'est pas joignable pour le moment. Votre application courriel va s'ouvrir pour envoyer la demande.",
    statusRequired: "Entrez un numéro de dossier et un code d'accès valides.",
    statusNotFound: "Aucun dossier n'a été trouvé avec cet accès. Vérifiez les identifiants transmis par NEXURADATA ou demandez une mise à jour.",
    statusFound: "Dossier trouvé.",
    statusBusy: "Recherche...",
    statusSearching: "Recherche du dossier en cours...",
    statusOffline: "Le portail de suivi n'est pas joignable pour le moment.",
    paymentKindDeposit: "Acompte",
    paymentKindFinal: "Solde",
    paymentKindCustom: "Paiement",
    paymentStatusPaid: "Payé",
    paymentStatusExpired: "Expiré",
    paymentStatusFailed: "À reprendre",
    paymentStatusOpen: "Ouvert",
    paymentConfirmedOn: (timestamp) => `Paiement confirmé le ${timestamp}`,
    paymentAvailableUntil: (timestamp) => `Lien disponible jusqu'au ${timestamp}`,
    paymentSentOn: (timestamp) => `Lien transmis le ${timestamp}`,
    paymentReference: (reference) => `Référence ${reference}`,
    paymentAction: "Régler en ligne",
    authorizationReady: "En attente d'autorisation client",
    authorizationApproved: "Approuvée",
    authorizationNoAmount: "Montant indiqué dans le cadre transmis",
    authorizationRequired: "Inscrivez le nom de la personne qui autorise et confirmez le consentement.",
    authorizationBusy: "Approbation...",
    authorizationSending: "Approbation de la demande d'intervention...",
    authorizationSuccess: "Autorisation approuvée. Le dossier a été mis à jour.",
    authorizationError: "L'autorisation n'a pas pu être confirmée.",
    authorizationOffline: "Le service d'autorisation n'est pas joignable pour le moment.",
    workroomLocked: "Le laboratoire qualifie encore le dossier. L'espace guidé s'ouvre après paiement ou autorisation.",
    workroomOpen: "Espace de travail ouvert",
    workroomAwaiting: "En attente du paiement ou de l'autorisation",
    workroomMailSubject: (caseId) => `Espace de travail NEXURADATA - ${caseId}`,
    demoCaseOne: {
      status: "Évaluation en cours",
      updatedAt: "4 avril 2026 à 11 h 40",
      support: "Disque externe USB",
      nextStep: "Communication de l'évaluation initiale",
      summary: "Le support a été reçu et enregistré. L'évaluation initiale est en cours avant l'envoi de la soumission ou des prochaines étapes.",
      steps: [
        { title: "Dossier reçu", note: "Support reçu et pris en charge.", state: "complete" },
        { title: "Évaluation en cours", note: "Lecture initiale et qualification du cas.", state: "active" },
        { title: "Soumission", note: "À transmettre après évaluation.", state: "pending" },
        { title: "Traitement", note: "Commence après autorisation.", state: "pending" }
      ],
      payments: [],
      authorization: {
        available: false,
        approved: false,
        quoteStatus: "none",
        quoteAmountFormatted: "",
        quoteSentAt: "",
        quoteApprovedAt: ""
      }
    },
    demoCaseTwo: {
      status: "Soumission envoyée",
      updatedAt: "4 avril 2026 à 10 h 15",
      support: "RAID / NAS",
      nextStep: "Attente de l'autorisation client",
      summary: "L'évaluation initiale a été complétée. La soumission et le cadre d'intervention ont été transmis au client pour acceptation.",
      steps: [
        { title: "Dossier reçu", note: "Support reçu et enregistré.", state: "complete" },
        { title: "Évaluation", note: "Analyse initiale terminée.", state: "complete" },
        { title: "Soumission envoyée", note: "En attente d'acceptation.", state: "active" },
        { title: "Traitement", note: "Débute après autorisation.", state: "pending" }
      ],
      payments: [
        {
          paymentRequestId: "PAY-20260404-A1B2C3",
          paymentKind: "deposit",
          status: "open",
          label: "Acompte d'intervention",
          description: "Ouverture du traitement après autorisation et prise en charge du dossier.",
          amountCents: 65000,
          amountFormatted: "650,00 $",
          currency: "cad",
          checkoutUrl: "https://checkout.stripe.com/pay/demo",
          createdAt: "2026-04-04T14:10:00.000Z",
          sentAt: "2026-04-04T14:11:00.000Z",
          paidAt: "",
          expiresAt: "2026-04-11T14:10:00.000Z"
        }
      ],
      authorization: {
        available: true,
        approved: false,
        quoteStatus: "sent",
        quoteAmountFormatted: "650,00 $",
        quoteSentAt: "2026-04-04T14:10:00.000Z",
        quoteApprovedAt: ""
      }
    }
  };

if (yearTarget) {
  yearTarget.textContent = new Date().getFullYear();
}

// ── Public UI helpers: footer notes, nav, reveals, counters ──

// Copyright footer — inject on all public pages that have .footer-note
const footerNote = document.querySelector(".footer-note");
if (footerNote) {
  const copyrightDiv = document.createElement("div");
  copyrightDiv.className = "footer-bottom";
  const year = new Date().getFullYear();
  copyrightDiv.innerHTML = isEnglishDocument
    ? `<p>&copy; ${year} NEXURA DATA. All rights reserved.</p>`
    : `<p>&copy; ${year} NEXURA DATA. Tous droits r\u00e9serv\u00e9s.</p>`;
  footerNote.insertAdjacentElement("afterend", copyrightDiv);
}

// Public header logo — normalize to the locked master asset on public pages.
document.querySelectorAll(".site-nav .brand-logo").forEach((logo) => {
  if (logo.getAttribute("src")?.includes("logo-petit.svg")) {
    logo.setAttribute("src", "/assets/nexuradata-master.svg");
  }
});

const revealElements = document.querySelectorAll("[data-reveal]");

const initializeMobileNav = () => {
  const navbars = document.querySelectorAll(".navbar, .site-nav");

  if (navbars.length === 0) {
    return;
  }

  const mobileNavQuery = window.matchMedia("(max-width: 720px)");

  navbars.forEach((navbar, index) => {
    const navLinks = navbar.querySelector(".nav-links");

    if (!navLinks) {
      return;
    }

    const navId = navLinks.id || `site-navigation-${index + 1}`;
    navLinks.id = navId;
    navbar.classList.add("nav-enhanced");

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "nav-toggle";
    toggle.setAttribute("aria-controls", navId);

    const setOpen = (open) => {
      const isOpen = Boolean(open) && mobileNavQuery.matches;
      navbar.classList.toggle("is-nav-open", isOpen);
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      toggle.setAttribute("aria-label", isOpen ? publicI18n.navClose : publicI18n.navOpen);
      toggle.textContent = isOpen ? publicI18n.navCloseLabel : publicI18n.navMenu;
    };

    setOpen(false);
    navbar.insertBefore(toggle, navLinks);

    toggle.addEventListener("click", () => {
      setOpen(!navbar.classList.contains("is-nav-open"));
    });

    navLinks.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        if (mobileNavQuery.matches) {
          setOpen(false);
        }
      });
    });

    document.addEventListener("click", (event) => {
      if (!mobileNavQuery.matches || !navbar.classList.contains("is-nav-open")) {
        return;
      }

      if (navbar.contains(event.target)) {
        return;
      }

      setOpen(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    });

    const syncNavState = (event) => {
      if (!event.matches) {
        setOpen(false);
      }
    };

    if (typeof mobileNavQuery.addEventListener === "function") {
      mobileNavQuery.addEventListener("change", syncNavState);
    } else if (typeof mobileNavQuery.addListener === "function") {
      mobileNavQuery.addListener(syncNavState);
    }
  });
};

initializeMobileNav();

const showAllReveals = () => {
  revealElements.forEach((element) => element.classList.add("is-visible"));
};

showAllReveals();

const counterElements = document.querySelectorAll("[data-count]");
counterElements.forEach((element) => {
  const target = parseInt(element.dataset.count, 10);
  if (Number.isNaN(target)) return;
  const suffix = element.dataset.countSuffix || "";
  const locale = document.documentElement.lang?.startsWith("en") ? "en-CA" : "fr-CA";
  element.textContent = target.toLocaleString(locale) + suffix;
});

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", (event) => {
    const href = anchor.getAttribute("href");

    if (!href || href === "#") {
      return;
    }

    const target = document.querySelector(href);

    if (!target) {
      return;
    }

    event.preventDefault();

    target.scrollIntoView({
      behavior: "auto",
      block: "start"
    });
  });
});

const paymentFeedback = document.querySelector("[data-payment-feedback]");

if (paymentFeedback) {
  const params = new URLSearchParams(window.location.search);
  const caseId = params.get("caseId") || "";
  const paymentRequestId = params.get("paymentRequestId") || "";
  const caseTarget = paymentFeedback.querySelector("[data-payment-feedback-case]");
  const requestTarget = paymentFeedback.querySelector("[data-payment-feedback-request]");
  const followLink = paymentFeedback.querySelector("[data-payment-feedback-follow]");
  const mailLink = paymentFeedback.querySelector("[data-payment-feedback-mail]");

  if (caseTarget) {
    caseTarget.textContent = caseId || "Non précisé";
  }

  if (requestTarget) {
    requestTarget.textContent = paymentRequestId || "Non précisée";
  }

  if (followLink && caseId) {
    followLink.href = `suivi-dossier-client-montreal.html?caseId=${encodeURIComponent(caseId)}`;
  }

  if (mailLink) {
    const subject = caseId
      ? `Dossier ${caseId} - suivi paiement`
      : "Suivi paiement NEXURADATA";
    const body = [
      caseId ? `Numéro de dossier: ${caseId}` : "",
      paymentRequestId ? `Référence de paiement: ${paymentRequestId}` : "",
      "",
      "Message:"
    ].filter(Boolean).join("\n");

    mailLink.href = `mailto:contact@nexuradata.ca?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
}

// ── Pricing/self-assessment paths ────────────────────────────

document.querySelectorAll("[data-paid-path-app]").forEach((app) => {
  const form = app.querySelector("[data-paid-path-form]");
  const titleTarget = app.querySelector("[data-paid-path-title]");
  const priceTarget = app.querySelector("[data-paid-path-price]");
  const summaryTarget = app.querySelector("[data-paid-path-summary]");
  const stepsTarget = app.querySelector("[data-paid-path-steps]");
  const startLink = app.querySelector("[data-paid-path-start]");
  const whatsappLink = app.querySelector("[data-paid-path-whatsapp]");

  if (!form || !titleTarget || !priceTarget || !summaryTarget || !stepsTarget) return;

  const estimatorCopy = isEnglishDocument
    ? {
      deleted_files: ["Deleted files recovery", "From $79 to $149", "A targeted recovery path when files were deleted, moved, formatted or lost without signs of physical damage.", "Je ne sais pas"],
      external_media: ["External media recovery", "From $129 to $350", "For USB keys, memory cards and external drives that are still partly detected or unstable.", "USB / carte mémoire"],
      hdd_ssd: ["HDD / SSD intervention", "From $350 to $650", "For drives or SSDs that are inaccessible, unstable, corrupted or showing symptoms that need specialized handling.", "SSD"],
      phone: ["Phone data recovery", "From $149 to $450", "For photos, videos, messages and app data on phones or tablets, depending on model, access and damage level.", "Téléphone / mobile"],
      raid_server: ["RAID / NAS / server case", "From $650 or quoted", "For multi-disk systems, business interruption, degraded arrays, missing volumes or server-side recovery.", "RAID / NAS / serveur"],
      forensic: ["Sensitive or evidence case", "Quoted", "For incidents, disputes, insurance, legal context or confidential evidence preservation.", "Forensique / preuve numérique"]
    }
    : {
      deleted_files: ["Récupération de fichiers supprimés", "De 79 $ à 149 $", "Parcours ciblé lorsque des fichiers ont été supprimés, déplacés, formatés ou perdus sans signe de dommage physique.", "Je ne sais pas"],
      external_media: ["Récupération support externe", "De 129 $ à 350 $", "Pour clés USB, cartes mémoire et disques externes encore partiellement détectés ou instables.", "USB / carte mémoire"],
      hdd_ssd: ["Intervention HDD / SSD", "De 350 $ à 650 $", "Pour disques ou SSD inaccessibles, instables, corrompus ou présentant des symptômes qui exigent une manipulation spécialisée.", "SSD"],
      phone: ["Récupération téléphone", "De 149 $ à 450 $", "Pour photos, vidéos, messages et données applicatives sur téléphone ou tablette, selon le modèle, l'accès et le dommage.", "Téléphone / mobile"],
      raid_server: ["Dossier RAID / NAS / serveur", "À partir de 650 $ ou sur soumission", "Pour systèmes multidisques, interruption d'activité, RAID dégradé, volume absent ou récupération côté serveur.", "RAID / NAS / serveur"],
      forensic: ["Dossier sensible ou preuve", "Sur soumission", "Pour incident, litige, assurance, contexte juridique ou conservation confidentielle de preuve.", "Forensique / preuve numérique"]
    };

  const labels = isEnglishDocument
    ? {
      standard: "Standard", priority: "Priority", critical: "Urgent or operations blocked",
      personal: "Personal or non-urgent", important: "Important data", blocked: "Work, client or activity blocked", legal: "Legal, insurance or evidence",
      none: "No attempt", software: "Recovery or repair software was launched", rebuild: "RAID rebuild, reset or format attempted", shop: "Already seen by another shop",
      scoped: "Quoted after scope confirmation", priorityQuote: "Priority quote", note: "Stop using the affected device until NEXURADATA confirms the next step.", prefix: "Estimate from the NEXURADATA self-assessment"
    }
    : {
      standard: "Standard", priority: "Rapide", critical: "Urgent ou opérations bloquées",
      personal: "Personnel ou non urgent", important: "Données importantes", blocked: "Travail, client ou activité bloquée", legal: "Juridique, assurance ou preuve",
      none: "Aucune tentative", software: "Logiciel de récupération ou réparation lancé", rebuild: "Reconstruction RAID, réinitialisation ou formatage tenté", shop: "Déjà vu par un autre atelier",
      scoped: "Sur soumission après cadrage", priorityQuote: "Soumission prioritaire", note: "Cessez d'utiliser le support touché jusqu'à confirmation de la prochaine étape.", prefix: "Estimation issue de l'auto-évaluation NEXURADATA"
    };

  const updateEstimate = () => {
    const formData = new FormData(form);
    const support = `${formData.get("support") || "deleted_files"}`;
    const symptom = `${formData.get("symptom") || "deleted"}`;
    const urgency = `${formData.get("urgency") || "standard"}`;
    const impact = `${formData.get("impact") || "personal"}`;
    const attempts = `${formData.get("attempts") || "none"}`;
    const profile = estimatorCopy[support] || estimatorCopy.deleted_files;
    const scoped = support === "forensic" || impact === "legal" || attempts === "rebuild" || attempts === "shop" || symptom === "clicking" || symptom === "raid_degraded";
    const priority = urgency === "critical" || impact === "blocked";
    const estimateType = scoped ? "scoped" : priority ? "priority" : "standard";
    const estimate = scoped ? labels.scoped : priority ? labels.priorityQuote : profile[1];
    const summary = `${profile[2]} ${scoped || priority ? labels.note : ""}`.trim();
    const steps = isEnglishDocument
      ? ["Keep the device in its current state and avoid new repair attempts.", "Open the case with this estimate so the context follows the request.", "NEXURADATA confirms the final quote before any intervention."]
      : ["Gardez le support dans son état actuel et évitez toute nouvelle tentative.", "Ouvrez le dossier avec cette estimation pour transmettre le contexte.", "NEXURADATA confirme le devis final avant toute intervention."];

    titleTarget.textContent = profile[0];
    priceTarget.textContent = estimate;
    summaryTarget.textContent = summary;
    stepsTarget.replaceChildren(...steps.map((step) => {
      const item = document.createElement("li");
      item.textContent = step;
      return item;
    }));

    const message = [
      labels.prefix,
      `${isEnglishDocument ? "Path" : "Parcours"}: ${profile[0]}`,
      `${isEnglishDocument ? "Estimate" : "Estimation"}: ${estimate}`,
      `${isEnglishDocument ? "Urgency" : "Urgence"}: ${labels[urgency]}`,
      `${isEnglishDocument ? "Impact" : "Impact"}: ${labels[impact]}`,
      `${isEnglishDocument ? "Attempts" : "Tentatives"}: ${labels[attempts]}`,
      `${isEnglishDocument ? "Symptom" : "Symptôme"}: ${symptom}`
    ].join("\n");
    const query = new URLSearchParams({
      support: profile[3],
      urgence: urgency === "critical" ? "Urgent" : urgency === "priority" ? "Rapide" : "Standard",
      profil: impact === "blocked" ? "Entreprise / TI" : impact === "legal" ? "Cabinet juridique" : "Particulier",
      impact: impact === "blocked" ? "Opérations bloquées" : impact === "legal" ? "Client, juridique ou assurance impliqué" : impact === "important" ? "Données importantes" : "Planifié / non urgent",
      sensibilite: impact === "legal" ? "Preuve / chaîne de possession" : impact === "blocked" ? "Données sensibles" : impact === "important" ? "Confidentiel" : "Standard",
      message
    });

    app.dataset.estimateSupport = support;
    app.dataset.estimateUrgency = urgency;
    app.dataset.estimateImpact = impact;
    app.dataset.estimateType = estimateType;

    if (startLink) startLink.href = isEnglishDocument ? `/en/?${query.toString()}#contact` : `index.html?${query.toString()}#contact`;
    if (whatsappLink) whatsappLink.href = `https://wa.me/14388130592?text=${encodeURIComponent(message)}`;
  };

  form.addEventListener("change", updateEstimate);
  if (startLink) {
    startLink.addEventListener("click", () => {
      trackSelfAssessmentIntent("open_case", app.dataset);
    });
  }

  if (whatsappLink) {
    whatsappLink.addEventListener("click", () => {
      trackSelfAssessmentIntent("whatsapp", app.dataset);
      trackContactIntent("self_assessment_whatsapp");
    });
  }

  updateEstimate();
});

const setMessage = (target, state, text) => {
  if (!target) {
    return;
  }

  target.dataset.state = state;
  target.textContent = text;
};

const setButtonBusy = (button, busy, busyLabel) => {
  if (!button) {
    return;
  }

  if (busy) {
    if (!button.dataset.defaultLabel) {
      button.dataset.defaultLabel = button.textContent || "";
    }

    if (busyLabel) {
      button.textContent = busyLabel;
    }

    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    return;
  }

  if (button.dataset.defaultLabel) {
    button.textContent = button.dataset.defaultLabel;
  }

  button.disabled = false;
  button.removeAttribute("aria-busy");
};

const parseJsonResponse = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const formatTimestamp = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(publicI18n.locale, {
    dateStyle: "long",
    timeStyle: "short"
  }).format(date);
};

const formatCurrency = (amountCents, currency = "cad") =>
  new Intl.NumberFormat(publicI18n.locale, {
    style: "currency",
    currency: `${currency || "cad"}`.toUpperCase()
  }).format((Number(amountCents) || 0) / 100);

const buildIntakeMailto = (formData) => {
  const subject = `${publicI18n.intakeSubjectPrefix} - ${formData.get("support")} - ${formData.get("urgence")}`;
  const bodyLines = [
    `${publicI18n.fieldName}: ${formData.get("nom") || ""}`,
    `${publicI18n.fieldEmail}: ${formData.get("courriel") || ""}`,
    `${publicI18n.fieldPhone}: ${formData.get("telephone") || ""}`,
    `${publicI18n.fieldSupport}: ${formData.get("support") || ""}`,
    `${publicI18n.fieldUrgency}: ${formData.get("urgence") || ""}`,
    `${publicI18n.fieldProfile}: ${formData.get("profil") || ""}`,
    `${publicI18n.fieldImpact}: ${formData.get("impact") || ""}`,
    `${publicI18n.fieldSensitivity}: ${formData.get("sensibilite") || ""}`,
    "",
    `${publicI18n.fieldDescription}:`,
    `${formData.get("message") || ""}`
  ];

  return `mailto:contact@nexuradata.ca?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
};

const createStatusStep = (step) => {
  const article = document.createElement("article");
  article.className = `status-step status-step-${step.state}`;

  const title = document.createElement("p");
  title.className = "status-step-title";
  title.textContent = step.title;

  const note = document.createElement("p");
  note.className = "status-step-note";
  note.textContent = step.note;

  article.append(title, note);
  return article;
};

const formatPaymentKindLabel = (paymentKind) => {
  if (paymentKind === "deposit") {
    return publicI18n.paymentKindDeposit;
  }

  if (paymentKind === "final") {
    return publicI18n.paymentKindFinal;
  }

  return publicI18n.paymentKindCustom;
};

const formatPaymentStatusLabel = (status) => {
  if (status === "paid") {
    return publicI18n.paymentStatusPaid;
  }

  if (status === "expired") {
    return publicI18n.paymentStatusExpired;
  }

  if (status === "failed") {
    return publicI18n.paymentStatusFailed;
  }

  return publicI18n.paymentStatusOpen;
};

const createStatusPayment = (payment) => {
  const article = document.createElement("article");
  article.className = "status-payment";

  const head = document.createElement("div");
  head.className = "status-payment-head";

  const title = document.createElement("p");
  title.className = "status-payment-title";
  title.textContent = payment.label;

  const badge = document.createElement("span");
  badge.className = `status-payment-badge is-${payment.status || "open"}`;
  badge.textContent = formatPaymentStatusLabel(payment.status);

  head.append(title, badge);

  const meta = document.createElement("p");
  meta.className = "status-payment-meta";
  meta.textContent = `${payment.amountFormatted || formatCurrency(payment.amountCents, payment.currency)} · ${formatPaymentKindLabel(payment.paymentKind)}`;

  const note = document.createElement("p");
  note.className = "status-payment-note";
  note.textContent = payment.description;

  const details = document.createElement("p");
  details.className = "status-payment-meta";
  details.textContent =
    payment.status === "paid" && payment.paidAt
      ? publicI18n.paymentConfirmedOn(formatTimestamp(payment.paidAt))
      : payment.status === "open" && payment.expiresAt
        ? publicI18n.paymentAvailableUntil(formatTimestamp(payment.expiresAt))
        : payment.sentAt
          ? publicI18n.paymentSentOn(formatTimestamp(payment.sentAt))
          : publicI18n.paymentReference(payment.paymentRequestId);

  article.append(head, meta, note);

  if (payment.checkoutUrl) {
    const actions = document.createElement("div");
    actions.className = "status-payment-actions";

    const link = document.createElement("a");
    link.className = "button button-primary button-small";
    link.href = payment.checkoutUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.dataset.stripeCheckoutLink = "";
    link.textContent = publicI18n.paymentAction;

    actions.append(link);
    article.append(actions);
  }

  article.append(details);
  return article;
};

let currentStatusCredentials = null;

const renderAuthorizationState = (record, statusPanel) => {
  const section = statusPanel?.querySelector("[data-authorization-section]");

  if (!section) {
    return;
  }

  const authorization = record.authorization || {};
  const isAvailable = Boolean(authorization.available);
  section.hidden = !isAvailable;

  if (!isAvailable) {
    return;
  }

  const amountTarget = section.querySelector("[data-authorization-amount]");
  const stateTarget = section.querySelector("[data-authorization-state]");
  const form = section.querySelector("[data-authorization-form]");
  const submitButton = form?.querySelector('button[type="submit"]');

  if (amountTarget) {
    amountTarget.textContent = authorization.quoteAmountFormatted || publicI18n.authorizationNoAmount;
  }

  if (stateTarget) {
    stateTarget.textContent = authorization.approved ? publicI18n.authorizationApproved : publicI18n.authorizationReady;
  }

  if (form) {
    form.hidden = Boolean(authorization.approved);
  }

  if (submitButton) {
    submitButton.disabled = Boolean(authorization.approved);
  }
};

const workroomCopy = isEnglishDocument
  ? {
    guided: {
      title: "Guided repair workroom",
      note: "Use this path when the lab can safely guide actions before deeper handling.",
      prepare: ["Keep the device powered as-is unless the lab asks otherwise.", "Prepare screenshots, error messages, account notices or file names.", "Write down what changed just before the issue appeared."],
      avoid: ["Do not install random recovery utilities.", "Do not reset, reinstall or overwrite the affected data.", "Do not send passwords through chat or email."],
      transfer: "Send the symptoms and screenshots first. If remote assistance is useful, NEXURADATA will confirm a supervised session with your consent."
    },
    media: {
      title: "Media intervention workroom",
      note: "Use this path for drives, SSDs, USB keys and memory cards.",
      prepare: ["Stop using the media immediately.", "Label the device with the case number.", "Prepare the cable, enclosure or adapter if it is part of the issue."],
      avoid: ["Do not run repair, format or disk-check tools.", "Do not open the device casing.", "Do not keep reconnecting media that clicks, disconnects or overheats."],
      transfer: "Send a short note with the device model and symptoms. The lab will confirm drop-off, shipping or remote preparation instructions."
    },
    raid: {
      title: "Business continuity workroom",
      note: "Use this path for RAID, NAS, server and operations-blocking incidents.",
      prepare: ["List the number of disks and any disk labels or slot positions.", "Export screenshots of the storage dashboard if accessible.", "Identify the last known healthy state and any rebuild attempt."],
      avoid: ["Do not rebuild, initialize or replace disks blindly.", "Do not force-mount affected volumes in write mode.", "Do not change disk order."],
      transfer: "Send architecture details and business impact. NEXURADATA will confirm whether the next step is remote review, image capture or lab handling."
    },
    forensic: {
      title: "Evidence and incident workroom",
      note: "Use this path when traceability, dispute, insurer, HR or legal context matters.",
      prepare: ["Preserve the original device or account state.", "Write a timeline of events and involved parties.", "Collect reference numbers, insurer notes or mandate context."],
      avoid: ["Do not modify, clean or reorganize evidence.", "Do not share sensitive material through informal channels.", "Do not let multiple people handle the same device without tracking."],
      transfer: "Send only the context first. NEXURADATA will confirm the controlled transfer method and the evidence-handling boundary."
    },
    mobile: {
      title: "Mobile case workroom",
      note: "Use this path for phones, tablets and app/account recovery contexts.",
      prepare: ["Keep the device charged and available.", "Note the model, passcode availability and cloud/account status.", "Prepare screenshots of error messages if the device still opens."],
      avoid: ["Do not factory reset the device.", "Do not keep guessing passcodes.", "Do not update or erase the phone before the lab confirms the path."],
      transfer: "Send the device model and access situation. The lab will confirm if guidance, remote support or physical handling is appropriate."
    }
  }
  : {
    guided: {
      title: "Espace de correction guidée",
      note: "Utilisez ce parcours lorsque le laboratoire peut guider des actions sécuritaires avant une prise en charge plus lourde.",
      prepare: ["Gardez l'appareil dans son état actuel sauf consigne contraire.", "Préparez captures, messages d'erreur, avis de compte ou noms de fichiers.", "Notez ce qui a changé juste avant l'apparition du problème."],
      avoid: ["N'installez pas d'utilitaires de récupération au hasard.", "Ne réinitialisez pas, ne réinstallez pas et n'écrasez pas les données touchées.", "N'envoyez pas de mots de passe par clavardage ou courriel."],
      transfer: "Envoyez d'abord les symptômes et captures. Si une assistance à distance est utile, NEXURADATA confirme une session supervisée avec votre consentement."
    },
    media: {
      title: "Espace d'intervention support",
      note: "Utilisez ce parcours pour disques, SSD, clés USB et cartes mémoire.",
      prepare: ["Cessez immédiatement d'utiliser le support.", "Identifiez le support avec le numéro de dossier.", "Préparez le câble, boîtier ou adaptateur si cela fait partie du problème."],
      avoid: ["Ne lancez pas d'outil de réparation, formatage ou vérification disque.", "N'ouvrez pas le boîtier du support.", "Ne rebranchez pas en boucle un média qui clique, décroche ou chauffe."],
      transfer: "Envoyez une note courte avec le modèle et les symptômes. Le laboratoire confirme dépôt, expédition ou préparation à distance."
    },
    raid: {
      title: "Espace continuité d'activité",
      note: "Utilisez ce parcours pour RAID, NAS, serveurs et incidents qui bloquent les opérations.",
      prepare: ["Listez le nombre de disques et les positions ou étiquettes visibles.", "Exportez des captures de la console de stockage si elle est accessible.", "Indiquez le dernier état sain connu et toute tentative de reconstruction."],
      avoid: ["Ne reconstruisez pas, n'initialisez pas et ne remplacez pas des disques à l'aveugle.", "Ne forcez pas le montage en écriture.", "Ne changez pas l'ordre des disques."],
      transfer: "Envoyez l'architecture et l'impact d'affaires. NEXURADATA confirme si la suite passe par revue distante, image disque ou laboratoire."
    },
    forensic: {
      title: "Espace preuve et incident",
      note: "Utilisez ce parcours lorsque la traçabilité, un litige, un assureur, RH ou un contexte juridique compte.",
      prepare: ["Préservez l'appareil ou le compte dans son état original.", "Rédigez une chronologie des événements et parties impliquées.", "Rassemblez numéros de référence, notes d'assureur ou contexte de mandat."],
      avoid: ["Ne modifiez pas, ne nettoyez pas et ne réorganisez pas la preuve.", "Ne partagez pas de matériel sensible par des canaux informels.", "Ne laissez pas plusieurs personnes manipuler le même support sans suivi."],
      transfer: "Envoyez d'abord le contexte. NEXURADATA confirme la méthode de transmission contrôlée et la limite de traitement probatoire."
    },
    mobile: {
      title: "Espace dossier mobile",
      note: "Utilisez ce parcours pour téléphones, tablettes et récupération liée aux apps ou comptes.",
      prepare: ["Gardez l'appareil chargé et disponible.", "Notez le modèle, l'accès au code et l'état des comptes infonuagiques.", "Préparez les captures d'erreur si l'appareil s'ouvre encore."],
      avoid: ["Ne réinitialisez pas l'appareil.", "Ne multipliez pas les essais de code.", "Ne mettez pas à jour et n'effacez pas le téléphone avant validation."],
      transfer: "Envoyez le modèle et la situation d'accès. Le laboratoire confirme si la suite passe par guidage, assistance distante ou manipulation physique."
    }
  };

const getWorkroomType = (support = "") => {
  const normalized = `${support}`.toLowerCase();

  if (normalized.includes("raid") || normalized.includes("nas") || normalized.includes("serveur") || normalized.includes("server")) {
    return "raid";
  }

  if (normalized.includes("forensique") || normalized.includes("preuve") || normalized.includes("juridique") || normalized.includes("forensic") || normalized.includes("evidence") || normalized.includes("legal")) {
    return "forensic";
  }

  if (normalized.includes("téléphone") || normalized.includes("telephone") || normalized.includes("mobile") || normalized.includes("phone")) {
    return "mobile";
  }

  if (normalized.includes("disque") || normalized.includes("drive") || normalized.includes("ssd") || normalized.includes("usb") || normalized.includes("carte") || normalized.includes("memory")) {
    return "media";
  }

  return "guided";
};

const hasWorkroomAccess = (record) => {
  const authorization = record.authorization || {};
  const payments = Array.isArray(record.payments) ? record.payments : [];
  return Boolean(authorization.approved) || payments.some((payment) => payment.status === "paid");
};

const renderListItems = (target, items) => {
  if (!target) return;
  target.replaceChildren(...items.map((text) => {
    const item = document.createElement("li");
    item.textContent = text;
    return item;
  }));
};

const renderWorkroom = (record, statusPanel) => {
  const section = statusPanel?.querySelector("[data-workroom-section]");

  if (!section) return;

  const type = getWorkroomType(record.support);
  const copy = workroomCopy[type] || workroomCopy.guided;
  const unlocked = hasWorkroomAccess(record);
  const titleTarget = section.querySelector("[data-workroom-title]");
  const noteTarget = section.querySelector("[data-workroom-note]");
  const statusTarget = section.querySelector("[data-workroom-status]");
  const prepareTarget = section.querySelector("[data-workroom-prepare]");
  const avoidTarget = section.querySelector("[data-workroom-avoid]");
  const transferTarget = section.querySelector("[data-workroom-transfer]");
  const mailLink = section.querySelector("[data-workroom-mail]");

  section.hidden = false;
  section.classList.toggle("is-locked", !unlocked);

  if (titleTarget) titleTarget.textContent = copy.title;
  if (noteTarget) noteTarget.textContent = copy.note;
  if (statusTarget) {
    statusTarget.textContent = unlocked ? publicI18n.workroomOpen : publicI18n.workroomAwaiting;
  }

  renderListItems(prepareTarget, copy.prepare);
  renderListItems(avoidTarget, unlocked ? copy.avoid : [publicI18n.workroomLocked, ...copy.avoid]);

  if (transferTarget) transferTarget.textContent = copy.transfer;

  if (mailLink) {
    const subject = publicI18n.workroomMailSubject(record.caseId || "");
    const body = [
      record.caseId ? `Case / dossier: ${record.caseId}` : "",
      record.support ? `Support: ${record.support}` : "",
      "",
      isEnglishDocument
        ? "I am ready for the next guided action. Please confirm the safest path, including remote assistance if appropriate."
        : "Je suis prêt pour la prochaine action guidée. Merci de confirmer le parcours le plus sûr, incluant l'assistance distante si appropriée."
    ].filter(Boolean).join("\n");
    mailLink.href = `mailto:contact@nexuradata.ca?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    mailLink.textContent = isEnglishDocument
      ? (unlocked ? "Request guided or remote assistance" : "Ask what is needed next")
      : (unlocked ? "Demander guidage ou assistance distante" : "Demander la suite requise");
  }
};

const renderStatusRecord = (record, statusPanel) => {
  if (!statusPanel) {
    return;
  }

  statusPanel.hidden = false;
  const caseTarget = statusPanel.querySelector("[data-status-case]");
  const badgeTarget = statusPanel.querySelector("[data-status-badge]");
  const updatedTarget = statusPanel.querySelector("[data-status-updated]");
  const supportTarget = statusPanel.querySelector("[data-status-support]");
  const nextTarget = statusPanel.querySelector("[data-status-next]");
  const summaryTarget = statusPanel.querySelector("[data-status-summary]");
  const timelineTarget = statusPanel.querySelector("[data-status-timeline]");
  const paymentsSection = statusPanel.querySelector("[data-status-payments-section]");
  const paymentsTarget = statusPanel.querySelector("[data-status-payments]");

  if (caseTarget) caseTarget.textContent = record.caseId;
  if (badgeTarget) badgeTarget.textContent = record.status;
  if (updatedTarget) updatedTarget.textContent = formatTimestamp(record.updatedAt);
  if (supportTarget) supportTarget.textContent = record.support;
  if (nextTarget) nextTarget.textContent = record.nextStep;
  if (summaryTarget) summaryTarget.textContent = record.summary;

  renderAuthorizationState(record, statusPanel);
  renderWorkroom(record, statusPanel);

  if (paymentsSection && paymentsTarget) {
    const payments = Array.isArray(record.payments) ? record.payments : [];

    paymentsSection.hidden = payments.length === 0;

    if (payments.length > 0) {
      paymentsTarget.replaceChildren(...payments.map(createStatusPayment));
      document.dispatchEvent(new CustomEvent("nexuradata:payments-rendered"));
    } else {
      paymentsTarget.replaceChildren();
      document.dispatchEvent(new CustomEvent("nexuradata:payments-rendered"));
    }
  }

  if (timelineTarget) {
    timelineTarget.replaceChildren(...(record.steps || []).map(createStatusStep));
  }
};

const intakeForm = document.querySelector("[data-intake-form]");

// ── Intake form ──────────────────────────────────────────────

if (intakeForm) {
  const statusTarget = intakeForm.querySelector("[data-form-status]");
  const submitButton = intakeForm.querySelector('button[type="submit"]');
  const endpoint = intakeForm.getAttribute("data-intake-endpoint") || "/api/intake";
  const intakeParams = new URLSearchParams(window.location.search);

  ["support", "urgence", "profil", "impact", "sensibilite", "message"].forEach((name) => {
    const field = intakeForm.elements[name];
    const value = intakeParams.get(name);

    if (field && value) {
      field.value = value;
    }
  });

  intakeForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!intakeForm.checkValidity()) {
      intakeForm.reportValidity();
      setMessage(statusTarget, "error", publicI18n.intakeRequired);
      return;
    }

    const formData = new FormData(intakeForm);
    const payload = {
      nom: `${formData.get("nom") || ""}`.trim(),
      courriel: `${formData.get("courriel") || ""}`.trim(),
      telephone: `${formData.get("telephone") || ""}`.trim(),
      support: `${formData.get("support") || ""}`.trim(),
      urgence: `${formData.get("urgence") || ""}`.trim(),
      profil: `${formData.get("profil") || ""}`.trim(),
      impact: `${formData.get("impact") || ""}`.trim(),
      sensibilite: `${formData.get("sensibilite") || ""}`.trim(),
      message: `${formData.get("message") || ""}`.trim(),
      consentement: formData.get("consentement") === "on",
      website: `${formData.get("website") || ""}`.trim(),
      "cf-turnstile-response": formData.get("cf-turnstile-response") || "",
      sourcePath: window.location.pathname
    };

    setButtonBusy(submitButton, true, publicI18n.intakeBusy);

    setMessage(statusTarget, "success", publicI18n.intakeOpening);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = await parseJsonResponse(response);

      if (response.ok && data?.ok) {
        intakeForm.reset();
        trackIntakeFormSubmit(data?.delivery?.client || "queued");
        setMessage(
          statusTarget,
          "success",
          data?.delivery?.client === "sent"
            ? publicI18n.intakeOpenedSent(data.caseId)
            : publicI18n.intakeOpenedQueued(data.caseId)
        );
        return;
      }

      if (data?.fallback === "mailto" || response.status >= 500) {
        window.location.href = buildIntakeMailto(formData);
        setMessage(
          statusTarget,
          "success",
          publicI18n.intakeFallback
        );
        return;
      }

      setMessage(statusTarget, "error", data?.message || publicI18n.intakeError);
    } catch {
      window.location.href = buildIntakeMailto(formData);
      setMessage(
        statusTarget,
        "success",
        publicI18n.intakeOffline
      );
    } finally {
      setButtonBusy(submitButton, false);
    }
  });
}

const statusForm = document.querySelector("[data-status-form]");

// ── Client status portal, authorization and workroom ─────────

if (statusForm) {
  const messageTarget = statusForm.querySelector("[data-status-form-message]");
  const statusPanel = document.querySelector("[data-status-panel]");
  const authorizationForm = document.querySelector("[data-authorization-form]");
  const authorizationMessage = authorizationForm?.querySelector("[data-authorization-message]");
  const authorizationEndpoint = authorizationForm?.getAttribute("data-authorization-endpoint") || "/api/authorization";
  const authorizationSubmitButton = authorizationForm?.querySelector('button[type="submit"]');
  const endpoint = statusForm.getAttribute("data-status-endpoint") || "/api/status";
  const submitButton = statusForm.querySelector('button[type="submit"]');
  const isLocalPreview = window.location.protocol === "file:" || ["localhost", "127.0.0.1"].includes(window.location.hostname);
  let currentStatusRecord = null;

  const demoCases = {
    "NX-2026-0412|MONTREAL24": {
      caseId: "NX-2026-0412",
      ...publicI18n.demoCaseOne
    },
    "NX-2026-0419|RAIDSECURE": {
      caseId: "NX-2026-0419",
      ...publicI18n.demoCaseTwo
    }
  };

  const caseIdField = statusForm.querySelector('[name="dossier"]');
  const accessCodeField = statusForm.querySelector('[name="code"]');
  const params = new URLSearchParams(window.location.search);
  const presetCaseId = `${params.get("caseId") || ""}`.trim().toUpperCase();

  if (caseIdField && presetCaseId) {
    caseIdField.value = presetCaseId;
  }

  if (accessCodeField && presetCaseId && !accessCodeField.value) {
    accessCodeField.focus();
  }

  if (authorizationForm) {
    authorizationForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!authorizationForm.checkValidity() || !currentStatusCredentials) {
        authorizationForm.reportValidity();
        setMessage(authorizationMessage, "error", publicI18n.authorizationRequired);
        return;
      }

      const formData = new FormData(authorizationForm);
      const signerName = `${formData.get("signerName") || ""}`.trim();
      const consent = formData.get("consent") === "on";

      if (isLocalPreview && currentStatusRecord) {
        const timestamp = new Date().toISOString();
        const updatedRecord = {
          ...currentStatusRecord,
          status: isEnglishDocument ? "Intervention authorized" : "Intervention autorisée",
          updatedAt: timestamp,
          nextStep: isEnglishDocument
            ? "NEXURADATA prepares the confirmed instructions and treatment sequence."
            : "NEXURADATA prépare les consignes et la séquence de traitement confirmées.",
          summary: isEnglishDocument
            ? "Authorization has been received. The lab can continue according to the transmitted scope."
            : "Votre autorisation a été reçue. Le laboratoire peut poursuivre selon le cadre transmis.",
          authorization: {
            ...(currentStatusRecord.authorization || {}),
            available: true,
            approved: true,
            quoteStatus: "approved",
            quoteApprovedAt: timestamp
          },
          steps: [
            ...(currentStatusRecord.steps || []).map((step) => ({ ...step, state: step.state === "active" ? "complete" : step.state })),
            {
              title: isEnglishDocument ? "Authorization received" : "Autorisation reçue",
              note: isEnglishDocument ? `Confirmed by ${signerName}.` : `Confirmée par ${signerName}.`,
              state: "active"
            }
          ]
        };

        currentStatusRecord = updatedRecord;
        renderStatusRecord(updatedRecord, statusPanel);
        authorizationForm.reset();
        setMessage(authorizationMessage, "success", publicI18n.authorizationSuccess);
        return;
      }

      setButtonBusy(authorizationSubmitButton, true, publicI18n.authorizationBusy);
      setMessage(authorizationMessage, "success", publicI18n.authorizationSending);

      try {
        const response = await fetch(authorizationEndpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json"
          },
          body: JSON.stringify({
            caseId: currentStatusCredentials.caseId,
            accessCode: currentStatusCredentials.accessCode,
            signerName,
            consent
          })
        });
        const data = await parseJsonResponse(response);

        if (response.ok && data?.ok) {
          currentStatusRecord = data;
          renderStatusRecord(data, statusPanel);
          authorizationForm.reset();
          setMessage(authorizationMessage, "success", publicI18n.authorizationSuccess);
          return;
        }

        setMessage(authorizationMessage, "error", data?.message || publicI18n.authorizationError);
      } catch {
        setMessage(authorizationMessage, "error", publicI18n.authorizationOffline);
      } finally {
        setButtonBusy(authorizationSubmitButton, false);
      }
    });
  }

  statusForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!statusForm.checkValidity()) {
      statusForm.reportValidity();
      setMessage(messageTarget, "error", publicI18n.statusRequired);
      return;
    }

    const formData = new FormData(statusForm);
    const dossier = `${formData.get("dossier") || ""}`.trim().toUpperCase();
    const code = `${formData.get("code") || ""}`.trim().toUpperCase();
    const key = `${dossier}|${code}`;

    if (isLocalPreview) {
      const record = demoCases[key];

      if (!record) {
        if (statusPanel) {
          statusPanel.hidden = true;
        }

        currentStatusCredentials = null;
        currentStatusRecord = null;

        setMessage(
          messageTarget,
          "error",
          publicI18n.statusNotFound
        );
        return;
      }

      currentStatusCredentials = { caseId: dossier, accessCode: code };
      currentStatusRecord = record;
      renderStatusRecord(record, statusPanel);
      setMessage(messageTarget, "success", publicI18n.statusFound);
      return;
    }

    setButtonBusy(submitButton, true, publicI18n.statusBusy);
    setMessage(messageTarget, "success", publicI18n.statusSearching);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json"
        },
        body: JSON.stringify({
          caseId: dossier,
          accessCode: code
        })
      });
      const data = await parseJsonResponse(response);

      if (response.ok && data?.ok) {
        currentStatusCredentials = { caseId: dossier, accessCode: code };
        currentStatusRecord = data;
        renderStatusRecord(data, statusPanel);
        setMessage(messageTarget, "success", publicI18n.statusFound);
        return;
      }

      if (statusPanel) {
        statusPanel.hidden = true;
      }

      currentStatusCredentials = null;
      currentStatusRecord = null;

      setMessage(
        messageTarget,
        "error",
        data?.message || publicI18n.statusNotFound
      );
    } catch {
      if (statusPanel) {
        statusPanel.hidden = true;
      }

      currentStatusCredentials = null;
      currentStatusRecord = null;

      setMessage(messageTarget, "error", publicI18n.statusOffline);
    } finally {
      setButtonBusy(submitButton, false);
    }
  });
}

const operationsRoot = document.querySelector("[data-ops-app]");

// ── Operations console ───────────────────────────────────────

if (operationsRoot) {
  const searchForm = document.querySelector("[data-ops-search-form]");
  const searchStatus = document.querySelector("[data-ops-search-status]");
  const resultsTarget = document.querySelector("[data-ops-results]");
  const casePanel = document.querySelector("[data-ops-case-panel]");
  const caseForm = document.querySelector("[data-ops-case-form]");
  const caseStatus = document.querySelector("[data-ops-case-status]");
  const searchEndpoint = operationsRoot.getAttribute("data-ops-endpoint") || "/api/ops/cases";
  const detailTitle = operationsRoot.querySelector("[data-ops-case-title]");
  const metaCreated = operationsRoot.querySelector("[data-ops-meta-created]");
  const metaUpdated = operationsRoot.querySelector("[data-ops-meta-updated]");
  const metaClient = operationsRoot.querySelector("[data-ops-meta-client]");
  const metaEmail = operationsRoot.querySelector("[data-ops-meta-email]");
  const metaSupport = operationsRoot.querySelector("[data-ops-meta-support]");
  const metaUrgency = operationsRoot.querySelector("[data-ops-meta-urgency]");
  const metaSource = operationsRoot.querySelector("[data-ops-meta-source]");
  const metaAccessSent = operationsRoot.querySelector("[data-ops-meta-access-sent]");
  const metaStatusSent = operationsRoot.querySelector("[data-ops-meta-status-sent]");
  const messageTarget = operationsRoot.querySelector("[data-ops-message]");
  const stepsTarget = operationsRoot.querySelector("[data-ops-steps]");
  const historyTarget = operationsRoot.querySelector("[data-ops-history]");
  const accessResult = operationsRoot.querySelector("[data-ops-access-result]");
  const paymentForm = operationsRoot.querySelector("[data-ops-payment-form]");
  const paymentStatus = operationsRoot.querySelector("[data-ops-payment-status]");
  const paymentsTarget = operationsRoot.querySelector("[data-ops-payments]");
  const addStepButton = operationsRoot.querySelector("[data-ops-add-step]");
  const sendUpdateButton = operationsRoot.querySelector("[data-ops-send-update]");
  const sendAccessButton = operationsRoot.querySelector("[data-ops-send-access]");
  const regenerateButton = operationsRoot.querySelector("[data-ops-regenerate-access]");
  const currentCaseIdInput = operationsRoot.querySelector("[data-ops-current-case-id]");
  const searchSubmitButton = searchForm?.querySelector('button[type="submit"]');
  const caseSubmitButton = caseForm?.querySelector('button[type="submit"]');
  const paymentSubmitButton = paymentForm?.querySelector('button[type="submit"]');
  const metaAcquisition = operationsRoot.querySelector("[data-ops-meta-acquisition]");
  const quoteStatusDisplay = operationsRoot.querySelector("[data-ops-quote-status]");
  const quoteAmountDisplay = operationsRoot.querySelector("[data-ops-quote-amount]");
  const quotePreapprovalDisplay = operationsRoot.querySelector("[data-ops-quote-preapproval]");
  const quoteSentAtDisplay = operationsRoot.querySelector("[data-ops-quote-sent-at]");
  const quoteApprovedAtDisplay = operationsRoot.querySelector("[data-ops-quote-approved-at]");
  const quoteResult = operationsRoot.querySelector("[data-ops-quote-result]");
  const quoteSendButton = operationsRoot.querySelector("[data-ops-quote-send]");
  const quoteApproveButton = operationsRoot.querySelector("[data-ops-quote-approve]");
  const quoteExpireButton = operationsRoot.querySelector("[data-ops-quote-expire]");
  const quoteDeclineButton = operationsRoot.querySelector("[data-ops-quote-decline]");
  const reminderTypeSelect = operationsRoot.querySelector("[data-ops-reminder-type]");
  const reminderMessageInput = operationsRoot.querySelector("[data-ops-reminder-message]");
  const logReminderButton = operationsRoot.querySelector("[data-ops-log-reminder]");
  const reminderResult = operationsRoot.querySelector("[data-ops-reminder-result]");
  const conciergeSummary = operationsRoot.querySelector("[data-ops-concierge-summary]");
  const conciergeMessage = operationsRoot.querySelector("[data-ops-concierge-message]");
  const conciergeWhatsApp = operationsRoot.querySelector("[data-ops-concierge-whatsapp]");
  const conciergeCopyButton = operationsRoot.querySelector("[data-ops-concierge-copy]");
  const conciergeGenerateButton = operationsRoot.querySelector("[data-ops-concierge-generate]");
  const conciergeResult = operationsRoot.querySelector("[data-ops-concierge-result]");

  const createStepRow = (step = { title: "", note: "", state: "pending" }) => {
    const wrapper = document.createElement("div");
    wrapper.className = "ops-step-row";
    wrapper.dataset.opsStepRow = "true";
    const titleField = document.createElement("label");
    titleField.className = "field";

    const titleLabel = document.createElement("span");
    titleLabel.textContent = "Titre";

    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.required = true;
    titleInput.dataset.opsStepTitle = "true";
    titleInput.value = step.title || "";

    titleField.append(titleLabel, titleInput);

    const stateField = document.createElement("label");
    stateField.className = "field";

    const stateLabel = document.createElement("span");
    stateLabel.textContent = "État";

    const stateSelect = document.createElement("select");
    stateSelect.dataset.opsStepState = "true";

    [
      ["pending", "En attente"],
      ["active", "Actif"],
      ["complete", "Complété"]
    ].forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      stateSelect.append(option);
    });

    stateSelect.value = step.state || "pending";
    stateField.append(stateLabel, stateSelect);

    const noteField = document.createElement("label");
    noteField.className = "field field-full";

    const noteLabel = document.createElement("span");
    noteLabel.textContent = "Note";

    const noteInput = document.createElement("textarea");
    noteInput.rows = 3;
    noteInput.required = true;
    noteInput.dataset.opsStepNote = "true";
    noteInput.value = step.note || "";

    noteField.append(noteLabel, noteInput);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "button button-secondary button-small";
    removeButton.dataset.opsRemoveStep = "true";
    removeButton.textContent = "Retirer l'étape";
    removeButton.addEventListener("click", () => {
      wrapper.remove();
    });

    wrapper.append(titleField, stateField, noteField, removeButton);

    return wrapper;
  };

  const collectSteps = () =>
    Array.from(stepsTarget?.querySelectorAll("[data-ops-step-row]") || []).map((row) => ({
      title: row.querySelector("[data-ops-step-title]")?.value.trim() || "",
      state: row.querySelector("[data-ops-step-state]")?.value || "pending",
      note: row.querySelector("[data-ops-step-note]")?.value.trim() || ""
    }));

  const quoteStatusLabels = {
    none: "Aucune",
    draft: "Brouillon",
    sent: "Envoyée",
    approved: "Approuvée",
    expired: "Expirée",
    declined: "Refusée"
  };

  const renderHistory = (history) => {
    if (!historyTarget) {
      return;
    }

    if (!history || history.length === 0) {
      historyTarget.innerHTML = "<p class=\"form-note\">Aucun événement enregistré pour ce dossier.</p>";
      return;
    }

    historyTarget.replaceChildren(
      ...history.map((entry) => {
        const article = document.createElement("article");
        article.className = "ops-history-entry";

        const title = document.createElement("p");
        title.className = "ops-history-title";
        title.textContent = entry.title;

        const meta = document.createElement("p");
        meta.className = "ops-history-meta";
        meta.textContent = `${formatTimestamp(entry.createdAt)} · ${entry.createdBy} · ${entry.kind}`;

        const note = document.createElement("p");
        note.className = "ops-history-note";
        note.textContent = entry.note;

        article.append(title, meta, note);
        return article;
      })
    );
  };

  const renderPayments = (payments) => {
    if (!paymentsTarget) {
      return;
    }

    if (!payments || payments.length === 0) {
      paymentsTarget.innerHTML = "<p class=\"form-note\">Aucune demande de paiement pour ce dossier.</p>";
      return;
    }

    paymentsTarget.replaceChildren(
      ...payments.map((payment) => {
        const article = document.createElement("article");
        article.className = "ops-payment-entry";

        const head = document.createElement("div");
        head.className = "ops-payment-head";

        const title = document.createElement("p");
        title.className = "ops-payment-title";
        title.textContent = payment.label;

        const badge = document.createElement("span");
        badge.className = `ops-payment-badge is-${payment.status || "open"}`;
        badge.textContent =
          payment.status === "paid"
            ? "Payé"
            : payment.status === "expired"
              ? "Expiré"
              : payment.status === "failed"
                ? "Échec"
                : "Ouvert";

        head.append(title, badge);

        const meta = document.createElement("p");
        meta.className = "ops-payment-meta";
        meta.textContent = `${payment.amountFormatted || formatCurrency(payment.amountCents, payment.currency)} · ${payment.paymentKind} · créé ${formatTimestamp(payment.createdAt)}`;

        const note = document.createElement("p");
        note.className = "ops-payment-note";
        note.textContent = payment.description;

        const actions = document.createElement("div");
        actions.className = "ops-payment-actions";

        if (payment.checkoutUrl) {
          const link = document.createElement("a");
          link.className = "button button-secondary button-small";
          link.href = payment.checkoutUrl;
          link.target = "_blank";
          link.rel = "noreferrer";
          link.textContent = "Ouvrir le lien Stripe";
          actions.append(link);
        }

        const details = document.createElement("p");
        details.className = "ops-payment-meta";
        details.textContent =
          payment.paidAt
            ? `Confirmé ${formatTimestamp(payment.paidAt)}`
            : payment.sentAt
              ? `Lien envoyé ${formatTimestamp(payment.sentAt)}`
              : `Lien non envoyé automatiquement`;

        article.append(head, meta, note, actions, details);
        return article;
      })
    );
  };

  const renderConcierge = (concierge) => {
    if (conciergeSummary) {
      conciergeSummary.textContent = concierge
        ? `${concierge.priorityLabel || "Suivi"} · ${concierge.recommendedPath || "Parcours à confirmer"} · ${concierge.channel === "whatsapp" ? "WhatsApp prêt" : "Courriel ou téléphone"}`
        : "Aucun message concierge disponible.";
    }

    if (conciergeMessage) {
      conciergeMessage.value = concierge?.clientMessage || "";
    }

    if (conciergeWhatsApp) {
      const whatsappUrl = concierge?.whatsappUrl || "";
      conciergeWhatsApp.href = whatsappUrl || "#";
      conciergeWhatsApp.hidden = !whatsappUrl;
    }
  };

  const fillCaseDetail = (record) => {
    if (casePanel) {
      casePanel.hidden = false;
    }

    if (detailTitle) detailTitle.textContent = record.caseId;
    if (metaCreated) metaCreated.textContent = formatTimestamp(record.createdAt);
    if (metaUpdated) metaUpdated.textContent = formatTimestamp(record.updatedAt);
    if (metaClient) metaClient.textContent = record.name;
    if (metaEmail) metaEmail.textContent = record.email;
    if (metaSupport) metaSupport.textContent = record.support;
    if (metaUrgency) metaUrgency.textContent = record.urgency;
    if (metaSource) metaSource.textContent = record.sourcePath || "/";
    if (metaAcquisition) metaAcquisition.textContent = record.acquisitionSource || "—";
    if (metaAccessSent) metaAccessSent.textContent = record.accessCodeLastSentAt ? formatTimestamp(record.accessCodeLastSentAt) : "Pas encore";
    if (metaStatusSent) metaStatusSent.textContent = record.statusEmailLastSentAt ? formatTimestamp(record.statusEmailLastSentAt) : "Pas encore";
    if (messageTarget) messageTarget.textContent = record.message;
    if (currentCaseIdInput) currentCaseIdInput.value = record.caseId;
    renderConcierge(record.concierge);

    if (caseForm) {
      const statusInput = caseForm.querySelector('[name="status"]');
      const nextStepInput = caseForm.querySelector('[name="nextStep"]');
      const summaryInput = caseForm.querySelector('[name="clientSummary"]');
      const notifyInput = caseForm.querySelector('[name="notifyClient"]');
      const qualInput = caseForm.querySelector('[name="qualificationSummary"]');
      const notesInput = caseForm.querySelector('[name="internalNotes"]');
      const flagsInput = caseForm.querySelector('[name="handlingFlags"]');
      const acqInput = caseForm.querySelector('[name="acquisitionSource"]');
      const quoteAmtInput = caseForm.querySelector('[name="quoteAmount"]');
      const preapprovalInput = caseForm.querySelector('[name="preapprovalConfirmed"]');

      if (statusInput) statusInput.value = record.status;
      if (nextStepInput) nextStepInput.value = record.nextStep;
      if (summaryInput) summaryInput.value = record.clientSummary;
      if (notifyInput) notifyInput.checked = false;
      if (qualInput) qualInput.value = record.qualificationSummary || "";
      if (notesInput) notesInput.value = record.internalNotes || "";
      if (flagsInput) flagsInput.value = record.handlingFlags || "";
      if (acqInput) acqInput.value = record.acquisitionSource || "";
      if (quoteAmtInput) quoteAmtInput.value = record.quoteAmountCents ? (record.quoteAmountCents / 100).toFixed(2) : "";
      if (preapprovalInput) preapprovalInput.checked = Boolean(record.preapprovalConfirmed);
    }

    if (quoteStatusDisplay) quoteStatusDisplay.textContent = quoteStatusLabels[record.quoteStatus] || record.quoteStatus || "Aucune";
    if (quoteAmountDisplay) quoteAmountDisplay.textContent = record.quoteAmountCents ? formatCurrency(record.quoteAmountCents, "cad") : "—";
    if (quotePreapprovalDisplay) quotePreapprovalDisplay.textContent = record.preapprovalConfirmed ? "Oui" : "Non";
    if (quoteSentAtDisplay) quoteSentAtDisplay.textContent = record.quoteSentAt ? formatTimestamp(record.quoteSentAt) : "—";
    if (quoteApprovedAtDisplay) quoteApprovedAtDisplay.textContent = record.quoteApprovedAt ? formatTimestamp(record.quoteApprovedAt) : "—";

    if (stepsTarget) {
      stepsTarget.replaceChildren(...(record.steps || []).map(createStepRow));
    }

    renderPayments(record.payments || []);

    if (accessResult) {
      accessResult.textContent = "";
      accessResult.dataset.state = "";
    }

    if (paymentStatus) {
      paymentStatus.textContent = "";
      paymentStatus.dataset.state = "";
    }

    if (quoteResult) {
      quoteResult.textContent = "";
      quoteResult.dataset.state = "";
    }

    if (reminderResult) {
      reminderResult.textContent = "";
      reminderResult.dataset.state = "";
    }

    if (conciergeResult) {
      conciergeResult.textContent = "";
      conciergeResult.dataset.state = "";
    }

    renderHistory(record.history || []);
    setMessage(caseStatus, "success", "Dossier chargé.");
  };

  const loadCaseDetail = async (caseId) => {
    setMessage(searchStatus, "success", "Chargement du dossier...");

    const response = await fetch(`${searchEndpoint}?caseId=${encodeURIComponent(caseId)}`, {
      headers: {
        accept: "application/json"
      }
    });
    const data = await parseJsonResponse(response);

    if (!response.ok || !data?.ok) {
      throw new Error(data?.message || "Impossible de charger ce dossier.");
    }

    fillCaseDetail(data.case);
    setMessage(searchStatus, "success", "Dossier chargé.");
  };

  const renderSearchResults = (items) => {
    if (!resultsTarget) {
      return;
    }

    if (!items || items.length === 0) {
      resultsTarget.innerHTML = "<p class=\"form-note\">Aucun dossier correspondant.</p>";
      return;
    }

    resultsTarget.replaceChildren(
      ...items.map((item) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "ops-result";

        const caseLabel = document.createElement("strong");
        caseLabel.textContent = item.case_id;

        const clientLabel = document.createElement("span");
        clientLabel.textContent = item.name;

        const supportLabel = document.createElement("span");
        supportLabel.textContent = `${item.support} · ${item.status}${item.quote_status && item.quote_status !== "none" ? ` · Soum: ${quoteStatusLabels[item.quote_status] || item.quote_status}` : ""}`;

        const nextLabel = document.createElement("span");
        nextLabel.className = "ops-result-next";
        nextLabel.textContent = item.next_step || "";

        const emailLabel = document.createElement("span");
        emailLabel.textContent = item.email;

        const updatedLabel = document.createElement("time");
        updatedLabel.dateTime = item.updated_at || "";
        updatedLabel.textContent = `Mis à jour ${formatTimestamp(item.updated_at)}`;

        button.append(caseLabel, clientLabel, supportLabel, nextLabel, emailLabel, updatedLabel);
        button.addEventListener("click", () => {
          loadCaseDetail(item.case_id).catch((error) => {
            setMessage(searchStatus, "error", error.message);
          });
        });
        return button;
      })
    );
  };

  if (searchForm) {
    searchForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const query = searchForm.querySelector('[name="query"]')?.value.trim() || "";
      const filterStatus = searchForm.querySelector('[name="filterStatus"]')?.value || "";
      const filterQuoteStatus = searchForm.querySelector('[name="filterQuoteStatus"]')?.value || "";
      const filterUrgency = searchForm.querySelector('[name="filterUrgency"]')?.value || "";
      setButtonBusy(searchSubmitButton, true, "Recherche...");
      setMessage(searchStatus, "success", "Recherche en cours...");

      try {
        const params = new URLSearchParams();
        if (query) params.set("query", query);
        if (filterStatus) params.set("status", filterStatus);
        if (filterQuoteStatus) params.set("quoteStatus", filterQuoteStatus);
        if (filterUrgency) params.set("urgency", filterUrgency);

        const response = await fetch(`${searchEndpoint}?${params.toString()}`, {
          headers: {
            accept: "application/json"
          }
        });
        const data = await parseJsonResponse(response);

        if (!response.ok || !data?.ok) {
          throw new Error(data?.message || "Recherche impossible.");
        }

        renderSearchResults(data.items || []);
        setMessage(searchStatus, "success", `${(data.items || []).length} dossier(s) chargé(s).`);
      } catch (error) {
        setMessage(searchStatus, "error", error instanceof Error ? error.message : "Recherche impossible.");
      } finally {
        setButtonBusy(searchSubmitButton, false);
      }
    });
  }

  if (addStepButton) {
    addStepButton.addEventListener("click", () => {
      if (stepsTarget) {
        stepsTarget.append(createStepRow());
      }
    });
  }

  if (caseForm) {
    caseForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const caseId = currentCaseIdInput?.value || "";

      if (!caseId) {
        setMessage(caseStatus, "error", "Chargez d'abord un dossier.");
        return;
      }

      setMessage(caseStatus, "success", "Enregistrement en cours...");
      setButtonBusy(caseSubmitButton, true, "Enregistrement...");

      try {
        const response = await fetch(searchEndpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json"
          },
          body: JSON.stringify({
            action: "update",
            caseId,
            status: caseForm.querySelector('[name="status"]')?.value.trim() || "",
            nextStep: caseForm.querySelector('[name="nextStep"]')?.value.trim() || "",
            clientSummary: caseForm.querySelector('[name="clientSummary"]')?.value.trim() || "",
            qualificationSummary: caseForm.querySelector('[name="qualificationSummary"]')?.value.trim() || "",
            internalNotes: caseForm.querySelector('[name="internalNotes"]')?.value.trim() || "",
            handlingFlags: caseForm.querySelector('[name="handlingFlags"]')?.value.trim() || "",
            acquisitionSource: caseForm.querySelector('[name="acquisitionSource"]')?.value.trim() || "",
            quoteAmount: caseForm.querySelector('[name="quoteAmount"]')?.value.trim() || "",
            preapprovalConfirmed: Boolean(caseForm.querySelector('[name="preapprovalConfirmed"]')?.checked),
            notifyClient: Boolean(caseForm.querySelector('[name="notifyClient"]')?.checked),
            steps: collectSteps()
          })
        });
        const data = await parseJsonResponse(response);

        if (!response.ok || !data?.ok) {
          throw new Error(data?.message || "La mise à jour a échoué.");
        }

        fillCaseDetail(data.case);
        setMessage(caseStatus, "success", data.delivery === "sent" ? "Dossier enregistré et client notifié." : "Dossier enregistré.");
      } catch (error) {
        setMessage(caseStatus, "error", error instanceof Error ? error.message : "La mise à jour a échoué.");
      } finally {
        setButtonBusy(caseSubmitButton, false);
      }
    });
  }

  if (sendUpdateButton) {
    sendUpdateButton.addEventListener("click", async () => {
      const caseId = currentCaseIdInput?.value || "";

      if (!caseId) {
        setMessage(caseStatus, "error", "Chargez d'abord un dossier.");
        return;
      }

      setMessage(caseStatus, "success", "Envoi de la mise à jour client...");
      setButtonBusy(sendUpdateButton, true, "Envoi...");

      try {
        const response = await fetch(searchEndpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json"
          },
          body: JSON.stringify({
            action: "send-update",
            caseId
          })
        });
        const data = await parseJsonResponse(response);

        if (!response.ok || !data?.ok) {
          throw new Error(data?.message || "L'envoi a échoué.");
        }

        fillCaseDetail(data.case);
        setMessage(caseStatus, "success", data.delivery === "sent" ? "Mise à jour envoyée au client." : `Envoi non effectué: ${data.delivery}`);
      } catch (error) {
        setMessage(caseStatus, "error", error instanceof Error ? error.message : "L'envoi a échoué.");
      } finally {
        setButtonBusy(sendUpdateButton, false);
      }
    });
  }

  if (sendAccessButton) {
    sendAccessButton.addEventListener("click", async () => {
      const caseId = currentCaseIdInput?.value || "";

      if (!caseId) {
        setMessage(caseStatus, "error", "Chargez d'abord un dossier.");
        return;
      }

      if (accessResult) {
        accessResult.textContent = "Renvoi du code en cours...";
        accessResult.dataset.state = "success";
      }
      setButtonBusy(sendAccessButton, true, "Renvoi...");

      try {
        const response = await fetch(searchEndpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json"
          },
          body: JSON.stringify({
            action: "send-access",
            caseId
          })
        });
        const data = await parseJsonResponse(response);

        if (!response.ok || !data?.ok) {
          throw new Error(data?.message || "Le renvoi du code a échoué.");
        }

        await loadCaseDetail(caseId);

        if (accessResult) {
          accessResult.textContent = data.delivery === "sent" ? "Code d'accès renvoyé au client." : `Envoi non effectué: ${data.delivery}`;
          accessResult.dataset.state = data.delivery === "sent" ? "success" : "error";
        }
      } catch (error) {
        if (accessResult) {
          accessResult.textContent = error instanceof Error ? error.message : "Le renvoi du code a échoué.";
          accessResult.dataset.state = "error";
        }
      } finally {
        setButtonBusy(sendAccessButton, false);
      }
    });
  }

  if (regenerateButton) {
    regenerateButton.addEventListener("click", async () => {
      const caseId = currentCaseIdInput?.value || "";

      if (!caseId) {
        setMessage(caseStatus, "error", "Chargez d'abord un dossier.");
        return;
      }

      if (accessResult) {
        accessResult.textContent = "Génération d'un nouveau code...";
        accessResult.dataset.state = "success";
      }
      setButtonBusy(regenerateButton, true, "Génération...");

      try {
        const response = await fetch(searchEndpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json"
          },
          body: JSON.stringify({
            action: "regenerate-access",
            caseId
          })
        });
        const data = await parseJsonResponse(response);

        if (!response.ok || !data?.ok) {
          throw new Error(data?.message || "La régénération du code a échoué.");
        }

        await loadCaseDetail(caseId);

        if (accessResult) {
          accessResult.textContent =
            data.delivery === "sent"
              ? `Nouveau code généré et envoyé: ${data.accessCode}`
              : `Nouveau code généré: ${data.accessCode}. Envoi non effectué (${data.delivery}).`;
          accessResult.dataset.state = data.delivery === "sent" ? "success" : "error";
        }
      } catch (error) {
        if (accessResult) {
          accessResult.textContent = error instanceof Error ? error.message : "La régénération du code a échoué.";
          accessResult.dataset.state = "error";
        }
      } finally {
        setButtonBusy(regenerateButton, false);
      }
    });
  }

  const quoteActionHandler = (button, action, label) => {
    if (!button) return;
    button.addEventListener("click", async () => {
      const caseId = currentCaseIdInput?.value || "";
      if (!caseId) {
        setMessage(quoteResult, "error", "Chargez d'abord un dossier.");
        return;
      }

      setMessage(quoteResult, "success", `${label}...`);
      setButtonBusy(button, true, label + "...");

      try {
        const body = { action, caseId };
        if (action === "quote-send") {
          const amt = caseForm?.querySelector('[name="quoteAmount"]')?.value.trim() || "";
          if (amt) body.quoteAmount = amt;
        }

        const response = await fetch(searchEndpoint, {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify(body)
        });
        const data = await parseJsonResponse(response);

        if (!response.ok || !data?.ok) {
          throw new Error(data?.message || "L'action a échoué.");
        }

        fillCaseDetail(data.case);
        setMessage(quoteResult, "success", `${label} effectuée.`);
      } catch (error) {
        setMessage(quoteResult, "error", error instanceof Error ? error.message : "L'action a échoué.");
      } finally {
        setButtonBusy(button, false);
      }
    });
  };

  quoteActionHandler(quoteSendButton, "quote-send", "Envoi de la soumission");
  quoteActionHandler(quoteApproveButton, "quote-approve", "Approbation");
  quoteActionHandler(quoteExpireButton, "quote-expire", "Expiration");
  quoteActionHandler(quoteDeclineButton, "quote-decline", "Refus");

  if (logReminderButton) {
    logReminderButton.addEventListener("click", async () => {
      const caseId = currentCaseIdInput?.value || "";
      if (!caseId) {
        setMessage(reminderResult, "error", "Chargez d'abord un dossier.");
        return;
      }

      const reminderType = reminderTypeSelect?.value || "general_follow_up";
      const message = reminderMessageInput?.value.trim() || "";

      setMessage(reminderResult, "success", "Enregistrement de la relance...");
      setButtonBusy(logReminderButton, true, "Enregistrement...");

      try {
        const response = await fetch(searchEndpoint, {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ action: "log-reminder", caseId, reminderType, message })
        });
        const data = await parseJsonResponse(response);

        if (!response.ok || !data?.ok) {
          throw new Error(data?.message || "Relance non enregistrée.");
        }

        fillCaseDetail(data.case);
        if (reminderMessageInput) reminderMessageInput.value = "";
        setMessage(reminderResult, "success", "Relance enregistrée.");
      } catch (error) {
        setMessage(reminderResult, "error", error instanceof Error ? error.message : "Relance non enregistrée.");
      } finally {
        setButtonBusy(logReminderButton, false);
      }
    });
  }

  if (conciergeCopyButton) {
    conciergeCopyButton.addEventListener("click", async () => {
      const message = conciergeMessage?.value || "";

      if (!message) {
        setMessage(conciergeResult, "error", "Aucun message à copier.");
        return;
      }

      try {
        await navigator.clipboard.writeText(message);
        setMessage(conciergeResult, "success", "Message copié.");
      } catch {
        conciergeMessage?.select();
        setMessage(conciergeResult, "success", "Message sélectionné pour copie manuelle.");
      }
    });
  }

  if (conciergeGenerateButton) {
    conciergeGenerateButton.addEventListener("click", async () => {
      const caseId = currentCaseIdInput?.value || "";
      if (!caseId) {
        setMessage(conciergeResult, "error", "Chargez d'abord un dossier.");
        return;
      }

      setMessage(conciergeResult, "success", "Génération du message concierge...");
      setButtonBusy(conciergeGenerateButton, true, "Génération...");

      try {
        const response = await fetch(searchEndpoint, {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ action: "concierge-draft", caseId })
        });
        const data = await parseJsonResponse(response);

        if (!response.ok || !data?.ok) {
          throw new Error(data?.message || "Concierge indisponible.");
        }

        if (data.case) fillCaseDetail(data.case);
        renderConcierge(data.concierge);
        setMessage(conciergeResult, "success", "Message concierge généré et ajouté à l'historique.");
      } catch (error) {
        setMessage(conciergeResult, "error", error instanceof Error ? error.message : "Concierge indisponible.");
      } finally {
        setButtonBusy(conciergeGenerateButton, false);
      }
    });
  }

  if (paymentForm) {
    paymentForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const caseId = currentCaseIdInput?.value || "";

      if (!caseId) {
        setMessage(paymentStatus, "error", "Chargez d'abord un dossier.");
        return;
      }

      if (!paymentForm.checkValidity()) {
        paymentForm.reportValidity();
        setMessage(paymentStatus, "error", "Complétez les champs de paiement.");
        return;
      }

      setMessage(paymentStatus, "success", "Création du lien de paiement...");
      setButtonBusy(paymentSubmitButton, true, "Création...");

      try {
        const response = await fetch(searchEndpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json"
          },
          body: JSON.stringify({
            action: "create-payment",
            caseId,
            paymentKind: paymentForm.querySelector('[name="paymentKind"]')?.value || "custom",
            amount: paymentForm.querySelector('[name="amount"]')?.value.trim() || "",
            label: paymentForm.querySelector('[name="label"]')?.value.trim() || "",
            description: paymentForm.querySelector('[name="description"]')?.value.trim() || "",
            sendEmail: Boolean(paymentForm.querySelector('[name="sendEmail"]')?.checked)
          })
        });
        const data = await parseJsonResponse(response);

        if (!response.ok || !data?.ok) {
          throw new Error(data?.message || "Impossible de créer la demande de paiement.");
        }

        if (data.case) {
          fillCaseDetail(data.case);
        }

        setMessage(
          paymentStatus,
          data.delivery === "sent" ? "success" : "error",
          data.delivery === "sent"
            ? "Demande de paiement créée et envoyée au client."
            : `Demande créée. Envoi automatique non effectué: ${data.delivery}.`
        );
      } catch (error) {
        setMessage(paymentStatus, "error", error instanceof Error ? error.message : "Impossible de créer la demande de paiement.");
      } finally {
        setButtonBusy(paymentSubmitButton, false);
      }
    });
  }

  if (searchForm) {
    searchForm.requestSubmit();
  }
}

/* ── Ops filtered view pages (quotes, payments, follow-up) ── */

const opsViewRoot = document.querySelector("[data-ops-view]");

// ── Filtered operations views ────────────────────────────────

if (opsViewRoot) {
  const viewName = opsViewRoot.getAttribute("data-ops-view");
  const viewEndpoint = opsViewRoot.getAttribute("data-ops-endpoint") || "/api/ops/cases";
  const viewFilters = document.querySelector("[data-ops-view-filters]");
  const viewStatus = document.querySelector("[data-ops-view-status]");
  const viewTbody = document.querySelector("[data-ops-view-tbody]");
  const viewSubmitButton = viewFilters?.querySelector('button[type="submit"]');

  const quoteStatusLabelsView = {
    none: "Aucune",
    draft: "Brouillon",
    sent: "Envoyée",
    approved: "Approuvée",
    expired: "Expirée",
    declined: "Refusée"
  };

  const paymentStatusLabelsView = {
    open: "Ouvert",
    paid: "Payé",
    expired: "Expiré",
    failed: "Échoué",
    cancelled: "Annulé"
  };

  const paymentKindLabelsView = {
    deposit: "Acompte",
    final: "Solde final",
    custom: "Ponctuel"
  };

  const caseLink = (caseId) => {
    if (!caseId) return "index.html";
    return `index.html?caseId=${encodeURIComponent(caseId)}`;
  };

  const renderQuotesTable = (items) => {
    if (!viewTbody) return;

    if (!items || items.length === 0) {
      viewTbody.innerHTML = '<tr><td colspan="9" class="ops-view-empty">Aucun travail demandé ou approuvé.</td></tr>';
      return;
    }

    viewTbody.replaceChildren(
      ...items.map((item) => {
        const tr = document.createElement("tr");
        tr.className = "ops-view-row";
        const reminderLabel = item.reminderDue === "urgente"
          ? '<span class="ops-view-badge is-reminder-urgent">Urgente</span>'
          : item.reminderDue === "suggérée"
            ? '<span class="ops-view-badge is-reminder-suggested">Suggérée</span>'
            : '—';
        tr.innerHTML = `
          <td><a href="${caseLink(item.caseId)}" class="ops-view-link">${escapeHtml(item.caseId)}</a></td>
          <td>${escapeHtml(item.clientName)}</td>
          <td>${item.quoteAmountFormatted || "—"}</td>
          <td><span class="ops-view-badge is-quote-${item.quoteStatus}">${quoteStatusLabelsView[item.quoteStatus] || item.quoteStatus}</span></td>
          <td>${escapeHtml(item.caseStatus)}</td>
          <td class="ops-view-muted">${item.quoteSentAt ? formatTimestamp(item.quoteSentAt) : "—"}</td>
          <td>${reminderLabel}</td>
          <td class="ops-view-muted">${escapeHtml(item.nextStep || "")}</td>
        `;
        tr.insertAdjacentHTML("beforeend", `<td><a href="${caseLink(item.caseId)}" class="button button-secondary button-small">Ouvrir</a></td>`);
        return tr;
      })
    );
  };

  const renderPaymentsTable = (items) => {
    if (!viewTbody) return;

    if (!items || items.length === 0) {
      viewTbody.innerHTML = '<tr><td colspan="9" class="ops-view-empty">Aucun paiement correspondant.</td></tr>';
      return;
    }

    viewTbody.replaceChildren(
      ...items.map((item) => {
        const tr = document.createElement("tr");
        tr.className = "ops-view-row";
        tr.innerHTML = `
          <td><a href="${caseLink(item.caseId)}" class="ops-view-link">${escapeHtml(item.caseId)}</a></td>
          <td>${escapeHtml(item.clientName || "")}</td>
          <td class="ops-view-mono">${escapeHtml(item.paymentRequestId)}</td>
          <td>${paymentKindLabelsView[item.paymentKind] || item.paymentKind}</td>
          <td>${item.amountFormatted || "—"}</td>
          <td><span class="ops-view-badge is-payment-${item.status}">${paymentStatusLabelsView[item.status] || item.status}</span></td>
          <td class="ops-view-muted">${formatTimestamp(item.createdAt)}</td>
          <td class="ops-view-muted">${item.expiresAt ? formatTimestamp(item.expiresAt) : "—"}</td>
          <td class="ops-view-muted">${item.paidAt ? formatTimestamp(item.paidAt) : "—"}</td>
        `;
        return tr;
      })
    );
  };

  const renderFollowUpTable = (items) => {
    if (!viewTbody) return;

    if (!items || items.length === 0) {
      viewTbody.innerHTML = '<tr><td colspan="9" class="ops-view-empty">Aucun dossier à relancer.</td></tr>';
      return;
    }

    viewTbody.replaceChildren(
      ...items.map((item) => {
        const tr = document.createElement("tr");
        tr.className = "ops-view-row";
        const paymentLabel = item.latestPaymentStatus && item.latestPaymentStatus !== "none"
          ? `<span class="ops-view-badge is-payment-${item.latestPaymentStatus}">${paymentStatusLabelsView[item.latestPaymentStatus] || item.latestPaymentStatus}</span>`
          : "—";
        tr.innerHTML = `
          <td><a href="${caseLink(item.caseId)}" class="ops-view-link">${escapeHtml(item.caseId)}</a></td>
          <td>${escapeHtml(item.clientName)}</td>
          <td>${escapeHtml(item.status)}</td>
          <td><span class="ops-view-badge is-quote-${item.quoteStatus}">${quoteStatusLabelsView[item.quoteStatus] || item.quoteStatus || "—"}</span></td>
          <td>${paymentLabel}</td>
          <td class="ops-view-muted">${item.lastClientContactAt ? formatTimestamp(item.lastClientContactAt) : "Aucun"}</td>
          <td class="ops-view-muted">${item.lastReminderSentAt ? formatTimestamp(item.lastReminderSentAt) : "—"}</td>
          <td class="ops-view-muted">${escapeHtml(item.nextStep || "")}</td>
        `;
        return tr;
      })
    );
  };

  const viewRenderers = {
    quotes: renderQuotesTable,
    payments: renderPaymentsTable,
    "follow-up": renderFollowUpTable
  };

  const loadView = async () => {
    if (!viewFilters) return;

    const params = new URLSearchParams();
    const formData = new FormData(viewFilters);

    for (const [key, value] of formData.entries()) {
      const trimmed = `${value}`.trim();
      if (trimmed) params.set(key, trimmed);
    }

    setMessage(viewStatus, "success", "Chargement...");
    if (viewSubmitButton) setButtonBusy(viewSubmitButton, true, "Chargement...");

    try {
      const response = await fetch(`${viewEndpoint}?${params.toString()}`, {
        headers: { accept: "application/json" }
      });
      const data = await parseJsonResponse(response);

      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || "Impossible de charger les données.");
      }

      const renderer = viewRenderers[viewName];
      if (renderer) renderer(data.items || []);

      setMessage(viewStatus, "success", `${(data.items || []).length} résultat(s).`);
    } catch (error) {
      setMessage(viewStatus, "error", error instanceof Error ? error.message : "Erreur de chargement.");
    } finally {
      if (viewSubmitButton) setButtonBusy(viewSubmitButton, false);
    }
  };

  if (viewFilters) {
    viewFilters.addEventListener("submit", (event) => {
      event.preventDefault();
      loadView();
    });

    loadView();
  }
}
