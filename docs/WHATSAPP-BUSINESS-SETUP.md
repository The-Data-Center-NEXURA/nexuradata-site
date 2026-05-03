# WhatsApp Business setup — NEXURADATA

Objectif: utiliser WhatsApp comme canal rapide de qualification, pas comme support improvisé. Le client doit recevoir une réponse professionnelle, courte et cadrée, puis être dirigé vers le formulaire ou le suivi de dossier lorsque nécessaire.

Règles:

- Ne pas promettre une récupération avant évaluation.
- Ne pas demander de mots de passe, codes d'accès, photos de documents sensibles ou données confidentielles dans WhatsApp.
- Ne pas publier d'adresse privée.
- Ne pas envoyer de diffusion promotionnelle sans consentement clair.
- Ne pas parler d'IA, de bot ou d'automatisation dans les messages clients.
- Utiliser WhatsApp pour qualifier et accélérer, puis documenter le dossier dans le système officiel.

## Profil Business

À configurer dans WhatsApp Business:

- **Nom**: NEXURADATA
- **Catégorie**: Service de récupération de données
- **Description courte**:
  ```text
  Récupération de données, RAID, SSD, mobile et forensique numérique à Montréal. Demandes qualifiées, suivi de dossier et confidentialité.
  ```
- **Site web**: `https://nexuradata.ca/`
- **Courriel**: `contact@nexuradata.ca`
- **Téléphone**: `+1 438 813 0592`
- **Adresse**: ne pas afficher d'adresse privée. Utiliser seulement la zone de service si disponible.
- **Heures**: publier seulement les heures réellement surveillées.

## Message d'accueil

```text
Bonjour, ici NEXURADATA. Pour bien qualifier votre demande, indiquez le type de support, le symptôme principal, l'urgence et les manipulations déjà tentées. Ne partagez pas de mot de passe ni de données sensibles ici.
```

## Message hors heures

```text
Bonjour, merci d'avoir contacté NEXURADATA. Votre message a été reçu. Si le support contient des données importantes, évitez les redémarrages, les reconstructions RAID ou les logiciels de récupération avant évaluation. Nous répondrons dès que possible.
```

## CTA recommandé

Le bouton WhatsApp doit mener au canal surveillé. Pour les pages publiques, garder le libellé sobre:

```text
WhatsApp direct
```

Éviter les formulations publiques qui donnent une impression automatisée ou amateur.

## Étiquettes WhatsApp Business

Créer ces étiquettes pour trier les conversations:

- Nouveau dossier
- Urgent / entreprise bloquée
- RAID / NAS
- Téléphone
- SSD / disque
- Forensique
- Devis envoyé
- En attente client
- À transférer au portail
- Fermé

## Processus de réponse

1. Répondre avec une qualification courte.
2. Confirmer que le client doit éviter les manipulations à risque.
3. Diriger vers le formulaire si le dossier doit être structuré.
4. Créer ou mettre à jour le dossier interne.
5. Donner le numéro de dossier seulement quand il existe.
6. Basculer le suivi sensible vers le portail client.

## Lien WhatsApp de base

Le site utilise déjà le numéro public:

```text
https://wa.me/14388130592
```

Pour une campagne ou un QR WhatsApp, utiliser un texte de départ court qui ne contient aucune information personnelle:

```text
https://wa.me/14388130592?text=Bonjour%20NEXURADATA%2C%20je%20veux%20ouvrir%20une%20demande%20de%20r%C3%A9cup%C3%A9ration%20de%20donn%C3%A9es.
```

## Mesure et suivi

- Le site suit les clics WhatsApp comme `contact_intent` et `generate_lead` dans GA4.
- Le site envoie aussi l'événement Meta `Contact` pour les clics WhatsApp.
- Ne pas envoyer le contenu des messages WhatsApp à GA4, Meta Pixel ou toute autre plateforme de mesure.
- Vérifier GA4 Realtime après publication: `contact_method = whatsapp` ou `self_assessment_whatsapp`.

## À ne pas faire

- Diffuser une promotion massive sans consentement.
- Répondre à un client avec des promesses de résultat.
- Demander un mot de passe ou un code de déverrouillage dans WhatsApp.
- Donner une adresse privée.
- Laisser le bouton WhatsApp actif si personne ne surveille le canal.