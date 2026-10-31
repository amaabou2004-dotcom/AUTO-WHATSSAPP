# WhatsAuto AI — SaaS d'automatisation WhatsApp par IA

> **État : Phases 1 → 3 livrées.** Fondations vérifiées (`typecheck`, `lint`, **109 tests**, `build`).
> **Ce dépôt ne contient encore aucune fonctionnalité commerciale en ligne** : pas d'authentification, pas de base de production, pas de connexion WhatsApp, pas d'IA, pas de facturation. Aucun écran, aucun document ne prétend le contraire.
> Le nom « WhatsAuto AI » est un **nom de travail** : il ne doit pas être déposé tel quel (Brand Guidelines Meta — pas de « WhatsApp » dans un nom de produit, cf. `docs/00`, §5).

---

## 1. Où en est le projet

| Phase | Objet | État |
|---|---|---|
| **1** | Audit, faisabilité Meta/IA, architecture, budget, modèle économique, risques, roadmap | ✅ validée (D1/D3/D4 tranchées) |
| **2** | Architecture définitive : 55 tables + RLS, OpenAPI (81 chemins / 114 opérations), 14 ADR | ✅ validée |
| **3** | Monorepo, CI, domaine de base, schémas partagés, runner de migrations, API minimale, console | ✅ **livrée** |
| 4 | Identité visuelle, design system, landing page | ⏳ en attente (nom du produit requis) |
| 5 → 16 | Auth, base de données, API métier, WhatsApp, IA, conversations, campagnes, facturation, back-office, i18n, tests, déploiement | ⏳ |

Aucune phase ne démarre sans validation explicite.

---

## 2. Démarrage rapide

```bash
pnpm install
pnpm run check            # typecheck + lint + tests + build  (doit être vert)

pnpm --filter @whatsauto/api dev     # API sur http://localhost:8787
pnpm --filter @whatsauto/web dev     # console sur http://localhost:5173
```

Migrations (dès qu'une base Postgres est disponible) :

```bash
DATABASE_URL_SERVICE='postgres://…' pnpm --filter @whatsauto/db migrate
```

Autres commandes : `pnpm run openapi:validate`, `pnpm run secrets:scan`,
`pnpm run test`, `pnpm run format`.

---

## 3. Structure

```
apps/api        Worker Hono — routes REST, /health, /meta, erreurs uniformes
apps/worker     Worker de traitement — consommateur de file + cron
apps/web        SPA React 19 + Vite + Tailwind 4 — console
packages/core   Domaine pur : téléphone E.164, monnaie, fenêtre 24 h, quotas, erreurs
packages/contracts  Schémas Zod partagés front/back
packages/db     Runner de migrations portable + SQL versionné + tests PGlite
```

Détail des choix, frontières de packages et dette assumée : [`docs/10-monorepo.md`](docs/10-monorepo.md).

---

## 4. Documentation

| Document | Contenu |
|---|---|
| [`docs/00-audit-environnement.md`](docs/00-audit-environnement.md) | Audit mesuré, connectivité, procédure d'audit Windows |
| [`docs/01-faisabilite-meta.md`](docs/01-faisabilite-meta.md) | Tech Provider / Embedded Signup, **périmètre autorisé de l'IA**, tarification par message, paiements |
| [`docs/02-architecture-cible.md`](docs/02-architecture-cible.md) | Monorepo, multi-tenant, couches WhatsApp/IA, jobs, paliers de charge |
| [`docs/03-budget-modele-economique.md`](docs/03-budget-modele-economique.md) | Limites réelles des offres gratuites, budget à 0/10/100 clients, grille tarifaire |
| [`docs/04-risques.md`](docs/04-risques.md) | 28 risques qualifiés et mitigations |
| [`docs/05-roadmap.md`](docs/05-roadmap.md) | 16 phases, critères de sortie, MVP commercialisable |
| [`docs/06-decisions-a-valider.md`](docs/06-decisions-a-valider.md) | Décisions tranchées + celles à venir |
| [`docs/07-modele-donnees.md`](docs/07-modele-donnees.md) | 55 tables, index, politiques RLS, invariants, dimensionnement |
| [`docs/08-api-openapi.yaml`](docs/08-api-openapi.yaml) | Contrat OpenAPI 3.1 (validé en CI) |
| [`docs/09-adr.md`](docs/09-adr.md) | 14 décisions d'architecture |
| [`docs/10-monorepo.md`](docs/10-monorepo.md) | Phase 3 : structure, commandes, tests, CI, dette |

Outils : [`scripts/audit-windows.ps1`](scripts/audit-windows.ps1) (lecture seule),
[`scripts/validate-openapi.sh`](scripts/validate-openapi.sh), [`scripts/scan-secrets.mjs`](scripts/scan-secrets.mjs).

---

## 5. Trois contraintes qui structurent tout le produit

1. **Le client paie Meta, pas nous** (décision D1). Depuis le 01/10/2026, chaque réponse de l'IA est un message facturé : 0,004 USD vers l'Afrique de l'Ouest, jusqu'à 0,055 USD vers l'Allemagne. Porter ce coût détruirait la marge. La plateforme le **mesure et l'affiche**, sans le refacturer.
2. **L'IA doit rester strictement métier.** Les conditions Meta interdisent un assistant généraliste comme fonctionnalité principale. Les garde-fous (périmètre, refus, transfert humain, divulgation) sont dans le code, pas seulement dans les CGU.
3. **L'offre gratuite ne suffit pas en production.** Supabase gratuit = 500 Mo, aucune sauvegarde, pause après 7 jours d'inactivité. Le passage en Pro (25 USD) doit être déclenché par le premier client payant, pas avant.

---

## 6. Règles absolues du projet

- Pas de code fictif présenté comme fonctionnel ; pas de bouton décoratif ; pas de données inventées.
- Aucun secret dans le dépôt ni dans le bundle frontend (scanner exécuté en CI).
- Aucun mélange de données entre entreprises (RLS + tests d'isolation croisée).
- Aucune API WhatsApp non officielle, aucun contournement des règles ni des limites Meta.
- Aucune fonctionnalité supprimée sans validation.

---

## 7. Prochaine étape

Phase 4 (identité visuelle et landing page) démarre après votre validation et le choix du **nom du produit** (décision D10) — le nom, le domaine et les couleurs sont configurables et ne doivent pas contenir « WhatsApp ».

*Documentation et code au 31 octobre 2026. Les tarifs, quotas et politiques cités portent leur date de relevé et doivent être revérifiés aux sources officielles avant tout engagement commercial.*
