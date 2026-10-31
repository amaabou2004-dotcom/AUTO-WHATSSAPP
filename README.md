# WhatsAuto AI — Monorepo du SaaS d'automatisation WhatsApp par IA

> **État du projet : PHASE 1 terminée et validée · PHASE 2 livrée — en attente de validation.**
> **Aucun code applicatif n'existe encore.** Ce dépôt contient pour l'instant l'audit, l'étude de faisabilité, l'architecture cible, le budget, le modèle économique, le registre des risques, la roadmap et les décisions à valider.
> Ce README ne revendique **aucune** fonctionnalité en ligne, aucun client, aucun chiffre d'usage, aucune certification.
> Les documents de Phase 2 (schéma de données, contrat OpenAPI, ADR) sont des **spécifications**, pas du code exécutable.

---

## 1. Où en est le projet ?

| Phase | Objet | État |
|---|---|---|
| **1** | Audit, faisabilité, architecture, budget, modèle économique, risques, roadmap | ✅ **livrée — à valider** |
| **2** | Architecture technique définitive : schéma de données (55 tables), contrat OpenAPI (81 chemins / 114 opérations, **validé**), 14 ADR | ✅ **livrée — à valider** |
| 3 → 16 | Monorepo, frontend, auth, base de données, API, WhatsApp, IA, conversations, campagnes, facturation, back-office, i18n, tests, déploiement | ⏳ non démarrées |

**La règle appliquée :** aucune phase ne démarre sans validation explicite (exigence du cahier des charges).

---

## 2. Documents de la Phase 1

| Document | Contenu |
|---|---|
| [`docs/00-audit-environnement.md`](docs/00-audit-environnement.md) | Audit mesuré du sandbox, de la connectivité, du dépôt ; procédure d'audit de votre machine Windows |
| [`docs/01-faisabilite-meta.md`](docs/01-faisabilite-meta.md) | Faisabilité WhatsApp/Meta, contraintes Embedded Signup & Tech Provider, **périmètre autorisé de l'IA**, économie des messages, faisabilité IA, conformité, paiements |
| [`docs/02-architecture-cible.md`](docs/02-architecture-cible.md) | Monorepo, multi-tenant, modèle de données, API, couche WhatsApp, couche IA, jobs, facturation, sécurité, i18n, paliers de charge, CI/CD |
| [`docs/03-budget-modele-economique.md`](docs/03-budget-modele-economique.md) | Offres gratuites et **leurs limites réelles**, budget à 0 / 10 / 100 clients, grille tarifaire, risques de marge |
| [`docs/04-risques.md`](docs/04-risques.md) | 28 risques qualifiés (probabilité × impact), mitigations, priorités |
| [`docs/05-roadmap.md`](docs/05-roadmap.md) | Séquencement des 16 phases, livrables, critères de sortie, estimations en jours-homme, périmètre du MVP |
| [`docs/06-decisions-a-valider.md`](docs/06-decisions-a-valider.md) | **14 décisions** à trancher avant la suite (4 bloquantes) |
| [`docs/07-modele-donnees.md`](docs/07-modele-donnees.md) | Modèle de données définitif : 55 tables, colonnes, contraintes, index, politiques RLS, invariants, dimensionnement |
| [`docs/08-api-openapi.yaml`](docs/08-api-openapi.yaml) | Contrat OpenAPI 3.1 de l'API (source de vérité des types et des tests) |
| [`docs/09-adr.md`](docs/09-adr.md) | 14 décisions d'architecture (ADR) avec alternatives écartées |
| [`scripts/audit-windows.ps1`](scripts/audit-windows.ps1) | Audit en **lecture seule** de votre machine Windows |
| [`scripts/validate-openapi.sh`](scripts/validate-openapi.sh) | Validation du contrat OpenAPI (intégrée à la CI en Phase 3) |

---

## 3. Trois conclusions de la Phase 1 à retenir

1. **Le risque n'est pas technique, il est économique et réglementaire.** Depuis le 1er octobre 2026, Meta facture les messages de service — donc chaque réponse de l'IA a un coût variable. Si la plateforme paie ces frais à la place des clients, un seul client européen rend un abonnement déficitaire. → **Le client doit payer Meta directement** (décision D1).
2. **L'IA sur WhatsApp est autorisée, mais uniquement au service d'une tâche métier de l'entreprise.** Un assistant généraliste est interdit. Les garde-fous doivent être **dans le code**, pas seulement dans les CGU.
3. **Le budget de démarrage est réellement proche de zéro** (~2–5 USD/mois, uniquement la clé IA payante), mais **l'offre gratuite Supabase n'est pas exploitable en production payante** (pause après 7 jours, aucune sauvegarde). Le passage à 25 USD/mois doit être déclenché par le premier client, pas avant.

---

## 4. Stack prévue (à valider en Phase 2)

**Frontend :** React + TypeScript + Vite + Tailwind CSS + shadcn/ui + React Router + TanStack Query + i18next (RTL inclus).
**Backend :** Cloudflare Workers + Hono, API REST versionnée, Cloudflare Queues, Cron Triggers.
**Données :** PostgreSQL (Supabase), Row Level Security, migrations SQL versionnées, `pgvector` pour la base de connaissances, PGlite pour les tests hors-ligne.
**IA :** couche d'abstraction multi-fournisseurs, Gemini en premier (tier payant), garde-fous de périmètre, RAG ancré, quotas et journalisation des coûts.
**WhatsApp :** WhatsApp Cloud API + Meta Embedded Signup uniquement. **Aucune API non officielle.**
**Paiement :** abstraction `BillingProvider` (manuel → Paddle → CinetPay/Flutterwave). Aucune dépendance à un seul prestataire.
**CI/CD :** GitHub Actions, environnements local / preview / staging / production, secrets hors dépôt.

---

## 5. Règles absolues du projet

- Pas de code fictif présenté comme fonctionnel.
- Pas de bouton décoratif sans action.
- Pas de données inventées : aucun faux client, faux chiffre, faux témoignage, fausse certification.
- Pas de secret dans le frontend ni dans le dépôt.
- Pas de fausse connexion WhatsApp, pas de fausse facturation, pas de fausses statistiques.
- Aucun mélange de données entre entreprises (RLS + tests d'isolation automatisés).
- Aucune API non officielle, aucun contournement des règles Meta ni des limites de débit.
- Aucune fonctionnalité supprimée sans validation.

---

## 6. Décisions validées le 31 octobre 2026

| Réf. | Décision |
|---|---|
| **D1** | **Le client paie Meta directement** (marge SaaS ~94 %, aucun risque pays) |
| **D3** | **Facturation manuelle, puis Paddle (international) + CinetPay (zone XOF)** |
| **D4** | **Afrique de l'Ouest francophone en priorité** (FR par défaut, prix en XOF, `Africa/Niamey`) |

## 7. Prochaine étape

1. Relire [`docs/07-modele-donnees.md`](docs/07-modele-donnees.md) et [`docs/09-adr.md`](docs/09-adr.md) (points à confirmer : ADR-011 Kysely, durées de conservation, verticales interdites).
2. Valider la Phase 2 pour lancer la **Phase 3** (monorepo pnpm + turbo, TypeScript strict, CI GitHub Actions, tests de migrations sous PGlite).

**Vérification du contrat d'API :**
```bash
./scripts/validate-openapi.sh
```

---

*Documentation rédigée le 31 octobre 2026. Les tarifs, quotas et politiques cités portent leur date de relevé et doivent être re-vérifiés aux sources officielles avant tout engagement commercial.*
