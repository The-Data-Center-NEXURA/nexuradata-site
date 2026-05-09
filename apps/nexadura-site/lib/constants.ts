import { CheckCircle2, DatabaseZap, ShieldCheck } from "lucide-react";

export const brand = {
  name: "NEXURA",
  domain: "nexura.ca",
  headline: "Automatisation IA pour revenus, opérations et équipes internes.",
  subheadline:
    "NEXURA relie l'accueil des demandes, la qualification, le routage CRM, le suivi et le reporting dans un système opérationnel clair.",
  offer: "Réservez un audit d'automatisation à portée fixe et repartez avec une carte de flux priorisée, un modèle de qualification et un plan d'implantation.",
  primaryCta: "Demander un audit d'automatisation",
  secondaryCta: "Explorer les services",
};

export const navItems = [
  { href: "/services", label: "Services" },
  { href: "/case-studies", label: "Études de cas" },
  { href: "/automation-audit", label: "Audit d'automatisation" },
  { href: "/about", label: "À propos" },
  { href: "/contact", label: "Contact" },
];

export const auditOffer = {
  title: "Audit d'automatisation",
  price: "Découverte à portée fixe",
  description:
    "Un examen ciblé de votre flux de la demande jusqu'au revenu, avec une feuille de route priorisée pour des automatisations livrables sans reconstruire toute l'entreprise.",
  deliverables: [
    "Carte du flux pour l'accueil, la qualification, le CRM et le suivi",
    "Modèle de qualification avec niveaux de priorité",
    "Carnet d'automatisation classé par impact et effort d'implantation",
    "Liste de contrôle analytique et suivi des conversions",
    "Estimation d'implantation pour les premiers flux en production",
  ],
};

export const systemStats = [
  { label: "ROUTES", value: "18" },
  { label: "SYNC", value: "ACTIF" },
  { label: "LATENCE", value: "0,4s" },
  { label: "ESCALADE", value: "ON" },
];

export const operatingNodes = [
  "Capture des signaux entrants",
  "Triage IA + qualification",
  "Affectation des routes CRM",
  "Moteur de séquences de suivi",
  "Tableau de commandement",
  "Mémoire des procédures",
];

export const caseStudies = [
  {
    slug: "b2b-service-firm-intake-cleanup",
    title: "Nettoyage de l'accueil pour une firme de services B2B",
    metric: "34 % plus rapide pour la première réponse",
    summary: "Demandes web, références et courriels regroupés dans un flux CRM qualifié avec alertes au bon responsable.",
    challenge: "L'équipe recevait des demandes par formulaires, références et fils courriel, sans propriétaire clair ni priorité de réponse uniforme.",
    system: "NEXURA a cartographié le flux d'accueil, normalisé les champs CRM requis, ajouté les règles de qualification et routé les alertes prioritaires.",
    outcome: "Le délai de première réponse a diminué de 34 % et la revue hebdomadaire est passée d'une fouille de courriels à une vue pipeline claire.",
  },
  {
    slug: "local-operator-follow-up-system",
    title: "Système de suivi pour un opérateur local",
    metric: "22 tâches manuelles retirées par semaine",
    summary: "Rappels en chiffrier remplacés par des alertes courriel et des séquences de suivi selon l'état de la demande.",
    challenge: "Le suivi dépendait de rappels manuels, ce qui rendait les occasions qualifiées faciles à manquer pendant les semaines chargées.",
    system: "Le flux a été reconstruit autour de l'état de la demande, de la responsabilité du propriétaire et de rappels automatisés selon l'urgence.",
    outcome: "L'opérateur a retiré 22 tâches manuelles par semaine et gagné un rythme de suivi qui ne dépend plus de la mémoire.",
  },
  {
    slug: "consulting-pipeline-reporting-layer",
    title: "Couche de reporting pour un pipeline-conseil",
    metric: "1 source de vérité pour la revue hebdomadaire",
    summary: "Étapes, attribution et événements de conversion standardisés pour rendre la qualité du pipeline visible.",
    challenge: "La direction voyait l'activité, mais pas la qualité du pipeline, les transferts bloqués ni les tendances de conversion par canal.",
    system: "NEXURA a standardisé les étapes, champs d'attribution, événements de conversion et vues de reporting autour des décisions hebdomadaires.",
    outcome: "L'équipe a obtenu une source de vérité pour revoir le pipeline et décider plus clairement où améliorer la conversion.",
  },
];

export const trustSignals = [
  { icon: ShieldCheck, label: "Aucune reconstruction invasive requise" },
  { icon: CheckCircle2, label: "Conçu autour de vos outils actuels" },
  { icon: DatabaseZap, label: "CRM et reporting en priorité" },
];

export const growthSystem = {
  seoPages: [
    "audit automatisation entreprise de services",
    "consultant automatisation crm québec",
    "automatisation suivi prospects",
    "automatisation flux travail PME",
    "audit automatisation opérations ventes",
  ],
  linkedinThemes: [
    "Autopsies de demandes manquées",
    "Cartes de flux avant/après",
    "Leçons d'hygiène CRM",
    "Démontage de modèles de qualification",
    "Erreurs d'automatisation qui créent de la dette opérationnelle",
  ],
  outboundLandingPages: [
    "audit-automatisation-services-locaux",
    "nettoyage-crm-services-professionnels",
    "systeme-accueil-suivi-b2b",
  ],
};