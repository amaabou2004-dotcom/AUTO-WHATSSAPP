# PHASE 1.1 — Audit de l'environnement

> **Date de l'audit :** 31 octobre 2026
> **Auditeur :** CTO / Architecte (agent Arena)
> **Portée :** environnement d'exécution de l'agent (sandbox Linux) + environnement cible du fondateur (Windows) + dépôt Git.
> **Règle appliquée :** aucun chiffre n'est inventé. Tout ce qui n'a pas pu être mesuré est explicitement marqué **NON MESURÉ** avec la procédure pour le mesurer.

---

## 1. Résumé exécutif

| Élément                                                  | État                                                                                                | Impact sur le projet                                                                                             |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Dépôt `AUTO-WHATSSAPP`                                   | Vide (1 fichier `README.md`), **public**, branche `main` initiale                                   | Repo à structurer. **Recommandation : passer en privé avant le code métier.**                                    |
| Environnement agent (sandbox)                            | Debian 12, Node 22.22.3, npm 10.9.8, git 2.39.5, gh authentifié, 2 vCPU / 3,8 Go RAM / 20 Go disque | Suffisant pour écrire, typer, tester et builder le monorepo                                                      |
| Réseau sortant de l'agent                                | **npm + GitHub uniquement**                                                                         | ❌ Impossible de déployer, ni d'appeler Meta / Supabase / Gemini depuis le sandbox                               |
| PostgreSQL local                                         | **absent**, Docker absent, `apt` bloqué (miroirs Debian injoignables)                               | Les tests de migrations se feront avec **PGlite (Postgres compilé en WASM via npm)** — 100 % hors-ligne, gratuit |
| Environnement Windows du fondateur                       | **NON MESURÉ** (hors de portée du sandbox)                                                          | Script d'audit fourni : `scripts/audit-windows.ps1`                                                              |
| Comptes externes (Meta, Supabase, Cloudflare, Google AI) | Non créés / non vérifiés                                                                            | À créer — voir §5 « Prérequis »                                                                                  |
| Accès GitHub                                             | `gh` authentifié en tant que `amaabou2004-dotcom`, push HTTPS OK                                    | PR et CI possibles depuis le sandbox                                                                             |

**Conséquence structurante :** ce sandbox est un **environnement de développement et de test unitaire**, pas un environnement de déploiement. Les étapes qui exigent un accès réseau réel (Embedded Signup Meta, envoi WhatsApp, appels Gemini, migrations sur Supabase, déploiement Wrangler) devront s'exécuter **soit sur la machine Windows du fondateur, soit dans GitHub Actions** (qui a un accès réseau complet). Toute la conception ci-dessous en tient compte : les intégrations seront testées par _contrats de test_ (mocks + tests de non-régression de payloads) ici, et par _smoke tests réels_ en CI/CD ou en local.

---

## 2. Détail mesuré — environnement agent

### 2.1 Système

```
OS        : Debian GNU/Linux 12 (bookworm), kernel 6.1.158+
CPU       : 2 vCPU
RAM       : 3,8 Go (disponible ~3,6 Go)
Disque    : 20 Go libres sur /
Utilisateur: uid 1001, membre du groupe sudo
```

### 2.2 Chaîne d'outils

| Outil                     | Version                  | Statut                                                                   |
| ------------------------- | ------------------------ | ------------------------------------------------------------------------ |
| Node.js                   | v22.22.3                 | ✅ (LTS-compatible ; `node:crypto`, `fetch`, Web Streams disponibles)    |
| npm                       | 10.9.8                   | ✅                                                                       |
| Yarn                      | 1.22.22                  | ✅ (legacy, non retenu)                                                  |
| pnpm                      | absent                   | ⚠️ à installer via `npm i -g pnpm` (registry npm autorisé)               |
| Bun                       | absent                   | non requis                                                               |
| git                       | 2.39.5                   | ✅                                                                       |
| gh                        | authentifié (`GH_TOKEN`) | ✅                                                                       |
| Python                    | 3.11.2                   | ✅ (usage : scripts ponctuels, jamais en prod)                           |
| psql / PostgreSQL         | **absent**               | ⚠️ remplacé par PGlite pour les tests                                    |
| Docker                    | **absent**               | non requis pour l'architecture retenue                                   |
| wrangler (CLI Cloudflare) | **absent**               | installable via npm ; exécution réelle impossible ici (pas de réseau CF) |
| supabase CLI              | **absent**               | installable via npm ; authentification impossible ici                    |
| ripgrep, jq, curl         | présents                 | ✅                                                                       |

### 2.3 Matrice de connectivité (testée par requête HTTP réelle)

| Destination                         | Résultat                                               | Conséquence                                                           |
| ----------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------- |
| `registry.npmjs.org`                | 200                                                    | installation de dépendances OK                                        |
| `api.github.com`                    | 200                                                    | gestion du dépôt, PR, issues OK                                       |
| `deb.debian.org`                    | **timeout / 000**                                      | impossible d'installer des paquets système (pas de PostgreSQL/Docker) |
| `supabase.com`                      | 000 (échec)                                            | pas de provisioning Supabase depuis l'agent                           |
| `generativelanguage.googleapis.com` | 000                                                    | pas d'appel Gemini réel depuis l'agent                                |
| `api.cloudflare.com`                | 000                                                    | pas de déploiement Wrangler depuis l'agent                            |
| `graph.facebook.com` (Meta)         | **DNS résolu seulement**, pas de connexion applicative | pas d'appel WhatsApp réel depuis l'agent                              |

> ⚠️ **Ne jamais interpréter un `000` comme « service indisponible »** : cela signifie _egress bloqué par la politique du sandbox_. Les services eux-mêmes n'ont pas été testés.

### 2.4 Outils de compilation/test disponibles hors-ligne

| Besoin                  | Solution retenue                                                                                    | Coût |
| ----------------------- | --------------------------------------------------------------------------------------------------- | ---- |
| Tests TypeScript        | `vitest` (npm)                                                                                      | 0    |
| Lint / format           | `eslint` + `prettier` (npm)                                                                         | 0    |
| Tests de migrations SQL | `@electric-sql/pglite` (Postgres 16 en WASM) + runner Vitest                                        | 0    |
| Tests de webhooks Meta  | payloads JSON figés + vérification HMAC `X-Hub-Signature-256` en Node                               | 0    |
| Tests E2E navigateur    | Playwright — **non installable ici** (binaires hors npm registry) → à exécuter en CI GitHub Actions | 0    |
| Build frontend          | `vite build`                                                                                        | 0    |
| Build Worker            | `wrangler deploy --dry-run` (peut nécessiter le réseau) → fallback : `esbuild --bundle`             | 0    |

---

## 3. Audit de l'environnement Windows du fondateur — procédure

Je ne peux pas atteindre la machine Windows : elle est hors du périmètre réseau du sandbox. Plutôt que de **deviner** sa configuration (interdit : « pas de données inventées »), je fournis un **script d'audit en lecture seule**.

### 3.1 Exécution

Dans PowerShell **7+** (ou Windows PowerShell 5.1), à la racine du dépôt :

```powershell
# Autoriser l'exécution du script pour cette session uniquement (pas de changement système)
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\audit-windows.ps1 -OutFile .\audit-windows.md
```

Le script :

- **ne modifie rien** (aucune installation, aucune écriture hors du fichier de rapport) ;
- vérifie : version de Windows, virtualisation (WSL2), RAM/CPU/disque, PowerShell, winget, Git, Node, pnpm, npm, Python, Docker, VS Code, extensions, `gh`, `wrangler`, `supabase`, ports occupés (3000, 5173, 8787, 5432), politique d'exécution, chemins longs (long paths), antivirus/Defender et exclusions, proxy, fuseau horaire, indicateurs de performance réseau ;
- produit un rapport Markdown à coller dans la conversation.

### 3.2 Critères d'acceptation de la machine de développement

| Critère       | Minimum   | Recommandé                                                                |
| ------------- | --------- | ------------------------------------------------------------------------- |
| Windows       | 10 22H2   | 11 23H2+                                                                  |
| RAM           | 8 Go      | 16 Go                                                                     |
| Disque libre  | 10 Go     | 30 Go (node_modules monorepo + caches)                                    |
| Node.js       | 20.x LTS  | **22.x LTS**                                                              |
| Git           | 2.40+     | à jour                                                                    |
| Chemins longs | activés   | activés                                                                   |
| WSL2          | optionnel | **recommandé** (permet PGlite/psql local et test de la CI en miroir)      |
| Antivirus     | —         | exclure `node_modules`, `.next`, `.turbo`, `dist` des scans (accélère ×3) |

> Si la machine ne respecte pas le minimum, la Phase 3 (monorepo) restera faisable mais les builds seront lents ; un environnement cloud de développement gratuit (GitHub Codespaces — quota gratuit mensuel limité, à vérifier) est l'alternative.

---

## 4. Audit du dépôt Git

| Point                 | Constat                                  | Action                                                                                                                                                                                                             |
| --------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Contenu               | `README.md` (17 octets) uniquement       | À remplacer par un README projet réel                                                                                                                                                                              |
| Visibilité            | **public**                               | ⚠️ **Passer en privé** avant tout code métier/client. Un repo public n'est pas un problème de secrets (aucun secret ne doit y entrer) mais expose l'avancement, le schéma de données et les failles non corrigées. |
| Branches              | `main` + `arena/6048e032-auto-whatssapp` | Travail sur la branche de session, PR vers `main`                                                                                                                                                                  |
| CI/CD                 | aucun workflow                           | À créer en Phase 3 (`ci.yml` : typecheck, lint, tests, build)                                                                                                                                                      |
| Licence               | aucune                                   | À décider (propriétaire recommandé pour un SaaS commercial)                                                                                                                                                        |
| Protection de branche | inconnue                                 | À activer sur `main` (PR obligatoire, CI verte)                                                                                                                                                                    |
| `.gitignore`          | absent                                   | À créer immédiatement (Phase 3)                                                                                                                                                                                    |

---

## 5. Prérequis externes à créer (Phase 1 → Phase 8)

Aucun de ces comptes n'est nécessaire pour coder les phases 2 à 6 ; tous sont nécessaires pour vendre.

| #   | Prérequis                                                                    | Quand                | Coût initial    | Risque / délai                                                                                                                                                                                                  |
| --- | ---------------------------------------------------------------------------- | -------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | Compte GitHub (fait) + repo privé                                            | Phase 3              | 0               | —                                                                                                                                                                                                               |
| P2  | Compte Cloudflare + `workers.dev`                                            | Phase 7              | 0               | —                                                                                                                                                                                                               |
| P3  | Projet Supabase (région UE pour le lancement)                                | Phase 6              | 0               | pause après 7 j d'inactivité (à documenter)                                                                                                                                                                     |
| P4  | Nom de domaine                                                               | Phase 16 (pas avant) | ~10–15 USD/an   | aucune urgence                                                                                                                                                                                                  |
| P5  | Compte Meta Developer + Business Portfolio                                   | Phase 8              | 0               | vérification d'entreprise **obligatoire** pour dépasser les quotas de base                                                                                                                                      |
| P6  | Statut **Meta Tech Provider** (et à terme Solution Partner)                  | Phase 8              | 0               | délai d'examen, conditions contractuelles (voir `01-faisabilite-meta.md`)                                                                                                                                       |
| P7  | Clé Google AI Studio + **facturation activée** (Tier 1, sans minimum)        | Phase 9              | ~0 (usage réel) | le tier gratuit interdit l'usage des données clients pour un service commercial (voir §3.3 du doc faisabilité)                                                                                                  |
| P8  | Compte prestataire de paiement adapté au Niger                               | Phase 12             | 0               | voir `04-budget-modele-economique.md` §6                                                                                                                                                                        |
| P9  | Entité juridique + documents légaux (CGU, politique de confidentialité, DPA) | Phase 15/16          | à budgéter      | **bloquant commercial**, à faire valider par un juriste                                                                                                                                                         |
| P10 | Marque / nom définitif + recherche d'antériorité                             | Phase 4              | à budgéter      | « WhatsAuto AI » est un nom de travail **et ne doit pas être déposé tel quel** (proximité avec des marques existantes et usage de « WhatsApp » dans un nom de produit = interdit par les règles de marque Meta) |

> ⚠️ **Point de conformité important dès maintenant :** utiliser « WhatsApp » dans le nom du produit ou du domaine est contraire aux _Brand Guidelines_ de Meta. Le nom affiché, le domaine et l'identité doivent être **configurables** (exigence du cahier des charges) et **dépourvus du mot WhatsApp**. La mention « compatible avec WhatsApp Business Platform » est, elle, autorisée dans une description factuelle.

---

## 6. Ce qui est vérifié / ce qui ne l'est pas

**Vérifié ici (mesuré) :** OS, versions d'outils, ressources, connectivité, état du dépôt, authentification GitHub.
**Vérifié par recherche documentaire (sourcé, à revalider avant contractualisation) :** tarifs et quotas WhatsApp/Meta, quotas Cloudflare, quotas Supabase, quotas Gemini, disponibilité des prestataires de paiement. Voir les documents `01` et `04`, chaque chiffre porte sa date de relevé.
**NON vérifié et devant l'être par vous ou en Phase 8/9/12 :** votre éligibilité Meta Tech Provider, votre éligibilité à un prestataire de paiement, votre environnement Windows, la fiscalité applicable à votre structure.

---

## 7. Décisions issues de cet audit

1. Le sandbox n'est **pas** un environnement de déploiement → CI/CD GitHub Actions obligatoire dès la Phase 3, et un environnement _staging_ réel dès la Phase 7.
2. Tests SQL via **PGlite**, pas de PostgreSQL système → les migrations doivent rester **portables** (pas d'extension exotique non disponible sur Supabase en Phase 6 ; `pgvector`, `pgcrypto`, `pg_cron` sont disponibles côté Supabase et à isoler derrière des migrations conditionnelles).
3. Le dépôt doit être **privé** avant la Phase 5.
4. Aucun développement d'intégration réelle (Meta, Gemini, paiement) ne peut être « testé » depuis ce sandbox : chaque intégration devra fournir (a) un **contrat de test** rejouable hors-ligne et (b) un **smoke test** réel exécutable par vous.
