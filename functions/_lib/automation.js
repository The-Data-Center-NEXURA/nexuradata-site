const normalizeText = (value, maxLength) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
};

const normalizeMultilineText = (value, maxLength) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").slice(0, maxLength);
};

const categoryLabels = {
  media: "Support lisible ou instable",
  raid: "Continuité d'activité",
  forensic: "Preuve et incident sensible",
  mobile: "Dossier mobile",
  guided: "Correction guidée"
};

const missingInfoLabels = {
  telephone: "numéro de téléphone direct",
  "device-model": "modèle exact du support et capacité",
  "raid-layout": "nombre de disques, type de RAID et dernière reconstruction",
  "incident-timeline": "chronologie courte et contexte légal, RH ou assurance",
  "mobile-access-state": "modèle du téléphone, code disponible et compte associé",
  "repair-attempts": "outils, commandes, réparations ou reconstructions déjà tentés",
  "encryption-access": "type de chiffrement et clés, mots de passe ou comptes disponibles"
};

const servicePaths = {
  media: "/recuperation-donnees-montreal.html",
  raid: "/recuperation-raid-ssd-montreal.html",
  forensic: "/forensique-numerique-montreal.html",
  mobile: "/recuperation-telephone-montreal.html",
  guided: "/services-recuperation-forensique-montreal.html"
};

const categorySafety = {
  raid: "Ne lancez aucune reconstruction, ne changez pas l'ordre des disques et gardez les supports isolés.",
  forensic: "Préservez l'état actuel, documentez les manipulations et évitez toute action non tracée.",
  mobile: "Ne réinitialisez pas l'appareil, évitez les essais répétés de code et conservez les comptes associés.",
  media: "Cessez d'utiliser le support, ne réinstallez rien et n'écrivez aucun nouveau fichier dessus.",
  guided: "Arrêtez les réparations improvisées avant validation du parcours."
};

const baseClientActions = [
  "Conserver le support original dans son état actuel.",
  "Noter la chronologie: dernier accès réussi, symptômes, manipulations déjà tentées.",
  "Préparer un support de destination si une récupération est approuvée."
];

const categoryOperatorTasks = {
  raid: [
    "Valider modèle NAS/contrôleur, nombre de disques, ordre, niveau RAID et derniers événements.",
    "Bloquer toute reconstruction avant copie ou plan de lecture contrôlé."
  ],
  forensic: [
    "Confirmer la portée probatoire, les personnes autorisées et les contraintes de chaîne de possession.",
    "Éviter toute promesse d'admissibilité ou conclusion juridique automatique."
  ],
  mobile: [
    "Confirmer modèle, état du code, sauvegardes disponibles et historique des dommages.",
    "Déterminer si l'intervention est logique, matérielle ou limitée par le chiffrement."
  ],
  media: [
    "Confirmer support, capacité, symptôme exact et fichiers prioritaires.",
    "Évaluer si la réception labo est nécessaire avant tout autre essai logiciel."
  ],
  guided: [
    "Requalifier le besoin et choisir entre conseil, prise en charge ou intervention payée."
  ]
};

const flagOperatorTasks = {
  "physical-risk": "Prioriser une lecture laboratoire; éviter redémarrage et réparation système.",
  "continuity-risk": "Préparer un plan continuité: fenêtre d'arrêt, dépendances et personne TI responsable.",
  "incident-response": "Traiter comme incident sensible; isoler les preuves et limiter les communications non nécessaires.",
  "forensic-boundary": "Demander contexte légal/assurance et consigner toute manipulation connue.",
  "overwrite-risk": "Documenter les écritures, formats, réinstallations ou reconstructions déjà tentés.",
  "priority-response": "Remonter le dossier dans la file prioritaire et confirmer le canal direct."
};

const expertSignalLabels = {
  "support-context-mismatch": "Le texte libre contredit le support sélectionné; le parcours doit être corrigé avant décision.",
  "urgency-understated": "L'urgence semble sous-estimée par rapport à l'impact décrit.",
  "physical-risk-hidden": "Un risque matériel est détecté dans le texte même si le symptôme choisi est moins sévère.",
  "forensic-context-hidden": "Un contexte preuve, assurance ou juridique est détecté et exige une revue humaine.",
  "repair-tool-attempted": "Une réparation système, reconstruction ou commande risquée semble déjà avoir été tentée.",
  "credential-dependent": "La faisabilité dépend possiblement d'un code, compte, mot de passe ou clé de chiffrement.",
  "contamination-risk": "Liquide, ouverture, riz, chaleur ou congélation peuvent aggraver le dommage ou contaminer l'analyse."
};

const expertSignalOperatorTasks = {
  "support-context-mismatch": "Corriger la catégorie du dossier selon le texte libre avant soumission ou paiement.",
  "urgency-understated": "Valider l'impact réel, la personne responsable et la fenêtre d'intervention.",
  "physical-risk-hidden": "Traiter comme risque matériel même si le client a choisi un symptôme logique.",
  "forensic-context-hidden": "Bloquer les consignes détaillées et valider la portée probatoire avec un humain.",
  "repair-tool-attempted": "Demander les commandes/outils exacts et arrêter toute réparation système.",
  "credential-dependent": "Confirmer les accès disponibles avant de promettre une voie de traitement.",
  "contamination-risk": "Documenter l'exposition, le séchage, l'ouverture et la remise sous tension."
};

const serviceLevelLabels = {
  emergency: "Urgence contrôlée",
  sensitive: "Revue humaine sensible",
  priority: "Priorité opérateur",
  standard: "Standard automatisé"
};

const clientNeedLabels = {
  personal_memory: "Souvenirs personnels à préserver",
  business_continuity: "Continuité d'activité",
  legal_or_insurance: "Preuve, litige ou assurance",
  privacy_sensitive: "Confidentialité élevée",
  urgent_stabilization: "Stabilisation technique urgente",
  technical_recovery: "Récupération technique ciblée"
};

const emotionalSignals = {
  distressed: {
    label: "Détresse client",
    responseTone: "rassurant et direct",
    empathyLine: "Je comprends que la perte peut être très lourde. La priorité est de préserver ce qui existe encore, sans ajouter de risque."
  },
  frustrated: {
    label: "Frustration ou fatigue",
    responseTone: "calme et structuré",
    empathyLine: "La situation a déjà pris trop d'énergie. On remet le dossier dans un parcours clair et contrôlé."
  },
  business_pressure: {
    label: "Pression opérationnelle",
    responseTone: "prioritaire et factuel",
    empathyLine: "Quand les opérations sont touchées, la priorité est de stabiliser le support et de réduire les manipulations improvisées."
  },
  legal_anxiety: {
    label: "Crainte légale ou assurance",
    responseTone: "prudent et documenté",
    empathyLine: "Quand une preuve ou une assurance est en jeu, chaque manipulation doit rester documentée et limitée."
  },
  neutral: {
    label: "Signal neutre",
    responseTone: "technique et concis",
    empathyLine: "Le dossier peut être qualifié méthodiquement avant toute intervention."
  }
};

const includesAny = (text, words) => words.some((word) => text.includes(word));

const uniqueItems = (items) => Array.from(new Set(items.filter(Boolean)));

const labelMissingInfo = (missingInfo) => missingInfo.map((key) => missingInfoLabels[key] || key);

const labelExpertSignals = (signals) => signals.map((key) => expertSignalLabels[key] || key);

const searchableText = (...values) => values
  .filter((value) => typeof value === "string")
  .join(" ")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "");

export const inferExpertSignals = (submission = {}) => {
  const support = searchableText(submission.support);
  const symptom = searchableText(submission.symptom, submission.symptome);
  const urgency = searchableText(submission.urgence, submission.urgency, submission.impact);
  const urgencyWithoutNegativeCue = urgency.replace(/non[- ]urgent|not urgent/g, "");
  const sensitivity = searchableText(submission.sensibilite, submission.sensitivity, submission.profil, submission.profile);
  const text = searchableText(submission.support, submission.message, submission.impact, submission.sensibilite, submission.sensitivity, submission.profil, submission.profile);
  const signals = new Set();

  if (includesAny(text, ["raid", "nas", "synology", "qnap", "serveur", "server", "rebuild", "reconstruction"]) && !includesAny(support, ["raid", "nas", "serveur", "server"])) {
    signals.add("support-context-mismatch");
  }

  if (includesAny(text, ["operations bloquees", "operations blocked", "payroll", "paie", "production", "client attend", "server down", "serveur down", "perte de revenu", "revenue loss"]) && !includesAny(urgencyWithoutNegativeCue, ["urgent", "rapide", "operations", "bloque", "blocked", "critical"])) {
    signals.add("urgency-understated");
  }

  if (includesAny(text, ["clique", "click", "bruit", "noise", "tombe", "drop", "eau", "liquid", "non detecte", "not detected", "chauffe", "overheat"]) && !includesAny(symptom, ["physical", "water", "not_detected", "choc", "liquide", "non detecte"])) {
    signals.add("physical-risk-hidden");
  }

  if (includesAny(text, ["preuve", "evidence", "avocat", "lawyer", "court", "tribunal", "assurance", "insurer", "claim", "litige", "legal", "juridique"]) && !includesAny(sensitivity, ["preuve", "evidence", "legal", "juridique", "assurance", "sensible"])) {
    signals.add("forensic-context-hidden");
  }

  if (includesAny(text, ["chkdsk", "fsck", "first aid", "disk utility", "utilitaire de disque", "repair", "reparer", "repare", "réparer", "réparé", "initialize", "initialiser", "rebuild", "reconstruction", "format", "factory reset"])) {
    signals.add("repair-tool-attempted");
  }

  if (includesAny(text, ["bitlocker", "filevault", "veracrypt", "mot de passe", "password", "cle de recuperation", "recovery key", "icloud", "google account", "passcode", "code verrou", "locked", "verrouille"])) {
    signals.add("credential-dependent");
  }

  if (includesAny(text, ["riz", "rice", "seche cheveux", "hair dryer", "congel", "freezer", "ouvert", "opened", "liquide", "liquid", "eau", "water", "alcool", "isopropyl"])) {
    signals.add("contamination-risk");
  }

  const hiddenHazards = Array.from(signals).filter((signal) => !["support-context-mismatch", "urgency-understated"].includes(signal));
  const contradictions = Array.from(signals).filter((signal) => ["support-context-mismatch", "urgency-understated"].includes(signal));
  const scoreBoost = hiddenHazards.length + (contradictions.length * 2);

  return {
    signals: Array.from(signals),
    hiddenHazards,
    contradictions,
    labels: labelExpertSignals(Array.from(signals)),
    scoreBoost
  };
};

const proposalFrom = ({ category, riskLevel, clientNeed, emotionalContext, missingInfo, quotePlan }) => {
  const blocked = missingInfo.length > 0;
  const base = {
    kind: clientNeed.key,
    readiness: blocked ? "needs-details" : quotePlan.readiness,
    tone: emotionalContext.responseTone,
    boundary: "Aucune récupération, analyse probatoire ou facturation ne commence sans accord explicite."
  };

  if (clientNeed.key === "personal_memory") {
    return {
      ...base,
      primary: "Préserver les souvenirs et éviter tout nouvel essai logiciel.",
      rationale: "Les photos, vidéos et documents personnels ont souvent plus de valeur émotionnelle que technique; la priorité est de réduire le risque d'écrasement.",
      nextStep: blocked ? "Compléter les détails du support, puis demander une première lecture de faisabilité." : "Ouvrir un dossier souvenir prioritaire avec consigne de non-écriture.",
      offer: "Évaluation orientée fichiers essentiels, avec décision humaine avant toute intervention payante."
    };
  }

  if (clientNeed.key === "business_continuity") {
    return {
      ...base,
      primary: "Traiter comme un dossier de continuité et bloquer les manipulations non contrôlées.",
      rationale: "Une panne d'affaires se gère d'abord par stabilisation, personne responsable, fenêtre d'intervention et réduction des essais destructifs.",
      nextStep: blocked ? "Obtenir l'architecture, le contact TI et l'impact opérationnel exact." : "Préparer une revue prioritaire avec plan de reprise et soumission après cadrage.",
      offer: "Proposition continuité: diagnostic prioritaire, plan d'action court, puis dépôt ou soumission selon le périmètre."
    };
  }

  if (clientNeed.key === "legal_or_insurance") {
    return {
      ...base,
      primary: "Basculer en revue humaine avant toute consigne technique détaillée.",
      rationale: "Les dossiers légaux, RH ou assurance exigent une chronologie et une chaîne de manipulation prudente.",
      nextStep: blocked ? "Compléter la chronologie et identifier les personnes autorisées." : "Cadrer le mandat sensible et confirmer la méthode de transmission contrôlée.",
      offer: "Proposition sensible: ouverture de dossier, revue de portée, puis devis adapté au mandat."
    };
  }

  if (clientNeed.key === "privacy_sensitive") {
    return {
      ...base,
      primary: "Utiliser un parcours confidentiel avec accès limité aux informations nécessaires.",
      rationale: "Les données médicales, RH ou client exigent un résumé minimal, utile et contrôlé.",
      nextStep: blocked ? "Confirmer le contact autorisé et les fichiers prioritaires sans exposer de contenu inutile." : "Ouvrir un dossier confidentiel et limiter le partage aux détails techniques nécessaires.",
      offer: "Proposition confidentielle: qualification courte, réception sécurisée et soumission après validation."
    };
  }

  if (clientNeed.key === "urgent_stabilization" || riskLevel === "high" || category === "raid") {
    return {
      ...base,
      primary: "Stabiliser le support avant toute nouvelle tentative.",
      rationale: "Les signes physiques, redémarrages, reconstructions ou non-détections peuvent aggraver la perte à chaque manipulation.",
      nextStep: blocked ? "Compléter les détails critiques, puis confirmer si la réception laboratoire est nécessaire." : "Garder le support isolé et préparer une revue prioritaire.",
      offer: "Proposition technique: revue prioritaire, consignes de réception, puis soumission ou dépôt selon le risque."
    };
  }

  return {
    ...base,
    primary: "Ouvrir un dossier ciblé avec les informations minimales utiles.",
    rationale: "Le cas semble compatible avec une qualification structurée avant décision d'intervention.",
    nextStep: blocked ? "Compléter les informations manquantes avant soumission." : "Préparer une évaluation standard et confirmer les fichiers prioritaires.",
    offer: "Proposition standard: préqualification, estimation après revue et intervention seulement après accord."
  };
};

const serviceLevelFrom = (category, flags, riskLevel, expertSignals = {}) => {
  const signals = expertSignals.signals || [];
  if (flags.includes("priority-response") && (category === "raid" || riskLevel === "high")) return "emergency";
  if (riskLevel === "sensitive" || flags.includes("forensic-boundary") || flags.includes("incident-response") || signals.includes("forensic-context-hidden")) return "sensitive";
  if (riskLevel === "high" || flags.includes("priority-response") || category === "raid" || signals.includes("physical-risk-hidden") || signals.includes("urgency-understated")) return "priority";
  return "standard";
};

const slaFrom = (serviceLevel) => ({
  emergency: "Revue opérateur immédiate dès réception du dossier.",
  sensitive: "Revue humaine obligatoire avant consigne détaillée ou soumission.",
  priority: "Revue prioritaire le même jour ouvrable.",
  standard: "Réponse initiale cible en moins de 24 h."
}[serviceLevel] || "Réponse initiale cible en moins de 24 h.");

const statusPlanFrom = (category, riskLevel, missingInfo, serviceLevel, nextStep) => ({
  status: missingInfo.length > 0 && serviceLevel !== "emergency" ? "En attente du média" : serviceLevel === "standard" ? "Nouveau dossier" : "Diagnostic en cours",
  nextStep,
  visibleState: missingInfo.length > 0 ? "missing-information" : riskLevel === "standard" ? "standard-triage" : "priority-triage",
  workroomState: category === "forensic" || riskLevel === "sensitive" ? "locked-human-review" : "awaiting-payment-or-authorization"
});

const quotePlanFrom = (category, riskLevel, missingInfo, flags) => ({
  readiness: missingInfo.length > 0 ? "blocked-missing-information" : riskLevel === "standard" ? "ready-standard-quote" : "review-before-quote",
  paymentKind: category === "raid" || riskLevel === "high" ? "deposit" : "custom",
  label: category === "raid" ? "Dépôt intervention RAID / NAS" : riskLevel === "sensitive" ? "Ouverture dossier sensible" : "Diagnostic et intervention NEXURADATA",
  description: flags.includes("physical-risk")
    ? "À confirmer après revue matérielle; aucun travail facturable sans accord écrit."
    : "À confirmer après qualification; aucun travail facturable sans accord écrit."
});

const clientActionsFrom = (category, missingInfo, expertSignals = {}) => uniqueItems([
  categorySafety[category] || categorySafety.guided,
  (expertSignals.signals || []).includes("repair-tool-attempted") && "Ne lancez plus de réparation système, CHKDSK, utilitaire de disque, reconstruction ou formatage.",
  (expertSignals.signals || []).includes("credential-dependent") && "Préparez les accès disponibles sans les transmettre dans un canal non sécurisé.",
  (expertSignals.signals || []).includes("contamination-risk") && "Ne chauffez pas, ne congelez pas et ne rouvrez pas le support; conservez l'historique d'exposition.",
  ...baseClientActions,
  ...labelMissingInfo(missingInfo).map((label) => `Préparer: ${label}.`)
]);

const operatorTasksFrom = (category, flags, missingInfo, quotePlan, expertSignals = {}) => uniqueItems([
  ...(categoryOperatorTasks[category] || categoryOperatorTasks.guided),
  ...flags.map((flag) => flagOperatorTasks[flag]),
  ...(expertSignals.signals || []).map((signal) => expertSignalOperatorTasks[signal]),
  ...labelMissingInfo(missingInfo).map((label) => `Demander au client: ${label}.`),
  quotePlan.readiness === "blocked-missing-information"
    ? "Bloquer la soumission et le paiement jusqu'aux informations critiques."
    : "Préparer la soumission et le lien Stripe après validation du périmètre."
]);

const automationActionsFrom = ({ category, missingInfo, serviceLevel, quotePlan, clientNeed, emotionalContext, expertSignals }) => uniqueItems([
  "triage-category-selected",
  "risk-flags-generated",
  (expertSignals.signals || []).length > 0 && "expert-signal-layer-applied",
  (expertSignals.hiddenHazards || []).length > 0 && "hidden-risk-detected",
  (expertSignals.contradictions || []).length > 0 && "intake-contradiction-corrected",
  "client-need-profile-created",
  emotionalContext.signal !== "neutral" && "empathy-response-prepared",
  "safe-handling-instructions-created",
  "client-summary-drafted",
  "proposal-drafted",
  "operator-task-list-created",
  missingInfo.length > 0 && "missing-information-request-created",
  quotePlan.readiness !== "blocked-missing-information" && "quote-payment-path-prepared",
  serviceLevel === "emergency" && "urgent-escalation-prepared",
  category === "forensic" && "human-review-boundary-applied",
  clientNeed.key === "business_continuity" && "continuity-proposal-prepared"
]);

export const inferCaseCategory = (support = "", message = "") => {
  const combined = `${support} ${message}`.toLowerCase();

  if (includesAny(combined, ["forensique", "preuve", "juridique", "avocat", "assurance", "litige", "forensic", "evidence", "legal", "insurer"])) {
    return "forensic";
  }

  if (includesAny(combined, ["raid", "nas", "serveur", "server", "rebuild", "reconstruction", "synology", "qnap"])) {
    return "raid";
  }

  if (includesAny(combined, ["téléphone", "telephone", "mobile", "iphone", "android", "ipad", "passcode", "code"])) {
    return "mobile";
  }

  if (includesAny(combined, ["disque", "drive", "ssd", "usb", "clé", "cle", "carte", "memory", "hdd"])) {
    return "media";
  }

  return "guided";
};

export const inferRiskFlags = (submission = {}) => {
  const message = `${submission.message || ""}`.toLowerCase();
  const support = `${submission.support || ""}`.toLowerCase();
  const urgency = `${submission.urgence || submission.urgency || ""}`.toLowerCase();
  const impact = `${submission.impact || ""}`.toLowerCase();
  const sensitivity = `${submission.sensibilite || submission.sensitivity || ""}`.toLowerCase();
  const flags = new Set();

  if (includesAny(message, ["clique", "click", "bruit", "noise", "chauffe", "overheat", "tombe", "drop", "eau", "liquid"])) {
    flags.add("physical-risk");
  }

  if (includesAny(`${support} ${message}`, ["raid", "nas", "serveur", "server", "rebuild", "reconstruction"])) {
    flags.add("continuity-risk");
  }

  if (includesAny(message, ["ransom", "rançon", "ransomware", "crypt", "chiffr", "malware", "compromis", "breach"])) {
    flags.add("incident-response");
  }

  if (includesAny(`${support} ${message} ${sensitivity}`, ["preuve", "forensic", "forensique", "juridique", "legal", "litige", "assurance", "insurer", "chaîne de possession", "chain of custody"])) {
    flags.add("forensic-boundary");
  }

  if (includesAny(message, ["format", "réinstall", "reinstall", "reset", "factory", "effac", "erase", "overwrite", "rebuild"])) {
    flags.add("overwrite-risk");
  }

  if (includesAny(`${urgency} ${impact} ${message}`, ["urgent", "très sensible", "tres sensible", "opérations bloquées", "operations blocked", "client", "juridique", "assurance"])) {
    flags.add("priority-response");
  }

  return Array.from(flags);
};

export const inferClientNeed = (submission = {}) => {
  const text = searchableText(submission.support, submission.message, submission.impact, submission.sensibilite, submission.sensitivity, submission.profil, submission.profile);

  if (includesAny(text, ["photo", "video", "souvenir", "famille", "family", "father", "mother", "mere", "pere", "decede", "passed away", "funeral", "wedding", "mariage", "baby", "bebe"])) {
    return { key: "personal_memory", label: clientNeedLabels.personal_memory };
  }

  if (includesAny(text, ["preuve", "evidence", "legal", "juridique", "avocat", "lawyer", "court", "tribunal", "litige", "assurance", "insurer", "claim", "rh", "hr"])) {
    return { key: "legal_or_insurance", label: clientNeedLabels.legal_or_insurance };
  }

  if (includesAny(text, ["paie", "payroll", "comptabil", "accounting", "quickbooks", "sage", "server", "serveur", "operations bloquees", "operations blocked", "production", "client attend", "client waiting", "invoice", "facture", "nas", "raid"])) {
    return { key: "business_continuity", label: clientNeedLabels.business_continuity };
  }

  if (includesAny(text, ["medical", "medicaux", "patient", "confidentiel", "confidential", "client list", "liste client", "rh", "hr", "employee", "employe"])) {
    return { key: "privacy_sensitive", label: clientNeedLabels.privacy_sensitive };
  }

  if (includesAny(text, ["click", "clique", "bruit", "noise", "eau", "liquid", "drop", "tombe", "non detecte", "not detected", "redemarrage", "rebuild", "reconstruction"])) {
    return { key: "urgent_stabilization", label: clientNeedLabels.urgent_stabilization };
  }

  return { key: "technical_recovery", label: clientNeedLabels.technical_recovery };
};

export const inferEmotionalContext = (submission = {}) => {
  const text = searchableText(submission.message, submission.impact, submission.urgence, submission.urgency, submission.sensibilite, submission.sensitivity);

  if (includesAny(text, ["panique", "panic", "desespere", "desperate", "pleure", "crying", "devast", "decede", "passed away", "funeral", "souvenir irremplacable", "irreplaceable"])) {
    return { signal: "distressed", ...emotionalSignals.distressed };
  }

  if (includesAny(text, ["frustre", "frustrated", "fache", "angry", "tanne", "exhausted", "epuise", "urgent depuis", "personne repond"])) {
    return { signal: "frustrated", ...emotionalSignals.frustrated };
  }

  if (includesAny(text, ["operations bloquees", "operations blocked", "payroll", "paie", "production", "client attend", "client waiting", "serveur down", "server down", "perte de revenu", "revenue loss"])) {
    return { signal: "business_pressure", ...emotionalSignals.business_pressure };
  }

  if (includesAny(text, ["avocat", "lawyer", "court", "tribunal", "assurance", "insurer", "claim", "preuve", "evidence", "litige", "legal"])) {
    return { signal: "legal_anxiety", ...emotionalSignals.legal_anxiety };
  }

  return { signal: "neutral", ...emotionalSignals.neutral };
};

export const inferMissingInformation = (submission = {}, category = "guided") => {
  const message = `${submission.message || ""}`.toLowerCase();
  const searchable = searchableText(submission.message, submission.support, submission.sensibilite, submission.sensitivity);
  const phone = normalizeText(submission.telephone || submission.phone || "", 40);
  const missing = [];

  if (!phone) {
    missing.push("telephone");
  }

  if (category === "media" && !includesAny(message, ["modèle", "model", "marque", "brand", "capacité", "capacity", "ssd", "hdd", "usb"])) {
    missing.push("device-model");
  }

  if (category === "raid" && !includesAny(message, ["nombre de disque", "number of disk", "disk count", "raid 0", "raid 1", "raid 5", "raid 6", "raid 10", "synology", "qnap"])) {
    missing.push("raid-layout");
  }

  if (category === "forensic" && !includesAny(message, ["date", "timeline", "chronologie", "assurance", "avocat", "court", "tribunal", "rh", "hr"])) {
    missing.push("incident-timeline");
  }

  if (category === "mobile" && !includesAny(message, ["iphone", "android", "samsung", "modèle", "model", "code", "passcode", "icloud", "google"])) {
    missing.push("mobile-access-state");
  }

  if (includesAny(searchable, ["chkdsk", "fsck", "first aid", "disk utility", "utilitaire de disque", "repair", "reparer", "réparer", "rebuild", "reconstruction"]) && !includesAny(searchable, ["commande", "command", "outil", "tool", "log", "journal"])) {
    missing.push("repair-attempts");
  }

  if (includesAny(searchable, ["bitlocker", "filevault", "veracrypt", "password", "mot de passe", "recovery key", "cle de recuperation", "passcode", "icloud", "google account"]) && !includesAny(searchable, ["disponible", "available", "connu", "known", "j'ai", "i have"])) {
    missing.push("encryption-access");
  }

  return missing;
};

const riskLevelFrom = (category, flags) => {
  if (category === "forensic" || flags.includes("forensic-boundary") || flags.includes("incident-response")) {
    return "sensitive";
  }

  if (category === "raid" || flags.includes("physical-risk") || flags.includes("continuity-risk") || flags.includes("overwrite-risk")) {
    return "high";
  }

  if (flags.includes("priority-response")) {
    return "priority";
  }

  return "standard";
};

const recommendedPathFrom = (category, riskLevel) => {
  if (category === "forensic" || riskLevel === "sensitive") return "Mandat probatoire ou incident sensible";
  if (category === "raid") return "Intervention continuité d'activité";
  if (category === "mobile") return "Parcours mobile contrôlé";
  if (category === "media" && riskLevel === "high") return "Intervention support à risque";
  if (category === "media") return "Récupération ciblée";
  return "Correction guidée payée";
};

const nextStepFrom = (category, missingInfo) => {
  if (missingInfo.length > 0) {
    return "Valider les informations manquantes, puis confirmer le parcours d'intervention.";
  }

  if (category === "raid") return "Confirmer l'architecture et préparer la séquence d'intervention.";
  if (category === "forensic") return "Cadrer le mandat, la portée et la méthode de transmission contrôlée.";
  if (category === "mobile") return "Confirmer le modèle, l'état d'accès et la voie de traitement appropriée.";
  if (category === "media") return "Qualifier l'état du support et confirmer la prochaine manipulation sécuritaire.";
  return "Confirmer le contexte et préparer la prochaine action guidée.";
};

export const buildCaseAutomationDraft = (submission = {}) => {
  const category = inferCaseCategory(submission.support, submission.message);
  const flags = inferRiskFlags(submission);
  const missingInfo = inferMissingInformation(submission, category);
  const expertSignals = inferExpertSignals(submission);
  const riskLevel = riskLevelFrom(category, flags);
  const recommendedPath = recommendedPathFrom(category, riskLevel);
  const nextStep = nextStepFrom(category, missingInfo);
  const clientNeed = inferClientNeed(submission);
  let emotionalContext = inferEmotionalContext(submission);
  if (emotionalContext.signal === "neutral" && clientNeed.key === "business_continuity" && includesAny(searchableText(submission.urgence, submission.urgency, submission.impact), ["urgent", "rapide", "operations bloquees", "operations blocked", "critical"])) {
    emotionalContext = { signal: "business_pressure", ...emotionalSignals.business_pressure };
  }
  let serviceLevel = serviceLevelFrom(category, flags, riskLevel, expertSignals);
  if (serviceLevel === "standard" && (emotionalContext.signal === "distressed" || clientNeed.key === "personal_memory")) {
    serviceLevel = "priority";
  }
  const serviceLevelLabel = serviceLevelLabels[serviceLevel] || serviceLevelLabels.standard;
  const sla = slaFrom(serviceLevel);
  const statusPlan = statusPlanFrom(category, riskLevel, missingInfo, serviceLevel, nextStep);
  const quotePlan = quotePlanFrom(category, riskLevel, missingInfo, flags);
  const proposal = proposalFrom({ category, riskLevel, clientNeed, emotionalContext, missingInfo, quotePlan });
  const clientActions = clientActionsFrom(category, missingInfo, expertSignals);
  const operatorTasks = operatorTasksFrom(category, flags, missingInfo, quotePlan, expertSignals);
  const automationActions = automationActionsFrom({ category, missingInfo, serviceLevel, quotePlan, clientNeed, emotionalContext, expertSignals });
  const qualificationLines = [
    `Catégorie: ${categoryLabels[category] || categoryLabels.guided}`,
    `Besoin client: ${clientNeed.label}`,
    `Signal émotionnel: ${emotionalContext.label}`,
    expertSignals.signals.length ? `Signaux experts: ${expertSignals.labels.join(" | ")}` : "Signaux experts: aucun conflit ou risque caché détecté",
    `Risque: ${riskLevel}`,
    `Niveau service: ${serviceLevelLabel}`,
    `SLA: ${sla}`,
    `Parcours recommandé: ${recommendedPath}`,
    `Proposition: ${proposal.primary}`,
    `Route: ${servicePaths[category] || servicePaths.guided}`,
    flags.length ? `Marqueurs: ${flags.join(", ")}` : "Marqueurs: aucun marqueur critique détecté",
    missingInfo.length ? `Informations à obtenir: ${labelMissingInfo(missingInfo).join("; ")}` : "Informations à obtenir: aucune information critique détectée",
    `Tâches opérateur: ${operatorTasks.join(" | ")}`,
    `Plan paiement: ${quotePlan.readiness}; ${quotePlan.label}`
  ];

  return {
    category,
    categoryLabel: categoryLabels[category] || categoryLabels.guided,
    riskLevel,
    expertSignals,
    clientNeed,
    emotionalContext,
    proposal,
    serviceLevel,
    serviceLevelLabel,
    sla,
    flags,
    missingInfo,
    missingInfoLabels: labelMissingInfo(missingInfo),
    recommendedPath,
    servicePath: servicePaths[category] || servicePaths.guided,
    nextStep,
    statusPlan,
    quotePlan,
    clientActions,
    operatorTasks,
    automationActions,
    clientSummary: normalizeMultilineText(
      [
        emotionalContext.signal !== "neutral" ? emotionalContext.empathyLine : "",
        `Votre demande a été reçue. NEXURADATA qualifie le dossier selon le parcours ${recommendedPath.toLowerCase()}.`,
        `Besoin compris: ${clientNeed.label}. Proposition: ${proposal.primary}`,
        `Priorité: ${serviceLevelLabel}. ${sla}`,
        `Action immédiate: ${clientActions[0] || categorySafety.guided}`
      ].filter(Boolean).join(" "),
      1200
    ),
    qualificationSummary: normalizeMultilineText(qualificationLines.join("\n"), 1800),
    handlingFlags: normalizeText([category, riskLevel, serviceLevel, `need:${clientNeed.key}`, `signal:${emotionalContext.signal}`, ...flags, ...expertSignals.signals.map((key) => `expert:${key}`), ...missingInfo.map((key) => `missing:${key}`)].join(", "), 700)
  };
};

export const buildAutomationTimeline = (draft = {}) => {
  const hasMissingInfo = (draft.missingInfo || []).length > 0;
  const priorityTitle = draft.serviceLevel === "emergency"
    ? "Escalade urgente préparée"
    : draft.serviceLevel === "sensitive"
      ? "Revue humaine sensible"
      : "Diagnostic en cours";

  return [
    {
      title: "Nouveau dossier",
      note: "La demande a été enregistrée et le client dispose d'un accès de suivi.",
      state: "complete",
      sortOrder: 0
    },
    {
      title: "Triage automatisé",
      note: `${draft.categoryLabel || categoryLabels.guided} · ${draft.serviceLevelLabel || serviceLevelLabels.standard} · ${draft.recommendedPath || "Parcours à confirmer"}.`,
      state: "complete",
      sortOrder: 1
    },
    {
      title: hasMissingInfo ? "En attente du média" : priorityTitle,
      note: hasMissingInfo
        ? `À obtenir: ${labelMissingInfo(draft.missingInfo || []).join("; ")}.`
        : draft.nextStep || "Le laboratoire prépare la prochaine action utile.",
      state: "active",
      sortOrder: 2
    },
    {
      title: "Soumission et paiement",
      note: draft.quotePlan?.readiness === "blocked-missing-information"
        ? "La soumission reste bloquée jusqu'aux informations critiques."
        : "La soumission et le lien Stripe peuvent être préparés après validation du périmètre.",
      state: "pending",
      sortOrder: 3
    },
    {
      title: "Intervention contrôlée",
      note: "Commence seulement après accord écrit, paiement ou autorisation applicable.",
      state: "pending",
      sortOrder: 4
    }
  ];
};

export const formatAutomationEventNote = (draft = {}) => [
  `Parcours: ${draft.recommendedPath || "à confirmer"}`,
  `Besoin client: ${draft.clientNeed?.label || clientNeedLabels.technical_recovery}`,
  `Signal émotionnel: ${draft.emotionalContext?.label || emotionalSignals.neutral.label}`,
  `Signaux experts: ${(draft.expertSignals?.labels || []).join(" | ") || "aucun"}`,
  `Proposition: ${draft.proposal?.primary || "à confirmer"}`,
  `Niveau service: ${draft.serviceLevelLabel || serviceLevelLabels.standard}`,
  `SLA: ${draft.sla || slaFrom("standard")}`,
  `Actions automatisées: ${(draft.automationActions || []).join(", ") || "triage"}`,
  `Tâches opérateur: ${(draft.operatorTasks || []).join(" | ") || "Revoir le dossier"}`,
  `Actions client: ${(draft.clientActions || []).join(" | ") || categorySafety.guided}`,
  `Plan paiement: ${draft.quotePlan?.readiness || "à confirmer"} · ${draft.quotePlan?.label || "Soumission à préparer"}`
].join("\n");