# PHASE 2 (avant-projet) — Architecture technique cible

> **Statut :** architecture validée pour la Phase 2. Le détail physique (colonnes, index, politiques RLS)
> est dans **`07-modele-donnees.md`**, le contrat d'API dans **`08-api-openapi.yaml`**, les décisions dans **`09-adr.md`**.
> **Nommage :** le tenant est l'`organization` ; la colonne d'isolation est **`organization_id`** (l'appellation `tenant_id` employée ci-dessous est un synonyme conceptuel). Rien de ce document n'est encore implémenté. Aucun composant décrit ici n'est présenté comme fonctionnel.
> **Principe directeur :** un **monolithe modulaire** déployable sur l'offre gratuite, dont chaque module peut être extrait en service indépendant **sans réécriture du domaine** quand le volume le justifiera.
> **Contrainte assumée :** le budget de départ est proche de zéro. L'architecture est donc dimensionnée pour **des dizaines de tenants**, pas pour des millions. Elle est _conçue_ pour évoluer, pas _prétend_ d'être déjà scalable. Les paliers de croissance sont au §12.

---

## 1. Vue d'ensemble

```
                     ┌──────────────────────────────┐
   Navigateur  ────► │  app web (React + Vite SPA)  │  Cloudflare Pages (statique)
   (tenant)          │  i18n / RTL / dark mode      │
                     └───────────────┬──────────────┘
                                     │ HTTPS + JWT Supabase (Bearer)
                                     ▼
   Meta (webhooks) ─►┌──────────────────────────────┐
                     │  API Worker (Hono)           │  Cloudflare Workers
                     │  REST /api/v1, SSE, webhooks │  (routing + validation + authz)
                     └───────┬─────────────┬────────┘
                             │             │
                    SQL (TCP/Hyperdrive)   │ enqueue
                             ▼             ▼
                  ┌────────────────┐  ┌──────────────────┐
                  │ PostgreSQL     │  │ Cloudflare Queues│
                  │ (Supabase)     │  │ (jobs)           │
                  │ RLS + pgvector │  └────────┬─────────┘
                  └────────────────┘           ▼
                             ▲        ┌──────────────────────────┐
                             │        │ Consumer Worker          │
                             │        │ IA, envoi WA, campagnes, │
                             └────────┤ automatisations, quotas  │
                                      └────────┬─────────────────┘
                                               ▼
                                    ┌─────────────────────┐
                                    │ Fournisseurs IA     │ Gemini (défaut) /
                                    │ + Meta Cloud API    │ autres via adapters
                                    └─────────────────────┘

   Cron Triggers : relances, reprise de files, agrégations, purge, sauvegardes
```

**Pourquoi un SPA + API séparés plutôt que SSR (Next.js) ?** Le cahier des charges impose React/Vite. Un SPA statique est gratuit, cacheable à l'infini, sans serveur Node à payer, et l'API Hono sur Workers est le point de contrôle unique de la sécurité. Le SEO du site marketing est traité par une landing page statique pré-rendue (Phase 4) et non par l'application.

---

## 2. Monorepo

**Outils :** `pnpm` workspaces + `turbo` (cache local/CI). TypeScript `strict`, `moduleResolution: bundler`.

```
auto-whatsapp/                      (nom technique neutre, sans "WhatsApp" en marque produit)
├─ apps/
│  ├─ web/                 React 18/19 + Vite + TS + Tailwind + shadcn/ui
│  │                       React Router + TanStack Query + i18next
│  ├─ api/                 Worker Hono : routes REST, webhooks Meta, SSE
│  ├─ worker/              Worker « jobs » : consumer Queues + Cron Triggers
│  └─ landing/             (Phase 4) pages marketing statiques pré-rendues
├─ packages/
│  ├─ core/                DOMAINE pur (aucune I/O) : entités, règles, permissions,
│  │                       calcul de quotas, machine à états des conversations
│  ├─ db/                  migrations SQL versionnées + client typé + repositories
│  ├─ whatsapp/            client Meta Cloud API + vérif. signature + parseur de webhooks
│  ├─ ai/                  interface AiProvider + impl Gemini + garde-fous + RAG
│  ├─ billing/             interface BillingProvider + Stripe/Paddle/CinetPay/manual
│  ├─ automations/         moteur de règles (déclencheurs/conditions/actions)
│  ├─ i18n/                catalogues de traduction + types générés + helpers RTL
│  ├─ ui/                  design system partagé (shadcn/ui customisé + tokens)
│  ├─ contracts/           schémas Zod partagés front/back (source de vérité API)
│  └─ config/              tsconfig, eslint, tailwind preset, env typé
├─ supabase/migrations/    (ou packages/db/migrations) SQL versionné
├─ docs/                   cette documentation
├─ scripts/                audit, génération, seed, outils
└─ .github/workflows/      ci.yml, deploy.yml, security.yml
```

**Règles de dépendance (vérifiées par ESLint `no-restricted-imports`) :**
`core` ne dépend de **rien** (pur). `db`, `whatsapp`, `ai`, `billing` dépendent de `core` + `contracts`. `apps/*` ne contiennent **aucune règle métier** : ils orchestrent. Interdiction d'importer `db` depuis `apps/web`.

**Conséquence :** extraire `ai` ou `whatsapp` vers un service séparé = déplacer un package derrière un transport, pas réécrire la logique.

---

## 3. Multi-tenant

### 3.1 Modèle retenu : base unique, schéma unique, isolation par `tenant_id` + RLS

| Option                                       | Verdict           | Raison                                                                                                             |
| -------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Base unique + `tenant_id` + RLS Postgres** | ✅ **Retenu**     | Coût et exploitation optimaux sur l'offre gratuite ; une seule migration à maintenir ; RLS = défense en profondeur |
| Schéma par tenant                            | ❌                | Migrations ×N, plafond de schémas, outillage Supabase inadapté                                                     |
| Base par tenant                              | ❌ (au lancement) | Coût, nombre de projets limité (2 sur l'offre gratuite), sauvegardes ×N. **Réservé à l'offre Enterprise**          |

**Chaîne d'isolation (4 couches, aucune ne doit être seule) :**

1. **JWT Supabase** → `app_metadata.organization_id`, `app_metadata.role`, `app_metadata.member_id` (signés, non modifiables par l'utilisateur).
2. **Politiques RLS** sur **toutes** les tables métier : `USING (organization_id = app.current_organization_id())`.
3. **Couche repository** : chaque requête exige un `TenantContext` typé ; le contexte est **obligatoire au niveau du type TypeScript** (`repository.conversations(ctx, …)`), pas une variable globale.
4. **Tests d'isolation** automatisés : suite de tests qui tente, pour chaque endpoint et chaque table, un accès croisé entre deux tenants et **doit** obtenir `403`/`0 ligne`. Ce test fait partie de la CI (Phase 6 et Phase 15).

⚠️ Le Worker utilise deux connexions distinctes : (a) **service role** pour les tâches système (webhooks, jobs) — jamais exposée au frontend, jamais pilotée par une entrée utilisateur non validée ; (b) **rôle utilisateur/JWT** pour les requêtes au nom d'un utilisateur, afin que **RLS s'applique réellement**. Toute requête « user-scoped » qui passerait par la service role est un bug de sécurité bloquant.

### 3.2 Espaces professionnels multiples par compte

`users` (identité) ↔ `memberships` (N:N) ↔ `organizations` (= tenants). Un utilisateur peut appartenir à plusieurs organisations avec des rôles différents ; le tenant actif est porté par un en-tête `X-Tenant-Id` **validé côté serveur** contre les memberships, jamais par un cookie non signé.

### 3.3 Rôles

`owner` > `admin` > `manager` > `agent` > `viewer`, plus le rôle **plateforme** `platform_admin` stocké **hors** des memberships (table `platform_staff`). Un `platform_admin` n'a **aucun** accès implicite aux conversations : il ne peut accéder qu'au travers du flux d'**accès exceptionnel** (§10.3).

---

## 4. Modèle de données (vue logique, ~30 tables)

Toutes les tables métier portent : `id uuid pk`, `tenant_id uuid not null`, `created_at`, `updated_at`, `created_by`, et éventuellement `deleted_at` (soft delete) — plus `version int` sur les entités à concurrence d'écriture (conversations, assistants).

| Domaine             | Tables                                                                                                                                                                                              | Notes clés                                                                                                      |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Identité**        | `profiles`, `organizations`, `memberships`, `invitations`, `sessions`, `mfa_factors`                                                                                                                | `profiles` lié à `auth.users` (Supabase) ; `sessions` gérées par Supabase, métadonnées d'appareil chez nous     |
| **Plateforme**      | `platform_staff`, `feature_flags`, `plans`, `plan_features`, `price_books`, `price_book_entries`, `countries`, `locales`, `ai_providers`, `ai_models`, `audit_logs`, `support_tickets`, `incidents` | `plans`/`price_books` **configurables** : aucune offre en dur                                                   |
| **Facturation**     | `subscriptions`, `subscription_items`, `invoices`, `payments`, `payment_events`, `coupons`, `redemptions`, `usage_counters`, `usage_events`                                                         | `usage_events` = journal append-only ; `usage_counters` = agrégat par période (recalculable)                    |
| **WhatsApp**        | `wa_accounts`, `wa_phone_numbers`, `wa_tokens` (chiffrés), `wa_templates`, `wa_webhook_events` (idempotence), `wa_message_costs`                                                                    | contrainte `unique(phone_number_id)` **globale** ; `wa_webhook_events.unique(meta_event_id)` pour l'idempotence |
| **IA**              | `ai_assistants`, `ai_instructions_versions`, `knowledge_documents`, `knowledge_chunks` (pgvector), `ai_runs` (tokens, coût, latence, garde-fous)                                                    | `ai_runs` = base du calcul de quotas _et_ de la facture IA                                                      |
| **Conversations**   | `conversations`, `messages`, `message_attachments`, `conversation_assignments`, `internal_notes`, `tags`, `conversation_tags`                                                                       | `messages` : index `(tenant_id, conversation_id, created_at desc)` ; **partitionnement** prévu au palier 3      |
| **Contacts**        | `contacts`, `contact_identities` (numéros), `contact_fields`, `contact_field_values`, `segments`, `segment_members`, `consents`, `opt_outs`, `suppression_list`, `imports`, `import_rows`           | consentement **horodaté + sourcé** obligatoire avant toute campagne                                             |
| **Campagnes**       | `campaigns`, `campaign_recipients`, `campaign_runs`, `message_batches`                                                                                                                              | `campaign_recipients.status` + `unique(campaign_id, contact_id)` = idempotence                                  |
| **Automatisations** | `automations`, `automation_nodes`, `automation_edges`, `automation_runs`, `automation_steps`                                                                                                        | exécution traçable, reprise après erreur                                                                        |
| **Notifications**   | `notifications`, `notification_preferences`, `push_subscriptions`                                                                                                                                   |                                                                                                                 |

**Conventions :** `snake_case`, pluriel, `timestamptz` partout (UTC), jamais de `timestamp` naïf. Montants en **entiers de la plus petite unité** (`amount_minor bigint` + `currency char(3)`) — jamais de `float` pour de l'argent. Devise et langue stockées **par organisation** avec surcharge par contact.

**Migrations :** SQL pur, numérotées `0001_init.sql`, idempotentes autant que possible, **réversibles** (`down`) quand c'est sans perte, testées sous **PGlite** en CI, appliquées par la CLI Supabase. Une migration ne modifie jamais une migration déjà appliquée en production.

---

## 5. API (Hono)

**Style :** REST versionné `/api/v1/...`, JSON, erreurs au format `{ error: { code, message, details?, request_id } }`, pagination par curseur (`?cursor=&limit=`), filtres explicites, tri whitelisté.

```
POST   /api/v1/auth/…                    (proxy Supabase Auth, rate-limité)
GET    /api/v1/me
GET    /api/v1/organizations
POST   /api/v1/organizations
GET    /api/v1/organizations/:id/members
POST   /api/v1/invitations

POST   /api/v1/wa/connect                → renvoie la config Embedded Signup
POST   /api/v1/wa/oauth/callback         → échange code → token, upsert WABA
GET    /api/v1/wa/accounts
DELETE /api/v1/wa/accounts/:id
POST   /api/v1/wa/templates             (soumission à Meta)
GET    /webhooks/whatsapp               (vérification hub.challenge)
POST   /webhooks/whatsapp               (X-Hub-Signature-256 → 200 immédiat → queue)

GET    /api/v1/conversations
GET    /api/v1/conversations/:id/messages
POST   /api/v1/conversations/:id/messages      (réponse manuelle)
POST   /api/v1/conversations/:id/ai-toggle
POST   /api/v1/conversations/:id/assign
POST   /api/v1/conversations/:id/notes
GET    /api/v1/stream                          (SSE : messages, statuts, notifications)

CRUD   /api/v1/contacts, /segments, /tags, /imports
CRUD   /api/v1/campaigns  + POST /campaigns/:id/schedule | /pause | /cancel
CRUD   /api/v1/automations
CRUD   /api/v1/assistants + POST /assistants/:id/knowledge
GET    /api/v1/analytics/…
GET    /api/v1/billing/subscription | /invoices | /usage
POST   /webhooks/billing/:provider
GET    /api/v1/health
```

**Middleware systématique :** `request_id` → `auth` (JWT) → `tenant` (membership vérifié) → `rateLimit` (par tenant et par IP) → `validate` (Zod partagé via `packages/contracts`) → `authorize` (permission) → handler → `audit` si action sensible.

**Idempotence :** tout `POST` d'envoi de message ou de campagne accepte un en-tête `Idempotency-Key`, persisté ; un rejeu renvoie le résultat initial.

---

## 6. Couche WhatsApp (Phase 8)

```
Webhook Meta ──► vérif HMAC ──► insert wa_webhook_events (unique) ──► 200 immédiat
                                            │
                                            └─► Queue « wa.inbound » ──► Consumer
                                                     ├─ upsert contact (E.164, consentement)
                                                     ├─ upsert conversation
                                                     ├─ insert message (statut received)
                                                     ├─ machine à états (IA active ? humain assigné ?)
                                                     └─ si IA : Queue « ai.reply »
```

- **Envoi** : `POST /{phone_number_id}/messages`, `X-Access-Token` déchiffré à la volée, `messaging_product: whatsapp`, retry **exponentiel** sur `429`/`5xx` uniquement, jamais sur `4xx` définitifs.
- **Statuts de livraison** : `sent → delivered → read → failed` mis à jour par webhook ; table de coûts alimentée à chaque `delivered` (tarif versionné).
- **Gestion des erreurs** : mapping des codes Meta (`131026` non délivrable, `131047` hors fenêtre 24 h → exige un modèle, `132000` paramètres de modèle invalides, `190`/`102` token invalide → marquer le compte « à reconnecter » et notifier le tenant).
- **Fenêtre de 24 h** : le produit **interdit** l'envoi libre hors fenêtre ; l'UI propose alors explicitement un **modèle approuvé**. Aucun contournement.
- **Tokens** : chiffrés (AES-GCM, clé en secret Worker, `key_id` pour rotation), jamais renvoyés au frontend, jamais loggés, accès journalisé dans `audit_logs`.

---

## 7. Couche IA (Phase 9)

```
message entrant
   │
   ├─ 1. Chargement du contexte : assistant (version d'instructions), langue, horaires,
   │     produits/services, FAQ, documents pertinents (pgvector top-k, filtré par tenant)
   ├─ 2. Classification d'intention (modèle bon marché) : métier / hors-périmètre / urgent / humain
   ├─ 3. Construction du prompt : system (règles dures) + contexte + historique borné (N derniers tours, résumé)
   ├─ 4. Appel AiProvider (timeout, retry, budget de tokens max)
   ├─ 5. Post-traitement : vérif de périmètre de la réponse, détection de fuite de prompt,
   │     redaction de données sensibles, longueur, langue
   ├─ 6. Décision : répondre / répondre + proposer transfert / transférer / silence
   └─ 7. Journalisation ai_runs (tokens in/out, coût estimé, latence, garde-fous déclenchés)
```

**Anti-hallucination :** réponses **ancrées** (RAG) + instruction de refus en cas d'absence d'information + fallback humain + `temperature` basse + interdiction d'inventer prix/délais. Tests d'évaluation (jeu de questions/réponses par tenant type) en CI « qualité IA ».
**Anti-injection :** les documents et messages sont traités comme **données**, jamais comme instructions ; délimiteurs + filtrage de motifs (`ignore previous instructions`, exfiltration de prompt) ; aucune tool-call arbitraire.
**Anti-boucle :** nombre maximal de tours IA consécutifs par conversation, détection de répétition, coupure automatique + transfert humain.
**Mémoire :** fenêtre de N messages + résumé périodique stocké ; **pas** de mémoire technique du tenant vers un modèle. Isolation stricte : le contexte est construit **uniquement** à partir du `tenant_id` courant (test d'isolation obligatoire).
**Multi-fournisseurs :** `AiProvider` + `AiModel` en base ; le tenant peut être routé vers un modèle différent sans changement de code ; coûts unitaires stockés pour estimer la dépense.

---

## 8. Jobs, files, temps

| Mécanisme                               | Usage                                                                                                                                | Pourquoi                                                                        |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| **Cloudflare Queues**                   | réponses IA, envois WhatsApp, imports, envois de campagnes                                                                           | découplage, retries, backpressure ; 10 000 opérations/jour en gratuit           |
| **Cron Triggers** (5 max en gratuit)    | reprise des `outbox` bloqués, relances planifiées, agrégation des quotas, purge/rétention, vérification des tokens WhatsApp expirant | filet de sécurité                                                               |
| **Outbox en base**                      | toute action différée (campagne programmée, follow-up, automatisation avec délai)                                                    | survit à une panne de file, idempotent, auditable                               |
| **SSE** (pas de WebSocket au lancement) | temps réel de la boîte de réception                                                                                                  | compatible Workers + SPA sans serveur persistant ; repli polling TanStack Query |

**Règle :** un job est **idempotent** (clé unique de traitement), **observable** (statut + tentatives + dernière erreur) et **reprenable** (relancé par cron après expiration d'un bail `locked_until`).

---

## 9. Facturation et quotas

- **Entitlements** : `plan_features` (booléens) + `plan_limits` (quotas numériques par période). **Aucune limite en dur dans le code** ; une limite est toujours lue depuis la base, avec un défaut de sécurité.
- **Comptage** : `usage_events` (append-only, idempotent par `event_key`) → `usage_counters` (agrégat par tenant/période/métrique). Métriques : messages sortants, messages IA, tokens IA, contacts, membres, campagnes, automatisations, assistants, connexions WhatsApp.
- **Dépassement** : configurable par plan (`soft` = alerte, `hard` = blocage, `overage` = facturation à l'unité). Par défaut : `soft` + alerte, `hard` sur les quotas IA pour éviter la faillite technique.
- **Abstraction PSP** : `BillingProvider { createCheckout, changePlan, cancel, portal, verifyWebhook, listInvoices }` — implémentations `manual`, `paddle`, `stripe`, `cinetpay`, `flutterwave`. Le domaine ne connaît que l'interface.
- **Essai gratuit** : durée et quotas **configurables** par plan ; à l'expiration → passage en lecture seule, **jamais** suppression de données.

---

## 10. Sécurité (résumé — détail Phase 15)

### 10.1 Contrôles de base

Validation Zod systématique ; requêtes SQL **paramétrées uniquement** ; en-têtes de sécurité (CSP stricte, HSTS, `X-Content-Type-Options`…) ; CORS par liste d'origines ; rate limiting (par IP, par tenant, par route sensible) ; verrouillage progressif des connexions ; MFA TOTP ; sessions révocables ; secrets dans les secrets Workers/Cloudflare (jamais dans le repo, jamais dans le bundle frontend) ; dépendances auditées en CI (`npm audit` + `osv-scanner`) ; journaux **sans données personnelles** (redaction).

### 10.2 Webhooks entrants

`X-Hub-Signature-256` vérifié en **temps constant** sur le **corps brut** ; rejet immédiat sinon ; idempotence par identifiant d'événement ; limitation de payload ; l'endpoint ne fait **que** persister + mettre en file.

### 10.3 Accès administrateur aux données clients

Aucun accès implicite. Flux : demande motivée (ticket + justification + durée) → double validation (un autre `platform_admin`) → accès **en lecture seule**, **limité à un tenant et une période**, **expirant automatiquement**, **notifié au tenant** et **intégralement journalisé**. Toute tentative hors de ce flux est refusée, y compris pour le propriétaire de la plateforme. C'est une exigence du cahier des charges et un argument commercial.

### 10.4 Données sensibles

Tokens WABA, secrets de fournisseurs : chiffrement enveloppe (AES-256-GCM, `key_id` en clair, clé en secret). Données personnelles : chiffrement au repos assuré par l'hébergeur (Postgres Supabase) ; pas de chiffrement applicatif colonne au lancement (impact sur la recherche), **décision tracée et documentée**. Export et suppression par tenant (droit à l'effacement) : endpoints dédiés + procédure documentée.

---

## 11. Frontend et i18n

- **Design system** `packages/ui` : tokens de couleur/théma clair-sombre, composants shadcn/ui, tableaux (TanStack Table), graphiques (Recharts), toasts, skeletons, états vides, messages d'erreur traduits.
- **i18n** : `i18next` + catalogues JSON par langue **chargés à la demande** (`Intl` pour dates/nombres/devises, `dir="rtl"` pour l'arabe, logique CSS logique `ms-`/`me-` plutôt que `ml-`/`mr-`). **Zéro chaîne en dur** ; une règle ESLint détecte les littéraux affichables. Langue initiale : `navigator.language` + préférence utilisateur + langue de l'organisation.
- **Aucune règle pays en dur** : fuseau, devise, format de numéro (libphonenumber), jours fériés, mentions légales → tables de configuration (`countries` + `locales`).
- **Accessibilité** : navigation clavier, focus visible, contrastes AA, `aria-live` sur le flux de messages.

---

## 12. Paliers de charge (conçu pour évoluer, pas livré)

| Palier                    | Charge visée                    | Architecture                                                                                                                                        | Actions déclenchées                                       |
| ------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **P0 — Lancement**        | 1–100 tenants, < 50 k msgs/mois | Workers gratuit, Supabase gratuit, Queues                                                                                                           | Rien. Coût quasi nul                                      |
| **P1 — Premiers revenus** | 100–500 tenants                 | Workers Paid (5 $/mois), Supabase Pro (25 $/mois)                                                                                                   | Sauvegardes, pas de pause, CPU 30 s, Quota IA             |
| **P2 — Croissance**       | 500–5 000 tenants               | Extraction du **consumer IA/envoi** en Worker dédié ; index partiels ; archivage des messages > 90 j ; cache KV                                     | Partition de `messages` par mois ; read replica           |
| **P3 — Échelle**          | 5 000–50 000 tenants            | Découpage par domaine (messagerie / campagnes / facturation) ; pool de workers d'envoi par région Meta ; ClickHouse ou équivalent pour l'analytique | Séparer la lecture analytique de la base transactionnelle |
| **P4 — Multi-région**     | > 50 000 tenants                | Bases régionales (UE, Amérique, Asie) + routage par `tenant.region` ; conformité résidence de données                                               | Réplication, plan de reprise                              |

À chaque palier : **test de charge réel** (k6 ou Artillery en CI planifiée) et **mesure des coûts**, pas de supposition.

---

## 13. CI/CD et environnements

| Environnement | Où                                               | Données                                    | Accès                        |
| ------------- | ------------------------------------------------ | ------------------------------------------ | ---------------------------- |
| `local`       | machine du fondateur (+ ce sandbox pour le code) | données de seed fictives                   | libre                        |
| `preview`     | Cloudflare Pages (une URL par PR)                | données de seed                            | équipe                       |
| `staging`     | Workers + Supabase staging                       | données de test ; **un WABA de test Meta** | équipe                       |
| `production`  | Workers + Supabase prod                          | données réelles                            | restreint, `main` uniquement |

**Pipeline (`ci.yml`)** sur chaque PR : `typecheck` → `lint` → `unit tests` → `migrations PGlite` → `tests d'isolation multi-tenant` → `build web + api` → `npm audit` → rapport. `deploy.yml` : `main` → staging automatique, production sur tag approuvé. Secrets GitHub, jamais dans le code. Branche `main` protégée.

---

## 14. Décisions techniques ouvertes (à valider — voir `07`)

1. Accès SQL depuis le Worker : **Hyperdrive** (100 k requêtes/jour en gratuit) vs **connexion TCP directe** (`postgres.js` sur Workers) vs **PostgREST/Supabase JS**. → recommandation : commencer par `postgres.js` + pool léger, Hyperdrive en P1 (le quota gratuit de 100 k requêtes/jour est insuffisant pour de la production).
2. Temps réel : SSE maison vs Supabase Realtime (200 connexions simultanées en gratuit). → recommandation : SSE.
3. File : Cloudflare Queues vs outbox+cron pur. → recommandation : outbox en source de vérité + Queues comme accélérateur.
4. ORM : SQL typé généré (`supabase gen types` / Kysely) vs Prisma. → recommandation : **Kysely** (SQL explicite, compatible Workers, pas de moteur binaire).
