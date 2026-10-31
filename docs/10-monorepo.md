# PHASE 3 — Monorepo, CI et fondations

> **État :** livré et vérifié. `pnpm run check` (types + lint + 109 tests + build) passe.
> **Ce qui existe réellement :** la structure du monorepo, la CI, le domaine de base (`core`), les schémas partagés (`contracts`), le runner de migrations testé sous PGlite, une API Hono minimale avec `/health` et `/meta`, un consommateur de file, et une console web qui interroge l'API.
> **Ce qui n'existe pas encore :** authentification, base de données de production, WhatsApp, IA, facturation. Aucun écran ne prétend le contraire.

---

## 1. Arborescence

```
auto-whatsapp/
├─ apps/
│  ├─ api/          Worker Hono : routes REST, middlewares, /health, /meta
│  ├─ worker/       Worker de traitement : consommateur de file + cron
│  └─ web/          SPA React + Vite + Tailwind (console)
├─ packages/
│  ├─ core/         Domaine pur (téléphone, monnaie, fenêtre 24 h, quotas, erreurs)
│  ├─ contracts/    Schémas Zod partagés front/back
│  └─ db/           Runner de migrations portable + SQL versionné + tests PGlite
├─ docs/            00 → 09 (Phase 1 et 2) + ce document
├─ scripts/         audit Windows, validation OpenAPI, détection de secrets
└─ .github/workflows/ci.yml
```

### Frontières et dépendances

| Package         | Peut importer                | Interdictions (vérifiées par ESLint)   |
| --------------- | ---------------------------- | -------------------------------------- |
| `core`          | rien (aucune I/O)            | `node:*`, `hono`, `postgres`, `kysely` |
| `contracts`     | `zod`                        | tout le reste                          |
| `db`            | `kysely`, `postgres`, `core` | `apps/*`                               |
| `api`, `worker` | `core`, `contracts`, `db`    | —                                      |
| `web`           | `contracts`, `core` (types)  | `db`, secrets serveur                  |

> ⚠️ **Décision de simplification par rapport à `02-architecture-cible.md` :** le package `config` a été supprimé. Les configurations (tsconfig, ESLint, Tailwind) vivent à la racine ; un package dédié n'aurait contenu aucun code et aurait ajouté une indirection. `packages/ui` et `packages/i18n` seront créés en Phase 4 et 14, quand ils auront un contenu réel.

---

## 2. Commandes

```bash
pnpm install            # installer
pnpm run dev            # (à venir Phase 5) lancer web + api ensemble
pnpm --filter @whatsauto/api dev      # API locale sur http://localhost:8787
pnpm --filter @whatsauto/web dev      # console sur http://localhost:5173
pnpm run typecheck      # TypeScript strict, tous les packages
pnpm run lint           # ESLint (frontières + règles)
pnpm run test           # Vitest (dont migrations PGlite)
pnpm run build          # build de tous les packages
pnpm run check          # les quatre ci-dessus, dans l'ordre
pnpm run openapi:validate   # valide docs/08-api-openapi.yaml
pnpm run secrets:scan       # détecte les secrets dans les fichiers suivis
```

Migrations (quand une base est disponible) :

```bash
DATABASE_URL_SERVICE='postgres://…' pnpm --filter @whatsauto/db migrate
```

---

## 3. Ce que contient réellement chaque package

### `packages/core` — domaine pur, 52 tests

| Fichier     | Rôle                                                                   | Décision de conception                                                                                                                                        |
| ----------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `phone.ts`  | Normalisation E.164, masquage pour les journaux                        | Aucune dépendance externe à ce stade ; `libphonenumber-js` remplacera la partie « plans de numérotation » en Phase 10. La limite est documentée dans le code. |
| `money.ts`  | Montants en plus petite unité, arithmétique, remises, formatage `Intl` | **Jamais de flottant pour de l'argent** ; `XOF`/`XAF` sans décimale, `KWD` à 3 décimales.                                                                     |
| `window.ts` | Fenêtre de service WhatsApp de 24 h                                    | Horloge serveur incohérente (horodatage futur) ⇒ fenêtre **fermée** : on échoue du côté sûr.                                                                  |
| `quota.ts`  | Évaluation quotas/limites (`block`, `warn`, `bill`)                    | La limite est toujours **fournie par l'appelant** (lue en base), jamais codée en dur.                                                                         |
| `errors.ts` | `AppError`, 18 codes publics stables, enveloppe d'erreur               | Une erreur inconnue devient `internal_error` : aucun détail interne ne fuit.                                                                                  |

### `packages/contracts` — 18 tests

Schémas Zod partagés : E.164, UUID, devise ISO-4217, montant entier, locale BCP-47, code pays, fuseau (validé via `Intl`), pagination par curseur, enveloppe d'erreur, réponse `/health`. Les codes d'erreur publics sont dupliqués depuis `core` et **un test vérifie le nombre** ; la Phase 7 ajoutera un test d'égalité stricte entre les deux listes.

### `packages/db` — 11 tests, dont la migration réelle

- `src/migrate.ts` : runner **agnostique du driver** (`SqlExecutor`), ordre strict, identifiants uniques et croissants, transaction par migration, interruption au premier échec.
- `migrations/0001_bootstrap.sql` : schéma `app`, trigger `app.set_updated_at()`, et les trois fonctions d'isolation `app.current_organization_id()`, `app.current_user_id()`, `app.current_role()`.
- Tests exécutés sous **PGlite** (Postgres 16 compilé en WASM) : application, idempotence, reprise partielle, rollback sur échec, refus d'identifiants dupliqués/non triés/mal formés, et **le contexte de tenant réellement extrait des revendications signées** (dont le cas « aucune revendication ⇒ NULL ⇒ aucun accès »).
- La migration testée est **le fichier du dépôt**, pas une copie.

### `apps/api` — 13 tests

Hono sur Workers : identifiant de corrélation (`x-request-id` réutilisé s'il est valide, sinon généré), journalisation JSON sans donnée personnelle, en-têtes de sécurité, CORS par liste d'origines, enveloppe d'erreur uniforme, `GET /health`, `GET /api/v1/health`, `GET /api/v1/meta` (identité configurable + langues et direction RTL).

Le `onError` journalise le détail et ne renvoie jamais le message interne.

### `apps/worker` — 10 tests

`dispatchJob` : validation de forme (clé d'idempotence obligatoire), routage, **acquittement d'un type inconnu après alerte** (pour ne jamais saturer la file en boucle), retry sur erreur transitoire, isolation des messages d'un lot.

### `apps/web` — 5 tests

Console minimale : thème clair/sombre persistant, sélecteur de langue, et panneau d'état qui interroge **réellement** `/api/v1/health` (TanStack Query, `refetchInterval` 30 s). Si l'API est absente, l'écran affiche « API injoignable » — il n'affiche jamais de données inventées.

---

## 4. CI (`.github/workflows/ci.yml`)

| Job         | Contenu                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------ |
| `quality`   | `pnpm install --frozen-lockfile` → typecheck → lint → tests → build ; format en informatif |
| `contracts` | `scripts/validate-openapi.sh` (OpenAPI 3.1, `$ref` inclus)                                 |
| `secrets`   | `scripts/scan-secrets.mjs` sur les fichiers suivis                                         |

**Pourquoi un scanner maison ?** `gitleaks-action` exige une licence pour les dépôts privés. Le script couvre les motifs critiques (clés privées, Google, Meta, Stripe, AWS, JWT de service, affectations `*_SECRET=` non vides) et échoue avec un code non nul. À remplacer par gitleaks quand une licence sera disponible — c'est noté dans l'en-tête du script.

⚠️ **`--frozen-lockfile` exige `pnpm-lock.yaml` commité.** Le fichier est généré et versionné dans ce dépôt.

---

## 5. Ce qui a été vérifié sur cette machine

```
pnpm run typecheck   ✔ 8 tâches
pnpm run lint        ✔ 6 tâches, 0 erreur
pnpm run test        ✔ 109 tests (db 11, core 52, contracts 18, api 13, worker 10, web 5)
pnpm run build       ✔ 6 tâches, bundle web 348 kB (106 kB gzip)
prettier --check     ✔
openapi:validate     ✔ 81 chemins / 114 opérations / 55 schémas
secrets:scan         ✔ aucun secret
```

**Non vérifié sur cette machine (et pourquoi) :** déploiement Cloudflare, appels Meta, appels Gemini, connexion à une base Postgres distante. Le sandbox de développement n'a **pas** d'accès réseau sortant vers ces services (voir `00-audit-environnement.md`). Ces vérifications auront lieu en CI GitHub Actions et sur votre machine, avec les smoke tests prévus en Phase 7/8/9.

---

## 6. Dette assumée à ce stade

| Élément                                   | Pourquoi c'est acceptable en Phase 3                                                                          | Échéance  |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------- |
| Pas de base branchée dans l'API           | Le schéma n'existe qu'en migration ; brancher maintenant créerait une dépendance non testable                 | Phase 6/7 |
| `phone.ts` sans plan de numérotation      | Couvre 80 % des cas, testé ; remplacé par une bibliothèque éprouvée                                           | Phase 10  |
| i18n limitée à `fr`/`en` dans la console  | La Phase 14 livre les 8 langues ; la structure (catalogues, aucune chaîne en dur côté logique) est déjà posée | Phase 14  |
| Pas de tests navigateur                   | Playwright nécessite des binaires non installables ici ; la CI les exécutera                                  | Phase 15  |
| Pas de `wrangler deploy` dans la CI       | Pas encore de compte Cloudflare ni de secrets de déploiement                                                  | Phase 7   |
| `no-console` assoupli pour `api`/`worker` | Journalisation JSON = mécanisme d'observabilité (ADR-014), documenté dans la config ESLint                    | —         |

---

## 7. Prochaine phase

**Phase 4 — identité visuelle et frontend commercial :** design tokens, `packages/ui`, landing page (hero, fonctionnalités, tarifs, FAQ, CTA, footer), pages légales en placeholder explicite, SEO/OpenGraph, nom et domaine configurables.

Prérequis de votre côté : **nom du produit** (D10) et orientation visuelle.
