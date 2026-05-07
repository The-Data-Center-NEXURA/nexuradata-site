/* NEXURA AI Recovery Desk — public command center.
 * No inline event handlers, no inline styles. CSP-safe.
 * Talks to /api/diagnostic (live) and /api/intake (live, may degrade to 503).
 */
(function () {
  "use strict";

  const root = document.querySelector("[data-recovery-desk]");
  if (!root) return;

  const lang = (root.getAttribute("data-lang") || "fr").toLowerCase();
  const isFr = lang.startsWith("fr");

  const t = (fr, en) => (isFr ? fr : en);

  const elements = {
    form: root.querySelector("[data-desk-form]"),
    textarea: root.querySelector("[data-desk-input]"),
    chips: root.querySelectorAll("[data-desk-chip]"),
    submit: root.querySelector("[data-desk-submit]"),
    error: root.querySelector("[data-desk-error]"),
    panel: root.querySelector("[data-desk-result]"),
    warningBox: root.querySelector("[data-desk-warning]"),
    riskLine: root.querySelector("[data-desk-risk]"),
    blocked: root.querySelector("[data-desk-blocked]"),
    meterRecovery: root.querySelector("[data-meter='recovery']"),
    meterRemote: root.querySelector("[data-meter='remote']"),
    meterLab: root.querySelector("[data-meter='lab']"),
    metricRecovery: root.querySelector("[data-metric='recovery']"),
    metricRemote: root.querySelector("[data-metric='remote']"),
    metricLab: root.querySelector("[data-metric='lab']"),
    lane: root.querySelector("[data-desk-lane]"),
    laneTitle: root.querySelector("[data-lane-title]"),
    laneRange: root.querySelector("[data-lane-range]"),
    laneNext: root.querySelector("[data-lane-next]"),
    laneActions: root.querySelector("[data-lane-actions]"),
    dna: root.querySelector("[data-desk-dna]"),
    quote: root.querySelector("[data-desk-quote]"),
    report: root.querySelector("[data-desk-report]"),
    intakeForm: root.querySelector("[data-intake-form]"),
    intakeStatus: root.querySelector("[data-intake-status]")
  };

  // ── Selected chip state ──────────────────────────────────────────
  const selection = { support: "drive", urgency: "business", value: "personal" };

  elements.chips.forEach((chip) => {
    chip.addEventListener("click", (event) => {
      event.preventDefault();
      const group = chip.getAttribute("data-group");
      const value = chip.getAttribute("data-value");
      if (!group || !value) return;
      selection[group] = value;
      root.querySelectorAll(`[data-desk-chip][data-group="${group}"]`).forEach((c) => {
        c.setAttribute("aria-pressed", c === chip ? "true" : "false");
      });
    });
  });

  // ── Risk → probability heuristics (client side, deterministic) ───
  const probabilityFromRisk = (riskLevel) => {
    if (riskLevel === "critical") return { recovery: 32, remote: 22, lab: 78 };
    if (riskLevel === "elevated") return { recovery: 54, remote: 38, lab: 62 };
    if (riskLevel === "intermediate") return { recovery: 68, remote: 52, lab: 48 };
    return { recovery: 82, remote: 71, lab: 34 };
  };

  // ── "Do not make it worse" engine — keyed by support + category ──
  const blockedActionsFor = (support, category, message) => {
    const text = (message || "").toLowerCase();
    const lane = (category || "").toLowerCase();
    const list = [];

    if (lane.includes("ransom") || text.includes("ransom") || text.includes("rançon") || text.includes("crypto")) {
      list.push(
        t("Ne pas supprimer les notes de rançon.", "Do not delete the ransom notes."),
        t("Ne pas formater ni effacer les systèmes touchés.", "Do not wipe affected systems."),
        t("Ne pas reconnecter les disques partagés ou sauvegardes.", "Do not reconnect shared drives or backups."),
        t("Ne pas payer ni négocier sans avis légal.", "Do not pay or negotiate without legal counsel.")
      );
    } else if (support === "raid" || support === "server" || lane.includes("raid")) {
      list.push(
        t("Ne pas reconstruire la grappe RAID.", "Do not rebuild the RAID array."),
        t("Ne pas remplacer plusieurs disques en même temps.", "Do not replace multiple drives at once."),
        t("Ne pas initialiser ou marquer un disque comme manquant.", "Do not initialize or mark a disk as missing."),
        t("Ne pas redémarrer le contrôleur sans capture d'état.", "Do not reboot the controller without a state snapshot.")
      );
    } else if (support === "phone") {
      list.push(
        t("Ne pas restaurer ni réinitialiser le téléphone.", "Do not restore or factory-reset the phone."),
        t("Ne pas réessayer le code de verrouillage à répétition.", "Do not retry the lockscreen code repeatedly."),
        t("Ne pas charger l'appareil s'il a été immergé.", "Do not charge the device if it was submerged."),
        t("Ne pas installer d'application de récupération sur l'appareil affecté.", "Do not install recovery apps on the affected device.")
      );
    } else if (support === "ssd") {
      list.push(
        t("Ne pas exécuter TRIM, secure-erase ou mise à jour de firmware.", "Do not run TRIM, secure-erase or firmware updates."),
        t("Ne pas formater ni partitionner.", "Do not format or repartition."),
        t("Ne pas écrire de nouveaux fichiers sur le SSD.", "Do not write new files to the SSD."),
        t("Ne pas installer de logiciel de récupération sur le même disque.", "Do not install recovery software on the same drive.")
      );
    } else {
      list.push(
        t("Ne pas formater le support.", "Do not format the device."),
        t("Ne pas exécuter CHKDSK, fsck ou réparation de partition.", "Do not run CHKDSK, fsck or partition repair."),
        t("Ne pas copier de nouveaux fichiers sur le support.", "Do not copy new files onto the device."),
        t("Ne pas installer de logiciel de récupération sur le disque affecté.", "Do not install recovery software on the affected drive.")
      );
    }
    return list;
  };

  // ── Service router lane labels ───────────────────────────────────
  const laneLabel = (recommendedPath, support) => {
    const path = (recommendedPath || "").toLowerCase();
    if (path.includes("ransom")) return t("Ransomware First Response", "Ransomware First Response");
    if (path.includes("forens") || path.includes("legal")) return t("Bureau forensique / preuves", "Digital Forensics / Legal Evidence Desk");
    if (support === "raid" || support === "server") return t("Triage Serveur / RAID", "Server / RAID Triage");
    if (support === "phone") return t("Récupération téléphone / tablette", "Phone / Tablet Recovery");
    if (path.includes("cloud")) return t("CloudRescue", "CloudRescue");
    if (path.includes("lab")) return t("Recovery laboratoire", "Laboratory Recovery");
    if (path.includes("remote") && path.includes("fix")) return t("RemoteLab Fix", "RemoteLab Fix");
    return t("RemoteLab Diagnose", "RemoteLab Diagnose");
  };

  const formatPriceRange = (quotePlan) => {
    if (!quotePlan) return t("À déterminer après diagnostic", "To be determined after diagnostic");
    const lo = quotePlan.priceMin || quotePlan.minCad;
    const hi = quotePlan.priceMax || quotePlan.maxCad;
    if (lo && hi) return `${lo} $ – ${hi} $ CAD`;
    return quotePlan.label || quotePlan.note || t("Soumission préparée après cadrage", "Quote prepared after scoping");
  };

  // ── Render result ────────────────────────────────────────────────
  const setMeter = (bar, metric, percent) => {
    if (!bar || !metric) return;
    const safe = Math.max(0, Math.min(100, Math.round(percent)));
    bar.style.setProperty("--desk-meter-fill", `${safe}%`);
    bar.setAttribute("aria-valuenow", String(safe));
    metric.textContent = `${safe}%`;
  };

  const renderList = (container, items, fallback) => {
    if (!container) return;
    container.innerHTML = "";
    const final = items && items.length ? items : [fallback];
    final.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      container.appendChild(li);
    });
  };

  const renderResult = (diagnostic) => {
    if (!diagnostic) return;
    const risk = diagnostic.riskLevel || "standard";
    const probs = probabilityFromRisk(risk);

    elements.panel.hidden = false;
    elements.warningBox.hidden = false;

    const riskLabelMap = {
      standard: t("Risque standard", "Standard risk"),
      intermediate: t("Risque intermédiaire", "Intermediate risk"),
      elevated: t("Risque élevé", "Elevated risk"),
      critical: t("Risque critique", "Critical risk")
    };
    elements.riskLine.textContent = `${riskLabelMap[risk] || riskLabelMap.standard} — ${diagnostic.categoryLabel || diagnostic.category || ""}`;

    renderList(
      elements.blocked,
      blockedActionsFor(selection.support, diagnostic.category, elements.textarea.value),
      t("Aucune action destructrice n'a été identifiée pour ce dossier.", "No destructive actions identified for this case.")
    );

    setMeter(elements.meterRecovery, elements.metricRecovery, probs.recovery);
    setMeter(elements.meterRemote, elements.metricRemote, probs.remote);
    setMeter(elements.meterLab, elements.metricLab, probs.lab);

    elements.laneTitle.textContent = laneLabel(diagnostic.recommendedPath, selection.support);
    elements.laneRange.textContent = formatPriceRange(diagnostic.quotePlan);
    elements.laneNext.textContent = diagnostic.brief?.nextStep || diagnostic.statusPlan?.nextStep || t("Prochaine étape à confirmer.", "Next step to confirm.");

    renderList(
      elements.laneActions,
      (diagnostic.clientActions || []).slice(0, 4),
      t("Conserver le support tel quel et attendre nos consignes.", "Keep the device as-is and wait for our instructions.")
    );

    // Case DNA card
    elements.dna.innerHTML = "";
    const dnaRows = [
      [t("Support", "Device"), { drive: t("Disque dur externe", "External hard drive"), ssd: "SSD", raid: t("RAID / NAS / serveur", "RAID / NAS / server"), server: t("RAID / NAS / serveur", "RAID / NAS / server"), phone: t("Téléphone / tablette", "Phone / tablet"), removable: t("USB / carte mémoire", "USB / memory card") }[selection.support] || selection.support],
      [t("Catégorie", "Category"), diagnostic.categoryLabel || diagnostic.category || "—"],
      [t("Niveau de risque", "Risk level"), riskLabelMap[risk] || risk],
      [t("Service recommandé", "Recommended service"), laneLabel(diagnostic.recommendedPath, selection.support)],
      [t("Type de client", "Client type"), selection.value === "business" ? t("Entreprise", "Business") : selection.value === "legal" ? t("Cabinet juridique", "Legal counsel") : selection.value === "medical" ? t("Données sensibles", "Sensitive data") : t("Particulier", "Individual")],
      [t("Estimation", "Estimated value"), formatPriceRange(diagnostic.quotePlan)],
      [t("SLA", "SLA"), diagnostic.sla || "—"],
      [t("Prochaine action", "Next best action"), diagnostic.brief?.nextStep || diagnostic.statusPlan?.nextStep || "—"]
    ];
    dnaRows.forEach(([k, v]) => {
      const dt = document.createElement("dt");
      dt.textContent = k;
      const dd = document.createElement("dd");
      dd.textContent = v;
      elements.dna.appendChild(dt);
      elements.dna.appendChild(dd);
    });

    // Draft quote preview
    elements.quote.innerHTML = "";
    const quoteHeader = document.createElement("h3");
    quoteHeader.textContent = t("Soumission provisoire", "Draft quote");
    const quoteSummary = document.createElement("p");
    quoteSummary.textContent = `${laneLabel(diagnostic.recommendedPath, selection.support)} — ${formatPriceRange(diagnostic.quotePlan)}`;
    const quoteList = document.createElement("ul");
    [
      t("Diagnostic sécurisé en lecture seule", "Secure read-only diagnostic"),
      t("Rapport de faisabilité de récupération", "Recovery feasibility report"),
      t("Protection contre les actions destructrices", "Blocked-action safety protection"),
      t("Recommandation de prochaine étape", "Next-step recommendation")
    ].forEach((label) => {
      const li = document.createElement("li");
      li.textContent = label;
      quoteList.appendChild(li);
    });
    elements.quote.append(quoteHeader, quoteSummary, quoteList);

    // Draft assessment report preview
    elements.report.innerHTML = "";
    const reportHeader = document.createElement("h3");
    reportHeader.textContent = t("Rapport d'évaluation NEXURA", "NEXURA Assessment Report");
    const reportSections = [
      [t("Information client", "Client information"), t("À compléter à l'ouverture du dossier.", "Completed when the case is opened.")],
      [t("Synthèse du problème", "Problem summary"), elements.textarea.value || t("Description fournie par le client.", "Description provided by the client.")],
      [t("Score de risque", "Risk score"), riskLabelMap[risk] || risk],
      [t("Trajectoire détectée", "Detected service path"), laneLabel(diagnostic.recommendedPath, selection.support)],
      [t("Actions à éviter", "Dangerous actions to avoid"), blockedActionsFor(selection.support, diagnostic.category, elements.textarea.value).join(" · ")],
      [t("Action recommandée", "Recommended action"), diagnostic.brief?.nextStep || "—"],
      [t("Plage de prix", "Price range"), formatPriceRange(diagnostic.quotePlan)],
      [t("Critères d'escalade laboratoire", "Lab escalation criteria"), diagnostic.brief?.boundary || "—"],
      [t("Prochaine étape", "Next step"), diagnostic.statusPlan?.nextStep || diagnostic.brief?.nextStep || "—"]
    ];
    reportSections.forEach(([title, body]) => {
      const h = document.createElement("h4");
      h.textContent = title;
      const p = document.createElement("p");
      p.textContent = body;
      elements.report.append(h, p);
    });

    elements.intakeForm.hidden = false;
  };

  // ── /api/diagnostic call ─────────────────────────────────────────
  elements.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    elements.error.hidden = true;
    elements.error.textContent = "";
    const message = (elements.textarea.value || "").trim();
    if (message.length < 6) {
      elements.error.hidden = false;
      elements.error.textContent = t("Décrivez brièvement ce qui se passe.", "Briefly describe what happened.");
      return;
    }
    elements.submit.disabled = true;
    elements.submit.textContent = t("Analyse en cours…", "Analyzing…");
    try {
      const response = await fetch("/api/diagnostic", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          support: selection.support,
          urgency: selection.urgency,
          value: selection.value,
          context: message
        })
      });
      const data = await response.json();
      if (!data.ok || !data.diagnostic) {
        throw new Error(data.message || "Diagnostic indisponible.");
      }
      renderResult(data.diagnostic);
      elements.panel.scrollIntoView({ block: "start" });
    } catch (err) {
      elements.error.hidden = false;
      elements.error.textContent = (err && err.message) || t("Diagnostic indisponible.", "Diagnostic unavailable.");
    } finally {
      elements.submit.disabled = false;
      elements.submit.textContent = t("Lancer le diagnostic AI", "Run AI diagnostic");
    }
  });

  // ── /api/intake call (graceful 503) ──────────────────────────────
  if (elements.intakeForm) {
    elements.intakeForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(elements.intakeForm);
      const payload = {
        nom: (formData.get("nom") || "").toString().trim(),
        courriel: (formData.get("courriel") || "").toString().trim(),
        telephone: (formData.get("telephone") || "").toString().trim(),
        support: selection.support,
        urgence: selection.urgency,
        message: (elements.textarea.value || "").trim(),
        consentement: formData.get("consentement") ? "true" : ""
      };
      if (!payload.nom || !payload.courriel || !payload.consentement) {
        elements.intakeStatus.hidden = false;
        elements.intakeStatus.textContent = t("Nom, courriel et consentement sont requis.", "Name, email and consent are required.");
        return;
      }
      const button = elements.intakeForm.querySelector("button[type='submit']");
      if (button) {
        button.disabled = true;
        button.textContent = t("Ouverture du dossier…", "Opening the case…");
      }
      try {
        const response = await fetch("/api/intake", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (response.status === 503) {
          elements.intakeStatus.hidden = false;
          elements.intakeStatus.textContent = data.message || t("Plateforme en configuration. Contactez-nous directement.", "Platform under configuration. Contact us directly.");
          return;
        }
        if (!data.ok) throw new Error(data.message || "Intake failed");
        elements.intakeStatus.hidden = false;
        elements.intakeStatus.textContent = `${t("Dossier", "Case")} ${data.caseId} — ${data.message || ""}`;
      } catch (err) {
        elements.intakeStatus.hidden = false;
        elements.intakeStatus.textContent = (err && err.message) || t("Ouverture du dossier impossible.", "Case opening failed.");
      } finally {
        if (button) {
          button.disabled = false;
          button.textContent = t("Ouvrir le dossier", "Open the case");
        }
      }
    });
  }
})();
