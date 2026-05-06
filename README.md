# NEXURADATA

Site marketing et plateforme de lancement pour un laboratoire de recuperation de donnees et forensique numerique.

Le depot couvre:

- le site public bilingue (FR + EN)
- le formulaire d'ouverture de dossier
- le portail client de suivi
- la console interne `/operations/`
- les Pages Functions Cloudflare pour l'intake, le suivi et les actions operateur
- la base Neon Postgres et la configuration `wrangler.jsonc`

## Structure utile

- `index.html` / `en/index.html` : pages d'accueil publiques (FR / EN)
- `*.html` a la racine : pages marketing FR publiees telles quelles pour garder des URLs courtes et stables
- `en/*.html` : equivalents EN des pages publiques; toute modification FR doit etre refletee cote EN
- `suivi-dossier-client-montreal.html` : portail client `noindex`
- `operations/index.html` : console interne a proteger via Cloudflare Access
- `assets/css/site.css` : styles partages
- `assets/js/site.js` : interactions publiques et console operateur
- `functions/api/intake.js` : ouverture de dossier
- `functions/api/status.js` : suivi client par numero + code
- `functions/api/ops/cases.js` : recherche et actions operateur
- `functions/_lib/` : logique partagee (DB, auth, emails, Stripe, rate-limit)
- `migrations/neon/0001_full_schema.sql` : schema Postgres consolide
- `migrations/d1-archive/` : ancienne base D1 (archive historique uniquement)
- `wrangler.jsonc` : configuration Pages/Functions avec uniquement des valeurs de role non personnelles
- `.dev.vars.example` : modele local sans secrets ni adresse personnelle, a copier vers `.dev.vars`

## Hygiene du depot

- Ne jamais commiter `.dev.vars`, `.env*`, `.wrangler/`, `release-cloudflare/` ou des exports locaux d'agents.
- Les fichiers `.github/agents/Agent Discovery Results*` sont des sorties locales de VS Code/Copilot et doivent rester hors Git.
- Les adresses personnelles et chemins locaux propres a une machine sont bloques par `npm run check`.
- Les templates HTML internes vont dans `docs/`, pas dans `assets/`, parce que `assets/` est publie avec le site.
- `release-cloudflare/` est regenere par `npm run build`; modifier uniquement les sources suivies.
- Les pages FR racine et leurs versions `en/` doivent rester synchronisees pour le SEO bilingue.

## Carte canonique du site

Cette carte evite d'empiler une nouvelle version du site quand un bon element existe deja.

- **Conversion principale**: `index.html`, `tarifs-recuperation-donnees-montreal.html`, `suivi-dossier-client-montreal.html`, `paiement-reussi.html`, `paiement-annule.html`.
- **Services coeur**: `recuperation-donnees-montreal.html`, `recuperation-raid-ssd-montreal.html`, `recuperation-telephone-montreal.html`, `forensique-numerique-montreal.html`, `services-recuperation-forensique-montreal.html`.
- **Preuve et confiance**: `le-laboratoire.html`, `mandats-entreprise.html`, `reception-securisee-donnees-montreal.html`, `engagements-conformite-quebec.html`, `conditions-intervention-paiement.html`, `mentions-legales.html`, `politique-confidentialite.html`.
- **SEO et education**: `processus-recuperation-donnees-montreal.html`, `problemes-courants-recuperation-montreal.html`, `prevention-perte-donnees-montreal.html`, `sauvegarde-vs-recuperation-donnees-montreal.html`, `resilience-donnees-entreprise-montreal.html`, `zones-desservies-montreal-quebec.html`, `statut-services-montreal.html`.
- **Console interne**: `operations/` et `/api/ops/*`, a proteger par Cloudflare Access.

Avant d'ajouter une page, verifier cette carte et renforcer la page canonique existante. Les fichiers `copy`, `old`, `backup`, `draft`, `test`, `tmp`, `v2` ou `index2.html` sont bloques par `npm run check`.

## Prerequis de lancement

1. Provisionner une base Neon Postgres et recuperer son `DATABASE_URL`.
2. Appliquer le schema `migrations/neon/0001_full_schema.sql` via `psql` ou la console Neon.
3. Declarer `DATABASE_URL` comme secret Cloudflare Pages.
4. Creer un secret fort `ACCESS_CODE_SECRET`.
5. Configurer les alias `contact@`, `urgence@`, `dossiers@` dans Cloudflare Email Routing.
6. Verifier le domaine d'envoi dans Resend et fournir `RESEND_API_KEY`.
7. Proteger `/operations/*` et `/api/ops/*` avec Cloudflare Access.

Le runbook detaille est dans [`docs/LAUNCH-RUNBOOK.md`](docs/LAUNCH-RUNBOOK.md). Voir aussi [`docs/`](docs/) pour la checklist de lancement, le guide de deploiement rapide et les notes de recherche concurrentielle / tarifaire.

## Commandes

- `npm install`
- `npm run build`
- `npm run cf:whoami`
- `npm run cf:dev`
- `npm run cf:check`
- `npm run cf:deploy`
- `npm run cf:deploy:staging`
- `npm run secret:scan`
- `npm test`
- `npm run test:coverage`

`release-cloudflare/` est regenere a chaque build pour les assets statiques. Les `functions/` restent a la racine du projet pour Cloudflare Pages Functions.

## Cloudflare Pages

1. Connecter le repo GitHub a Cloudflare Pages.
2. Utiliser `.` comme root directory.
3. Utiliser `npm run build` comme build command.
4. Utiliser `release-cloudflare` comme build output directory.
5. Laisser `main` comme branche de production.
6. Utiliser la branche de lancement ou `staging` pour les previews.
7. Une fois `wrangler.jsonc` rempli avec les vrais bindings, traiter ce fichier comme source de verite pour la configuration.
