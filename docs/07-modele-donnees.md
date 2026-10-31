# PHASE 2.1 — Modèle de données définitif

> **Statut :** spécification à valider. Aucune migration n'est encore écrite ; ce document est la source de vérité pour la Phase 6.
> **Décisions appliquées :** D1 = le client paie Meta · D3 = facturation manuelle puis Paddle/CinetPay · D4 = Afrique de l'Ouest francophone en priorité · D2 = base unique + RLS.
> **Convention de nommage :** le **tenant** est l'`organization`. La colonne d'isolation s'appelle **`organization_id`** partout (et non `tenant_id`) ; `X-Tenant-Id` côté API transporte un identifiant d'organisation.

---

## 1. Principes du schéma

1. **Postgres 15+ (Supabase)**, extensions : `pgcrypto` (UUID), `citext` (e-mails), `pg_trgm` (recherche), `vector` (pgvector, base de connaissances), `pg_stat_statements` (observabilité).
2. **Tout identifiant est un `uuid`** généré par `gen_random_uuid()`. Les journaux volumineux (`audit_logs`, `usage_events`) utilisent un `bigint` `generated always as identity`.
3. **Tout horodatage est `timestamptz`** en UTC ; l'affichage local est calculé côté application à partir de `organizations.timezone`.
4. **Montants monétaires :** `amount_minor bigint` + `currency char(3)`, ISO-4217. **Jamais** de `numeric` flottant, jamais de `float8` pour de l'argent. `XOF` n'a pas de décimales → `amount_minor` représente des francs.
5. **Enums :** types Postgres nommés (`create type ... as enum`), jamais de chaînes libres pour un état. Un ajout de valeur se fait par `alter type ... add value` (migration séparée, non transactionnelle — documenté).
6. **Suppression :** `deleted_at timestamptz` sur les entités visibles par l'utilisateur (soft delete). Les journaux d'audit et d'usage sont **immuables** (pas d'UPDATE/DELETE, pas de RLS permissive).
7. **Concurrence :** colonne `version int not null default 1` sur `conversations`, `ai_assistants`, `campaigns`, `automations` ; mise à jour conditionnelle `where version = $n`.
8. **Horodatage technique :** `created_at`, `updated_at` gérés par trigger `set_updated_at()` (une seule fonction, appliquée par table).

---

## 2. Fonctions et helpers SQL

```sql
-- Contexte courant, dérivé du JWT Supabase (app_metadata signé par le serveur)
create schema if not exists app;

create or replace function app.current_organization_id() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb
                -> 'app_metadata' ->> 'organization_id', '')::uuid;
$$;

create or replace function app.current_user_id() returns uuid
language sql stable as $$ select auth.uid(); $$;

create or replace function app.current_role() returns text
language sql stable as $$ select current_setting('request.jwt.claims', true)::jsonb
                -> 'app_metadata' ->> 'role'; $$;

create or replace function app.is_platform_staff(levels text[] default array['support','admin','owner'])
returns boolean language sql stable as $$
  select exists (select 1 from public.platform_staff s
                 where s.user_id = auth.uid() and s.level::text = any(levels));
$$;

create or replace function app.has_min_role(min_role text) returns boolean
language sql stable as $$
  select case app.current_role()
           when 'owner' then true when 'admin' then min_role in ('admin','manager','agent','viewer')
           when 'manager' then min_role in ('manager','agent','viewer')
           when 'agent' then min_role in ('agent','viewer')
           when 'viewer' then min_role = 'viewer'
           else false end;
$$;
```

**Modèle de politique standard** (appliqué à chaque table métier) :

```sql
alter table <t> enable row level security;
alter table <t> force row level security;

create policy <t>_select on <t> for select to authenticated
  using (organization_id = app.current_organization_id());

create policy <t>_insert on <t> for insert to authenticated
  with check (organization_id = app.current_organization_id() and app.has_min_role('agent'));

create policy <t>_update on <t> for update to authenticated
  using (organization_id = app.current_organization_id() and app.has_min_role('agent'))
  with check (organization_id = app.current_organization_id());

create policy <t>_delete on <t> for delete to authenticated
  using (organization_id = app.current_organization_id() and app.has_min_role('manager'));
```

Le rôle `service_role` **contourne RLS** (usage : webhooks, jobs). Toute requête faite au nom d'un utilisateur passe par le client « user-scoped » du Worker, jamais par `service_role`.
Les tables sans `organization_id` (plateforme) ont des politiques explicites `app.is_platform_staff(...)` ou **aucune politique** (accès service uniquement).

---

## 3. Domaines et tables (55 tables)

Légende des colonnes — **PK** clé primaire, **FK** clé étrangère, **U** contrainte d'unicité, **IX** index, **RLS** politique d'isolation organisation.

### 3.1 Identité et accès (7 tables)

#### `profiles`

| Colonne                              | Type        | Contraintes                                   |
| ------------------------------------ | ----------- | --------------------------------------------- |
| id                                   | uuid        | **PK**, FK `auth.users(id)` on delete cascade |
| email                                | citext      | not null, **U**                               |
| full_name                            | text        |                                               |
| avatar_url                           | text        |                                               |
| locale                               | text        | FK `locales(code)`, default `'fr'`            |
| timezone                             | text        | default `'Africa/Niamey'`                     |
| phone_e164                           | text        |                                               |
| mfa_enrolled_at                      | timestamptz |                                               |
| last_seen_at                         | timestamptz |                                               |
| created_at / updated_at / deleted_at | timestamptz |                                               |

**RLS :** `select` si `id = auth.uid()` **ou** membre d'une organisation commune (`exists membership`) ; `update` uniquement sa propre ligne (colonnes non sensibles seulement — l'e-mail passe par Supabase Auth).
**IX :** `(email)`, gin trigram sur `full_name`.

#### `organizations`

| Colonne                              | Type                | Contraintes                                                                                                             |
| ------------------------------------ | ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| id                                   | uuid                | **PK**                                                                                                                  |
| name                                 | text                | not null                                                                                                                |
| slug                                 | citext              | not null, **U**                                                                                                         |
| logo_url                             | text                |                                                                                                                         |
| country_code                         | char(2)             | FK `countries(code)`                                                                                                    |
| default_locale                       | text                | FK `locales(code)`                                                                                                      |
| timezone                             | text                | not null, default `'Africa/Niamey'`                                                                                     |
| currency                             | char(3)             | not null, default `'XOF'`                                                                                               |
| region                               | text                | `'africa_west' \| 'eu' \| 'mena' \| 'latam' \| 'apac'` — sert au routage tarifaire et à terme à la résidence de données |
| status                               | organization_status | `active \| suspended \| deletion_requested \| deleted`                                                                  |
| owner_user_id                        | uuid                | FK `profiles(id)`                                                                                                       |
| plan_id                              | uuid                | FK `plans(id)` (dénormalisé pour lecture rapide ; **source de vérité = `subscriptions`**)                               |
| trial_ends_at                        | timestamptz         |                                                                                                                         |
| settings                             | jsonb               | not null default `'{}'` (stockage de préférences non critiques)                                                         |
| created_at / updated_at / deleted_at | timestamptz         |                                                                                                                         |

**RLS :** `select` si membre ; `update` si `has_min_role('admin')` (colonnes `status`, `plan_id` non modifiables par le client — contrôle trigger).
**IX :** `(slug)`, `(status)`, `(plan_id)`.

#### `memberships`

| Colonne                             | Type          | Contraintes                                    |
| ----------------------------------- | ------------- | ---------------------------------------------- |
| id                                  | uuid          | **PK**                                         |
| organization_id                     | uuid          | FK, not null, **RLS**                          |
| user_id                             | uuid          | FK `profiles(id)`                              |
| role                                | member_role   | `owner \| admin \| manager \| agent \| viewer` |
| status                              | member_status | `invited \| active \| suspended \| removed`    |
| invited_by                          | uuid          | FK `profiles(id)`                              |
| joined_at / created_at / updated_at | timestamptz   |                                                |
| —                                   |               | **U** `(organization_id, user_id)`             |

**RLS :** `select` si même organisation ; `insert/update/delete` si `has_min_role('admin')` **et** `role <> 'owner'` (un admin ne peut pas créer ni modifier un owner) — contrainte trigger + policy.
**IX :** `(user_id)` (pour « mes organisations »), `(organization_id, status)`.

#### `invitations`

| Colonne                  | Type        | Contraintes                                                                               |
| ------------------------ | ----------- | ----------------------------------------------------------------------------------------- |
| id                       | uuid        | **PK**                                                                                    |
| organization_id          | uuid        | FK, **RLS**                                                                               |
| email                    | citext      | not null                                                                                  |
| role                     | member_role | not null                                                                                  |
| token_hash               | text        | not null, **U** (jamais le token en clair)                                                |
| expires_at               | timestamptz | not null, default `now() + interval '7 days'`                                             |
| accepted_at / revoked_at | timestamptz |                                                                                           |
| created_by               | uuid        | FK `profiles(id)`                                                                         |
| created_at               | timestamptz | not null                                                                                  |
| —                        |             | **U** partiel `(organization_id, email) where accepted_at is null and revoked_at is null` |

**RLS :** `select/insert/delete` si `has_min_role('admin')`. L'acceptation se fait via une fonction `security definer` côté service, jamais par un accès direct.

#### `session_metadata`

| Colonne         | Type        | Contraintes                             |
| --------------- | ----------- | --------------------------------------- |
| id              | uuid        | **PK**                                  |
| user_id         | uuid        | FK `profiles(id)`                       |
| organization_id | uuid        | FK nullable                             |
| ip_hash         | text        | SHA-256 salé — **jamais l'IP en clair** |
| user_agent      | text        | tronqué à 300 caractères                |
| last_active_at  | timestamptz |                                         |
| revoked_at      | timestamptz |                                         |

**RLS :** `select/update` si `user_id = auth.uid()`.
**Usage :** liste des sessions affichées à l'utilisateur ; la révocation réelle passe par l'API Supabase Auth (`signOut` global).

#### `platform_staff`

| Colonne    | Type        | Contraintes                 |
| ---------- | ----------- | --------------------------- |
| user_id    | uuid        | **PK**, FK `profiles(id)`   |
| level      | staff_level | `support \| admin \| owner` |
| granted_by | uuid        | FK `profiles(id)`           |
| created_at | timestamptz |                             |

**RLS :** **aucune politique** pour `authenticated` → accès `service_role` uniquement. Lecture de sa propre ligne possible via une vue `app_staff_self`.

#### `audit_logs` _(immuable)_

| Colonne         | Type            | Contraintes                                                                    |
| --------------- | --------------- | ------------------------------------------------------------------------------ |
| id              | bigint identity | **PK**                                                                         |
| organization_id | uuid            | FK nullable (actions plateforme)                                               |
| actor_type      | actor_type      | `user \| platform_staff \| system \| webhook`                                  |
| actor_user_id   | uuid            | nullable                                                                       |
| action          | text            | not null, nomenclature `domaine.entite.verbe` (ex. `whatsapp.account.revoked`) |
| entity_type     | text            |                                                                                |
| entity_id       | uuid            |                                                                                |
| before / after  | jsonb           | diff minimal, **sans données personnelles inutiles**                           |
| request_id      | text            | corrélation                                                                    |
| ip_hash         | text            |                                                                                |
| created_at      | timestamptz     | not null default `now()`                                                       |

**RLS :** `select` si `organization_id = app.current_organization_id()` **et** `has_min_role('admin')` ; **aucun** `update`/`delete` accordé à `authenticated`. Rétention : 24 mois, purge par cron (paramétrable).

### 3.2 Plateforme et configuration (9 tables)

#### `countries`

`code char(2)` **PK**, `name_i18n jsonb`, `dial_code text`, `default_currency char(3)`, `default_locale text`, `default_timezone text`, `is_allowed boolean` (pays où le service est commercialisé), `requires_tax_id boolean`, `whatsapp_rate_region text`, `updated_at`.
**RLS :** lecture publique (`authenticated`, `anon`) des pays `is_allowed` ; écriture `platform_staff`.

#### `locales`

`code text` **PK** (BCP-47 : `fr`, `en`, `es`, `pt`, `ar`, `de`, `zh-CN`), `name text`, `direction locale_direction` (`ltr`/`rtl`), `is_enabled boolean`, `translation_completion smallint`.
**RLS :** lecture publique, écriture `platform_staff`.

#### `plans`

| Colonne                                                      | Type        |
| ------------------------------------------------------------ | ----------- |
| id uuid **PK**                                               |             |
| code text **U** (`starter`, `pro`, `business`, `enterprise`) |             |
| name text                                                    |             |
| description text                                             |             |
| sort_order int                                               |             |
| trial_days int default 14                                    |             |
| is_public boolean default true                               |             |
| is_active boolean default true                               |             |
| created_at / updated_at                                      | timestamptz |

**RLS :** lecture publique si `is_active and is_public` ; écriture `platform_staff` (`admin`).

#### `plan_features`

`plan_id uuid` + `feature_key text` (**PK composite**), `enabled boolean`.
Clés : `campaigns`, `automations`, `advanced_reports`, `api_access`, `custom_branding`, `export_data`, `priority_support`, `multi_number`, `white_label`.
**RLS :** lecture publique ; écriture `platform_staff`.

#### `plan_limits`

`plan_id uuid` + `metric usage_metric` (**PK composite**), `limit_value numeric`, `period limit_period` (`day|month|total`), `overage_policy overage_policy` (`block|warn|bill`), `overage_unit_price_minor bigint`.
Métriques (`usage_metric`) : `ai_replies`, `ai_tokens`, `messages_out`, `contacts`, `members`, `organizations`, `wa_numbers`, `assistants`, `campaigns_per_month`, `automations`.
**RLS :** lecture publique ; écriture `platform_staff`.

#### `price_books` / `price_book_entries`

`price_books` : `id uuid PK`, `code text U` (`intl_usd`, `xof_west_africa`, …), `currency char(3)`, `region text`, `country_code char(2)` nullable, `is_default boolean`, `is_active boolean`.
`price_book_entries` : `id uuid PK`, `price_book_id uuid FK`, `plan_id uuid FK`, `interval billing_interval` (`month`/`year`), `amount_minor bigint`, `psp_price_ref text` (référence chez Paddle/Stripe), `is_active boolean`, **U** `(price_book_id, plan_id, interval)`.
**RLS :** lecture publique ; écriture `platform_staff`.
**Note :** le choix du `price_book` à la souscription est figé sur `subscriptions.price_book_id` — une hausse de prix ne modifie **jamais** un abonnement existant sans migration explicite.

#### `settings`

`key text PK`, `value jsonb`, `description text`, `updated_by uuid`, `updated_at`.
Contient la configuration de marque et de plateforme : `brand.name`, `brand.domain`, `brand.logo_url`, `brand.primary_color`, `trial.days`, `limits.default_*`, `retention.messages_days`, `features.*`.
**RLS :** lecture `platform_staff` ; certains `key` exposés par une vue `public_settings` (nom, logo, couleurs) en lecture publique. **Aucun secret n'est stocké ici** — les secrets vont dans les secrets Workers.

#### `feature_flags` / `organization_feature_overrides`

`feature_flags` : `key text PK`, `description`, `default_enabled boolean`, `rollout jsonb` (tenants ciblés / pourcentage).
`organization_feature_overrides` : `organization_id` + `flag_key` (**PK**), `enabled boolean`, `set_by uuid`.
**RLS :** lecture si même organisation (overrides) ; écriture `platform_staff`.

#### `support_tickets` / `support_messages` / `incidents`

`support_tickets` : `id`, `organization_id` **RLS**, `created_by`, `subject`, `body`, `status` (`open|pending|resolved|closed`), `priority`, `assigned_staff_id`, `created_at`, `updated_at`.
`support_messages` : `id`, `ticket_id`, `author_type` (`tenant|staff`), `author_id`, `body`, `created_at`.
`incidents` : `id`, `title`, `severity`, `status`, `started_at`, `resolved_at`, `public_note` — **public** si `status <> 'draft'`.

#### `data_access_grants` _(accès administrateur contrôlé)_

| Colonne                  | Type                                                                    |
| ------------------------ | ----------------------------------------------------------------------- |
| id uuid **PK**           |                                                                         |
| organization_id uuid     | FK, not null                                                            |
| staff_user_id uuid       | FK `platform_staff`                                                     |
| requested_reason text    | not null, **min 20 caractères** (contrainte `check`)                    |
| scope data_access_scope  | `conversations_read \| account_read \| full_read`                       |
| approved_by uuid         | FK `platform_staff` (**obligatoire, différent du demandeur**)           |
| starts_at / expires_at   | timestamptz, `expires_at <= starts_at + interval '7 days'` (contrainte) |
| revoked_at               | timestamptz                                                             |
| organization_notified_at | timestamptz                                                             |

**RLS :** lecture `platform_staff` + lecture par le tenant concerné (transparence) ; insertion via fonction `security definer` uniquement.
**Contrainte applicative :** toute requête d'un `platform_staff` sur des données de conversation **doit** citer un `grant_id` valide ; le Worker journalise `data_access.grant.used` à chaque lecture.

### 3.3 Facturation et usage (10 tables)

#### `subscriptions`

| Colonne                                   | Type                                                                          |
| ----------------------------------------- | ----------------------------------------------------------------------------- |
| id uuid **PK**                            |                                                                               |
| organization_id uuid                      | FK, **RLS**, **U** partiel `where status in ('trialing','active','past_due')` |
| plan_id uuid                              | FK `plans`                                                                    |
| price_book_id uuid                        | FK `price_books`                                                              |
| status subscription_status                | `trialing \| active \| past_due \| canceled \| expired \| manual`             |
| provider billing_provider                 | `manual \| paddle \| stripe \| cinetpay \| flutterwave`                       |
| provider_ref text                         | id externe (nullable en manuel)                                               |
| seats int default 1                       |                                                                               |
| current_period_start / current_period_end | timestamptz                                                                   |
| cancel_at_period_end boolean              |                                                                               |
| trial_ends_at                             | timestamptz                                                                   |
| canceled_at / ended_at                    | timestamptz                                                                   |
| metadata jsonb                            |                                                                               |
| created_at / updated_at                   |                                                                               |

**RLS :** `select` si `has_min_role('admin')` ; **écriture par le service uniquement** (aucun client ne modifie son abonnement directement).

#### `subscription_items`

`id`, `subscription_id` FK, `kind subscription_item_kind` (`plan|addon`), `addon_code text`, `quantity int`, `unit_amount_minor bigint`, `currency char(3)`.
**RLS :** lecture `admin` ; écriture service.

#### `invoices` / `invoice_lines`

`invoices` : `id`, `organization_id` **RLS**, `subscription_id`, `number text` **U** (séquence `INV-YYYY-NNNNNN`), `status` (`draft|open|paid|void|uncollectible`), `currency`, `subtotal_minor`, `tax_minor`, `total_minor`, `issued_at`, `due_at`, `paid_at`, `pdf_url`, `provider_ref`, `billing_snapshot jsonb` (nom légal, adresse, TVA au moment de l'émission — **immuable**).
`invoice_lines` : `id`, `invoice_id`, `description`, `quantity`, `unit_amount_minor`, `amount_minor`, `metric usage_metric` nullable, `period_start`, `period_end`.
**RLS :** lecture `admin` ; écriture service.

#### `payments` / `payment_events`

`payments` : `id`, `organization_id`, `invoice_id`, `provider`, `provider_ref text` **U**, `amount_minor`, `currency`, `status payment_status` (`pending|succeeded|failed|refunded`), `method text` (`mobile_money|card|transfer|cash`), `paid_at`, `failure_code`, `raw jsonb` (tronqué, **sans données de carte**).
`payment_events` : `id`, `provider`, `provider_event_id text` **U** (idempotence), `type`, `received_at`, `processed_at`, `payload jsonb`.
**RLS :** `payments` lecture `admin` ; `payment_events` service uniquement.

#### `coupons` / `coupon_redemptions`

`coupons` : `id`, `code citext` **U**, `kind` (`percent|amount`), `value numeric`, `currency`, `max_redemptions int`, `redemption_count int`, `starts_at`, `ends_at`, `applicable_plan_ids uuid[]`, `is_active`.
`coupon_redemptions` : `id`, `coupon_id`, `organization_id`, `subscription_id`, `created_at`, **U** `(coupon_id, organization_id)`.
**RLS :** lecture publique du code (validation) via endpoint ; écriture `platform_staff`.

#### `usage_metrics` _(référentiel)_

`key usage_metric` **PK**, `unit text`, `description text`, `is_billable boolean`.

#### `usage_events` _(append-only, source de vérité de la consommation)_

| Colonne                 | Type                                               |
| ----------------------- | -------------------------------------------------- |
| id bigint identity      | **PK**                                             |
| organization_id uuid    | FK, **RLS**, not null                              |
| metric usage_metric     | not null                                           |
| quantity numeric        | not null default 1                                 |
| occurred_at timestamptz | not null                                           |
| source_type text        | `message\|ai_run\|import\|manual`                  |
| source_id uuid          |                                                    |
| idempotency_key text    | **U** `(organization_id, metric, idempotency_key)` |
| metadata jsonb          |                                                    |

**IX :** `(organization_id, metric, occurred_at desc)`.
**RLS :** `select` si `has_min_role('manager')` ; **pas d'INSERT/UPDATE/DELETE** pour `authenticated` (le comptage est fait par le service, jamais par le client).

#### `usage_counters` _(agrégat, recalculable)_

`organization_id` + `metric` + `period_start` (**PK**), `period_end`, `used numeric`, `limit_value numeric`, `updated_at`.
Recalcul par cron depuis `usage_events` → un compteur erroné ne corrompt jamais la source.

#### `quota_overrides`

`id`, `organization_id`, `metric`, `limit_value numeric`, `reason text`, `expires_at`, `set_by uuid`. **RLS :** lecture `admin`, écriture `platform_staff`.

### 3.4 WhatsApp (7 tables)

#### `wa_accounts`

| Colonne                                  | Type                                                            |
| ---------------------------------------- | --------------------------------------------------------------- |
| id uuid **PK**                           |                                                                 |
| organization_id uuid                     | FK, **RLS**                                                     |
| waba_id text                             | **U global** (un WABA ne peut appartenir qu'à une organisation) |
| business_portfolio_id text               |                                                                 |
| display_name text                        |                                                                 |
| status wa_account_status                 | `pending \| connected \| restricted \| revoked \| error`        |
| quality_rating text                      | (`green                                                         | yellow   | red`)     |
| messaging_limit_tier text                | (`tier_1k                                                       | tier_10k | tier_100k | unlimited`) |
| currency char(3)                         | devise de facturation Meta du WABA (informatif)                 |
| connected_by uuid                        | FK `profiles`                                                   |
| last_synced_at / created_at / updated_at | timestamptz                                                     |

#### `wa_phone_numbers`

`id`, `organization_id` **RLS**, `wa_account_id`, `phone_number_id text` **U global**, `display_phone_number text`, `verified_name text`, `status` (`pending|connected|migrated|banned`), `quality_rating`, `messaging_limit_tier`, `two_step_pin_set boolean`, `created_at`, `updated_at`.
**IX :** `(organization_id)`, **U** sur `phone_number_id` (isolation inter-tenant au niveau du schéma).

#### `wa_credentials` _(secrets — accès service uniquement)_

`id`, `organization_id`, `wa_account_id`, `phone_number_id` nullable, `kind` (`system_user_token|app_secret|webhook_verify_token`), `ciphertext bytea`, `iv bytea`, `auth_tag bytea`, `key_id text`, `expires_at`, `rotated_at`, `revoked_at`, `last_used_at`.
**RLS :** **aucune politique** pour `authenticated` → illisible par tout client, y compris un `owner`. Déchiffrement réservé au Worker.

#### `wa_templates`

`id`, `organization_id` **RLS**, `wa_account_id`, `name text`, `language text`, `category template_category` (`marketing|utility|authentication`), `status template_status` (`draft|pending|approved|rejected|paused|disabled`), `components jsonb`, `meta_template_id text`, `rejection_reason text`, `submitted_at`, `reviewed_at`, **U** `(wa_account_id, name, language)`.

#### `wa_webhook_events` _(idempotence)_

`id`, `provider_event_id text` **U**, `object text`, `field text`, `phone_number_id text`, `signature_valid boolean not null`, `received_at`, `processed_at`, `attempts int default 0`, `last_error text`, `payload jsonb`.
**IX :** `(processed_at)` partiel `where processed_at is null`.
**RLS :** service uniquement. Rétention 30 j (purge cron) — le payload brut n'est pas conservé indéfiniment.

#### `wa_rate_cards`

`id`, `version text` **U** + `effective_from timestamptz`, `country_code char(2)`, `category template_category|'service'`, `amount_minor bigint`, `currency char(3)`, `source_url text`, `retrieved_at`.
**Usage :** calcul du **coût Meta estimé** affiché au tenant (transparence) et du coût réel par message. **Aucune valeur en dur dans le code.**
**RLS :** lecture publique ; écriture `platform_staff`.

#### `wa_message_costs`

`id`, `organization_id` **RLS**, `message_id uuid`, `phone_number_id`, `country_code`, `category`, `rate_card_id`, `amount_minor`, `currency`, `billed_at`.

### 3.5 Intelligence artificielle (6 tables)

#### `ai_providers`

`id`, `code text` **U** (`gemini`, `openai`, `groq`, `mistral`, `workers_ai`), `name`, `is_enabled boolean`, `config jsonb` (endpoint, région — **aucun secret**), `secret_ref text` (nom du secret Worker détenteur de la clé), `created_at`, `updated_at`.
**RLS :** lecture `platform_staff` uniquement.

#### `ai_models`

`id`, `provider_id`, `code text` (ex. `gemini-2.5-flash`), `display_name`, `capabilities jsonb` (`chat`,`embedding`,`vision`), `context_window int`, `input_price_per_mtok_minor bigint`, `output_price_per_mtok_minor bigint`, `currency`, `is_enabled`, `is_default boolean`, **U** `(provider_id, code)`.
**RLS :** lecture publique (liste des modèles disponibles pour l'UI) ; écriture `platform_staff`.

#### `ai_assistants`

| Colonne                              | Type                                                             |
| ------------------------------------ | ---------------------------------------------------------------- |
| id uuid **PK**                       |                                                                  |
| organization_id uuid                 | FK, **RLS**                                                      |
| name text not null                   |                                                                  |
| avatar_url text                      |                                                                  |
| persona text                         | (personnalité)                                                   |
| tone assistant_tone                  | (`professional`, `friendly`, `formal`, `casual`, `enthusiastic`) |
| primary_locale text                  | FK `locales`                                                     |
| secondary_locales text[]             |                                                                  |
| instructions text                    | (instructions personnalisées, bornées à 8 000 caractères)        |
| objectives jsonb                     | liste d'objectifs commerciaux                                    |
| business_info jsonb                  | nom, description, adresse, secteurs                              |
| hours jsonb                          | horaires + fuseau                                                |
| fallback_message text                |                                                                  |
| handoff_keywords text[]              | ex. `{humain, agent, conseiller, responsable}`                   |
| model_id uuid                        | FK `ai_models`                                                   |
| max_turns int default 8              | anti-boucle                                                      |
| is_active boolean                    |                                                                  |
| version int default 1                |                                                                  |
| created_by / created_at / updated_at |                                                                  |
| —                                    | **U** `(organization_id, lower(name))`                           |

#### `ai_assistant_versions` _(historique immuable des réglages)_

`id`, `assistant_id`, `version int`, `snapshot jsonb`, `created_by`, `created_at`, **U** `(assistant_id, version)`.
**Usage :** « quelle configuration a produit cette réponse ? » + retour arrière.

#### `knowledge_documents` / `knowledge_chunks`

`knowledge_documents` : `id`, `organization_id` **RLS**, `assistant_id`, `title`, `source_type` (`upload|url|manual|faq`), `mime_type`, `size_bytes`, `storage_path text` (R2), `checksum text`, `status` (`pending|indexing|ready|failed`), `error text`, `chunk_count int`, `created_by`, `created_at`.
`knowledge_chunks` : `id`, `organization_id` **RLS**, `document_id`, `chunk_index int`, `content text`, `token_count int`, `embedding vector(768)`, `created_at`, **U** `(document_id, chunk_index)`.
**IX :** ivfflat/hnsw sur `embedding` (`vector_cosine_ops`), index gist trigram sur `content` pour la recherche lexicale hybride.
**Isolation :** la recherche vectorielle **filtre toujours** par `organization_id` (pré-filtrage par partition logique, pas de top-k global).

#### `ai_runs` _(journal de chaque appel IA — base des quotas et des coûts)_

`id`, `organization_id` **RLS**, `assistant_id`, `conversation_id`, `message_id`, `provider_id`, `model_id`, `intent text`, `prompt_tokens int`, `completion_tokens int`, `cost_minor bigint`, `currency`, `latency_ms int`, `outcome` (`replied|handoff|refused|escalated|error`), `guardrail_flags text[]` (`out_of_scope|prompt_injection|hallucination_risk|language_unsupported|loop_detected`), `error_code text`, `created_at`.
**IX :** `(organization_id, created_at desc)`, `(conversation_id)`.
**Rétention :** le **contenu** des prompts n'est pas conservé ici (données personnelles) ; seules les métriques et les drapeaux. Le contenu vit dans `messages`.

### 3.6 Contacts (10 tables)

#### `contacts`

`id`, `organization_id` **RLS**, `display_name text`, `primary_e164 text`, `email citext`, `locale text`, `timezone text`, `status contact_status` (`active|blocked|unsubscribed|archived`), `source contact_source` (`whatsapp_inbound|manual|import|api|form`), `owner_user_id uuid`, `first_seen_at`, `last_interaction_at`, `message_count int default 0`, `consent_state consent_state` (`unknown|granted|revoked`) _dénormalisé pour filtrage rapide_, `created_at`, `updated_at`, `deleted_at`, **U** `(organization_id, primary_e164)`.
**IX :** gin trigram `(display_name)`, `(organization_id, last_interaction_at desc)`.

#### `contact_identities`

`id`, `organization_id` **RLS**, `contact_id`, `channel` (`whatsapp`), `external_id text` (le `wa_id` Meta), `phone_e164 text`, **U** `(organization_id, channel, external_id)`.
**Raison :** un contact peut exister sur plusieurs canaux demain (Instagram, web chat) sans changer le modèle.

#### `contact_fields` / `contact_field_values`

`contact_fields` : `id`, `organization_id` **RLS**, `key text`, `label text`, `type field_type` (`text|number|date|select|multiselect|boolean|url`), `options jsonb`, `is_required boolean`, **U** `(organization_id, key)`.
`contact_field_values` : `contact_id` + `field_id` (**PK**), `value jsonb`, `updated_at`.

#### `contact_consents` _(preuve de consentement — obligatoire avant toute campagne)_

`id`, `organization_id` **RLS**, `contact_id`, `channel`, `purpose consent_purpose` (`marketing|service|transactional`), `status consent_state` (`granted|revoked`), `source consent_source` (`web_form|whatsapp_inbound|import|manual|api`), `evidence jsonb` (texte exact, URL, ID de formulaire, IP hachée), `granted_at`, `revoked_at`, `created_by`.
**IX :** `(organization_id, contact_id, purpose, status)`.
**Règle métier :** une campagne `marketing` **exige** une ligne `granted` non révoquée pour `marketing` **et** l'absence de ligne dans `opt_outs`. Vérifié en base **et** en code.

#### `opt_outs`

`id`, `organization_id` **RLS**, `phone_e164 text`, `reason text`, `source text`, `opted_out_at`, **U** `(organization_id, phone_e164)`.
**Règle :** l'insertion est possible même sans `contact_id` (le contact peut ne plus exister) ; elle bloque tout envoi marketing futur, y compris réimporté.

#### `tags` / `contact_tags`

`tags` : `id`, `organization_id` **RLS**, `name citext`, `color char(7)`, **U** `(organization_id, name)`.
`contact_tags` : `contact_id` + `tag_id` (**PK**).

#### `segments` / `segment_members`

`segments` : `id`, `organization_id` **RLS**, `name`, `kind` (`static|dynamic`), `definition jsonb` (**DSL restreint**, pas de SQL libre), `member_count int`, `computed_at`.
`segment_members` : `segment_id` + `contact_id` (**PK**) — matérialisation pour les segments dynamiques, recalculée par cron.

#### `imports`

`id`, `organization_id` **RLS**, `entity` (`contacts`), `filename`, `status` (`pending|validating|running|completed|failed|canceled`), `total_rows`, `inserted`, `updated`, `skipped`, `failed`, `duplicate_strategy` (`skip|update|merge`), `error_report_path text` (R2), `created_by`, `started_at`, `finished_at`.

### 3.7 Conversations (9 tables)

#### `conversations`

| Colonne                                 | Type                                             |
| --------------------------------------- | ------------------------------------------------ |
| id uuid **PK**                          |                                                  |
| organization_id uuid                    | FK, **RLS**                                      |
| contact_id uuid                         | FK                                               |
| phone_number_id text                    | FK `wa_phone_numbers(phone_number_id)`           |
| status conversation_status              | `open \| pending \| closed`                      |
| priority conversation_priority          | `low \| normal \| high \| urgent`                |
| assigned_user_id uuid                   | FK `profiles` nullable                           |
| ai_enabled boolean default true         |                                                  |
| ai_paused_until timestamptz             |                                                  |
| ai_consecutive_turns smallint default 0 | anti-boucle                                      |
| last_message_at timestamptz             |                                                  |
| last_inbound_at timestamptz             | (fenêtre 24 h : `now() - last_inbound_at < 24h`) |
| first_response_at timestamptz           | (KPI)                                            |
| resolved_at timestamptz                 |                                                  |
| snoozed_until timestamptz               |                                                  |
| unread_count int default 0              |                                                  |
| version int default 1                   |                                                  |
| created_at / updated_at                 |                                                  |

**Contrainte :** **U** partiel `(organization_id, contact_id, phone_number_id) where status <> 'closed'` → une seule conversation ouverte par contact et par numéro.
**IX :** `(organization_id, status, last_message_at desc)`, `(organization_id, assigned_user_id, status)`, `(organization_id, last_inbound_at)` (fenêtre 24 h).

#### `messages` _(table la plus volumineuse — préparée au partitionnement)_

| Colonne                              | Type                                                                                                             |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| id uuid **PK**                       |                                                                                                                  |
| organization_id uuid                 | FK, **RLS**                                                                                                      |
| conversation_id uuid                 | FK                                                                                                               |
| wa_message_id text                   | **U** `(organization_id, wa_message_id)` — idempotence webhook                                                   |
| direction message_direction          | `inbound \| outbound`                                                                                            |
| sender_type message_sender           | `contact \| user \| ai \| system`                                                                                |
| sender_user_id uuid                  | FK `profiles` nullable                                                                                           |
| type message_type                    | `text\|image\|document\|audio\|video\|sticker\|location\|contacts\|interactive\|template\|reaction\|unsupported` |
| body text                            | (texte extrait ou légende)                                                                                       |
| payload jsonb                        | (structure Meta brute normalisée)                                                                                |
| template_id uuid                     | FK `wa_templates`                                                                                                |
| status message_status                | `queued\|sent\|delivered\|read\|failed\|received`                                                                |
| error_code text / error_message text |                                                                                                                  |
| ai_run_id uuid                       | FK `ai_runs`                                                                                                     |
| created_at timestamptz not null      |                                                                                                                  |
| updated_at timestamptz               |                                                                                                                  |

**IX :** `(organization_id, conversation_id, created_at desc)` ; `(organization_id, wa_message_id)` ; `(organization_id, created_at)` pour la purge.
**Partitionnement :** `partition by range (created_at)` mensuel **à partir du palier P2** ; le code doit être écrit dès maintenant sans hypothèse contraire (pas de `select *` global, toujours une borne temporelle).

#### `message_attachments`

`id`, `organization_id` **RLS**, `message_id`, `storage_path text` (R2 privé), `mime_type`, `size_bytes`, `sha256`, `width int`, `height int`. Accès par URL signée expirante uniquement.

#### `conversation_notes` _(notes internes, jamais visibles du contact)_

`id`, `organization_id` **RLS**, `conversation_id`, `author_user_id`, `body text`, `created_at`.
**RLS renforcée :** `select` si `has_min_role('agent')` **et** membre de l'organisation ; **exclues** de tout export destiné au contact.

#### `conversation_tags` / `conversation_assignments`

`conversation_tags` : `conversation_id` + `tag_id` (**PK**).
`conversation_assignments` : `id`, `organization_id`, `conversation_id`, `from_user_id`, `to_user_id`, `reason text`, `created_by`, `created_at` — **historique des transferts**, immuable.

### 3.8 Campagnes (2 tables)

#### `campaigns`

`id`, `organization_id` **RLS**, `name text`, `status campaign_status` (`draft|scheduled|running|paused|completed|canceled|failed`), `template_id uuid` FK `wa_templates` (**doit être `approved`**), `segment_id uuid` FK `segments`, `phone_number_id text` FK, `variables jsonb` (mapping nom → champ/constante), `scheduled_at timestamptz`, `timezone text`, `throttle_per_minute int default 60` (jamais au-delà des limites Meta), `total_recipients int`, `sent_count`, `delivered_count`, `read_count`, `failed_count`, `replied_count`, `created_by`, `started_at`, `finished_at`, `version int`.

#### `campaign_recipients`

`id`, `organization_id` **RLS**, `campaign_id`, `contact_id`, `status recipient_status` (`pending|queued|sent|delivered|read|replied|failed|skipped_no_consent|skipped_opt_out|skipped_no_template`), `wa_message_id text`, `error_code text`, `sent_at`, `updated_at`, **U** `(campaign_id, contact_id)`.
**IX :** `(campaign_id, status)`.

### 3.9 Automatisations (3 tables)

#### `automations`

`id`, `organization_id` **RLS**, `name`, `status` (`draft|active|paused|archived`), `trigger_type automation_trigger` (`message_received|keyword_match|no_reply|contact_created|tag_added|campaign_replied|schedule`), `definition jsonb` (graphe `{nodes, edges}` validé par Zod), `version int`, `created_by`, `updated_at`, **U** `(organization_id, lower(name))`.

#### `automation_runs` / `automation_steps`

`automation_runs` : `id`, `organization_id`, `automation_id`, `conversation_id`, `contact_id`, `status` (`queued|running|done|failed|canceled`), `current_node_id text`, `started_at`, `finished_at`, `error text`, **U** `(automation_id, conversation_id, dedupe_key)` — idempotence.
`automation_steps` : `id`, `organization_id`, `run_id`, `node_id`, `action_type`, `status` (`pending|scheduled|executing|done|failed|skipped`), `attempts smallint`, `scheduled_for timestamptz`, `executed_at`, `result jsonb`, `error text`.
**IX :** `(scheduled_for)` partiel `where status = 'scheduled'` (moteur de délais).

### 3.10 Notifications (2 tables)

#### `notifications`

`id`, `organization_id` **RLS**, `user_id`, `type notification_type` (`new_message|assignment|handoff_requested|quota_warning|quota_exceeded|whatsapp_error|campaign_finished|payment_failed|invitation`), `title`, `body`, `data jsonb`, `read_at`, `created_at`, **IX** `(user_id, read_at)`.

#### `notification_preferences`

`user_id` + `organization_id` + `type` (**PK**), `in_app boolean`, `email boolean`.

---

## 4. Vues et agrégats

| Vue                         | Contenu                                                                                      | RLS                           |
| --------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------- |
| `v_org_usage_current`       | consommation vs limite du plan par métrique, période en cours                                | héritée (`organizations`)     |
| `v_conversation_inbox`      | conversation + contact + dernier message + assigné + étiquettes (une ligne par conversation) | filtrée par `organization_id` |
| `v_agent_performance_daily` | messages traités, temps de première réponse, conversations résolues par agent/jour           | idem                          |
| `v_campaign_stats`          | agrégats d'une campagne                                                                      | idem                          |
| `v_whatsapp_health`         | comptes, qualité, tier, date de dernière synchro                                             | idem                          |
| `v_platform_stats`          | organisations actives, MRR, consommation IA globale — **accès `platform_staff` uniquement**  | —                             |

**Règle :** les vues utilisées par le frontend sont créées avec `with (security_invoker = true)` pour que RLS s'applique (sinon le propriétaire contourne les politiques).

---

## 5. Triggers et invariants (à implémenter en Phase 6)

| Invariant                                                         | Mécanisme                                                                               |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `updated_at` automatique                                          | trigger `set_updated_at()` sur toutes les tables                                        |
| Un seul `owner` actif par organisation                            | index unique partiel + trigger de garde                                                 |
| `role = 'owner'` non attribuable par un `admin`                   | policy + trigger `check_member_role_change`                                             |
| `plan_id` / `status` non modifiables par le client                | trigger `guard_org_protected_columns`                                                   |
| Campagne impossible sans consentement                             | trigger `check_campaign_recipient_consent` + vérification applicative (double barrière) |
| Campagne impossible avec un template non approuvé                 | trigger `check_campaign_template_approved`                                              |
| Message sortant impossible hors fenêtre 24 h sans template        | règle `packages/core` + contrôle serveur (pas de trigger, dépend d'un appel Meta)       |
| Aucun `wa_credentials` lisible par un client                      | RLS sans politique + test automatisé                                                    |
| `expires_at` d'un `data_access_grants` ≤ 7 jours et > `starts_at` | contrainte `check`                                                                      |
| `usage_counters` cohérent avec `usage_events`                     | recalcul cron quotidien + alerte d'écart                                                |
| Messages immuables en contenu                                     | `revoke update (body, payload)` sauf statut/erreur                                      |

---

## 6. Volume estimé et indexation (dimensionnement honnête)

Hypothèses : 100 tenants, 200 conversations actives par tenant, 40 messages/jour/conversation.
→ ~800 000 messages/mois, ~250 octets de charge utile moyenne hors `payload` JSON.

| Objet               | Volume à 100 tenants (1 an)    | Remarque                                                                                                                                                     |
| ------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `messages`          | 9,6 M lignes ≈ 4–8 Go          | **dépasse l'offre gratuite Supabase (500 Mo) dès le premier mois** → Supabase Pro + politique de rétention 12 mois + partitionnement obligatoires à ce stade |
| `wa_webhook_events` | 20 M lignes si conservées 30 j | purge obligatoire (30 j), sinon la table domine tout                                                                                                         |
| `ai_runs`           | ~1 M lignes/an                 | métriques seules, ~150 octets/ligne : gérable                                                                                                                |
| `usage_events`      | ~2 M lignes/an                 | archiver par mois dans R2 après agrégation (palier P2)                                                                                                       |
| `knowledge_chunks`  | 50 k lignes                    | `vector(768)` ≈ 3 Ko/ligne → 150 Mo ; à surveiller                                                                                                           |

**Conséquence assumée et chiffrée :** l'offre gratuite tient pour **la démonstration et les 2–3 premiers clients**, pas au-delà. C'est un argument de plus pour facturer dès le premier client (voir `03`).

---

## 7. Ce qui n'est pas dans ce schéma (et pourquoi)

| Absent                                                         | Raison                                                                            |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Table `tenants` séparée                                        | `organizations` **est** le tenant ; une indirection supplémentaire n'apporte rien |
| Table de messages d'e-mail transactionnel                      | délégué à Supabase Auth / fournisseur d'e-mail                                    |
| Stockage de fichiers en base                                   | R2 (pièces jointes, exports, rapports d'import)                                   |
| Historique complet des conversations pour l'analytique avancée | palier P3, base dédiée (ClickHouse ou équivalent) — pas au lancement              |
| Données de carte bancaire                                      | **jamais** chez nous (PSP tokenise ; nous ne stockons que `provider_ref`)         |
| Embeddings au niveau plateforme                                | isolation stricte : les chunks sont toujours rattachés à une organisation         |
