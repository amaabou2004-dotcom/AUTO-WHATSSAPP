# PHASE 1.9 — Feuille de route

> **Principe :** chaque phase a un **objectif**, des **livrables** et des **critères de sortie vérifiables**. Une phase n'est déclarée terminée que si ses critères sont remplis et testés. Aucune phase ne démarre sans votre validation explicite (exigence du cahier des charges).
> **Estimations :** en jours-homme (jh) de développement effectif, hors délais externes (Meta, banque). Ce sont des ordres de grandeur, pas des engagements.

---

## 1. Séquencement recommandé (différent de la numérotation d'origine)

La numérotation du cahier des charges est conservée, mais l'**ordre d'exécution** proposé place la facturation **avant** campagnes et automatisations, afin d'atteindre un produit **vendable** plus tôt.

```
Semaine  1-2   : Phase 1 (ce document) + Phase 2 (validation architecture)
Semaine  3     : Phase 3  — monorepo + CI
Semaine  4-5   : Phase 4  — identité visuelle + landing + design system
Semaine  6-7   : Phase 5  — auth + multi-tenant
Semaine  8-9   : Phase 6  — base de données + RLS + tests d'isolation
Semaine 10     : Phase 7  — API + jobs + observabilité
Semaine 11-13  : Phase 8  — WhatsApp (Cloud API + Embedded Signup)   ◄── délais Meta à lancer en parallèle dès la semaine 3
Semaine 14-16  : Phase 9  — assistant IA + garde-fous + RAG
Semaine 17-19  : Phase 10 — contacts + boîte de réception temps réel
Semaine 20-21  : Phase 12 — abonnements + quotas + facturation manuelle/PSP
                ► **MVP COMMERCIALISABLE — premiers clients payants**
Semaine 22-25  : Phase 11 — campagnes + automatisations
Semaine 26-27  : Phase 13 — back-office plateforme
Semaine 28     : Phase 14 — internationalisation complète (IT/DE/AR/ZH audités)
Semaine 29-31  : Phase 15 — tests complets + audit de sécurité
Semaine 32-33  : Phase 16 — production, documentation commerciale, légal
```

> ⚠️ **Délais externes à lancer immédiatement, indépendamment du code :** vérification d'entreprise Meta, demande de statut Tech Provider, KYC du prestataire de paiement, rédaction juridique. Ce sont eux qui déterminent la date du premier euro, pas le développement.

---

## 2. Détail des phases

### PHASE 1 — Audit et faisabilité ✅ *(livrée dans ce dépôt)*
**Objectif :** connaître l'environnement, la faisabilité, les coûts, les risques.
**Livrables :** `00` audit, `01` faisabilité Meta/IA, `03` budget & modèle économique, `04` risques, `05` roadmap, `06` décisions, script d'audit Windows.
**Critère de sortie :** vous avez validé les décisions `06-decisions-a-valider.md`.

### PHASE 2 — Architecture technique définitive ✅ *(livrée — à valider)*
**Livrée :** modèle de données complet (55 tables, contraintes, index, politiques RLS, invariants) dans `07` ;
contrat OpenAPI **validé** (81 chemins, 114 opérations, 55 schémas) dans `08` ; 14 ADR dans `09`.
**Objectif :** figer l'architecture, le modèle de données et les contrats d'API.
**Livrables :** `02-architecture-cible.md` consolidé, diagramme de données complet (tables + colonnes + index + politiques RLS), spécification OpenAPI des ~60 endpoints, ADR (Architecture Decision Records) pour les 8 décisions structurantes.
**Critère de sortie :** aucune zone d'ombre sur le multi-tenant, les secrets, la facturation, la file de messages.

### PHASE 3 — Monorepo et CI — 3 jh
**Livrables :** pnpm workspaces, turbo, TypeScript strict, ESLint/Prettier, `packages/{core,contracts,config}`, `.gitignore`, `.env.example`, `ci.yml` (typecheck + lint + tests + migrations PGlite + build), `gitleaks`, protection de branche, README.
**Critère de sortie :** `pnpm ci` vert sur une PR vide ; un secret commité est bloqué.

### PHASE 4 — Identité visuelle et frontend — 8 jh
**Livrables :** design tokens (couleurs, typo, espacement, élévation), thème clair/sombre, `packages/ui` (≈ 25 composants), landing page (hero, fonctionnalités, démo IA **réelle ou explicitement étiquetée comme démo interactive**, avantages, tarifs, FAQ, CTA, footer), pages légales (placeholders clairement marqués), favicon/OG image, nom + domaine **configurables via variables**.
**Critère de sortie :** Lighthouse ≥ 90 sur la landing, responsive, accessible au clavier, aucune chaîne en dur, aucun témoignage/chiffre inventé.

### PHASE 5 — Authentification et multi-tenant — 8 jh
**Livrables :** inscription e-mail, connexion, Google OAuth, vérification e-mail, réinitialisation, MFA TOTP, gestion des sessions, profils, organisations, memberships, invitations, rôles/permissions, sélection d'espace actif.
**Critère de sortie :** parcours complet testé de bout en bout ; un utilisateur ne voit jamais un espace auquel il n'appartient pas ; invitations expirantes et à usage unique.

### PHASE 6 — Base de données et sécurité — 8 jh
**Livrables :** migrations `0001…00NN` complètes, RLS sur toutes les tables, index justifiés, `audit_logs`, tests de migration sous PGlite, **suite de tests d'isolation inter-tenant**, procédure de sauvegarde/restauration documentée et testée.
**Critère de sortie :** 100 % des tables métier protégées par RLS ; tests d'isolation verts sur l'ensemble des tables ; restauration démontrée.

### PHASE 7 — Backend et API — 8 jh
**Livrables :** Worker Hono, middleware (auth, tenant, rate-limit, validation, audit), 60 endpoints, format d'erreur unifié, pagination, idempotence, SSE, worker de jobs, cron, `/health`, logs structurés, `request_id`.
**Critère de sortie :** contrat OpenAPI respecté, tests d'intégration, aucune requête SQL non paramétrée, temps de réponse p95 mesuré.

### PHASE 8 — Connexion WhatsApp officielle — 12 jh (+ délais Meta)
**Livrables :** configuration Embedded Signup, échange de code, stockage chiffré des tokens, webhooks vérifiés et idempotents, envoi de messages, gestion des statuts, gestion des erreurs Meta, gestion de la fenêtre 24 h, modèles de messages (création/soumission/suivi), tableau de bord des connexions, révocation/reconnexion.
**Critère de sortie :** un numéro de test réel reçoit et envoie un message ; rejeu d'un webhook = aucun doublon ; token compromis = révocation en < 1 min.

### PHASE 9 — Intelligence artificielle — 12 jh
**Livrables :** interface `AiProvider`, implémentation Gemini, second fournisseur, configuration complète de l'assistant (nom, avatar, personnalité, ton, langues, instructions, objectifs, entreprise, produits, tarifs, horaires, FAQ, documents, règles, messages de secours), RAG `pgvector`, détection de langue, garde-fous de périmètre, anti-injection, anti-hallucination, anti-boucle, mémoire bornée, transfert humain, journal `ai_runs`, quotas et coûts.
**Critère de sortie :** jeu d'évaluation (50 questions types × 3 tenants) ≥ seuil de qualité défini ; test d'isolation IA vert ; coût moyen par réponse mesuré et documenté.

### PHASE 10 — Contacts et conversations — 14 jh
**Livrables :** boîte de réception temps réel, recherche, filtres, attribution, notes internes, étiquettes, priorités, statuts, transferts, notifications, indicateurs ; contacts (CRUD, import CSV/Excel avec détection de doublons, segments, champs personnalisés, historique, consentement, désinscription, liste d'exclusion).
**Critère de sortie :** un agent traite 20 conversations simulées sans rechargement ; import de 5 000 lignes avec rapport d'erreurs ; aucun doublon créé.

### PHASE 11 — Campagnes et automatisations — 15 jh
**Livrables :** création de campagne, segmentation, variables, modèles approuvés, prévisualisation, programmation, file avec débit limité, gestion d'erreurs, suivi et rapports ; constructeur d'automatisations (déclencheurs/conditions/actions/délais), historique d'exécution, reprise après erreur.
**Critère de sortie :** campagne de 1 000 destinataires délivrée avec taux d'échec explicable ; **aucun envoi possible sans consentement enregistré** (test négatif obligatoire) ; automatisation reprenable après incident simulé.

### PHASE 12 — Abonnements et facturation — 8 jh
**Livrables :** plans et prix configurables, entitlements, comptage d'usage, essai, souscription, changement de plan, annulation, factures, historique, échecs de paiement, coupons, quotas, alertes, abstraction PSP + implémentation manuelle et une implémentation réelle.
**Critère de sortie :** un client peut souscrire, être facturé, voir sa facture, changer de plan, annuler ; un dépassement de quota est bloqué ou facturé selon la configuration ; aucun chiffre financier simulé.

### PHASE 13 — Espace administrateur général — 8 jh
**Livrables :** utilisateurs, entreprises, abonnements, tarifs, paiements, quotas, fournisseurs IA, modèles IA, statistiques globales, consommation, incidents, support, suspension, feature flags, pays et langues, journaux d'audit, **flux d'accès exceptionnel contrôlé** aux données clients.
**Critère de sortie :** toute action sensible est journalisée ; un admin ne peut pas lire une conversation hors du flux justifié et ce flux expire ; test négatif du contournement.

### PHASE 14 — Internationalisation — 6 jh
**Livrables :** 8 langues (EN, FR, ES, PT, AR, DE, ZH + 1), chargement à la demande, RTL complet, formats `Intl`, fuseaux, devises, `price_books` par région, sélecteur de langue, détection, extraction automatisée des chaînes, guide « ajouter une langue ».
**Critère de sortie :** aucune chaîne en dur (règle ESLint active) ; rendu arabe vérifié ; changement de langue sans rechargement ; audits de traduction.

### PHASE 15 — Tests complets et audit de sécurité — 10 jh
**Livrables :** pyramide de tests, tests E2E Playwright, tests de charge (k6), revue OWASP Top 10, tests d'isolation, tests d'injection de prompt, audit des dépendances, analyse des secrets, plan de réponse à incident, procédure RGPD (export/suppression), **documents légaux rédigés et soumis à validation juridique**.
**Critère de sortie :** aucun finding critique ouvert ; taux de couverture du domaine ≥ 80 % ; rapport d'audit écrit.

### PHASE 16 — Déploiement et préparation commerciale — 8 jh
**Livrables :** production durcie, sauvegardes automatiques + restauration testée, monitoring et alertes, documentation client, page de statut, parcours d'onboarding, simulateur de coûts WhatsApp, politique de confidentialité/CGU/cookies/DPA, kit commercial (pitch, captures réelles, tarifs), procédure de support.
**Critère de sortie :** un client externe s'inscrit, connecte son numéro et reçoit une réponse IA **sans intervention manuelle** ; incident simulé détecté et traité.

---

## 3. Périmètre du MVP commercialisable (Phases 3→10 + 12)

**Inclus :** inscription/connexion, organisation unique par compte, connexion WhatsApp, assistant IA configurable, boîte de réception, contacts, abonnement avec quotas, landing page, français + anglais.
**Explicitement reporté :** campagnes, automatisations visuelles, back-office complet, 6 langues supplémentaires, MFA avancée, équipes multi-utilisateurs au-delà de 2, intégrations avancées.

**Pourquoi :** c'est le plus petit ensemble qui permet de **facturer**. Tout le reste s'ajoute quand les retours clients réels existent — et non avant.

**Estimation cumulée :** ~70 jh jusqu'au MVP, ~128 jh pour les 16 phases.

---

## 4. Ce dont j'ai besoin de vous à chaque phase

| Phase | Décisions/valeurs attendues de votre part |
|---|---|
| 2 | Validation des décisions D1–D8 (`06`) |
| 3 | Visibilité du dépôt (privé ?), licence |
| 4 | Nom du produit, palette, ton, contenu de marque |
| 5 | Politique d'invitation, taille d'équipe par plan |
| 6 | Région d'hébergement (UE par défaut), durées de conservation |
| 8 | Documents d'entreprise, accès Meta, numéro de test |
| 9 | Fournisseur IA + clé API, seuils de qualité acceptés |
| 12 | Grille tarifaire réelle, PSP, moyens de paiement |
| 15 | Juriste, seuils de risque acceptés |
| 16 | Domaine, marque, canaux de lancement |

---

## 5. Ce que la roadmap ne promet pas

- Elle ne promet **aucun nombre d'utilisateurs, aucun revenu, aucune certification**.
- Elle ne promet pas que l'offre gratuite suffira en production : elle ne suffira pas, c'est chiffré.
- Elle ne garantit pas l'obtention du statut Meta : c'est une décision de Meta.
- Elle estime le travail, pas la réussite commerciale.
