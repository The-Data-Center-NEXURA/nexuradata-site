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

const initFacebookVideoEmbeds = () => {
  document.querySelectorAll("[data-facebook-video-stage]").forEach((container) => {
    const triggers = [...container.querySelectorAll("[data-facebook-video-trigger]")];

    triggers.forEach((trigger) => {
      trigger.setAttribute("aria-pressed", "false");

      trigger.addEventListener("click", () => {
        const videoUrl = trigger.getAttribute("data-facebook-video-src") || "";
        if (!videoUrl) return;

        container.querySelector(".lab-video-frame")?.remove();

        const iframe = document.createElement("iframe");
        iframe.className = "lab-video-frame";
        iframe.src = videoUrl;
        iframe.title = trigger.getAttribute("data-facebook-video-title") || "NEXURADATA video";
        iframe.width = trigger.getAttribute("data-facebook-video-width") || "560";
        iframe.height = trigger.getAttribute("data-facebook-video-height") || "314";
        iframe.loading = "lazy";
        iframe.allow = "clipboard-write; encrypted-media; picture-in-picture; web-share";
        iframe.allowFullscreen = true;
        iframe.setAttribute("scrolling", "no");

        triggers.forEach((button) => {
          button.setAttribute("aria-pressed", button === trigger ? "true" : "false");
        });

        container.dataset.videoLoaded = "true";
        container.dataset.videoFormat = trigger.getAttribute("data-facebook-video-format") || "wide";
        container.appendChild(iframe);
        trackGaEvent("facebook_video_loaded", { event_category: "media", method: "hero_reel" });
      });
    });
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
initFacebookVideoEmbeds();
initKineticCanvas();
initHeroClock();

function initHeroClock() {
  const el = document.querySelector("[data-hero-clock]");
  if (!el) return;
  const fmt = new Intl.DateTimeFormat("fr-CA", {
    timeZone: "America/Toronto",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  const tick = () => { try { el.textContent = fmt.format(new Date()); } catch (e) {} };
  tick();
  setInterval(tick, 30 * 1000);
}

// ── IBM square chatbot dock ───────────────────────────────────
(function () {
  // Skip on operator console
  if (window.location.pathname.startsWith("/operations")) return;

  const waNumber = "14388130592"; // digits only, no +
  const labels = isEnglishDocument
    ? {
      aria: "NEXURADATA case help",
      openLabel: "Open a case",
      closeLabel: "Close case help",
      kicker: "NEXURADATA",
      status: "OPEN CASE",
      title: "Open a recovery case.",
      copy: "Tell us what happened in your own words. We will prepare the safest next step and keep your request ready if the online form fails.",
      placeholder: "Describe the device, what changed, and the files you need.",
      supportLabel: "Media",
      symptomLabel: "Symptom",
      urgencyLabel: "Urgency",
      historyLabel: "Attempt",
      valueLabel: "Value",
      stateLabel: "State",
      contextLabel: "Your message",
      contextPlaceholder: "Example: my external drive is no longer detected and I need family photos from last year.",
      moodLabel: "How are you holding up?",
      moodOptions: [["Okay", "okay"], ["Stressed", "stressed"], ["Business blocked", "business_blocked"], ["Legal pressure", "legal_pressure"]],
      supportOptions: [["drive", "Hard drive"], ["ssd", "SSD"], ["raid", "RAID / NAS"], ["phone", "Phone"], ["server", "Server"], ["removable", "USB / card"]],
      symptomOptions: [["deleted", "Deleted files"], ["slow", "Slow / unstable"], ["not_detected", "Not detected"], ["physical", "Shock / noise"], ["water", "Liquid damage"], ["encrypted", "Encrypted / forensic"]],
      urgencyOptions: [["standard", "Standard"], ["business", "Business impact"], ["critical", "Critical now"]],
      historyOptions: [["no_attempt", "No attempt"], ["software", "Recovery app"], ["opened", "Opened device"], ["rebuild", "RAID rebuild"], ["powered_on", "Repeated power-on"]],
      valueOptions: [["personal", "Personal"], ["business", "Business"], ["legal", "Legal"], ["medical", "Sensitive"]],
      stateOptions: [["powered_off", "Powered off"], ["unplugged", "Unplugged"], ["running", "Still running"], ["unknown", "Unknown"]],
      resultAction: "Prepare my case",
      risk: "Risk",
      confidence: "Confidence",
      route: "Next step",
      avoid: "Do not",
      protocol: "Protocol",
      fixed: "Fixed automatically",
      expert: "Expert alerts",
      brief: "Lab handoff",
      why: "Why this route",
      missing: "Prepare these details",
      need: "Client need",
      signal: "Signal",
      proposal: "Proposal",
      serverVerified: "Server verified",
      serviceLevel: "Service",
      nextAction: "Next action",
      quoteReadiness: "Quote",
      operatorFocus: "Operator focus",
      guardrail: "Human review remains required before recovery, forensic conclusions, payment or physical intervention.",
      autoFillStatus: "The case form was prepared from your message.",
      needLabels: {
        personal_memory: "Personal memories to preserve",
        business_continuity: "Business continuity",
        legal_or_insurance: "Legal, evidence or insurance",
        privacy_sensitive: "High confidentiality",
        urgent_stabilization: "Urgent technical stabilization",
        technical_recovery: "Targeted technical recovery"
      },
      signalLabels: {
        distressed: "Client distress",
        frustrated: "Frustration",
        business_pressure: "Operational pressure",
        legal_anxiety: "Legal or insurance concern",
        neutral: "Neutral"
      },
      empathyLines: {
        distressed: "I understand this may be more than a technical loss. The priority is to preserve what still exists without adding risk.",
        frustrated: "This has already taken enough energy. The safest move is to put the case back into a clear, controlled path.",
        business_pressure: "When operations are affected, the priority is stabilization first, then a short decision path.",
        legal_anxiety: "When evidence or insurance is involved, every manipulation should stay limited and documented.",
        neutral: "The case can be qualified methodically before any intervention."
      },
      proposals: {
        personal_memory: ["Preserve the memories and avoid new recovery attempts.", "Open a personal-memory priority case focused on essential files."],
        business_continuity: ["Treat this as a continuity case and stop uncontrolled manipulation.", "Prepare an urgent review with a short recovery plan and quote after scope validation."],
        legal_or_insurance: ["Move to human review before detailed technical instructions.", "Frame the legal or insurance scope, then confirm secure transmission."],
        privacy_sensitive: ["Use a confidential path with only the minimum necessary details.", "Open a secure case and keep the summary technically useful but restrained."],
        urgent_stabilization: ["Stabilize the device before any new attempt.", "Prepare lab review, secure intake and quote path after risk validation."],
        technical_recovery: ["Open a targeted recovery case with the useful minimum details.", "Prepare a standard evaluation and confirm target files before work starts."]
      },
      fixes: {
        safe: "Unsafe next actions converted into stop-handling instructions.",
        route: "Service route, urgency, profile, impact and sensitivity selected.",
        intake: "Main case form prefilled with the diagnostic summary.",
        missing: "Missing details checklist prepared for lab review.",
        emergency: "Emergency WhatsApp escalation armed for this critical case.",
        expert: "Hidden risks and contradictions converted into operator tasks.",
        handoff: "Email, copy, tracking and payment handoff links prepared."
      },
      expertSignals: {
        supportMismatch: "Context overrides the selected media: infrastructure or RAID review required.",
        urgencyUnderstated: "Urgency appears understated compared with the operational impact.",
        physicalHidden: "Hardware risk is detected from context even if the selected symptom is softer.",
        forensicHidden: "Legal, insurance or evidence language detected; evidence-safe human review required.",
        repairAttempted: "Repair, rebuild or system command already attempted; further writes must stop.",
        credentialDependent: "Feasibility may depend on a passcode, account, password or encryption key.",
        contamination: "Liquid, opening, rice, heat or freezing history may change the lab path."
      },
      reasons: {
        infrastructure: "RAID, NAS or server cases depend on disk order, controller state and previous rebuild attempts.",
        ssd: "SSD failures can degrade quickly when powered repeatedly.",
        phone: "Phones need model, lock state and damage history before any risky handling.",
        physical: "Shock, noise or liquid damage raises hardware risk with every restart.",
        encrypted: "Encrypted or legal data needs evidence-safe handling and access details.",
        notDetected: "A non-detected device should not be initialized, formatted or repaired by the OS.",
        urgent: "Business or critical impact changes the route from advice to controlled intake.",
        attempted: "Prior software, opening or rebuild attempts increase overwrite and evidence risks.",
        sensitive: "Business, legal or medical data needs a stricter confidentiality path.",
        running: "A device still running may contain the last readable state; do not restart it without a plan.",
        default: "The safest next step is to preserve the original media and document the timeline."
      },
      questions: {
        default: "Device brand/model, capacity, last successful access and target files.",
        raid: "RAID/NAS model, number of disks, disk labels/order and last rebuild action.",
        phone: "Phone model, passcode availability, backup status and damage history.",
        physical: "Noise, shock, liquid, smell, heat and whether the device was powered again.",
        deleted: "File types, folders, deletion date and what has been written since.",
        encrypted: "Encryption type, passwords/keys available and legal preservation needs.",
        attempted: "Exact recovery tools, repairs, rebuilds or commands already attempted.",
        credentials: "Available passwords, recovery keys, cloud accounts and who is authorized to use them.",
        contamination: "Exposure history: liquid, opening, rice, heat, freezing and power-on attempts.",
        contradiction: "Which description is correct if the selected options and written context disagree.",
        impact: "Systems affected, business deadline, responsible contact and acceptable intervention window."
      },
      cases: {
        logical: ["Ready to open a case", "Tell us which files matter and when the device last worked normally.", "Do not save anything new on the same device."],
        priority: ["Handle this carefully", "Keep the device aside and open the case with your description.", "Avoid recovery apps or automatic repair tools for now."],
        high: ["Keep it powered off", "The safest next step is lab review before another attempt.", "Do not open, rebuild, initialize or format it."],
        critical: ["Urgent human review", "Use the urgent channel if work is blocked right now.", "Do not restart anything or attempt a rebuild."]
      },
      protocols: {
        logical: ["Preserve the original media.", "Open a case with the diagnostic summary.", "Prepare a destination drive if recovery is approved."],
        priority: ["Stop recovery apps and writes.", "Document the timeline and last successful access.", "Use secure intake before any new attempt."],
        high: ["Keep the device isolated and stable.", "Do not initialize, format or repair volumes.", "Send the case to lab review before powering on."],
        critical: ["Freeze all manipulations now.", "Escalate only through the emergency channel.", "Wait for lab instructions before any rebuild or restart."]
      },
      case: "Full form",
      service: "Service page",
      reception: "Secure intake",
      rates: "Pricing",
      statusLink: "Track case",
      payment: "Payment",
      paymentPrepared: "Payment prepared after approval",
      emailSummary: "Email instead",
      copySummary: "Copy message",
      copied: "Copied",
      copyFailed: "Copy failed",
      quickCase: "Where should we reach you?",
      fieldName: "Name",
      fieldEmail: "Email",
      fieldPhone: "Phone",
      consent: "I agree to open a case with this message.",
      submitCase: "Open my case",
      openingCase: "Opening your case...",
      caseOpened: (caseId, plan) => plan?.recommendedPath
        ? `Case ${caseId} is open. We will review it before giving recovery instructions.`
        : `Case ${caseId} is open. Check your email for the access code.`,
      caseFallback: "Online opening did not complete. Your prepared email is opening so the request is not lost.",
      caseError: "I could not open the case online. Use the prepared email or the full form.",
      emergency: "Urgent WhatsApp",
      emailSubject: "NEXURADATA recovery request",
      waIntro: "Hello NEXURADATA, I need urgent help with this recovery case."
    }
    : {
      aria: "Aide dossier NEXURADATA",
      openLabel: "Ouvrir un dossier",
      closeLabel: "Fermer l'aide dossier",
      kicker: "NEXURADATA",
      status: "OUVRIR DOSSIER",
      title: "Ouvrir un dossier de récupération.",
      copy: "Expliquez ce qui s'est passé avec vos mots. On prépare la prochaine étape et on garde la demande prête si le formulaire en ligne tombe.",
      placeholder: "Décrivez l'appareil, ce qui a changé et les fichiers dont vous avez besoin.",
      supportLabel: "Support",
      symptomLabel: "Symptôme",
      urgencyLabel: "Urgence",
      historyLabel: "Tentative",
      valueLabel: "Valeur",
      stateLabel: "État",
      contextLabel: "Votre message",
      contextPlaceholder: "Exemple: mon disque externe n'est plus détecté et j'ai besoin des photos de famille de l'an dernier.",
      moodLabel: "Comment ça va avec ça?",
      moodOptions: [["Ça va", "okay"], ["Stressé", "stressed"], ["Entreprise bloquée", "business_blocked"], ["Pression légale", "legal_pressure"]],
      supportOptions: [["drive", "Disque dur"], ["ssd", "SSD"], ["raid", "RAID / NAS"], ["phone", "Téléphone"], ["server", "Serveur"], ["removable", "USB / carte"]],
      symptomOptions: [["deleted", "Fichiers supprimés"], ["slow", "Lent / instable"], ["not_detected", "Non détecté"], ["physical", "Choc / bruit"], ["water", "Liquide"], ["encrypted", "Chiffré / forensique"]],
      urgencyOptions: [["standard", "Standard"], ["business", "Impact entreprise"], ["critical", "Critique maintenant"]],
      historyOptions: [["no_attempt", "Aucune"], ["software", "Logiciel tenté"], ["opened", "Support ouvert"], ["rebuild", "RAID reconstruit"], ["powered_on", "Redémarrages"]],
      valueOptions: [["personal", "Personnel"], ["business", "Entreprise"], ["legal", "Juridique"], ["medical", "Sensible"]],
      stateOptions: [["powered_off", "Éteint"], ["unplugged", "Débranché"], ["running", "Encore allumé"], ["unknown", "Inconnu"]],
      resultAction: "Préparer mon dossier",
      risk: "Risque",
      confidence: "Confiance",
      route: "Prochaine étape",
      avoid: "À ne pas faire",
      protocol: "Protocole",
      fixed: "Corrigé automatiquement",
      expert: "Alertes expertes",
      brief: "Transfert labo",
      why: "Pourquoi ce parcours",
      missing: "À préparer",
      need: "Besoin client",
      signal: "Signal",
      proposal: "Proposition",
      serverVerified: "Vérifié serveur",
      serviceLevel: "Service",
      nextAction: "Prochaine action",
      quoteReadiness: "Soumission",
      operatorFocus: "Focus opérateur",
      guardrail: "La revue humaine reste obligatoire avant récupération, conclusion probatoire, paiement ou intervention physique.",
      autoFillStatus: "Le formulaire a été préparé avec votre message.",
      needLabels: {
        personal_memory: "Souvenirs personnels à préserver",
        business_continuity: "Continuité d'activité",
        legal_or_insurance: "Preuve, litige ou assurance",
        privacy_sensitive: "Confidentialité élevée",
        urgent_stabilization: "Stabilisation technique urgente",
        technical_recovery: "Récupération technique ciblée"
      },
      signalLabels: {
        distressed: "Détresse client",
        frustrated: "Frustration",
        business_pressure: "Pression opérationnelle",
        legal_anxiety: "Crainte légale ou assurance",
        neutral: "Neutre"
      },
      empathyLines: {
        distressed: "Je comprends que ce peut être plus qu'une perte technique. La priorité est de préserver ce qui existe encore sans ajouter de risque.",
        frustrated: "La situation a déjà pris trop d'énergie. Le plus sûr est de remettre le dossier dans un parcours clair et contrôlé.",
        business_pressure: "Quand les opérations sont touchées, la priorité est la stabilisation, puis une décision courte et structurée.",
        legal_anxiety: "Quand une preuve ou une assurance est en jeu, chaque manipulation doit rester limitée et documentée.",
        neutral: "Le dossier peut être qualifié méthodiquement avant toute intervention."
      },
      proposals: {
        personal_memory: ["Préserver les souvenirs et éviter tout nouvel essai de récupération.", "Ouvrir un dossier souvenir prioritaire centré sur les fichiers essentiels."],
        business_continuity: ["Traiter comme un dossier de continuité et arrêter les manipulations non contrôlées.", "Préparer une revue urgente avec plan court et soumission après cadrage."],
        legal_or_insurance: ["Basculer en revue humaine avant toute consigne technique détaillée.", "Cadrer le contexte légal ou assurance, puis confirmer la transmission sécurisée."],
        privacy_sensitive: ["Utiliser un parcours confidentiel avec seulement les détails nécessaires.", "Ouvrir un dossier sécurisé et garder le résumé utile mais limité."],
        urgent_stabilization: ["Stabiliser le support avant toute nouvelle tentative.", "Préparer la revue labo, la réception sécurisée et la soumission après validation du risque."],
        technical_recovery: ["Ouvrir un dossier ciblé avec les informations minimales utiles.", "Préparer une évaluation standard et confirmer les fichiers visés avant intervention."]
      },
      fixes: {
        safe: "Gestes dangereux convertis en consignes d'arrêt.",
        route: "Parcours, urgence, profil, impact et sensibilité sélectionnés.",
        intake: "Formulaire principal prérempli avec le résumé diagnostic.",
        missing: "Liste d'informations manquantes préparée pour le laboratoire.",
        emergency: "Escalade WhatsApp urgence armée pour ce cas critique.",
        expert: "Risques cachés et contradictions convertis en tâches opérateur.",
        handoff: "Liens courriel, copie, suivi et paiement préparés."
      },
      expertSignals: {
        supportMismatch: "Le contexte corrige le support choisi: revue infrastructure ou RAID requise.",
        urgencyUnderstated: "L'urgence semble sous-estimée par rapport à l'impact opérationnel.",
        physicalHidden: "Risque matériel détecté dans le contexte même si le symptôme choisi est plus doux.",
        forensicHidden: "Langage preuve, assurance ou juridique détecté; revue humaine compatible preuve requise.",
        repairAttempted: "Réparation, reconstruction ou commande système déjà tentée; arrêter toute écriture.",
        credentialDependent: "La faisabilité peut dépendre d'un code, compte, mot de passe ou clé de chiffrement.",
        contamination: "Liquide, ouverture, riz, chaleur ou congélation peuvent changer le parcours labo."
      },
      reasons: {
        infrastructure: "Les cas RAID, NAS ou serveur dépendent de l'ordre des disques, du contrôleur et des reconstructions déjà tentées.",
        ssd: "Un SSD peut se dégrader rapidement après des remises sous tension répétées.",
        phone: "Un téléphone exige le modèle, l'état du verrouillage et l'historique des dommages avant toute manipulation risquée.",
        physical: "Choc, bruit ou liquide augmentent le risque matériel à chaque redémarrage.",
        encrypted: "Les données chiffrées ou juridiques exigent un parcours compatible avec la preuve et les accès disponibles.",
        notDetected: "Un support non détecté ne doit pas être initialisé, formaté ou réparé par le système.",
        urgent: "Un impact entreprise ou critique déplace le dossier vers une réception contrôlée plutôt qu'un simple conseil.",
        attempted: "Les logiciels, ouvertures ou reconstructions déjà tentés augmentent les risques d'écrasement et de preuve.",
        sensitive: "Les données entreprise, juridiques ou médicales exigent un parcours de confidentialité plus strict.",
        running: "Un appareil encore allumé peut contenir le dernier état lisible; ne le redémarrez pas sans plan.",
        default: "La prochaine étape la plus sûre consiste à préserver l'original et documenter la chronologie."
      },
      questions: {
        default: "Marque/modèle, capacité, dernier accès réussi et fichiers visés.",
        raid: "Modèle RAID/NAS, nombre de disques, étiquettes/ordre et dernière reconstruction.",
        phone: "Modèle du téléphone, code disponible, sauvegardes et historique des dommages.",
        physical: "Bruit, choc, liquide, odeur, chaleur et remise sous tension déjà faite.",
        deleted: "Types de fichiers, dossiers, date de suppression et écritures depuis l'incident.",
        encrypted: "Type de chiffrement, mots de passe/clés disponibles et besoin de préservation juridique.",
        attempted: "Outils, réparations, reconstructions ou commandes déjà tentés.",
        credentials: "Mots de passe, clés de récupération, comptes cloud disponibles et personne autorisée.",
        contamination: "Historique d'exposition: liquide, ouverture, riz, chaleur, congélation et remise sous tension.",
        contradiction: "Quelle description est correcte si les options choisies et le contexte écrit se contredisent.",
        impact: "Systèmes touchés, échéance d'affaires, contact responsable et fenêtre d'intervention acceptable."
      },
      cases: {
        logical: ["Dossier prêt à ouvrir", "Dites-nous quels fichiers comptent et quand l'appareil fonctionnait encore normalement.", "N'enregistrez rien de nouveau sur le même support."],
        priority: ["À traiter avec prudence", "Gardez le support de côté et ouvrez le dossier avec votre description.", "Évitez les logiciels de récupération ou les réparations automatiques pour l'instant."],
        high: ["Gardez l'appareil éteint", "Le plus sûr est une revue laboratoire avant un autre essai.", "N'ouvrez pas, ne reconstruisez pas, n'initialisez pas et ne formatez pas."],
        critical: ["Revue humaine urgente", "Utilisez le canal urgence si les opérations sont bloquées maintenant.", "Ne redémarrez rien et ne tentez pas de reconstruction."]
      },
      protocols: {
        logical: ["Préservez le support original.", "Ouvrez un dossier avec le résumé diagnostic.", "Préparez un disque de destination si la récupération est approuvée."],
        priority: ["Arrêtez les logiciels de récupération et toute écriture.", "Notez la chronologie et le dernier accès réussi.", "Passez par la réception sécurisée avant toute nouvelle tentative."],
        high: ["Gardez l'appareil isolé et stable.", "N'initialisez pas, ne formatez pas et ne réparez pas les volumes.", "Envoyez le dossier au laboratoire avant toute remise sous tension."],
        critical: ["Gelez toute manipulation maintenant.", "Escaladez seulement par le canal urgence.", "Attendez les consignes du laboratoire avant toute reconstruction ou redémarrage."]
      },
      case: "Formulaire complet",
      service: "Page service",
      reception: "Réception sécurisée",
      rates: "Tarifs",
      statusLink: "Suivi dossier",
      payment: "Paiement",
      paymentPrepared: "Paiement préparé après accord",
      emailSummary: "Écrire plutôt",
      copySummary: "Copier message",
      copied: "Copié",
      copyFailed: "Échec copie",
      quickCase: "Où doit-on vous joindre?",
      fieldName: "Nom",
      fieldEmail: "Courriel",
      fieldPhone: "Téléphone",
      consent: "J'accepte d'ouvrir un dossier avec ce message.",
      submitCase: "Ouvrir mon dossier",
      openingCase: "Ouverture du dossier...",
      caseOpened: (caseId, plan) => plan?.recommendedPath
        ? `Dossier ${caseId} ouvert. Nous le relisons avant de donner des consignes de récupération.`
        : `Dossier ${caseId} ouvert. Vérifiez votre courriel pour le code d'accès.`,
      caseFallback: "L'ouverture en ligne n'a pas complété. Le courriel préparé s'ouvre pour ne pas perdre la demande.",
      caseError: "Impossible d'ouvrir le dossier en ligne. Utilisez le courriel préparé ou le formulaire complet.",
      emergency: "WhatsApp urgence",
      emailSubject: "Demande de récupération NEXURADATA",
      waIntro: "Bonjour NEXURADATA, j'ai besoin d'aide urgente pour ce dossier de récupération."
    };
  const homePrefix = isEnglishDocument ? "/en" : "";
  const caseHref = `${homePrefix}/#contact`;
  const statusHref = `${homePrefix}/suivi-dossier-client-montreal.html`;
  const receptionHref = `${homePrefix}/reception-securisee-donnees-montreal.html`;
  const ratesHref = `${homePrefix}/tarifs-recuperation-donnees-montreal.html`;
  const diagnosticEndpoint = "/api/diagnostic";
  const serviceHref = (path) => `${homePrefix}/${path}`;
  const whatsappHref = `https://wa.me/${waNumber}?text=${encodeURIComponent(labels.waIntro)}`;
  const optionMarkup = (options) => options.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
  const optionLabel = (options, value) => options.find(([optionValue]) => optionValue === value)?.[1] || value;
  const moodLabelFor = (value) => labels.moodOptions.find(([, optionValue]) => optionValue === value)?.[0] || value;
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
    if (symptom === "encrypted" || value === "legal") return "Dossier légal / forensique";
    if (support === "raid" || support === "server") return "RAID / NAS / serveur";
    if (support === "phone") return "Téléphone";
    if (support === "ssd") return "SSD / NVMe";
    if (support === "removable") return "USB / carte SD";
    return "HDD";
  };
  const mapCaseUrgency = (urgency, symptom, value) => {
    if (symptom === "encrypted" || value === "legal" || value === "medical") return "Très sensible";
    if (urgency === "critical") return "Urgence 24–48 h";
    if (urgency === "business") return "Priorité";
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
  const mapCaseSymptom = (scenario) => {
    if (scenario.caseSymptom) return scenario.caseSymptom;
    if (scenario.symptom === "deleted") return "fichiers supprimés";
    if (scenario.symptom === "not_detected") return "non détecté";
    if (scenario.symptom === "physical") return "bruit / clic";
    if (scenario.symptom === "water") return "eau / feu / choc";
    if (scenario.symptom === "encrypted") return "ransomware / chiffré";
    return "non détecté";
  };
  const mapCaseClientType = (scenario) => scenario.clientType || mapCaseProfile(scenario.value);
  const findActiveStripeCheckoutHref = () => {
    const checkoutLink = document.querySelector('[data-stripe-checkout-link][href*="checkout.stripe.com"], .status-payment-actions a[href*="checkout.stripe.com"]');
    return checkoutLink?.href || "";
  };

  const dock = document.createElement("aside");
  dock.className = "chatbot-dock";
  dock.dataset.chatbotPhase = "asking";
  dock.id = "diagnostic-assistant";
  dock.tabIndex = -1;
  dock.dataset.chatbotOpen = "false";
  dock.setAttribute("aria-label", labels.aria);
  dock.innerHTML = `
    <button type="button" class="chatbot-toggle" data-chatbot-toggle aria-expanded="false" aria-controls="chatbot-panel" aria-label="${labels.openLabel}" title="${labels.openLabel}">
      <span class="chatbot-brand-tile" aria-hidden="true">
        <img class="chatbot-brand-logo" src="/assets/nexuradata-master.svg" alt="" width="164" height="20" aria-hidden="true" decoding="async">
      </span>
      <span class="chatbot-toggle-copy" aria-hidden="true">
        <span class="chatbot-kicker">${labels.kicker}</span>
        <span class="chatbot-status">${labels.status}</span>
      </span>
    </button>
    <section class="chatbot-panel" id="chatbot-panel" data-chatbot-panel hidden>
      <div class="chatbot-dock-header">
        <img class="chatbot-mark" src="/assets/nexuradata-icon.png" alt="" width="24" height="24" aria-hidden="true" decoding="async">
        <span class="chatbot-kicker">${labels.kicker}</span>
        <span class="chatbot-live" data-chatbot-live aria-hidden="true"><span class="chatbot-live-dot"></span><span data-chatbot-clock>MTL</span></span>
        <span class="chatbot-step" data-chatbot-step aria-hidden="true"></span>
        <button type="button" class="chatbot-close" data-chatbot-close aria-label="${labels.closeLabel}">X</button>
      </div>
      <p class="chatbot-title">${labels.title}</p>
      <p class="chatbot-copy">${labels.copy}</p>
      <form class="chatbot-diagnostic" data-chatbot-diagnostic>
        <div class="chatbot-thread" data-chatbot-thread aria-live="polite"></div>
        <div class="chatbot-quick-actions" data-chatbot-quick-actions></div>
        <input type="hidden" name="support" value="drive">
        <input type="hidden" name="symptom" value="not_detected">
        <input type="hidden" name="urgency" value="standard">
        <input type="hidden" name="history" value="no_attempt">
        <input type="hidden" name="value" value="personal">
        <input type="hidden" name="state" value="unknown">
        <input type="hidden" name="mood" value="okay">
        <input type="hidden" name="caseSymptom" value="non détecté">
        <input type="hidden" name="clientType" value="Particulier">
        <label class="chatbot-context-field"><span>${labels.contextLabel}</span><textarea name="context" rows="4" maxlength="620" required placeholder="${labels.contextPlaceholder}"></textarea></label>
        <p class="chatbot-estimate" data-chatbot-estimate hidden></p>
        <button type="submit" class="chatbot-diagnostic-submit" data-chatbot-diagnostic-submit>${labels.resultAction}</button>
      </form>
      <div class="chatbot-result" data-chatbot-result aria-live="polite" tabindex="-1" hidden>
        <p class="chatbot-placeholder">${labels.placeholder}</p>
      </div>
      <section class="chatbot-brief" data-chatbot-brief hidden>
        <h3>${labels.brief}</h3>
        <dl data-chatbot-brief-fields></dl>
        <ul data-chatbot-brief-focus></ul>
      </section>
      <section class="chatbot-fixed" data-chatbot-fixed hidden>
        <h3>${labels.fixed}</h3>
        <ul data-chatbot-fixes></ul>
      </section>
      <section class="chatbot-expert" data-chatbot-expert hidden>
        <h3>${labels.expert}</h3>
        <ul data-chatbot-expert-signals></ul>
        <p>${labels.guardrail}</p>
      </section>
      <section class="chatbot-insight" data-chatbot-insight hidden>
        <div class="chatbot-insight-block">
          <h3>${labels.why}</h3>
          <ul data-chatbot-reasons></ul>
        </div>
        <div class="chatbot-insight-block">
          <h3>${labels.missing}</h3>
          <ul data-chatbot-questions></ul>
        </div>
      </section>
      <form class="chatbot-case-form" data-chatbot-case-form data-intake-endpoint="/api/intake" hidden>
        <p>${labels.quickCase}</p>
        <label><span>${labels.fieldName}</span><input type="text" name="nom" autocomplete="name" required></label>
        <label><span>${labels.fieldEmail}</span><input type="email" name="courriel" autocomplete="email" required></label>
        <label><span>${labels.fieldPhone}</span><input type="tel" name="telephone" autocomplete="tel"></label>
        <label><span>${isEnglishDocument ? "City" : "Ville"}</span><input type="text" name="ville" autocomplete="address-level2"></label>
        <label><span>${isEnglishDocument ? "Preferred contact" : "Préférence de contact"}</span><select name="preferenceContact"><option value="email">Email</option><option value="téléphone">${isEnglishDocument ? "Phone" : "Téléphone"}</option><option value="whatsapp">WhatsApp</option></select></label>
        <label class="chatbot-case-consent"><input type="checkbox" name="consentement" required><span>${labels.consent}</span></label>
        <input type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" hidden>
        <button type="submit" class="chatbot-execute" data-chatbot-case-submit>${labels.submitCase}</button>
        <span class="chatbot-case-status" data-chatbot-case-status aria-live="polite"></span>
      </form>
      <div class="chatbot-actions" data-chatbot-actions hidden>
        <a class="chatbot-link chatbot-link-primary" href="${caseHref}" data-chatbot-action="case">${labels.case}</a>
        <a class="chatbot-link" href="${serviceHref("recuperation-donnees-montreal.html")}" data-chatbot-service>${labels.service}</a>
        <a class="chatbot-link" href="${statusHref}" data-chatbot-action="status">${labels.statusLink}</a>
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
  const thread = dock.querySelector("[data-chatbot-thread]");
  const quickActions = dock.querySelector("[data-chatbot-quick-actions]");
  const estimateTarget = dock.querySelector("[data-chatbot-estimate]");
  const result = dock.querySelector("[data-chatbot-result]");
  const brief = dock.querySelector("[data-chatbot-brief]");
  const briefFields = dock.querySelector("[data-chatbot-brief-fields]");
  const briefFocus = dock.querySelector("[data-chatbot-brief-focus]");
  const fixed = dock.querySelector("[data-chatbot-fixed]");
  const fixesTarget = dock.querySelector("[data-chatbot-fixes]");
  const expert = dock.querySelector("[data-chatbot-expert]");
  const expertSignalsTarget = dock.querySelector("[data-chatbot-expert-signals]");
  const insight = dock.querySelector("[data-chatbot-insight]");
  const reasonsTarget = dock.querySelector("[data-chatbot-reasons]");
  const questionsTarget = dock.querySelector("[data-chatbot-questions]");
  const protocolTarget = dock.querySelector("[data-chatbot-protocol]");
  const caseForm = dock.querySelector("[data-chatbot-case-form]");
  const actions = dock.querySelector("[data-chatbot-actions]");
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
  let latestServerDiagnostic = null;
  let diagnosticRequestId = 0;
  let serverDiagnosticTimer = null;
  let diagnosisShown = false;
  const setDockOpen = (open, restoreFocus = false) => {
    const isOpen = Boolean(open);
    dock.dataset.chatbotOpen = isOpen ? "true" : "false";
    toggleButton?.setAttribute("aria-expanded", isOpen ? "true" : "false");
    if (panel) panel.hidden = !isOpen;
    if (isOpen) {
      try { ensureConciergeGreeting(); } catch (_) { /* greeting helper not ready yet */ }
    }

    if (!restoreFocus) return;

    window.setTimeout(() => {
      if (isOpen) {
        diagnosticForm?.querySelector("textarea")?.focus({ preventScroll: true });
      } else {
        toggleButton?.focus({ preventScroll: true });
      }
    }, 0);
  };
  const watchHeroMediaOverlap = () => {
    const heroMedia = document.querySelector("[data-facebook-video-stage]");
    if (!heroMedia || !("IntersectionObserver" in window)) return;

    const mobileQuery = window.matchMedia("(max-width: 720px)");
    let mediaInView = false;
    const syncState = () => {
      dock.dataset.heroMediaInView = mobileQuery.matches && mediaInView ? "true" : "false";
    };
    const observer = new IntersectionObserver((entries) => {
      mediaInView = entries.some((entry) => entry.isIntersecting);
      syncState();
    }, { threshold: 0.12 });

    observer.observe(heroMedia);
    mobileQuery.addEventListener?.("change", syncState);
    syncState();
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
  const localizeExpertSignalKeys = (keys = []) => {
    const map = {
      "support-context-mismatch": "supportMismatch",
      "urgency-understated": "urgencyUnderstated",
      "physical-risk-hidden": "physicalHidden",
      "forensic-context-hidden": "forensicHidden",
      "repair-tool-attempted": "repairAttempted",
      "credential-dependent": "credentialDependent",
      "contamination-risk": "contamination"
    };
    return keys.map((key) => labels.expertSignals?.[map[key]]).filter(Boolean);
  };
  const setDiagnosisVisibility = (visible) => {
    [result, caseForm, actions].forEach((element) => {
      if (element) element.hidden = !visible;
    });

    [brief, fixed, expert, insight, protocolTarget].forEach((element) => {
      if (element) element.hidden = true;
    });
  };
  const renderList = (target, items) => {
    if (!target) return;
    target.replaceChildren(...items.map((item) => {
      const listItem = document.createElement("li");
      listItem.textContent = item;
      return listItem;
    }));
  };
  const uniqueItems = (items) => [...new Set(items.filter(Boolean))];
  const conversationCopy = isEnglishDocument
    ? {
      assistant: "NEXURADATA",
      you: "You",
      estimatePrefix: "Estimate",
      stripePrefix: "Stripe",
      paymentHint: "The assistant does not charge you blindly. It opens an existing Stripe Checkout link if one is already attached to the case; otherwise payment is sent after written approval.",
      finalPrompt: "One sentence in your own words. I'll open the case.",
      steps: [
        {
          key: "mood",
          question: "How are you holding up?",
          options: labels.moodOptions.map(([label, mood]) => [label, { mood }])
        },
        {
          key: "support",
          question: "Media type",
          options: [
            ["HDD", { support: "drive" }],
            ["SSD/NVMe", { support: "ssd" }],
            ["USB/SD card", { support: "removable" }],
            ["Phone", { support: "phone" }],
            ["RAID/NAS/server", { support: "raid", urgency: "business" }],
            ["Legal/forensic file", { support: "drive", symptom: "encrypted", value: "legal", clientType: "Avocat", caseSymptom: "ransomware / chiffré" }]
          ]
        },
        {
          key: "symptom",
          question: "Symptom",
          options: [
            ["Deleted files", { symptom: "deleted", caseSymptom: "fichiers supprimés" }],
            ["Formatted", { symptom: "deleted", history: "rebuild", caseSymptom: "formaté" }],
            ["Not detected", { symptom: "not_detected", caseSymptom: "non détecté" }],
            ["Noise/click", { symptom: "physical", state: "powered_off", caseSymptom: "bruit / clic" }],
            ["Water/fire/shock", { symptom: "water", state: "powered_off", caseSymptom: "eau / feu / choc" }],
            ["Ransomware/encrypted", { symptom: "encrypted", value: "legal", caseSymptom: "ransomware / chiffré" }],
            ["Multiple failed disks", { support: "raid", symptom: "physical", urgency: "critical", caseSymptom: "plusieurs disques défaillants" }]
          ]
        },
        {
          key: "urgency",
          question: "Urgency",
          options: [
            ["Standard", { urgency: "standard" }],
            ["Priority", { urgency: "business" }],
            ["Emergency 24-48 h", { urgency: "critical" }]
          ]
        },
        {
          key: "value",
          question: "Client type",
          options: [
            ["Individual", { value: "personal", clientType: "Particulier" }],
            ["Business", { value: "business", clientType: "Entreprise" }],
            ["Lawyer", { value: "legal", clientType: "Avocat", symptom: "encrypted" }],
            ["Insurer", { value: "legal", clientType: "Assureur", symptom: "encrypted" }],
            ["Accountant", { value: "business", clientType: "Comptable" }],
            ["Police/investigator", { value: "legal", clientType: "Police / enquêteur", symptom: "encrypted" }]
          ]
        }
      ]
    }
    : {
      assistant: "NEXURADATA",
      you: "Vous",
      estimatePrefix: "Estimation",
      stripePrefix: "Stripe",
      paymentHint: "L'assistant ne facture pas à l'aveugle. Il ouvre un lien Stripe Checkout existant si un paiement est déjà attaché au dossier; sinon le paiement part après accord écrit.",
      finalPrompt: "Une phrase dans vos mots. J'ouvre le dossier.",
      steps: [
        {
          key: "mood",
          question: "Comment ça va avec ça?",
          options: labels.moodOptions.map(([label, mood]) => [label, { mood }])
        },
        {
          key: "support",
          question: "Type de média",
          options: [
            ["HDD", { support: "drive" }],
            ["SSD/NVMe", { support: "ssd" }],
            ["USB/carte SD", { support: "removable" }],
            ["Téléphone", { support: "phone" }],
            ["RAID/NAS/serveur", { support: "raid", urgency: "business" }],
            ["Dossier légal/forensique", { support: "drive", symptom: "encrypted", value: "legal", clientType: "Avocat", caseSymptom: "ransomware / chiffré" }]
          ]
        },
        {
          key: "symptom",
          question: "Symptôme",
          options: [
            ["Fichiers supprimés", { symptom: "deleted", caseSymptom: "fichiers supprimés" }],
            ["Formaté", { symptom: "deleted", history: "rebuild", caseSymptom: "formaté" }],
            ["Non détecté", { symptom: "not_detected", caseSymptom: "non détecté" }],
            ["Bruit/clic", { symptom: "physical", state: "powered_off", caseSymptom: "bruit / clic" }],
            ["Eau/feu/choc", { symptom: "water", state: "powered_off", caseSymptom: "eau / feu / choc" }],
            ["Ransomware/chiffré", { symptom: "encrypted", value: "legal", caseSymptom: "ransomware / chiffré" }],
            ["Plusieurs disques défaillants", { support: "raid", symptom: "physical", urgency: "critical", caseSymptom: "plusieurs disques défaillants" }]
          ]
        },
        {
          key: "urgency",
          question: "Urgence",
          options: [
            ["Standard", { urgency: "standard" }],
            ["Priorité", { urgency: "business" }],
            ["Urgence 24–48 h", { urgency: "critical" }]
          ]
        },
        {
          key: "value",
          question: "Type de client",
          options: [
            ["Particulier", { value: "personal", clientType: "Particulier" }],
            ["Entreprise", { value: "business", clientType: "Entreprise" }],
            ["Avocat", { value: "legal", clientType: "Avocat", symptom: "encrypted" }],
            ["Assureur", { value: "legal", clientType: "Assureur", symptom: "encrypted" }],
            ["Comptable", { value: "business", clientType: "Comptable" }],
            ["Police/enquêteur", { value: "legal", clientType: "Police / enquêteur", symptom: "encrypted" }]
          ]
        }
      ]
    };
  const conversationAnswers = {};
  const renderBrief = (diagnostic) => {
    const handoff = diagnostic?.brief;
    if (!brief || !briefFields || !briefFocus || !handoff) return;

    brief.hidden = !diagnosisShown;
    const fieldRows = [
      [labels.serverVerified, handoff.recommendedPath || diagnostic.recommendedPath],
      [labels.serviceLevel, `${handoff.serviceLevelLabel || diagnostic.serviceLevelLabel || ""} ${handoff.sla || diagnostic.sla || ""}`.trim()],
      [labels.nextAction, handoff.nextStep],
      [labels.quoteReadiness, handoff.quoteLabel || handoff.quoteReadiness]
    ].filter(([, value]) => value);

    briefFields.replaceChildren(...fieldRows.flatMap(([term, description]) => {
      const dt = document.createElement("dt");
      dt.textContent = term;
      const dd = document.createElement("dd");
      dd.textContent = description;
      return [dt, dd];
    }));
    renderList(briefFocus, uniqueItems([handoff.clientAction, ...(handoff.operatorFocus || []), ...(handoff.missingInfo || []).map((item) => `${labels.missing}: ${item}`)]).slice(0, 5));
  };
  const renderServerHandoff = (diagnostic) => {
    const handoff = diagnostic?.brief;
    if (!result || !diagnosisShown || !handoff) return;

    result.querySelector("[data-chatbot-server-handoff]")?.remove();

    const message = document.createElement("div");
    message.className = "chatbot-message chatbot-message-assistant";
    message.setAttribute("data-chatbot-server-handoff", "");

    const title = document.createElement("p");
    const titleStrong = document.createElement("strong");
    titleStrong.textContent = `${labels.serverVerified}: ${handoff.recommendedPath || diagnostic.recommendedPath || ""}`;
    title.append(titleStrong);
    message.append(title);

    [
      handoff.nextStep && `${labels.nextAction}: ${handoff.nextStep}`,
      handoff.clientAction,
      handoff.missingInfo?.length ? `${labels.missing}: ${handoff.missingInfo.join(" / ")}` : ""
    ].filter(Boolean).forEach((line) => {
      const paragraph = document.createElement("p");
      paragraph.textContent = line;
      message.append(paragraph);
    });

    result.append(message);
  };
  const appendServerBriefToSummary = (diagnostic) => {
    const handoff = diagnostic?.brief;
    if (!handoff || latestDiagnosticSummary.includes(`${labels.brief}:`)) return;
    latestDiagnosticSummary = `${latestDiagnosticSummary} ${labels.brief}: ${handoff.recommendedPath || diagnostic.recommendedPath}. ${labels.serviceLevel}: ${handoff.serviceLevelLabel || diagnostic.serviceLevelLabel || ""}. ${labels.nextAction}: ${handoff.nextStep || ""}. ${labels.operatorFocus}: ${(handoff.operatorFocus || []).join(" / ")}.`;
    syncSummaryActions();
    if (diagnosisShown) applyDiagnosisToMainForm();
  };
  const normalizeSignalText = (...values) => values
    .filter((value) => typeof value === "string")
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const hasSignal = (text, words) => words.some((word) => text.includes(word));
  const buildExpertSignals = ({ support, symptom, urgency, value, state, context }) => {
    const text = normalizeSignalText(context, support, symptom, urgency, value, state);
    const keys = [];
    const add = (key) => {
      if (!keys.includes(key)) keys.push(key);
    };
    const mentionsInfrastructure = hasSignal(text, ["raid", "nas", "synology", "qnap", "server", "serveur", "rebuild", "reconstruction"]);
    const mentionsPhone = hasSignal(text, ["iphone", "android", "samsung", "passcode", "icloud", "google account", "verrouille", "locked"]);
    const mentionsForensic = hasSignal(text, ["preuve", "evidence", "legal", "juridique", "avocat", "lawyer", "court", "tribunal", "assurance", "insurer", "claim", "litige"]);
    const mentionsBusinessImpact = hasSignal(text, ["operations blocked", "operations bloquees", "payroll", "paie", "production", "client waiting", "client attend", "server down", "serveur down", "revenue loss", "perte de revenu"]);
    const routeOverride = mentionsForensic ? "forensic" : mentionsInfrastructure ? "infrastructure" : mentionsPhone ? "phone" : "";

    if (mentionsInfrastructure && !["raid", "server"].includes(support)) add("supportMismatch");
    if (mentionsBusinessImpact && urgency === "standard") add("urgencyUnderstated");
    if (hasSignal(text, ["click", "clique", "bruit", "noise", "drop", "tombe", "liquid", "liquide", "eau", "water", "not detected", "non detecte", "overheat", "chauffe"]) && !["physical", "water", "not_detected"].includes(symptom)) add("physicalHidden");
    if (mentionsForensic && value !== "legal") add("forensicHidden");
    if (hasSignal(text, ["chkdsk", "fsck", "first aid", "disk utility", "utilitaire de disque", "repair", "reparer", "repare", "rebuild", "reconstruction", "initialize", "initialiser", "format", "factory reset"])) add("repairAttempted");
    if (hasSignal(text, ["bitlocker", "filevault", "veracrypt", "password", "mot de passe", "recovery key", "cle de recuperation", "passcode", "icloud", "google account", "locked", "verrouille"])) add("credentialDependent");
    if (hasSignal(text, ["rice", "riz", "hair dryer", "seche cheveux", "freezer", "congel", "opened", "ouvert", "liquid", "liquide", "water", "eau", "isopropyl", "alcool"])) add("contamination");

    const labelsByKey = labels.expertSignals || {};
    const hiddenHazards = keys.filter((key) => !["supportMismatch", "urgencyUnderstated"].includes(key));
    const contradictions = keys.filter((key) => ["supportMismatch", "urgencyUnderstated"].includes(key));

    return {
      keys,
      hiddenHazards,
      contradictions,
      routeOverride,
      scoreBoost: hiddenHazards.length + (contradictions.length * 2),
      labels: keys.map((key) => labelsByKey[key] || key),
      has: (key) => keys.includes(key)
    };
  };
  const applyExpertOverrides = ({ support, symptom, urgency, value }, expertSignals) => ({
    support: expertSignals.routeOverride === "infrastructure" ? "raid" : expertSignals.routeOverride === "phone" ? "phone" : support,
    symptom: expertSignals.has("physicalHidden") ? "physical" : symptom,
    urgency: expertSignals.has("urgencyUnderstated") ? "business" : urgency,
    value: expertSignals.routeOverride === "forensic" ? "legal" : value
  });
  const buildClientIntelligence = ({ support, symptom, urgency, value, mood, context }) => {
    const text = normalizeSignalText(context, support, symptom, urgency, value, mood);
    let needKey = "technical_recovery";
    let signalKey = "neutral";

    if (hasSignal(text, ["photo", "video", "souvenir", "famille", "family", "father", "mother", "mere", "pere", "decede", "passed away", "wedding", "mariage", "baby", "bebe"])) {
      needKey = "personal_memory";
    } else if (hasSignal(text, ["preuve", "evidence", "legal", "juridique", "avocat", "lawyer", "court", "tribunal", "litige", "assurance", "insurer", "claim", "rh", "hr"]) || value === "legal") {
      needKey = "legal_or_insurance";
    } else if (hasSignal(text, ["payroll", "paie", "accounting", "comptabil", "quickbooks", "server", "serveur", "operations bloquees", "operations blocked", "production", "client waiting", "client attend", "invoice", "facture", "nas", "raid"]) || support === "raid" || support === "server" || value === "business") {
      needKey = "business_continuity";
    } else if (hasSignal(text, ["medical", "patient", "confidentiel", "confidential", "client list", "liste client", "employee", "employe"]) || value === "medical") {
      needKey = "privacy_sensitive";
    } else if (hasSignal(text, ["click", "clique", "bruit", "noise", "eau", "liquid", "drop", "tombe", "non detecte", "not detected", "redemarrage", "rebuild", "reconstruction"]) || ["physical", "water", "not_detected"].includes(symptom)) {
      needKey = "urgent_stabilization";
    }

    if (mood === "stressed" || hasSignal(text, ["panique", "panic", "desespere", "desperate", "pleure", "crying", "devast", "decede", "passed away", "irreplaceable", "irremplacable"])) {
      signalKey = "distressed";
    } else if (hasSignal(text, ["frustre", "frustrated", "fache", "angry", "tanne", "exhausted", "epuise", "personne repond"])) {
      signalKey = "frustrated";
    } else if (mood === "business_blocked" || needKey === "business_continuity" || hasSignal(text, ["operations blocked", "operations bloquees", "payroll", "paie", "production", "server down", "serveur down"])) {
      signalKey = "business_pressure";
    } else if (mood === "legal_pressure" || needKey === "legal_or_insurance") {
      signalKey = "legal_anxiety";
    }

    const [primary, nextStep] = labels.proposals[needKey] || labels.proposals.technical_recovery;
    const scoreBoost = (signalKey === "distressed" ? 3 : ["business_pressure", "legal_anxiety"].includes(signalKey) ? 2 : 0) + (["personal_memory", "business_continuity", "legal_or_insurance", "urgent_stabilization"].includes(needKey) ? 2 : 0);

    return {
      needKey,
      signalKey,
      needLabel: labels.needLabels[needKey],
      signalLabel: labels.signalLabels[signalKey],
      empathy: labels.empathyLines[signalKey],
      proposal: { primary, nextStep },
      scoreBoost
    };
  };
  const buildReasons = ({ support, symptom, urgency, history, value, state }, expertSignals = {}) => {
    const items = uniqueItems([
      ...(expertSignals.labels || []),
      (support === "raid" || support === "server") && labels.reasons.infrastructure,
      support === "ssd" && labels.reasons.ssd,
      support === "phone" && labels.reasons.phone,
      (symptom === "physical" || symptom === "water") && labels.reasons.physical,
      symptom === "encrypted" && labels.reasons.encrypted,
      symptom === "not_detected" && labels.reasons.notDetected,
      (urgency === "critical" || urgency === "business") && labels.reasons.urgent,
      history !== "no_attempt" && labels.reasons.attempted,
      (value === "business" || value === "legal" || value === "medical") && labels.reasons.sensitive,
      (state === "running" || state === "unknown") && labels.reasons.running,
      labels.reasons.default
    ]);
    return items.slice(0, 5);
  };
  const buildQuestions = ({ support, symptom, history }, expertSignals = {}) => {
    const items = uniqueItems([
      (expertSignals.contradictions || []).length > 0 && labels.questions.contradiction,
      expertSignals.has?.("urgencyUnderstated") && labels.questions.impact,
      expertSignals.has?.("repairAttempted") && labels.questions.attempted,
      expertSignals.has?.("credentialDependent") && labels.questions.credentials,
      expertSignals.has?.("contamination") && labels.questions.contamination,
      (support === "raid" || support === "server") && labels.questions.raid,
      support === "phone" && labels.questions.phone,
      (symptom === "physical" || symptom === "water" || symptom === "not_detected") && labels.questions.physical,
      symptom === "deleted" && labels.questions.deleted,
      symptom === "encrypted" && labels.questions.encrypted,
      history !== "no_attempt" && labels.questions.attempted,
      labels.questions.default
    ]);
    return items.slice(0, 5);
  };
  const buildFixes = ({ isCritical, expertSignals }) => uniqueItems([
    labels.fixes.safe,
    labels.fixes.route,
    labels.fixes.intake,
    labels.fixes.missing,
    isCritical && labels.fixes.emergency,
    (expertSignals?.keys || []).length > 0 && labels.fixes.expert,
    labels.fixes.handoff
  ]);
  const setSelectValue = (form, name, value) => {
    const field = form?.elements?.[name];
    if (!field || !value) return false;
    field.value = value;
    return field.value === value;
  };
  const applyDiagnosisToMainForm = () => {
    const intakeForm = document.querySelector("[data-intake-form]");
    if (!intakeForm) return false;

    setSelectValue(intakeForm, "support", latestCasePayload.support);
    setSelectValue(intakeForm, "urgence", latestCasePayload.urgence);
    setSelectValue(intakeForm, "profil", latestCasePayload.profil);
    setSelectValue(intakeForm, "impact", latestCasePayload.impact);
    setSelectValue(intakeForm, "sensibilite", latestCasePayload.sensibilite);

    const messageField = intakeForm.elements?.message;
    if (messageField && (!messageField.value.trim() || messageField.dataset.chatbotFilled === "true")) {
      messageField.value = latestDiagnosticSummary;
      messageField.dataset.chatbotFilled = "true";
    }

    const status = intakeForm.querySelector("[data-form-status]") || document.querySelector("[data-form-status]");
    if (status && diagnosisShown) {
      status.dataset.state = "success";
      status.textContent = labels.autoFillStatus;
    }

    try {
      sessionStorage.setItem("nexuradata_diagnostic_summary", latestDiagnosticSummary);
      sessionStorage.setItem("nexuradata_diagnostic_payload", JSON.stringify(latestCasePayload));
    } catch {
      // Optional browser handoff only.
    }

    return true;
  };
  const syncSummaryActions = () => {
    if (serviceLink) {
      serviceLink.href = latestServiceHref;
    }

    if (emailLink) {
      emailLink.href = `mailto:contact@nexuradata.ca?subject=${encodeURIComponent(labels.emailSubject)}&body=${encodeURIComponent(latestDiagnosticSummary)}`;
    }
  };
  const applyServerDiagnostic = (diagnostic) => {
    if (!diagnostic) return;
    latestServerDiagnostic = diagnostic;
    renderBrief(diagnostic);
    renderServerHandoff(diagnostic);
    appendServerBriefToSummary(diagnostic);

    if (diagnostic.servicePath && serviceLink) {
      latestServiceHref = `${homePrefix}${diagnostic.servicePath}`;
      serviceLink.href = latestServiceHref;
    }

    const serverExpertLabels = localizeExpertSignalKeys(diagnostic.expertSignals?.signals || []);
    if (serverExpertLabels.length > 0) {
      renderList(expertSignalsTarget, serverExpertLabels);
      if (expert && diagnosisShown) expert.hidden = false;
    }

    const serverQuestions = diagnostic.missingInfoLabels || [];
    if (serverQuestions.length > 0) {
      const existingQuestions = questionsTarget ? [...questionsTarget.querySelectorAll("li")].map((item) => item.textContent) : [];
      renderList(questionsTarget, uniqueItems([...serverQuestions, ...existingQuestions]).slice(0, 5));
    }

    if (diagnostic.clientActions?.length) {
      const existingProtocol = protocolTarget ? [...protocolTarget.querySelectorAll("li")].map((item) => item.textContent) : [];
      renderList(protocolTarget, uniqueItems([...diagnostic.clientActions, ...existingProtocol]).slice(0, 5));
    }

    try {
      sessionStorage.setItem("nexuradata_server_diagnostic", JSON.stringify(diagnostic));
    } catch {
      // Optional browser handoff only.
    }
  };
  const requestServerDiagnostic = async (scenario) => {
    const requestId = ++diagnosticRequestId;

    try {
      const response = await fetch(diagnosticEndpoint, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(scenario)
      });
      const data = await parseBotJsonResponse(response);

      if (requestId !== diagnosticRequestId || !response.ok || !data?.ok) return;
      applyServerDiagnostic(data.diagnostic);
    } catch {
      // Static previews and offline sessions keep the local diagnostic.
    }
  };
  const scheduleServerDiagnostic = (scenario) => {
    if (!diagnosisShown) return;
    window.clearTimeout(serverDiagnosticTimer);
    serverDiagnosticTimer = window.setTimeout(() => requestServerDiagnostic(scenario), 320);
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
  const normalizeForMatch = (value) => `${value || ""}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const inferScenarioFromContext = (scenario) => {
    const text = normalizeForMatch(scenario.context);
    const inferred = { ...scenario };

    if (/\b(raid|nas|synology|qnap|serveur|server|vmware|hyper-v)\b/.test(text)) inferred.support = text.includes("serveur") || text.includes("server") ? "server" : "raid";
    else if (/\b(iphone|ipad|android|telephone|phone|cellulaire|mobile)\b/.test(text)) inferred.support = "phone";
    else if (/\b(ssd|nvme|m\.2)\b/.test(text)) inferred.support = "ssd";
    else if (/\b(usb|cle usb|carte sd|microsd|sd card)\b/.test(text)) inferred.support = "removable";

    if (/\b(liquide|eau|cafe|mouille|water|liquid|wet)\b/.test(text)) inferred.symptom = "water";
    else if (/\b(bruit|clac|clique|choc|tombe|drop|noise|clicking|burn|odeur)\b/.test(text)) inferred.symptom = "physical";
    else if (/\b(chiffre|bitlocker|mot de passe|password|preuve|legal|juridique|assurance|police)\b/.test(text)) inferred.symptom = "encrypted";
    else if (/\b(non detecte|non reconnu|plus detecte|plus reconnu|not detected|unrecognized|n'apparait|apparait pas)\b/.test(text) || /n.est plus (detecte|reconnu)/.test(text)) inferred.symptom = "not_detected";
    else if (/\b(lent|slow|freeze|bloque|instable)\b/.test(text)) inferred.symptom = "slow";
    else if (/\b(supprime|efface|formatte|delete|deleted|format)\b/.test(text)) inferred.symptom = "deleted";

    if (/\b(urgent|urgence|maintenant|bloque|production|entreprise|business|client|serveur|server|critique|critical)\b/.test(text)) inferred.urgency = /\b(maintenant|bloque|critique|critical|production)\b/.test(text) ? "critical" : "business";

    if (/\b(logiciel|software|recuva|disk drill|easeus|tent[eé]|tried)\b/.test(text)) inferred.history = "software";
    if (/\b(ouvert|opened|demont[eé]|riz|rice|chaleur|heat|congele|freezer)\b/.test(text)) inferred.history = "opened";
    if (/\b(rebuild|reconstruction|initialis[eé]|initialize|formatte|formatted)\b/.test(text)) inferred.history = "rebuild";
    if (/\b(redemarr[eé]|reboot|redemar|powered on|encore allume)\b/.test(text)) inferred.history = "powered_on";

    if (/\b(preuve|legal|juridique|assurance|lawyer|court|police)\b/.test(text)) inferred.value = "legal";
    else if (/\b(medical|sante|patient|health)\b/.test(text)) inferred.value = "medical";
    else if (/\b(entreprise|business|client|compta|serveur|server|production)\b/.test(text)) inferred.value = "business";

    if (/\b(encore allume|running|powered on|ouvert sur l'ecran)\b/.test(text)) inferred.state = "running";
    if (/\b(eteint|off|debranche|unplugged)\b/.test(text)) inferred.state = "powered_off";

    return inferred;
  };
  const buildScenarioFromDiagnosticForm = () => {
    const formData = new FormData(diagnosticForm);
    const scenario = inferScenarioFromContext({
      support: formData.get("support") || "drive",
      symptom: formData.get("symptom") || "not_detected",
      urgency: formData.get("urgency") || "standard",
      history: formData.get("history") || "no_attempt",
      value: formData.get("value") || "personal",
      state: formData.get("state") || "unknown",
      mood: formData.get("mood") || "okay",
      context: `${formData.get("context") || ""}`.trim().slice(0, 620)
    });
    scenario.caseSymptom = `${formData.get("caseSymptom") || ""}`.trim();
    scenario.clientType = `${formData.get("clientType") || ""}`.trim();
    return scenario;
  };
  const buildBotEstimate = (scenario) => {
    const quoted = isEnglishDocument ? "Firm quote after review" : "Prix ferme après diagnostic";
    const paymentAfterApproval = isEnglishDocument
      ? "Payment link after case opening and written approval."
      : "Lien de paiement après ouverture du dossier et accord écrit.";
    const paymentPortal = conversationCopy.paymentHint;
    const hasHighRisk = ["physical", "water", "encrypted"].includes(scenario.symptom) || ["opened", "rebuild"].includes(scenario.history) || ["legal", "medical"].includes(scenario.value);

    if (scenario.value === "legal" || scenario.symptom === "encrypted") {
      return {
        price: isEnglishDocument ? "Forensic review from $2,500 CAD" : "Revue forensique dès 2 500 $ CA",
        payment: paymentPortal
      };
    }

    if (scenario.support === "raid" || scenario.support === "server") {
      return {
        price: isEnglishDocument ? "Server/RAID triage $399-$1,200 CAD; recovery usually $1,200+ CAD" : "Triage serveur/RAID 399 $-1 200 $ CA; récupération souvent 1 200 $+ CA",
        payment: isEnglishDocument ? `${paymentAfterApproval} Stripe deposit can be created from the admin cockpit.` : `${paymentAfterApproval} Un dépôt Stripe peut être créé depuis le cockpit admin.`
      };
    }

    if (hasHighRisk) {
      return {
        price: scenario.support === "phone" ? (isEnglishDocument ? "Physical phone cases from $699 CAD" : "Téléphone physique dès 699 $ CA") : quoted,
        payment: paymentAfterApproval
      };
    }

    if (scenario.support === "phone") {
      return { price: isEnglishDocument ? "Phone logical recovery from $299 CAD" : "Téléphone logique dès 299 $ CA", payment: paymentAfterApproval };
    }

    if (scenario.support === "removable") {
      return { price: isEnglishDocument ? "USB / memory card from $299 CAD" : "USB / carte mémoire dès 299 $ CA", payment: paymentAfterApproval };
    }

    if (scenario.symptom === "deleted") {
      return { price: isEnglishDocument ? "Deleted files from $199 CAD" : "Fichiers supprimés dès 199 $ CA", payment: paymentAfterApproval };
    }

    if (scenario.support === "ssd") {
      return { price: isEnglishDocument ? "SSD / NVMe lab work from $649 CAD" : "SSD / NVMe en laboratoire dès 649 $ CA", payment: paymentAfterApproval };
    }

    return { price: isEnglishDocument ? "HDD / external drive from $299 CAD; complex cases from $649 CAD" : "HDD / disque externe dès 299 $ CA; cas complexes dès 649 $ CA", payment: paymentAfterApproval };
  };
  const setDiagnosticValues = (values = {}) => {
    Object.entries(values).forEach(([name, value]) => {
      const field = diagnosticForm?.elements?.[name];
      if (field) field.value = value;
    });
  };
  const createConversationBubble = (role, text) => {
    const row = document.createElement("div");
    row.className = `chatbot-conversation-row is-${role}`;
    if (role === "assistant") {
      const avatar = document.createElement("img");
      avatar.className = "chatbot-conversation-avatar";
      avatar.src = "/assets/nexuradata-icon.png";
      avatar.alt = "";
      avatar.width = 28;
      avatar.height = 28;
      avatar.decoding = "async";
      avatar.loading = "lazy";
      row.appendChild(avatar);
    }
    const bubble = document.createElement("p");
    bubble.className = `chatbot-conversation-line is-${role}`;
    bubble.textContent = text;
    row.appendChild(bubble);
    return row;
  };
  const showTypingThen = (next, delay = 420) => {
    if (!thread) { next(); return; }
    const row = document.createElement("div");
    row.className = "chatbot-conversation-row is-assistant";
    const avatar = document.createElement("img");
    avatar.className = "chatbot-conversation-avatar";
    avatar.src = "/assets/nexuradata-icon.png";
    avatar.alt = "";
    avatar.width = 28;
    avatar.height = 28;
    avatar.decoding = "async";
    row.appendChild(avatar);
    const bubble = document.createElement("p");
    bubble.className = "chatbot-conversation-line is-assistant";
    const dots = document.createElement("span");
    dots.className = "chatbot-typing";
    dots.textContent = "...";
    bubble.appendChild(dots);
    row.appendChild(bubble);
    thread.appendChild(row);
    quickActions?.replaceChildren();
    window.setTimeout(next, delay);
  };
  const initLiveClock = () => {
    const liveBadge = dock.querySelector("[data-chatbot-live]");
    const clockEl = dock.querySelector("[data-chatbot-clock]");
    if (!liveBadge || !clockEl) return;
    const tick = () => {
      try {
        const now = new Date();
        const time = new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Toronto",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        }).format(now);
        const hourMtl = Number(new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Toronto",
          hour: "2-digit",
          hour12: false
        }).format(now));
        const dayMtl = new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Toronto",
          weekday: "short"
        }).format(now);
        const isWeekday = !["Sat", "Sun"].includes(dayMtl);
        const open = isWeekday && hourMtl >= 8 && hourMtl < 19;
        clockEl.textContent = `MTL · ${time}`;
        liveBadge.dataset.liveState = open ? "open" : "closed";
      } catch {
        clockEl.textContent = "MTL";
      }
    };
    tick();
    window.setInterval(tick, 30000);
  };
  const renderConversation = () => {
    // Legacy step-by-step quiz disabled. The /api/concierge LLM now drives
    // the conversation end-to-end via free-text input. We only clear the step
    // badge so it does not display a stale "01 / 04" indicator.
    const stepBadge = dock.querySelector("[data-chatbot-step]");
    if (stepBadge) stepBadge.textContent = "";
    if (quickActions) quickActions.replaceChildren();
    dock.dataset.chatbotPhase = "open-text";
    return;
    // eslint-disable-next-line no-unreachable
    if (!thread || !quickActions) return;

    const answeredSteps = conversationCopy.steps.filter((step) => conversationAnswers[step.key]);
    const currentStep = conversationCopy.steps.find((step) => !conversationAnswers[step.key]);
    dock.dataset.chatbotPhase = currentStep ? "asking" : "open-text";

    const stepBadge = dock.querySelector("[data-chatbot-step]");
    if (stepBadge) {
      const total = conversationCopy.steps.length;
      const current = currentStep ? answeredSteps.length + 1 : total;
      stepBadge.textContent = `${String(current).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
    }

    const lines = [];

    if (answeredSteps.length === 0) {
      lines.push(createConversationBubble("assistant", conversationCopy.steps[0].question));
    } else {
      answeredSteps.forEach((step) => {
        lines.push(createConversationBubble("assistant", step.question));
        lines.push(createConversationBubble("user", conversationAnswers[step.key]));
      });
      if (currentStep) {
        lines.push(createConversationBubble("assistant", currentStep.question));
      } else {
        lines.push(createConversationBubble("assistant", conversationCopy.finalPrompt));
      }
    }

    thread.replaceChildren(...lines);
    quickActions.replaceChildren();

    if (currentStep) {
      currentStep.options.forEach(([label, values]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "chatbot-quick-choice";
        button.textContent = label;
        button.addEventListener("click", () => {
          conversationAnswers[currentStep.key] = label;
          setDiagnosticValues(values);
          showTypingThen(() => {
            renderConversation();
            const scenario = updateDiagnosis();
            const estimate = buildBotEstimate(scenario);
            if (estimateTarget) {
              estimateTarget.hidden = false;
              estimateTarget.textContent = `${conversationCopy.estimatePrefix}: ${estimate.price}. ${conversationCopy.stripePrefix}: ${estimate.payment}`;
            }
          });
          trackGaEvent("chatbot_conversation_answer", { event_category: "diagnostic", method: currentStep.key });
        });
        quickActions.append(button);
      });
      return;
    }

    const estimate = buildBotEstimate(buildScenarioFromDiagnosticForm());
    if (estimateTarget) {
      estimateTarget.hidden = false;
      estimateTarget.textContent = `${conversationCopy.estimatePrefix}: ${estimate.price}. ${conversationCopy.stripePrefix}: ${estimate.payment}`;
    }
  };
  const updateDiagnosis = () => {
    const scenario = buildScenarioFromDiagnosticForm();
    const context = scenario.context || "";
    latestServerDiagnostic = null;
    if (brief) brief.hidden = true;
    const expertSignals = buildExpertSignals(scenario);
    const effectiveScenario = { ...scenario, ...applyExpertOverrides(scenario, expertSignals) };
    const clientIntelligence = buildClientIntelligence(effectiveScenario);
    const score =
      ({ raid: 3, server: 3, ssd: 2, phone: 1, drive: 0, removable: 0 }[effectiveScenario.support] || 0) +
      ({ water: 4, physical: 4, encrypted: 3, not_detected: 2, slow: 1, deleted: 0 }[effectiveScenario.symptom] || 0) +
      ({ critical: 4, business: 2, standard: 0 }[effectiveScenario.urgency] || 0) +
      ({ rebuild: 4, opened: 3, software: 2, powered_on: 2, no_attempt: 0 }[effectiveScenario.history] || 0) +
      ({ legal: 2, medical: 2, business: 1, personal: 0 }[effectiveScenario.value] || 0) +
      ({ running: 2, unknown: 1, powered_off: 0, unplugged: 0 }[effectiveScenario.state] || 0) +
      clientIntelligence.scoreBoost +
      expertSignals.scoreBoost;
    const level = score >= 13 ? "critical" : score >= 9 ? "high" : score >= 5 ? "priority" : "logical";
    const isCritical = level === "critical";
    const confidence = Math.min(96, 62 + (score * 3));
    const [title, route, avoid] = labels.cases[level];
    const selectedSupport = optionLabel(labels.supportOptions, effectiveScenario.support);
    const selectedSymptom = optionLabel(labels.symptomOptions, effectiveScenario.symptom);
    const selectedUrgency = optionLabel(labels.urgencyOptions, effectiveScenario.urgency);
    result.innerHTML = `
      <div class="chatbot-message chatbot-message-assistant">
        <p>${clientIntelligence.empathy}</p>
        <p><strong>${title}</strong></p>
        <p>${route}</p>
        <p>${avoid}</p>
      </div>
    `;
    const protocolItems = labels.protocols[level] || [];
    const fixItems = buildFixes({ isCritical, expertSignals });
    const reasonItems = buildReasons(effectiveScenario, expertSignals);
    const questionItems = buildQuestions(effectiveScenario, expertSignals);
    renderList(protocolTarget, protocolItems);
    renderList(fixesTarget, fixItems);
    renderList(expertSignalsTarget, expertSignals.labels.length ? expertSignals.labels : [labels.guardrail]);
    if (expert) expert.hidden = true;
    renderList(reasonsTarget, reasonItems);
    renderList(questionsTarget, questionItems);
    if (fixed) fixed.hidden = !diagnosisShown;
    if (insight) insight.hidden = !diagnosisShown;
    if (protocolTarget) protocolTarget.hidden = !diagnosisShown;
    latestServiceHref = getServiceHref(effectiveScenario.support, effectiveScenario.symptom, effectiveScenario.value);
    latestCasePayload = {
      support: mapCaseSupport(effectiveScenario.support, effectiveScenario.symptom, effectiveScenario.value),
      symptome: mapCaseSymptom(effectiveScenario),
      urgence: mapCaseUrgency(effectiveScenario.urgency, effectiveScenario.symptom, effectiveScenario.value),
      profil: mapCaseClientType(effectiveScenario),
      impact: mapCaseImpact(effectiveScenario.urgency, effectiveScenario.value),
      sensibilite: mapCaseSensitivity(effectiveScenario.symptom, effectiveScenario.value)
    };
    latestDiagnosticSummary = [
      `${title}`,
      `${labels.contextLabel}: ${context || labels.placeholder}`,
      `${labels.supportLabel}: ${selectedSupport}`,
      `${labels.symptomLabel}: ${selectedSymptom}`,
      `${labels.urgencyLabel}: ${selectedUrgency}`,
      `${labels.moodLabel}: ${moodLabelFor(effectiveScenario.mood)}`,
      `${labels.route}: ${route}`,
      `${labels.avoid}: ${avoid}`
    ].filter(Boolean).join("\n");
    syncSummaryActions();
    if (diagnosisShown) applyDiagnosisToMainForm();
    emergencyLink.hidden = !isCritical;
    emergencyLink.href = `https://wa.me/${waNumber}?text=${encodeURIComponent(`${labels.waIntro}\n${latestDiagnosticSummary}`)}`;
    return scenario;
  };

  const showDiagnosisResult = () => {
    diagnosisShown = true;
    setDiagnosisVisibility(true);
    const scenario = updateDiagnosis();
    scheduleServerDiagnostic(scenario);
    applyDiagnosisToMainForm();
    caseForm?.scrollIntoView({ block: "nearest" });
    caseForm?.querySelector("input")?.focus({ preventScroll: true });
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
      ville: `${formData.get("ville") || ""}`.trim(),
      preferenceContact: `${formData.get("preferenceContact") || "email"}`.trim(),
      support: latestCasePayload.support,
      symptome: latestCasePayload.symptome,
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
        const serverPlan = data.automation || data.concierge || null;
        setCaseStatus("success", labels.caseOpened(caseId, serverPlan));

        if (statusLink && caseId) {
          statusLink.href = `${statusHref}?caseId=${encodeURIComponent(caseId)}`;
        }

        if (paymentLink && caseId) {
          paymentLink.href = `${statusHref}?caseId=${encodeURIComponent(caseId)}#paiement`;
          paymentLink.textContent = labels.paymentPrepared;
        }

        if (serverPlan?.servicePath && serviceLink) {
          latestServiceHref = `${homePrefix}${serverPlan.servicePath}`;
          serviceLink.href = latestServiceHref;
        }

        if (data.concierge?.whatsappUrl && emergencyLink) {
          emergencyLink.hidden = false;
          emergencyLink.href = data.concierge.whatsappUrl;
        }

        try {
          sessionStorage.setItem("nexuradata_latest_case_id", caseId);
          sessionStorage.setItem("nexuradata_diagnostic_summary", latestDiagnosticSummary);
          if (serverPlan) sessionStorage.setItem("nexuradata_server_automation", JSON.stringify(serverPlan));
        } catch {
          // Optional browser handoff only.
        }

        trackIntakeFormSubmit(data?.delivery?.client || "chatbot_case_assistant");
        trackContactIntent("chatbot_autonomous_case_created");
        return;
      }

      if (data?.fallback === "mailto" || response.status >= 500 || [404, 405, 429].includes(response.status) || /anti-abus|temporarily unavailable|indisponible/i.test(data?.message || "")) {
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

  // ── CONCIERGE: multi-turn LLM-backed concierge ──────────────
  // Conversation history kept in-memory only; never persisted client-side.
  const conciergeEndpoint = "/api/concierge";
  const conciergeLocale = isEnglishDocument ? "en" : "fr";
  const conciergeMaxHistory = 12;
  const conciergeMaxChars = 1800;
  const conciergeMaxImages = 2;
  const conciergeMaxImageBytes = 5 * 1024 * 1024;
  const conciergeAllowedImageMimes = new Set(["image/jpeg", "image/png", "image/webp"]);
  const conciergeState = {
    history: [],
    busy: false,
    greeted: false,
    disabled: false,
    pendingImages: []
  };
  const conciergeCopy = isEnglishDocument
    ? {
      greeting:
        "Hi, this is NEXURADATA. Tell me what happened to the device — what kind of media it is, what it does or doesn't do right now, and how urgent this is for you. I read everything before suggesting anything.",
      thinking: "Reading…",
      networkError: "I lost the connection for a moment. Send your message again — I'll pick it up.",
      placeholder: "Describe the device, what changed, and the files you need.",
      submitDefault: "Send",
      submitBusy: "Reading…",
      attachLabel: "+ Photo",
      attachRemove: "Remove",
      attachTooLarge: "Image too large (max 5 MB).",
      attachBadType: "Use a JPEG, PNG or WebP image.",
      attachTooMany: "Two images max per message."
    }
    : {
      greeting:
        "Bonjour, ici NEXURADATA. Décrivez-moi ce qui est arrivé à l'appareil — quel type de support, ce qu'il fait ou ne fait plus, et l'urgence pour vous. Je lis tout avant de suggérer quoi que ce soit.",
      thinking: "Lecture…",
      networkError: "J'ai perdu la connexion un instant. Renvoyez votre message — je le reprends.",
      placeholder: "Décrivez l'appareil, ce qui a changé et les fichiers dont vous avez besoin.",
      submitDefault: "Envoyer",
      submitBusy: "Lecture…",
      attachLabel: "+ Photo",
      attachRemove: "Retirer",
      attachTooLarge: "Image trop lourde (max 5 Mo).",
      attachBadType: "Utilisez une image JPEG, PNG ou WebP.",
      attachTooMany: "Deux images maximum par message."
    };
  const submitButton = diagnosticForm.querySelector("[data-chatbot-diagnostic-submit]");
  const contextField = diagnosticForm.querySelector('textarea[name="context"]');
  if (contextField) {
    contextField.placeholder = conciergeCopy.placeholder;
    contextField.required = false;
  }
  if (submitButton) {
    submitButton.textContent = conciergeCopy.submitDefault;
  }
  const scrollThreadToBottom = () => {
    if (!panel) return;
    window.requestAnimationFrame(() => {
      panel.scrollTop = panel.scrollHeight;
    });
  };
  const appendChatBubble = (role, text) => {
    if (!thread || !text) return null;
    const node = document.createElement("p");
    node.className = `chatbot-conversation-line is-${role === "user" ? "user" : "assistant"}`;
    node.textContent = text;
    thread.appendChild(node);
    scrollThreadToBottom();
    return node;
  };
  // Lightweight typing indicator: a single assistant bubble with three dots
  // animated via textContent rotation. Removed when a real reply arrives so
  // the IBM bubble stack stays clean.
  let typingIndicatorNode = null;
  let typingIndicatorTimer = null;
  const showTypingIndicator = () => {
    if (!thread || typingIndicatorNode) return;
    typingIndicatorNode = document.createElement("p");
    typingIndicatorNode.className = "chatbot-conversation-line is-assistant is-typing";
    typingIndicatorNode.setAttribute("aria-label", conciergeCopy.thinking);
    typingIndicatorNode.textContent = `${conciergeCopy.thinking} ·`;
    thread.appendChild(typingIndicatorNode);
    scrollThreadToBottom();
    let dots = 1;
    typingIndicatorTimer = window.setInterval(() => {
      dots = (dots % 3) + 1;
      if (typingIndicatorNode) {
        typingIndicatorNode.textContent = `${conciergeCopy.thinking} ${"·".repeat(dots)}`;
      }
    }, 480);
  };
  const hideTypingIndicator = () => {
    if (typingIndicatorTimer) {
      window.clearInterval(typingIndicatorTimer);
      typingIndicatorTimer = null;
    }
    if (typingIndicatorNode?.parentNode) {
      typingIndicatorNode.parentNode.removeChild(typingIndicatorNode);
    }
    typingIndicatorNode = null;
  };
  const renderConciergeSuggestions = (suggestions = [], opts = {}) => {
    if (!quickActions) return;
    quickActions.replaceChildren();
    // Always offer the attach action so visitors can send a photo of the
    // damaged drive / error screen on any turn.
    const attachButton = document.createElement("button");
    attachButton.type = "button";
    attachButton.className = "chatbot-quick-choice";
    attachButton.textContent = conciergeCopy.attachLabel;
    attachButton.addEventListener("click", () => {
      if (conciergeState.busy) return;
      fileInput.click();
    });
    quickActions.appendChild(attachButton);
    if (!Array.isArray(suggestions) || suggestions.length === 0) return;
    suggestions.slice(0, 3).forEach((label, index) => {
      const text = `${label || ""}`.trim().slice(0, 80);
      if (!text) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "chatbot-quick-choice";
      // First chip on a priority-intake turn doubles as the strong CTA.
      if (opts.priorityIntake && index === 0) {
        button.setAttribute("data-chatbot-priority-cta", "true");
        button.style.fontWeight = "600";
      }
      button.textContent = text;
      button.addEventListener("click", () => {
        if (conciergeState.busy || !contextField) return;
        contextField.value = text;
        diagnosticForm.requestSubmit?.() || diagnosticForm.dispatchEvent(new Event("submit", { cancelable: true }));
      });
      quickActions.appendChild(button);
    });
  };
  const ensureConciergeGreeting = () => {
    if (conciergeState.greeted || !thread) return;
    conciergeState.greeted = true;
    appendChatBubble("assistant", conciergeCopy.greeting);
  };

  // ── Attachment UI: image previews + hidden file input.
  // We add a single `+ Photo` chip into the existing quick-actions strip and
  // a hidden file input. Image previews live in their own row created on
  // demand. No HTML or CSS changes — everything is JS-driven and reuses the
  // existing `chatbot-quick-choice` IBM-style chip styling.
  let attachmentRow = null;
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = Array.from(conciergeAllowedImageMimes).join(",");
  fileInput.multiple = true;
  fileInput.hidden = true;
  fileInput.setAttribute("data-chatbot-image-input", "");
  diagnosticForm.appendChild(fileInput);

  const ensureAttachmentRow = () => {
    if (attachmentRow) return attachmentRow;
    attachmentRow = document.createElement("div");
    attachmentRow.className = "chatbot-quick-actions";
    attachmentRow.setAttribute("data-chatbot-attachments", "");
    attachmentRow.style.marginTop = "0.5rem";
    if (quickActions?.parentNode) {
      quickActions.parentNode.insertBefore(attachmentRow, quickActions.nextSibling);
    } else {
      diagnosticForm.appendChild(attachmentRow);
    }
    return attachmentRow;
  };

  const renderAttachmentChips = () => {
    const row = ensureAttachmentRow();
    row.replaceChildren();
    if (conciergeState.pendingImages.length === 0) {
      row.style.display = "none";
      return;
    }
    row.style.display = "";
    conciergeState.pendingImages.forEach((image, index) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chatbot-quick-choice";
      chip.textContent = `${image.name} · ${conciergeCopy.attachRemove}`;
      chip.addEventListener("click", () => {
        conciergeState.pendingImages.splice(index, 1);
        renderAttachmentChips();
      });
      row.appendChild(chip);
    });
  };

  const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });

  const handleAttachFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    for (const file of Array.from(fileList)) {
      if (conciergeState.pendingImages.length >= conciergeMaxImages) {
        appendChatBubble("assistant", conciergeCopy.attachTooMany);
        break;
      }
      if (!conciergeAllowedImageMimes.has(file.type)) {
        appendChatBubble("assistant", conciergeCopy.attachBadType);
        continue;
      }
      if (file.size > conciergeMaxImageBytes) {
        appendChatBubble("assistant", conciergeCopy.attachTooLarge);
        continue;
      }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        conciergeState.pendingImages.push({
          name: `${file.name || "image"}`.slice(0, 60),
          dataUrl: `${dataUrl}`
        });
      } catch {
        // swallow read errors silently — the user can retry.
      }
    }
    renderAttachmentChips();
  };

  fileInput.addEventListener("change", () => {
    handleAttachFiles(fileInput.files);
    fileInput.value = "";
  });
  const setConciergeBusy = (busy) => {
    conciergeState.busy = busy;
    if (submitButton) {
      submitButton.disabled = busy;
      submitButton.textContent = busy ? conciergeCopy.submitBusy : conciergeCopy.submitDefault;
    }
    if (contextField) contextField.disabled = busy;
  };
  const pushConciergeMessage = (role, content) => {
    if (!content) return;
    conciergeState.history.push({ role, content: `${content}`.slice(0, conciergeMaxChars) });
    if (conciergeState.history.length > conciergeMaxHistory) {
      conciergeState.history.splice(0, conciergeState.history.length - conciergeMaxHistory);
    }
  };
  const handleConciergeTurn = async (rawInput) => {
    const userText = `${rawInput || ""}`.trim().slice(0, conciergeMaxChars);
    const attachments = conciergeState.pendingImages.slice(0, conciergeMaxImages);
    if (!userText && attachments.length === 0) return;
    if (conciergeState.busy) return;
    ensureConciergeGreeting();
    // Visible bubble: text + a hint about how many images were attached.
    const visibleText = attachments.length > 0
      ? `${userText}${userText ? "\n" : ""}[${attachments.length} image${attachments.length > 1 ? "s" : ""}]`
      : userText;
    appendChatBubble("user", visibleText || `[${attachments.length} image]`);

    // History payload: multimodal when images are attached, plain string otherwise.
    let historyContent;
    if (attachments.length > 0) {
      historyContent = [
        ...(userText ? [{ type: "text", text: userText }] : []),
        ...attachments.map((image) => ({ type: "image_url", image_url: { url: image.dataUrl } }))
      ];
    } else {
      historyContent = userText;
    }
    conciergeState.history.push({ role: "user", content: historyContent });
    if (conciergeState.history.length > conciergeMaxHistory) {
      conciergeState.history.splice(0, conciergeState.history.length - conciergeMaxHistory);
    }
    // Clear pending attachments now that they have been queued.
    conciergeState.pendingImages = [];
    renderAttachmentChips();
    if (contextField) contextField.value = "";
    setConciergeBusy(true);
    if (quickActions) quickActions.replaceChildren();
    showTypingIndicator();

    // Page context lets the model adapt to where the user came from
    // (e.g. the RAID page vs the phone page) without leaking PII.
    const pageContext = {
      path: window.location.pathname || "/",
      title: (document.title || "").slice(0, 160)
    };

    let data = null;
    try {
      const response = await fetch(conciergeEndpoint, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          locale: conciergeLocale,
          messages: conciergeState.history,
          page: pageContext
        })
      });
      data = await parseBotJsonResponse(response);
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || "concierge-unavailable");
      }
    } catch {
      hideTypingIndicator();
      appendChatBubble("assistant", conciergeCopy.networkError);
      setConciergeBusy(false);
      return;
    }

    hideTypingIndicator();
    const reply = `${data.reply || ""}`.trim();
    if (reply) {
      appendChatBubble("assistant", reply);
      pushConciergeMessage("assistant", reply);
    }
    renderConciergeSuggestions(data.suggestions || [], { priorityIntake: Boolean(data.priorityIntake) });

    if (data.triage) {
      latestServerDiagnostic = data.triage;
      showDiagnosisResult();
      applyServerDiagnostic(data.triage);
      trackGaEvent("chatbot_concierge_triage", {
        event_category: "diagnostic",
        method: data.provider || "openai"
      });
      if (data.priorityIntake) {
        trackGaEvent("chatbot_concierge_priority", {
          event_category: "diagnostic",
          method: data.provider || "openai"
        });
      }
    } else {
      trackGaEvent("chatbot_concierge_turn", {
        event_category: "diagnostic",
        method: data.provider || "openai"
      });
    }
    setConciergeBusy(false);
  };
  toggleButton?.addEventListener("click", () => {
    if (dock.dataset.chatbotOpen === "true") ensureConciergeGreeting();
  });
  diagnosticForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = contextField ? contextField.value : "";
    const hasText = `${value || ""}`.trim().length > 0;
    const hasImages = conciergeState.pendingImages.length > 0;
    if (!hasText && !hasImages) {
      // Empty submit falls back to the legacy local renderer so the dock
      // never feels frozen if the model isn't called yet.
      showDiagnosisResult();
      return;
    }
    handleConciergeTurn(value);
  });
  diagnosticForm.addEventListener("change", () => {
    const scenario = updateDiagnosis();
    if (diagnosisShown) {
      scheduleServerDiagnostic(scenario);
      setCaseStatus("", "");
      trackGaEvent("chatbot_diagnostic", { event_category: "diagnostic", method: "local_triage" });
    }
  });
  diagnosticForm.addEventListener("input", () => {
    if (!diagnosisShown) return;
    const scenario = updateDiagnosis();
    scheduleServerDiagnostic(scenario);
    setCaseStatus("", "");
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
  // Close on outside click — but decide from pointerdown so that a re-render
  // triggered by an in-dock click does not detach the target before we check.
  let pointerDownInsideDock = false;
  document.addEventListener("pointerdown", (event) => {
    if (dock.dataset.chatbotOpen !== "true") {
      pointerDownInsideDock = false;
      return;
    }
    const path = typeof event.composedPath === "function" ? event.composedPath() : [];
    pointerDownInsideDock = path.includes(dock) || dock.contains(event.target);
  }, true);
  document.addEventListener("click", (event) => {
    if (dock.dataset.chatbotOpen !== "true") return;
    if (pointerDownInsideDock) {
      pointerDownInsideDock = false;
      return;
    }
    const path = typeof event.composedPath === "function" ? event.composedPath() : [];
    if (path.includes(dock) || dock.contains(event.target)) return;
    setDockOpen(false);
  });
  renderConversation();
  updateDiagnosis();
  setDiagnosisVisibility(false);
  syncPaymentLink();
  watchHeroMediaOverlap();
  initLiveClock();

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

      if (link.dataset.chatbotAction === "email_summary" || link.dataset.chatbotAction === "service_route") {
        syncSummaryActions();
      }

      if (link.dataset.chatbotAction === "case") {
        applyDiagnosisToMainForm();
      }
      trackContactIntent(`chatbot_${link.dataset.chatbotAction || "open"}`);
    });
  });
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

const renderQuotesSection = (record, statusPanel) => {
  const section = statusPanel?.querySelector("[data-status-quotes-section]");
  const list = statusPanel?.querySelector("[data-status-quotes]");
  const messageTarget = statusPanel?.querySelector("[data-status-quotes-message]");
  if (!section || !list) return;
  const quotes = Array.isArray(record.quotes) ? record.quotes : [];
  if (messageTarget) messageTarget.textContent = "";
  if (quotes.length === 0) {
    section.hidden = true;
    list.replaceChildren();
    return;
  }
  section.hidden = false;
  list.replaceChildren(...quotes.map((quote) => createStatusQuote(quote, record, messageTarget)));
};

const quoteStatusLabel = (status) => {
  const fr = { sent: "Envoyée", approved: "Approuvée", declined: "Refusée", expired: "Expirée", paid: "Payée", draft: "Brouillon" };
  const en = { sent: "Sent", approved: "Approved", declined: "Declined", expired: "Expired", paid: "Paid", draft: "Draft" };
  const map = isEnglishDocument ? en : fr;
  return map[status] || status || "—";
};

const createStatusQuote = (quote, record, messageTarget) => {
  const article = document.createElement("article");
  article.className = "status-payment status-quote";

  const head = document.createElement("div");
  head.className = "status-payment-head";

  const title = document.createElement("p");
  title.className = "status-payment-title";
  title.textContent = quote.title || (isEnglishDocument ? "Quote" : "Soumission");

  const badge = document.createElement("span");
  badge.className = `status-payment-badge is-${quote.status || "sent"}`;
  badge.textContent = quoteStatusLabel(quote.status);
  head.append(title, badge);

  const meta = document.createElement("p");
  meta.className = "status-payment-meta";
  meta.textContent = formatCurrency((Number(quote.amountCad) || 0) * 100, "CAD");

  article.append(head, meta);

  if (Array.isArray(quote.lineItems) && quote.lineItems.length > 0) {
    const list = document.createElement("ul");
    list.className = "status-quote-items";
    quote.lineItems.forEach((item) => {
      const li = document.createElement("li");
      const qty = Number(item.quantity || 1);
      const sub = formatCurrency((Number(item.amountCad) || 0) * 100 * qty, "CAD");
      li.textContent = `${item.label} — ${qty} × ${sub}`;
      list.append(li);
    });
    article.append(list);
  }

  if (quote.expiresAt) {
    const exp = document.createElement("p");
    exp.className = "status-payment-meta";
    exp.textContent = (isEnglishDocument ? "Valid until " : "Valide jusqu'au ") + formatTimestamp(quote.expiresAt);
    article.append(exp);
  }

  if (quote.status === "sent") {
    const actions = document.createElement("div");
    actions.className = "status-payment-actions";
    const approveBtn = document.createElement("button");
    approveBtn.type = "button";
    approveBtn.className = "button button-primary button-small";
    approveBtn.textContent = isEnglishDocument ? "Approve" : "Approuver";
    const declineBtn = document.createElement("button");
    declineBtn.type = "button";
    declineBtn.className = "button button-secondary button-small";
    declineBtn.textContent = isEnglishDocument ? "Decline" : "Refuser";

    const submit = async (action) => {
      if (!currentStatusCredentials) return;
      approveBtn.disabled = true;
      declineBtn.disabled = true;
      if (messageTarget) {
        messageTarget.textContent = isEnglishDocument ? "Sending decision…" : "Envoi de la décision…";
      }
      try {
        const url = `/api/cases/${encodeURIComponent(currentStatusCredentials.caseId)}/quotes/${encodeURIComponent(quote.id)}/${action}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessCode: currentStatusCredentials.accessCode })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.ok === false) {
          throw new Error(payload.message || (isEnglishDocument ? "Decision failed." : "Décision échouée."));
        }
        if (messageTarget) {
          messageTarget.textContent = isEnglishDocument
            ? `Quote ${action === "accept" ? "approved" : "declined"}.`
            : `Soumission ${action === "accept" ? "approuvée" : "refusée"}.`;
        }
        const statusForm = document.querySelector("[data-status-form]");
        if (statusForm) {
          statusForm.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
        }
      } catch (error) {
        approveBtn.disabled = false;
        declineBtn.disabled = false;
        if (messageTarget) messageTarget.textContent = error.message;
      }
    };

    approveBtn.addEventListener("click", () => submit("accept"));
    declineBtn.addEventListener("click", () => submit("decline"));
    actions.append(approveBtn, declineBtn);
    article.append(actions);
  } else if (quote.status === "approved" && quote.approvedAt) {
    const stamp = document.createElement("p");
    stamp.className = "status-payment-meta";
    stamp.textContent = (isEnglishDocument ? "Approved on " : "Approuvée le ") + formatTimestamp(quote.approvedAt);
    article.append(stamp);
  }

  return article;
};

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

  renderQuotesSection(record, statusPanel);

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
  const metaPhone = operationsRoot.querySelector("[data-ops-meta-phone]");
  const metaCity = operationsRoot.querySelector("[data-ops-meta-city]");
  const metaContact = operationsRoot.querySelector("[data-ops-meta-contact]");
  const metaSupport = operationsRoot.querySelector("[data-ops-meta-support]");
  const metaSymptom = operationsRoot.querySelector("[data-ops-meta-symptom]");
  const metaUrgency = operationsRoot.querySelector("[data-ops-meta-urgency]");
  const metaIndicativePrice = operationsRoot.querySelector("[data-ops-meta-indicative-price]");
  const metaReceived = operationsRoot.querySelector("[data-ops-meta-received]");
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
  const metaAssigned = operationsRoot.querySelector("[data-ops-meta-assigned]");
  const quoteStatusDisplay = operationsRoot.querySelector("[data-ops-quote-status]");
  const quoteAmountDisplay = operationsRoot.querySelector("[data-ops-quote-amount]");
  const quotePreapprovalDisplay = operationsRoot.querySelector("[data-ops-quote-preapproval]");
  const quoteSentAtDisplay = operationsRoot.querySelector("[data-ops-quote-sent-at]");
  const quoteApprovedAtDisplay = operationsRoot.querySelector("[data-ops-quote-approved-at]");
  const quoteResult = operationsRoot.querySelector("[data-ops-quote-result]");
  const quoteSendButton = operationsRoot.querySelector("[data-ops-quote-send]");
  const quoteApproveButton = operationsRoot.querySelector("[data-ops-quote-approve]");
  const quotePdfLink = operationsRoot.querySelector("[data-ops-quote-pdf]");
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
  const automationApplyButton = operationsRoot.querySelector("[data-ops-automation-apply]");
  const conciergeResult = operationsRoot.querySelector("[data-ops-concierge-result]");
  const automationSuiteSummary = operationsRoot.querySelector("[data-ops-automation-suite-summary]");
  const automationSuiteScore = operationsRoot.querySelector("[data-ops-automation-suite-score]");
  const automationSuiteJobs = operationsRoot.querySelector("[data-ops-automation-suite-jobs]");
  const automationSuiteCopyButton = operationsRoot.querySelector("[data-ops-automation-suite-copy]");
  const automationSuiteResult = operationsRoot.querySelector("[data-ops-automation-suite-result]");
  const payoutCopyButton = document.querySelector("[data-ops-payout-copy]");
  const payoutResult = document.querySelector("[data-ops-payout-result]");
  const pricingState = operationsRoot.querySelector("[data-ops-pricing-state]");
  const pricingSummary = operationsRoot.querySelector("[data-ops-pricing-summary]");
  const pricingQuote = operationsRoot.querySelector("[data-ops-pricing-quote]");
  const pricingPaid = operationsRoot.querySelector("[data-ops-pricing-paid]");
  const pricingBalance = operationsRoot.querySelector("[data-ops-pricing-balance]");
  const pricingAction = operationsRoot.querySelector("[data-ops-pricing-action]");
  const pricingConfidence = operationsRoot.querySelector("[data-ops-pricing-confidence]");
  const pricingRules = operationsRoot.querySelector("[data-ops-pricing-rules]");
  const pricingPrefillButton = operationsRoot.querySelector("[data-ops-pricing-prefill]");
  const pricingCreateButton = operationsRoot.querySelector("[data-ops-pricing-create]");
  const pricingCopyButton = operationsRoot.querySelector("[data-ops-pricing-copy]");
  const pricingResult = operationsRoot.querySelector("[data-ops-pricing-result]");
  const payoutRunbook = [
    "NEXURADATA payout runbook",
    "1. Ouvrir Stripe Dashboard en mode live.",
    "2. Vérifier Balance > Available > CAD.",
    "3. Confirmer le compte bancaire NEXURADATA et les délais de disponibilité.",
    "4. Rapprocher les paiements payés avec les dossiers et factures internes.",
    "5. Créer la payout dans Stripe seulement après validation du montant disponible.",
    "6. Consigner la payout et ne jamais partager de clé Stripe dans un ticket ou un chat."
  ].join("\n");
  let currentPricingDecision = null;
  let currentAutomationSuite = null;

  const writeTextToClipboard = async (text) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const buffer = document.createElement("textarea");
    buffer.value = text;
    buffer.setAttribute("readonly", "");
    buffer.style.position = "fixed";
    buffer.style.left = "-9999px";
    document.body.append(buffer);
    buffer.select();
    document.execCommand("copy");
    buffer.remove();
  };

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

  const paymentStatusValue = (payment) => `${payment?.status || "open"}`.toLowerCase();

  const sumPaymentAmounts = (payments, predicate) =>
    payments.filter(predicate).reduce((total, payment) => total + (Number(payment.amountCents) || 0), 0);

  const buildPricingDecision = (record = {}) => {
    const payments = Array.isArray(record.payments) ? record.payments : [];
    const quoteAmountCents = Number(record.quoteAmountCents) || 0;
    const paidAmountCents = sumPaymentAmounts(payments, (payment) => paymentStatusValue(payment) === "paid");
    const openAmountCents = sumPaymentAmounts(payments, (payment) => {
      const status = paymentStatusValue(payment);
      return status !== "paid" && status !== "expired" && status !== "failed";
    });
    const balanceCents = Math.max(quoteAmountCents - paidAmountCents, 0);
    const blockers = [];

    if (!record.caseId) {
      blockers.push("Aucun dossier réel n'est chargé.");
    }

    if (quoteAmountCents <= 0) {
      blockers.push("Aucune soumission chiffrée n'est enregistrée.");
    }

    if (record.quoteStatus !== "approved") {
      blockers.push("La soumission n'est pas approuvée.");
    }

    if (!record.preapprovalConfirmed) {
      blockers.push("La préapprobation client n'est pas confirmée.");
    }

    if (quoteAmountCents > 0 && balanceCents <= 0) {
      blockers.push("Le solde calculé est nul ou déjà payé.");
    }

    if (openAmountCents > 0) {
      blockers.push(`Une demande de paiement ouverte existe déjà (${formatCurrency(openAmountCents, "cad")}).`);
    }

    const ready = blockers.length === 0;
    const amount = (balanceCents / 100).toFixed(2);
    const label = paidAmountCents > 0
      ? `Solde final - ${record.caseId || "dossier"}`
      : `Paiement approuvé - ${record.caseId || "dossier"}`;
    const description = [
      "Montant calculé par l'intelligence prix NEXURADATA.",
      `Soumission approuvée: ${formatCurrency(quoteAmountCents, "cad")}.`,
      `Paiements Stripe confirmés: ${formatCurrency(paidAmountCents, "cad")}.`,
      `Solde exact à percevoir: ${formatCurrency(balanceCents, "cad")}.`,
      "Vérifier l'identité du client et le dossier avant l'envoi."
    ].join(" ");
    const rules = ready
      ? [
        "Soumission approuvée et préapprobation confirmée.",
        `Calcul job: ${formatCurrency(quoteAmountCents, "cad")} - ${formatCurrency(paidAmountCents, "cad")} = ${formatCurrency(balanceCents, "cad")}.`,
        "Le job peut préremplir le paiement exact, mais l'opérateur déclenche l'envoi final.",
        "Les acomptes, remises, remboursements et cas spéciaux restent en revue humaine."
      ]
      : blockers.map((blocker) => `Bloqué: ${blocker}`);

    return {
      version: "local-fallback",
      jobName: "price-intelligence",
      jobMode: ready ? "ready_to_prefill" : "blocked",
      ready,
      confidence: ready ? 90 : Math.max(15, 82 - (blockers.length * 18)),
      blockers,
      quoteAmountCents,
      quoteAmountFormatted: formatCurrency(quoteAmountCents, "cad"),
      paidAmountCents,
      paidAmountFormatted: formatCurrency(paidAmountCents, "cad"),
      balanceCents,
      balanceFormatted: formatCurrency(balanceCents, "cad"),
      openAmountCents,
      paymentKind: "final",
      amount,
      label,
      description,
      rules,
      summary: ready
        ? "Job local prêt: le montant exact peut être prérempli, mais la création intelligente passera par le serveur."
        : "Job bloqué: corriger les points ci-dessous avant qu'un montant soit proposé.",
      actionLabel: ready ? "Préremplir" : "Bloquée",
      suggestedPayment: ready
        ? {
          paymentKind: "final",
          amount,
          label,
          description,
          sendEmail: true
        }
        : null,
      copyText: [
        `Décision price intelligence - ${record.caseId || "aucun dossier"}`,
        `Mode: ${ready ? "ready_to_prefill" : "blocked"}`,
        `Soumission: ${formatCurrency(quoteAmountCents, "cad")}`,
        `Payé confirmé: ${formatCurrency(paidAmountCents, "cad")}`,
        `Solde exact: ${formatCurrency(balanceCents, "cad")}`,
        `Action: ${ready ? "préremplir le paiement final" : "ne pas envoyer"}`,
        ...rules.map((rule) => `- ${rule}`)
      ].join("\n")
    };
  };

  const renderPricingDecision = (record) => {
    currentPricingDecision = record?.pricingDecision || buildPricingDecision(record);

    if (pricingState) {
      pricingState.textContent = currentPricingDecision.ready ? "Prêt" : "Bloqué";
      pricingState.classList.toggle("is-ready", currentPricingDecision.ready);
      pricingState.classList.toggle("is-blocked", !currentPricingDecision.ready);
    }

    if (pricingSummary) pricingSummary.textContent = currentPricingDecision.summary;
    if (pricingQuote) pricingQuote.textContent = currentPricingDecision.quoteAmountFormatted || formatCurrency(currentPricingDecision.quoteAmountCents, "cad");
    if (pricingPaid) pricingPaid.textContent = currentPricingDecision.paidAmountFormatted || formatCurrency(currentPricingDecision.paidAmountCents, "cad");
    if (pricingBalance) pricingBalance.textContent = currentPricingDecision.balanceFormatted || formatCurrency(currentPricingDecision.balanceCents, "cad");
    if (pricingAction) pricingAction.textContent = currentPricingDecision.actionLabel;
    if (pricingConfidence) pricingConfidence.textContent = `${Number(currentPricingDecision.confidence) || 0}%`;

    if (pricingRules) {
      pricingRules.replaceChildren(...currentPricingDecision.rules.map((rule) => {
        const item = document.createElement("li");
        item.textContent = rule;
        return item;
      }));
    }

    if (pricingPrefillButton) {
      pricingPrefillButton.disabled = !currentPricingDecision.ready || !currentPricingDecision.suggestedPayment;
    }

    if (pricingCreateButton) {
      pricingCreateButton.disabled = !currentPricingDecision.ready || !currentPricingDecision.suggestedPayment;
    }

    if (pricingResult) {
      pricingResult.textContent = "";
      pricingResult.dataset.state = "";
    }
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
        ? `${concierge.priorityLabel || "Suivi"} · ${concierge.serviceLevelLabel || "Automation"} · ${concierge.sla || "SLA à confirmer"} · ${concierge.channel === "whatsapp" ? "WhatsApp prêt" : "Courriel ou téléphone"}`
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

  const automationModeLabels = {
    ready_to_send: "Prêt",
    ready_to_draft: "Brouillon prêt",
    ready_to_log: "Relance prête",
    ready_to_request: "Demande prête",
    ready_to_respond: "Réponse prête",
    human_review: "Revue humaine",
    monitoring: "Surveillance",
    blocked: "Bloqué",
    complete: "Complet",
    clear: "Clair"
  };

  const renderAutomationSuite = (suite) => {
    currentAutomationSuite = suite || null;

    if (automationSuiteSummary) {
      automationSuiteSummary.textContent = suite?.summary || "Aucun plan automation disponible pour ce dossier.";
    }

    if (automationSuiteScore) {
      automationSuiteScore.textContent = suite ? `${Number(suite.confidence) || 0}% global` : "—";
    }

    if (automationSuiteJobs) {
      const jobs = Array.isArray(suite?.jobs) ? suite.jobs : [];

      if (jobs.length === 0) {
        automationSuiteJobs.innerHTML = "<p class=\"form-note\">Aucun module automation n'est disponible.</p>";
      } else {
        automationSuiteJobs.replaceChildren(...jobs.map((job) => {
          const item = document.createElement("article");
          item.className = "ops-automation-job";

          const head = document.createElement("div");
          head.className = "ops-automation-job-head";

          const title = document.createElement("p");
          title.className = "ops-automation-job-title";
          title.textContent = job.label || job.id || "Module";

          const mode = `${job.mode || "monitoring"}`;
          const badge = document.createElement("span");
          badge.className = `ops-automation-job-badge is-${mode.replace(/_/g, "-")}`;
          badge.textContent = automationModeLabels[mode] || mode;

          head.append(title, badge);

          const summary = document.createElement("p");
          summary.className = "ops-automation-job-summary";
          summary.textContent = job.summary || "Aucun résumé disponible.";

          const meta = document.createElement("p");
          meta.className = "ops-automation-job-meta";
          const signals = Array.isArray(job.signals) && job.signals.length ? ` · ${job.signals.slice(0, 3).join(" / ")}` : "";
          meta.textContent = `${job.action || "Surveiller"} · ${Number(job.confidence) || 0}%${signals}`;

          item.append(head, summary, meta);
          return item;
        }));
      }
    }

    if (automationSuiteCopyButton) {
      automationSuiteCopyButton.disabled = !suite?.copyText;
    }

    if (automationSuiteResult) {
      automationSuiteResult.textContent = "";
      automationSuiteResult.dataset.state = "";
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
    if (metaPhone) metaPhone.textContent = record.phone || "—";
    if (metaCity) metaCity.textContent = record.city || "—";
    if (metaContact) metaContact.textContent = record.preferredContact || "—";
    if (metaSupport) metaSupport.textContent = record.support;
    if (metaSymptom) metaSymptom.textContent = record.symptom || "—";
    if (metaUrgency) metaUrgency.textContent = record.urgency;
    if (metaIndicativePrice) metaIndicativePrice.textContent = record.indicativePrice || "—";
    if (metaReceived) metaReceived.textContent = record.receivedAt ? formatTimestamp(record.receivedAt) : "—";
    if (metaSource) metaSource.textContent = record.sourcePath || "/";
    if (metaAcquisition) metaAcquisition.textContent = record.acquisitionSource || "—";
    if (metaAssigned) metaAssigned.textContent = record.assignedTo || "—";
    if (metaAccessSent) metaAccessSent.textContent = record.accessCodeLastSentAt ? formatTimestamp(record.accessCodeLastSentAt) : "Pas encore";
    if (metaStatusSent) metaStatusSent.textContent = record.statusEmailLastSentAt ? formatTimestamp(record.statusEmailLastSentAt) : "Pas encore";
    if (messageTarget) messageTarget.textContent = record.message;
    if (currentCaseIdInput) currentCaseIdInput.value = record.caseId;
    renderConcierge(record.concierge);
    renderAutomationSuite(record.automationSuite);

    if (caseForm) {
      const statusInput = caseForm.querySelector('[name="status"]');
      const receivedAtInput = caseForm.querySelector('[name="receivedAt"]');
      const cityInput = caseForm.querySelector('[name="city"]');
      const contactInput = caseForm.querySelector('[name="preferredContact"]');
      const symptomInput = caseForm.querySelector('[name="symptom"]');
      const clientTypeInput = caseForm.querySelector('[name="clientType"]');
      const nextStepInput = caseForm.querySelector('[name="nextStep"]');
      const summaryInput = caseForm.querySelector('[name="clientSummary"]');
      const diagnosticInput = caseForm.querySelector('[name="diagnosticSummary"]');
      const probabilityInput = caseForm.querySelector('[name="recoveryProbability"]');
      const timelineInput = caseForm.querySelector('[name="estimatedTimeline"]');
      const conditionsInput = caseForm.querySelector('[name="quoteConditions"]');
      const notifyInput = caseForm.querySelector('[name="notifyClient"]');
      const qualInput = caseForm.querySelector('[name="qualificationSummary"]');
      const notesInput = caseForm.querySelector('[name="internalNotes"]');
      const flagsInput = caseForm.querySelector('[name="handlingFlags"]');
      const acqInput = caseForm.querySelector('[name="acquisitionSource"]');
      const assignedInput = caseForm.querySelector('[name="assignedTo"]');
      const lastActionInput = caseForm.querySelector('[name="lastAction"]');
      const nextActionInput = caseForm.querySelector('[name="nextAction"]');
      const documentsInput = caseForm.querySelector('[name="documentsSummary"]');
      const quoteAmtInput = caseForm.querySelector('[name="quoteAmount"]');
      const preapprovalInput = caseForm.querySelector('[name="preapprovalConfirmed"]');

      if (statusInput) statusInput.value = record.status;
      if (receivedAtInput) receivedAtInput.value = record.receivedAt ? new Date(record.receivedAt).toISOString().slice(0, 16) : "";
      if (cityInput) cityInput.value = record.city || "";
      if (contactInput) contactInput.value = record.preferredContact || "";
      if (symptomInput) symptomInput.value = record.symptom || "";
      if (clientTypeInput) clientTypeInput.value = record.clientType || "";
      if (nextStepInput) nextStepInput.value = record.nextStep;
      if (summaryInput) summaryInput.value = record.clientSummary;
      if (diagnosticInput) diagnosticInput.value = record.diagnosticSummary || "";
      if (probabilityInput) probabilityInput.value = record.recoveryProbability || "";
      if (timelineInput) timelineInput.value = record.estimatedTimeline || "";
      if (conditionsInput) conditionsInput.value = record.quoteConditions || "Aucune donnée récupérée = aucune facture.";
      if (notifyInput) notifyInput.checked = false;
      if (qualInput) qualInput.value = record.qualificationSummary || "";
      if (notesInput) notesInput.value = record.internalNotes || "";
      if (flagsInput) flagsInput.value = record.handlingFlags || "";
      if (acqInput) acqInput.value = record.acquisitionSource || "";
      if (assignedInput) assignedInput.value = record.assignedTo || "";
      if (lastActionInput) lastActionInput.value = record.lastAction || "";
      if (nextActionInput) nextActionInput.value = record.nextAction || "";
      if (documentsInput) documentsInput.value = record.documentsSummary || "";
      if (quoteAmtInput) quoteAmtInput.value = record.quoteAmountCents ? (record.quoteAmountCents / 100).toFixed(2) : "";
      if (preapprovalInput) preapprovalInput.checked = Boolean(record.preapprovalConfirmed);
    }

    if (quotePdfLink) {
      quotePdfLink.href = `${searchEndpoint.replace(/\/cases$/, "/quote-pdf")}?caseId=${encodeURIComponent(record.caseId)}`;
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
    renderPricingDecision(record);

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

    if (pricingResult) {
      pricingResult.textContent = "";
      pricingResult.dataset.state = "";
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
            receivedAt: caseForm.querySelector('[name="receivedAt"]')?.value.trim() || "",
            city: caseForm.querySelector('[name="city"]')?.value.trim() || "",
            preferredContact: caseForm.querySelector('[name="preferredContact"]')?.value.trim() || "",
            symptom: caseForm.querySelector('[name="symptom"]')?.value.trim() || "",
            clientType: caseForm.querySelector('[name="clientType"]')?.value.trim() || "",
            nextStep: caseForm.querySelector('[name="nextStep"]')?.value.trim() || "",
            clientSummary: caseForm.querySelector('[name="clientSummary"]')?.value.trim() || "",
            diagnosticSummary: caseForm.querySelector('[name="diagnosticSummary"]')?.value.trim() || "",
            recoveryProbability: caseForm.querySelector('[name="recoveryProbability"]')?.value.trim() || "",
            estimatedTimeline: caseForm.querySelector('[name="estimatedTimeline"]')?.value.trim() || "",
            quoteConditions: caseForm.querySelector('[name="quoteConditions"]')?.value.trim() || "",
            qualificationSummary: caseForm.querySelector('[name="qualificationSummary"]')?.value.trim() || "",
            internalNotes: caseForm.querySelector('[name="internalNotes"]')?.value.trim() || "",
            handlingFlags: caseForm.querySelector('[name="handlingFlags"]')?.value.trim() || "",
            acquisitionSource: caseForm.querySelector('[name="acquisitionSource"]')?.value.trim() || "",
            assignedTo: caseForm.querySelector('[name="assignedTo"]')?.value.trim() || "",
            lastAction: caseForm.querySelector('[name="lastAction"]')?.value.trim() || "",
            nextAction: caseForm.querySelector('[name="nextAction"]')?.value.trim() || "",
            documentsSummary: caseForm.querySelector('[name="documentsSummary"]')?.value.trim() || "",
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
          body.diagnosticSummary = caseForm?.querySelector('[name="diagnosticSummary"]')?.value.trim() || "";
          body.recoveryProbability = caseForm?.querySelector('[name="recoveryProbability"]')?.value.trim() || "";
          body.estimatedTimeline = caseForm?.querySelector('[name="estimatedTimeline"]')?.value.trim() || "";
          body.quoteConditions = caseForm?.querySelector('[name="quoteConditions"]')?.value.trim() || "";
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

  if (automationApplyButton) {
    automationApplyButton.addEventListener("click", async () => {
      const caseId = currentCaseIdInput?.value || "";
      if (!caseId) {
        setMessage(conciergeResult, "error", "Chargez d'abord un dossier.");
        return;
      }

      setMessage(conciergeResult, "success", "Application du plan automatisé...");
      setButtonBusy(automationApplyButton, true, "Application...");

      try {
        const response = await fetch(searchEndpoint, {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ action: "apply-automation", caseId })
        });
        const data = await parseJsonResponse(response);

        if (!response.ok || !data?.ok) {
          throw new Error(data?.message || "Automation indisponible.");
        }

        if (data.case) fillCaseDetail(data.case);
        setMessage(conciergeResult, "success", "Plan automatisé appliqué au dossier, à la timeline et aux champs opérateur.");
      } catch (error) {
        setMessage(conciergeResult, "error", error instanceof Error ? error.message : "Automation indisponible.");
      } finally {
        setButtonBusy(automationApplyButton, false);
      }
    });
  }

  if (automationSuiteCopyButton) {
    automationSuiteCopyButton.addEventListener("click", async () => {
      try {
        await writeTextToClipboard(currentAutomationSuite?.copyText || "Aucun plan automation disponible.");
        setMessage(automationSuiteResult, "success", "Plan automation copié.");
      } catch {
        setMessage(automationSuiteResult, "error", "Copie impossible.");
      }
    });
  }

  if (payoutCopyButton) {
    payoutCopyButton.addEventListener("click", async () => {
      try {
        await writeTextToClipboard(payoutRunbook);
        setMessage(payoutResult, "success", "Runbook payout copié.");
      } catch {
        setMessage(payoutResult, "error", "Copie impossible. Ouvrez Stripe et suivez la checklist visible.");
      }
    });
  }

  if (pricingPrefillButton) {
    pricingPrefillButton.addEventListener("click", () => {
      if (!currentPricingDecision?.ready || !currentPricingDecision.suggestedPayment || !paymentForm) {
        setMessage(pricingResult, "error", "Le job prix est bloqué. Corrigez les garde-fous avant de préremplir.");
        return;
      }

      const suggestedPayment = currentPricingDecision.suggestedPayment;

      const kindInput = paymentForm.querySelector('[name="paymentKind"]');
      const amountInput = paymentForm.querySelector('[name="amount"]');
      const labelInput = paymentForm.querySelector('[name="label"]');
      const descriptionInput = paymentForm.querySelector('[name="description"]');
      const sendEmailInput = paymentForm.querySelector('[name="sendEmail"]');

      if (kindInput) kindInput.value = suggestedPayment.paymentKind || currentPricingDecision.paymentKind || "final";
      if (amountInput) amountInput.value = suggestedPayment.amount || currentPricingDecision.amount;
      if (labelInput) labelInput.value = suggestedPayment.label || currentPricingDecision.label;
      if (descriptionInput) descriptionInput.value = suggestedPayment.description || currentPricingDecision.description;
      if (sendEmailInput) sendEmailInput.checked = true;

      setMessage(pricingResult, "success", "Paiement exact prérempli. Révisez, puis utilisez le bouton Paiements pour créer et envoyer le lien Stripe.");
      setMessage(paymentStatus, "success", "Demande de paiement préparée par l'intelligence prix, en attente d'envoi opérateur.");
    });
  }

  if (pricingCreateButton) {
    pricingCreateButton.addEventListener("click", async () => {
      const caseId = currentCaseIdInput?.value || "";

      if (!caseId) {
        setMessage(pricingResult, "error", "Chargez d'abord un dossier réel.");
        return;
      }

      if (!currentPricingDecision?.ready) {
        setMessage(pricingResult, "error", "Le job prix est bloqué. Aucun lien Stripe ne sera créé.");
        return;
      }

      setButtonBusy(pricingCreateButton, true, "Création...");
      setMessage(pricingResult, "success", "Création du lien intelligent côté serveur...");

      try {
        const response = await fetch(searchEndpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json"
          },
          body: JSON.stringify({
            action: "create-smart-payment",
            caseId
          })
        });
        const data = await parseJsonResponse(response);

        if (!response.ok || !data?.ok) {
          throw new Error(data?.message || "Le job prix n'a pas pu créer le lien.");
        }

        if (data.case) {
          fillCaseDetail(data.case);
        }

        setMessage(
          pricingResult,
          data.delivery === "sent" ? "success" : "error",
          data.delivery === "sent"
            ? "Lien Stripe exact créé et envoyé au client."
            : `Lien exact créé. Envoi automatique non effectué: ${data.delivery}.`
        );
      } catch (error) {
        setMessage(pricingResult, "error", error instanceof Error ? error.message : "Le job prix n'a pas pu créer le lien.");
      } finally {
        setButtonBusy(pricingCreateButton, false);
      }
    });
  }

  if (pricingCopyButton) {
    pricingCopyButton.addEventListener("click", async () => {
      try {
        await writeTextToClipboard(currentPricingDecision?.copyText || "Aucune décision price intelligence disponible.");
        setMessage(pricingResult, "success", "Décision job copiée.");
      } catch {
        setMessage(pricingResult, "error", "Copie impossible.");
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

/* ── RemoteFix client portal and admin dashboard ──────────── */

const remoteFixForm = document.querySelector("[data-remotefix-form]");
const remoteFixSessionPanel = document.querySelector("[data-remotefix-session]");

const remoteFixParams = new URLSearchParams(window.location.search);
const remoteFixCredentials = {
  caseId: remoteFixParams.get("caseId") || "",
  sessionId: remoteFixParams.get("sessionId") || "",
  token: remoteFixParams.get("token") || ""
};

const remoteFixJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const remoteFixIdempotencyKey = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return `rf-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
};

const remoteFixDiagnosticPayload = () => ({
  caseId: remoteFixCredentials.caseId,
  sessionId: remoteFixCredentials.sessionId,
  sessionToken: remoteFixCredentials.token,
  agentVersion: "tauri-simulated-0.1",
  platform: "browser_simulated",
  diagnostics: {
    disks: [{
      model: "RemoteFix simulated disk",
      sizeGb: 1000,
      smartStatus: "passed",
      isDetected: true,
      hasMountPoint: false,
      fileSystem: "NTFS",
      isReadOnly: true
    }],
    cloud: { provider: "onedrive", syncStatus: "stuck", previousVersionsFound: 3 },
    outlook: { profileDetected: true, pstFilesFound: 1, ostFilesFound: 1, indexingHealthy: false },
    system: { freeSpaceGb: 128, criticalEventsLast24h: 0, malwareIndicators: 0, ransomwareExtensionsDetected: [] }
  }
});

const renderRemoteFixClientOverview = (data) => {
  const sessionSummary = document.querySelector("[data-remotefix-session-summary]");
  const reportTarget = document.querySelector("[data-remotefix-report]");
  const runButton = document.querySelector("[data-remotefix-run-diagnostic]");
  if (remoteFixSessionPanel) remoteFixSessionPanel.hidden = false;
  if (sessionSummary) {
    sessionSummary.textContent = `${data.case?.caseId || "Dossier"} · ${data.triage?.decision || "diagnostic"} · ${data.session?.status || "session"}`;
  }
  if (runButton) runButton.disabled = !data.hasConsent;
  if (reportTarget) {
    reportTarget.textContent = JSON.stringify({
      dossier: data.case?.caseId,
      statut: data.case?.status,
      decision: data.triage?.decision,
      service: data.triage?.service,
      rapport: data.diagnostic?.summary || "Aucun rapport agent reçu.",
      actionsAutorisees: data.diagnostic?.safeActionsToOffer || data.triage?.allowedActions || [],
      actionsBloquees: data.diagnostic?.blockedActions || data.triage?.blockedActions || []
    }, null, 2);
  }
};

if (remoteFixForm) {
  const messageTarget = document.querySelector("[data-remotefix-message]");
  const resultPanel = document.querySelector("[data-remotefix-result]");
  const submitButton = remoteFixForm.querySelector('button[type="submit"]');
  const endpoint = remoteFixForm.getAttribute("data-remotefix-endpoint") || "/api/remotefix/cases";

  remoteFixForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!remoteFixForm.checkValidity()) {
      remoteFixForm.reportValidity();
      return;
    }
    const formData = new FormData(remoteFixForm);
    const payload = {
      client: {
        name: `${formData.get("name") || ""}`.trim(),
        email: `${formData.get("email") || ""}`.trim(),
        phone: `${formData.get("phone") || ""}`.trim(),
        type: `${formData.get("clientType") || "individual"}`
      },
      intake: {
        deviceType: `${formData.get("deviceType") || "unknown"}`,
        systemType: `${formData.get("systemType") || "unknown"}`,
        symptom: `${formData.get("symptom") || "unknown"}`,
        urgency: `${formData.get("urgency") || "standard"}`,
        problemStartedAt: `${formData.get("problemStartedAt") || ""}`.trim(),
        containsCriticalData: formData.get("containsCriticalData") === "on",
        attemptedFix: formData.get("attemptedFix") === "on",
        legalMatter: formData.get("legalMatter") === "on",
        notes: `${formData.get("notes") || ""}`.trim()
      },
      idempotencyKey: remoteFixIdempotencyKey()
    };

    setButtonBusy(submitButton, true, "Création...");
    setMessage(messageTarget, "success", "Création du dossier, triage et lien sécurisé...");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await remoteFixJson(response);
      if (!response.ok || !data?.ok) throw new Error(data?.message || "RemoteFix indisponible.");

      if (resultPanel) resultPanel.hidden = false;
      document.querySelector("[data-remotefix-case-title]").textContent = `Dossier ${data.caseId}`;
      document.querySelector("[data-remotefix-decision]").textContent = data.triage?.decision || "—";
      document.querySelector("[data-remotefix-service]").textContent = data.triage?.service || "—";
      document.querySelector("[data-remotefix-risk]").textContent = `${data.triage?.riskLabel || "—"} (${data.triage?.riskScore || 0}/100)`;
      document.querySelector("[data-remotefix-price]").textContent = data.triage?.priceRange || "—";
      document.querySelector("[data-remotefix-next]").textContent = data.triage?.nextAction || "—";
      const secureLink = document.querySelector("[data-remotefix-secure-link]");
      const reportLink = document.querySelector("[data-remotefix-report-link]");
      if (secureLink) secureLink.href = data.session?.publicUrl || "#";
      if (reportLink) reportLink.href = `/api/remotefix/report-pdf?caseId=${encodeURIComponent(data.caseId)}&sessionId=${encodeURIComponent(data.session?.id || "")}&token=${encodeURIComponent(new URL(data.session?.publicUrl || window.location.href).searchParams.get("token") || "")}`;
      setMessage(messageTarget, data.email?.sent ? "success" : "error", data.email?.sent ? "Dossier créé et courriel Resend envoyé." : "Dossier créé. Courriel simulé ou non configuré.");
    } catch (error) {
      setMessage(messageTarget, "error", error instanceof Error ? error.message : "RemoteFix indisponible.");
    } finally {
      setButtonBusy(submitButton, false);
    }
  });
}

if (remoteFixSessionPanel && remoteFixCredentials.caseId && remoteFixCredentials.sessionId && remoteFixCredentials.token) {
  const consentForm = document.querySelector("[data-remotefix-consent-form]");
  const runButton = document.querySelector("[data-remotefix-run-diagnostic]");
  const reportTarget = document.querySelector("[data-remotefix-report]");
  const loadRemoteFixSession = async () => {
    const response = await fetch(`/api/remotefix/cases?caseId=${encodeURIComponent(remoteFixCredentials.caseId)}&sessionId=${encodeURIComponent(remoteFixCredentials.sessionId)}&token=${encodeURIComponent(remoteFixCredentials.token)}`, { headers: { accept: "application/json" } });
    const data = await remoteFixJson(response);
    if (response.ok && data?.ok) renderRemoteFixClientOverview(data);
    else if (reportTarget) reportTarget.textContent = data?.message || "Lien RemoteFix invalide.";
  };

  consentForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const response = await fetch("/api/remotefix/consent", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ ...remoteFixCredentials, accepted: true, acceptedTermsVersion: "remotefix-terms-2026-05-07" })
    });
    const data = await remoteFixJson(response);
    if (response.ok && data?.ok) {
      setMessage(reportTarget, "success", "Consentement reçu. Le diagnostic simulé peut démarrer.");
      if (runButton) runButton.disabled = false;
      await loadRemoteFixSession();
    } else {
      setMessage(reportTarget, "error", data?.message || "Consentement impossible.");
    }
  });

  runButton?.addEventListener("click", async () => {
    setButtonBusy(runButton, true, "Diagnostic...");
    const response = await fetch("/api/remotefix/diagnostics", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(remoteFixDiagnosticPayload())
    });
    const data = await remoteFixJson(response);
    if (response.ok && data?.ok) {
      if (reportTarget) reportTarget.textContent = JSON.stringify(data.result, null, 2);
      await loadRemoteFixSession();
    } else {
      setMessage(reportTarget, "error", data?.message || "Diagnostic refusé.");
    }
    setButtonBusy(runButton, false);
  });

  loadRemoteFixSession();
}

const remoteFixAdmin = document.querySelector("[data-remotefix-admin]");

if (remoteFixAdmin) {
  const listTarget = remoteFixAdmin.querySelector("[data-remotefix-admin-list]");
  const detailPanel = remoteFixAdmin.querySelector("[data-remotefix-admin-detail]");
  const messageTarget = remoteFixAdmin.querySelector("[data-remotefix-admin-message]");
  const searchForm = remoteFixAdmin.querySelector("[data-remotefix-admin-search]");
  let selectedOverview = null;

  const loadRemoteFixDetail = async (caseId) => {
    const response = await fetch(`/api/remotefix/admin?caseId=${encodeURIComponent(caseId)}`, { headers: { accept: "application/json" } });
    const data = await remoteFixJson(response);
    if (!response.ok || !data?.ok) throw new Error(data?.message || "Dossier indisponible.");
    selectedOverview = data;
    if (detailPanel) detailPanel.hidden = false;
    remoteFixAdmin.querySelector("[data-remotefix-admin-case-id]").textContent = data.case.caseId;
    remoteFixAdmin.querySelector("[data-remotefix-admin-title]").textContent = `${data.case.name} · ${data.case.email}`;
    remoteFixAdmin.querySelector("[data-remotefix-admin-decision]").textContent = `${data.triage?.decision || "—"} · ${data.triage?.riskLabel || "—"}`;
    remoteFixAdmin.querySelector("[data-remotefix-admin-report]").textContent = data.diagnostic?.summary || "Aucun rapport reçu.";
    remoteFixAdmin.querySelector("[data-remotefix-admin-actions]").textContent = (data.diagnostic?.safeActionsToOffer || data.triage?.allowedActions || []).join(", ") || "Lecture seulement";
    remoteFixAdmin.querySelector("[data-remotefix-admin-blocked]").textContent = (data.diagnostic?.blockedActions || data.triage?.blockedActions || []).join(", ") || "—";
    remoteFixAdmin.querySelector("[data-remotefix-admin-pdf]").href = `/api/remotefix/report-pdf?caseId=${encodeURIComponent(data.case.caseId)}`;
    const auditTarget = remoteFixAdmin.querySelector("[data-remotefix-admin-audit]");
    auditTarget.replaceChildren(...(data.audit || []).map((entry) => {
      const item = document.createElement("li");
      item.textContent = `${formatTimestamp(entry.createdAt)} · ${entry.actor} · ${entry.event}`;
      return item;
    }));
  };

  const loadRemoteFixAdminList = async () => {
    const formData = new FormData(searchForm);
    const query = `${formData.get("query") || ""}`.trim();
    const response = await fetch(`/api/remotefix/admin?query=${encodeURIComponent(query)}`, { headers: { accept: "application/json" } });
    const data = await remoteFixJson(response);
    if (!response.ok || !data?.ok) throw new Error(data?.message || "Dashboard indisponible.");
    listTarget.replaceChildren(...(data.items || []).map((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "ops-case-item";
      button.innerHTML = `<strong>${escapeHtml(item.caseId)}</strong><span>${escapeHtml(item.name)} · ${escapeHtml(item.triage.decision)}</span><small>${escapeHtml(item.triage.riskLabel)} · ${escapeHtml(item.status)}</small>`;
      button.addEventListener("click", async () => {
        try {
          await loadRemoteFixDetail(item.caseId);
          setMessage(messageTarget, "success", "Dossier RemoteFix chargé.");
        } catch (error) {
          setMessage(messageTarget, "error", error instanceof Error ? error.message : "Dossier indisponible.");
        }
      });
      return button;
    }));
    setMessage(messageTarget, "success", `${(data.items || []).length} dossier(s) RemoteFix.`);
  };

  searchForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await loadRemoteFixAdminList();
    } catch (error) {
      setMessage(messageTarget, "error", error instanceof Error ? error.message : "Dashboard indisponible.");
    }
  });

  remoteFixAdmin.querySelector("[data-remotefix-admin-email]")?.addEventListener("click", async () => {
    if (!selectedOverview?.case?.caseId) return;
    const response = await fetch("/api/remotefix/sessions", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ caseId: selectedOverview.case.caseId })
    });
    const data = await remoteFixJson(response);
    setMessage(messageTarget, response.ok && data?.ok ? "success" : "error", response.ok && data?.ok ? "Courriel sécurisé envoyé ou simulé." : data?.message || "Envoi impossible.");
    if (response.ok && data?.ok) await loadRemoteFixDetail(selectedOverview.case.caseId);
  });

  remoteFixAdmin.querySelector("[data-remotefix-admin-payment]")?.addEventListener("click", async () => {
    if (!selectedOverview?.case?.caseId) return;
    const response = await fetch("/api/remotefix/payments", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ caseId: selectedOverview.case.caseId })
    });
    const data = await remoteFixJson(response);
    setMessage(messageTarget, response.ok && data?.ok ? "success" : "error", response.ok && data?.ok ? "Paiement Stripe créé." : data?.message || "Paiement impossible.");
  });

  remoteFixAdmin.querySelector("[data-remotefix-admin-approve]")?.addEventListener("click", async () => {
    if (!selectedOverview?.case?.caseId) return;
    const session = selectedOverview.sessions?.[0];
    const action = remoteFixAdmin.querySelector("[data-remotefix-admin-command]")?.value || "read_diagnostics";
    const response = await fetch("/api/remotefix/commands", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ caseId: selectedOverview.case.caseId, sessionId: session?.id, action, paymentAuthorized: true })
    });
    const data = await remoteFixJson(response);
    setMessage(messageTarget, response.ok && data?.ok ? "success" : "error", response.ok && data?.ok ? `Commande signée: ${data.command.id}` : data?.message || "Commande refusée.");
    if (response.ok && data?.ok) await loadRemoteFixDetail(selectedOverview.case.caseId);
  });

  searchForm?.requestSubmit();
}
