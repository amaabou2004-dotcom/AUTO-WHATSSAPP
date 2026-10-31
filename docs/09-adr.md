# PHASE 2.2 — Décisions d'architecture (ADR)

> Format : **Contexte → Décision → Conséquences → Alternatives écartées**.
> Statut : `acceptée` (validée par le fondateur), `proposée` (à valider en Phase 3).
> Ces ADR ne peuvent être modifiés que par un nouvel ADR qui les remplace explicitement.

---

## ADR-001 — Monolithe modulaire déployé sur Cloudflare Workers

**Statut :** acceptée
**Contexte :** démarrage à budget quasi nul, un seul développeur, besoin d'évoluer vers des dizaines de milliers de tenants sans réécriture.
**Décision :** un seul dépôt, packages à frontières explicites (`core` sans I/O), deux Workers (`api`, `worker`) et une SPA statique. Aucun microservice au lancement.
**Conséquences :**

- ⚠️ Contrainte réelle : **10 ms de CPU** par invocation sur l'offre gratuite. Tout traitement lourd (import, génération de rapports, indexation vectorielle) doit être délégué à la file.
- Les frontières de packages sont vérifiées par ESLint (`no-restricted-imports`), pas par la discipline.
- Extraction ultérieure possible sans réécriture du domaine.
  **Alternatives écartées :** microservices (coût d'exploitation et complexité injustifiés) ; VPS Node classique (coût mensuel + administration + pas d'edge).

---

## ADR-002 — Isolation multi-tenant par `organization_id` + Row Level Security

**Statut :** acceptée
**Contexte :** exigence absolue « les données d'une entreprise ne doivent jamais être accessibles à une autre ».
**Décision :** base unique, schéma unique, colonne `organization_id` sur toutes les tables métier, RLS Postgres activée **et forcée**, quatre couches d'isolation (JWT signé → RLS → contexte typé → tests d'isolation automatisés).
**Conséquences :**

- Chaque requête doit porter un contexte d'organisation non optionnel au niveau du type TypeScript.
- Une fuite inter-tenant devient une **régression testée** : la CI exécute un croisement systématique de deux tenants et doit obtenir 0 ligne.
- Une table sans RLS est un incident bloquant, pas un détail.
  **Alternatives écartées :** schéma par tenant (migrations ×N, plafond) ; base par tenant (coût, sauvegardes, offre gratuite limitée à 2 projets).

---

## ADR-003 — PostgreSQL (Supabase) comme unique source de vérité

**Statut :** acceptée
**Contexte :** besoin de transactions, de contraintes, de RLS, de `pgvector`, et de coût nul au démarrage.
**Décision :** Postgres Supabase, migrations SQL versionnées, `pgvector` pour la connaissance, aucune duplication de vérité dans KV ou dans un cache non invalidable.
**Conséquences :**

- L'offre gratuite (500 Mo, pause 7 jours, pas de sauvegarde) est **insuffisante en production** → passage en Pro au premier client payant (chiffré dans `03`).
- Tests de migration sous **PGlite** (WASM) pour rester exécutables hors-ligne ; toute migration doit rester portable et ne pas dépendre d'une extension absente en test. Les extensions spécifiques (`vector`, `pg_cron`) sont isolées dans des migrations conditionnelles.
- La table `messages` devra être partitionnée au palier P2 : tout code écrit maintenant doit borner les requêtes dans le temps.

---

## ADR-004 — SPA statique + API BFF, pas de SSR

**Statut :** acceptée
**Contexte :** le cahier des charges impose React + Vite ; la sécurité exige un point de contrôle unique ; le budget interdit un serveur Node permanent.
**Décision :** SPA sur Cloudflare Pages, API Hono sur Workers comme **seul** point d'accès aux données ; aucune clé Supabase `service_role` côté navigateur ; la clé anon publique est utilisée uniquement pour l'authentification.
**Conséquences :**

- SEO du site marketing assuré par des pages statiques pré-rendues, pas par l'application.
- Toute logique métier vit dans le Worker ; le frontend ne fait que présenter et valider en miroir (Zod partagé).

---

## ADR-005 — WhatsApp : Cloud API + Embedded Signup, rien d'autre

**Statut :** acceptée
**Contexte :** les API non officielles (Baileys, whatsapp-web.js) exposent à un bannissement et violent les conditions Meta. Le cahier des charges l'interdit explicitement.
**Décision :** intégration exclusive via WhatsApp Cloud API et Meta Embedded Signup, statut Tech Provider. Un numéro ne peut être rattaché qu'à **une** organisation (contrainte d'unicité globale sur `phone_number_id`). Les jetons sont chiffrés (AES-GCM) et jamais exposés.
**Conséquences :**

- Dépendance totale à Meta : voir R1, R2, R3 dans `04-risques.md`.
- La fenêtre de 24 h et l'approbation des modèles sont des contraintes produit, pas des options.
- Aucun mécanisme de contournement de débit ne doit être écrit, même « temporairement ».

---

## ADR-006 — Les frais de messages sont payés par le client à Meta (D1 = A)

**Statut :** acceptée (décision du fondateur, 31/10/2026)
**Contexte :** depuis le 01/10/2026, les messages de service sont facturés ; l'écart de coût entre l'Afrique de l'Ouest (~0,004 USD) et l'Allemagne (~0,055 USD) est d'un facteur 14. Porter ce coût détruirait la marge.
**Décision :** le client rattache son moyen de paiement à **son** WABA ; la plateforme ne refacture pas les messages. Elle **mesure** et **affiche** le coût estimé (transparence), sans le porter.
**Conséquences :**

- Marge SaaS ≈ 94 %, pas de trésorerie avancée, pas de TVA sur des flux qui ne nous appartiennent pas.
- Friction d'onboarding assumée : étape guidée « ajouter un moyen de paiement chez Meta » avec capture d'écran et checklist.
- Les tarifs Meta sont stockés en base (`wa_rate_cards`) et **jamais** en dur ; le simulateur de coût est un argument commercial.
- Un plan Enterprise pourra basculer en modèle centralisé (acompte + plafond dur) via `subscriptions.provider`, sans refonte.

---

## ADR-007 — IA multi-fournisseurs, Gemini payant par défaut, garde-fous métier obligatoires

**Statut :** acceptée
**Contexte :** coût, souveraineté, et surtout clause « AI Providers » des conditions Meta (interdiction d'un assistant généraliste comme fonctionnalité principale).
**Décision :**

1. Interface `AiProvider` + modèles en base, sélectionnables par tenant et par tâche.
2. Gemini **tier payant** par défaut (le tier gratuit autorise l'usage des données pour améliorer les produits Google : incompatible avec des conversations de clients finaux).
3. Le périmètre autorisé est **imposé par le code** : classifieur d'intention, refus hors domaine, divulgation « assistant automatique », transfert humain, aucune génération libre.
4. Aucun entraînement sur les données clients. RAG strictement filtré par `organization_id`.
   **Conséquences :**

- Un tenant ne peut pas transformer l'assistant en ChatGPT : c'est une garantie de conformité, pas une limite commerciale.
- Coût IA mesuré par `ai_runs` (tokens, latence, coût) et plafonné par tenant.
- Un second fournisseur doit être opérationnel **dès la Phase 9**, sinon l'abstraction n'est qu'un décor.

---

## ADR-008 — Outbox en base + Cloudflare Queues, idempotence par clé naturelle

**Statut :** acceptée
**Contexte :** Meta réessaie ses webhooks ; les workers peuvent échouer ; l'offre gratuite limite les opérations de file à 10 000/jour ; un message envoyé deux fois est un incident client.
**Décision :** la base est la **source de vérité** des travaux à exécuter (outbox / `campaign_recipients` / `automation_steps` / `message_batches`). Les Queues accélèrent le traitement ; un cron reprend ce qui est bloqué. Chaque traitement porte une clé d'idempotence persistée (`wa_message_id`, `(campaign_id, contact_id)`, `Idempotency-Key`).
**Conséquences :**

- Aucune perte de travail en cas de panne de file ; rejeu sûr.
- Toute écriture de job doit être idempotente ; les tests incluent un rejeu systématique.

---

## ADR-009 — Facturation abstraite, prix en base, jamais en dur

**Statut :** acceptée (D3 = A)
**Contexte :** aucun PSP ne couvre correctement le Niger ; Stripe/Paystack sont indisponibles ; les prix doivent varier par devise et région.
**Décision :** interface `BillingProvider` (`manual`, `paddle`, `stripe`, `cinetpay`, `flutterwave`) ; `plans`/`plan_limits`/`plan_features`/`price_books` entièrement en base et administrables ; le prix affiché provient toujours du `price_book` applicable à la région du client.
**Conséquences :**

- Démarrage possible en facturation manuelle sans code de paiement.
- Une hausse de prix ne modifie **jamais** un abonnement existant : nouveau `price_book`, migration explicite.
- Aucun montant, aucune devise, aucun taux de TVA codé dans le frontend.

---

## ADR-010 — Temps réel par Server-Sent Events, pas de WebSocket

**Statut :** acceptée
**Contexte :** la boîte de réception doit être réactive ; Supabase Realtime est limité à 200 connexions simultanées en gratuit ; WebSocket exige un Durable Object par connexion.
**Décision :** SSE depuis le Worker avec `Last-Event-ID` pour la reprise, repli automatique en interrogation périodique (TanStack Query) si le flux échoue.
**Conséquences :**

- Compatible avec l'hébergement statique et l'authentification par en-tête (jeton court dédié au flux).
- À l'échelle, un Durable Object par organisation pourra remplacer le fan-out naïf (palier P3), sans changer le contrat d'événements.

---

## ADR-011 — Accès SQL explicite et typé (Kysely), pas d'ORM opaque

**Statut :** proposée (à confirmer en Phase 3)
**Contexte :** Workers n'accepte pas de moteur binaire ; les requêtes doivent être lisibles et optimisables ; RLS exige un contrôle précis du rôle de connexion.
**Décision :** Kysely + `postgres.js`, types générés depuis Postgres, requêtes SQL paramétrées uniquement.
**Conséquences :** pas de « magie » de migrations multiples ; les requêtes lentes sont identifiables ; deux clients de connexion distincts (service / utilisateur) sont explicites dans le code.
**Alternatives écartées :** Prisma (moteur binaire, adaptation Workers fragile) ; Supabase JS comme unique accès (perte de contrôle sur les transactions et les index).

---

## ADR-012 — Internationalisation par catalogues, aucune règle pays dans le cœur

**Statut :** acceptée
**Contexte :** produit international dès la conception ; ajout de langues sans toucher au métier ; RTL pour l'arabe.
**Décision :** tous les textes dans des catalogues (`packages/i18n`), `Intl` pour dates/nombres/devises, `libphonenumber` pour les numéros, pays/langues/devises en base (`countries`, `locales`, `price_books`), CSS logique pour le RTL, règle ESLint qui échoue sur un littéral affichable.
**Conséquences :**

- Une langue est ajoutée par un fichier de traduction + une ligne en base, sans redéploiement du métier.
- Toute logique « si pays = X » dans `packages/core` est un défaut de conception à corriger.

---

## ADR-013 — Deux contextes de connexion distincts et accès administrateur encadré

**Statut :** acceptée
**Contexte :** la `service_role` contourne RLS ; un usage laxiste annule tout le bénéfice de l'isolation. Le cahier des charges exige qu'un administrateur n'accède pas librement aux conversations.
**Décision :**

1. Deux clients SQL : **user-scoped** (RLS active, requêtes au nom d'un utilisateur) et **service** (webhooks, jobs système uniquement, jamais piloté par une entrée utilisateur non validée).
2. Aucun accès administrateur implicite : `data_access_grants` (motif ≥ 20 caractères, double validation, expiration ≤ 7 jours, notification du tenant, journalisation à chaque lecture).
   **Conséquences :**

- Un `platform_admin` ne peut pas lire une conversation sans laisser de trace ni sans validation croisée.
- Les tests incluent le cas « admin tente un accès hors grant → 403 + entrée d'audit ».

---

## ADR-014 — Observabilité minimale et gratuite, mesure avant achat

**Statut :** acceptée
**Contexte :** budget proche de zéro ; il est facile d'acheter du monitoring avant d'avoir des utilisateurs.
**Décision :** `/health` détaillé, logs structurés JSON avec `request_id`, table `audit_logs`, `ai_runs` pour les coûts, `usage_events` pour la consommation, alertes par e-mail sur seuils. Aucun outil payant avant le palier P1.
**Conséquences :**

- Les métriques nécessaires au pilotage (coût IA, coût Meta estimé, latence, taux d'échec) sont **dans la base**, donc exploitables en SQL, sans dépendance externe.
- L'ajout d'un APM tiers reste possible plus tard sans refonte (logs déjà structurés).

---

## Tableau récapitulatif

| ADR | Sujet                                     | Statut       |
| --- | ----------------------------------------- | ------------ |
| 001 | Monolithe modulaire sur Workers           | acceptée     |
| 002 | Multi-tenant + RLS                        | acceptée     |
| 003 | Postgres comme source de vérité           | acceptée     |
| 004 | SPA + API BFF                             | acceptée     |
| 005 | Cloud API + Embedded Signup uniquement    | acceptée     |
| 006 | Le client paie Meta                       | acceptée     |
| 007 | IA multi-fournisseurs + garde-fous        | acceptée     |
| 008 | Outbox + Queues + idempotence             | acceptée     |
| 009 | Facturation abstraite, prix en base       | acceptée     |
| 010 | SSE plutôt que WebSocket                  | acceptée     |
| 011 | Kysely + postgres.js                      | **proposée** |
| 012 | i18n par catalogues                       | acceptée     |
| 013 | Connexions séparées + accès admin encadré | acceptée     |
| 014 | Observabilité gratuite                    | acceptée     |
