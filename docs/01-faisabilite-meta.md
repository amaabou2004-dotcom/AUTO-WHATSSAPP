# PHASE 1.3–1.4 — Étude de faisabilité technique et réglementaire (WhatsApp / Meta / IA)

> **Date de relevé :** 31 octobre 2026.
> **Statut des chiffres :** relevés par recherche documentaire publique à la date ci-dessus. **Ils ne sont pas contractuels.** Meta et Google modifient leurs tarifs et conditions plusieurs fois par an. Chaque chiffre porte sa source ; les points marqués 🔴 **DOIVENT être re-vérifiés sur la page officielle** avant signature d'un contrat client ou fixation définitive d'un prix.
> **Règle :** aucune affirmation de conformité n'est faite ici. La conformité dépend de votre entité, de votre usage et de vos contrats, pas d'une intention.

---

## 1. Verdict de faisabilité

| Question                                                                                                                    | Réponse                                                                       | Condition                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Peut-on construire un SaaS multi-tenant qui connecte les comptes WhatsApp Business **de ses clients** aux API officielles ? | ✅ **Oui**                                                                    | Passer par **WhatsApp Cloud API + Meta Embedded Signup**, avec le statut **Tech Provider** |
| Peut-on faire répondre une **IA** aux clients finaux d'une entreprise sur WhatsApp ?                                        | ✅ **Oui**, si l'IA est **au service d'une tâche métier de cette entreprise** | Interdiction d'offrir un assistant **généraliste** ; voir §3.1                             |
| Peut-on vendre ce SaaS depuis le Niger ?                                                                                    | ⚠️ **Oui techniquement**, mais **non** avec Stripe/Paddle en direct           | Voir §5 et `04-budget-modele-economique.md`                                                |
| Peut-on garantir une marge confortable sur les messages ?                                                                   | ⚠️ **Dépend entièrement du modèle de facturation Meta retenu**                | Voir §2.3 — c'est **la** décision économique n°1                                           |
| Peut-on démarrer avec un budget quasi nul ?                                                                                 | ✅ **Oui**, avec 2 exceptions assumées                                        | (a) clé IA payante « à l'usage » (quelques USD/mois), (b) nom de domaine. Voir `04`        |

**Conclusion :** le projet est **faisable**, mais son risque principal n'est **pas technique**. Il est **réglementaire et économique** : (1) le périmètre autorisé de l'IA sur WhatsApp est restreint, (2) depuis le 1er octobre 2026 Meta facture aussi les messages de service, ce qui transforme chaque réponse de l'IA en **coût variable**. Une architecture qui ignore ces deux points est vouée à l'échec commercial, quelle que soit sa qualité logicielle.

---

## 2. Mécanique d'accès WhatsApp Business Platform

### 2.1 Les quatre chemins possibles

| Voie                                            | Description                                                                                          | Recommandation                                                                                                            |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Cloud API en direct + Embedded Signup**       | Chaque client connecte son propre WABA via la fenêtre Meta ; la plateforme obtient un token par WABA | ✅ **Retenu.** Officiel, sans intermédiaire, coût 0 côté Meta                                                             |
| On-Premises API                                 | Héritage, déprécié par Meta                                                                          | ❌ Exclu                                                                                                                  |
| BSP (Business Solution Provider) revendeur      | Twilio, 360dialog, Gupshup…                                                                          | ❌ Exclu : marge intermédiaire, dépendance, tarifs à l'usage. **Option de secours** si le statut Tech Provider est refusé |
| API non officielles (Baileys, whatsapp-web.js…) | Automatisation de WhatsApp Web                                                                       | ❌ **Interdit sans exception** — bannissement du numéro du client, violation des règles, risque juridique                 |

### 2.2 Ce que le statut « Tech Provider » impose

D'après les conditions de la plateforme (relevé oct. 2026) :

1. **Application Meta** + **Business Portfolio vérifié** (documents d'entreprise : registre de commerce, justificatif d'adresse, site web).
2. **Accès avancé** aux permissions `whatsapp_business_messaging` et `whatsapp_business_management` (revue d'application).
3. **Embedded Signup** configuré (ID de configuration, `FB.login` côté client, échange du `code` contre un token côté serveur).
4. **Webhook** HTTPS public, vérifié par `hub.challenge` + signature `X-Hub-Signature-256` (HMAC-SHA256 avec l'App Secret).
5. **Conditions** : WhatsApp Business Solution Terms, Business Messaging Policy, Meta Platform Terms, **Brand Guidelines**, et **Data Processing Terms** entre vous et vos clients (vous êtes sous-traitant de leurs données).
6. **Interdiction de revendre l'accès** sans accord ; obligations de transparence sur les tarifs.
7. **Modèles de messages** : soumis à approbation Meta, catégorisés (marketing / utility / authentication). Toute campagne doit s'appuyer sur un modèle **approuvé** + **opt-in** du destinataire.

**Conséquences d'architecture (déjà intégrées au plan) :**

- Token **par WABA**, chiffré au repos, avec rotation et révocation (webhook `account_update`).
- Un **numéro = un WABA = un tenant** dans notre base, avec contrainte d'unicité globale (un numéro ne peut pas être connecté à deux tenants).
- Le webhook doit être **idempotent** (Meta réessaie), **rapide** (< 5 s) et **asynchrone** (accusé immédiat, traitement en file).
- Le système doit gérer les **limits de messagerie** par portfolio (250 → 1 000 → 10 000 → 100 000 → illimité de destinataires uniques / 24 h) et la **note de qualité** du numéro.
- Fonctionnalité obligatoire : **tableau de bord des connexions** avec état du token, date d'expiration, qualité, limites, bouton de déconnexion.

### 2.3 🔴 Économie des messages — le point le plus dangereux du projet

**Ce qui a changé :**

- Depuis le **1er juillet 2025**, la facturation Meta est **par message livré** (et non plus par conversation de 24 h).
- Depuis le **1er **octobre 2026**, les **messages de service** (réponses libres dans la fenêtre de 24 h, c'est-à-dire **exactement ce que produit une IA qui répond**) sont facturés au tarif _utility_ du pays du destinataire, au-delà d'un quota gratuit mensuel par numéro (les sources publiques divergent : **1 000 messages de service gratuits / numéro / mois** selon plusieurs analyses d'octobre 2026, d'autres annoncent la fin de l'allocation gratuite. 🔴 **À vérifier sur la page tarifaire officielle Meta avant tout pricing.**).

**Tarifs unitaires relevés (rate card du 1er octobre 2026, USD, par message livré) :**

| Marché du destinataire                                                                      | Marketing                    | Utility / Service | Pertinence pour nous                    |
| ------------------------------------------------------------------------------------------- | ---------------------------- | ----------------- | --------------------------------------- |
| Afrique de l'Ouest francophone (Niger, Mali, Burkina, Sénégal, Côte d'Ivoire, Bénin, Togo…) | _« Rest of Africa »_ ~0,0225 | ~0,0040           | 🎯 Cœur de cible initiale               |
| Nigéria                                                                                     | 0,0516                       | 0,0067            | Marché volume                           |
| Maroc                                                                                       | 0,0414                       | 0,0230            | Cible MENA                              |
| France                                                                                      | 0,0859                       | 0,0300            | Cible diaspora / PME UE                 |
| Espagne                                                                                     | 0,0707                       | 0,0200            | Cible UE                                |
| Allemagne                                                                                   | 0,1365                       | 0,0550            | ⚠️ Coût unitaire le plus élevé d'Europe |
| Émirats arabes unis                                                                         | 0,0576                       | 0,0157            | Cible Golfe                             |
| Brésil                                                                                      | 0,0625                       | 0,0068            | Cible LATAM                             |
| Inde                                                                                        | 0,0118                       | 0,0014            | Volume maximal                          |
| États-Unis / Canada                                                                         | 0,0250                       | 0,0034            | Référence                               |
| Mexique                                                                                     | 0,0397                       | 0,0085            | LATAM                                   |

> Sources : pages tarifaires Meta et analyses publiques datées d'octobre 2026 (dragapp.com/blog/whatsapp-business-api-pricing, unipile.com/whatsapp-business-api-pricing, whatsapppilot.esafqa.com). **Les prix officiels font foi.** Le code produit devra stocker la table tarifaire **en base de données, versionnée par date d'effet**, et jamais en dur.

**Exemple de calcul qui doit vous alerter** — un client « Pro » dont les clients finaux sont en **Allemagne** :

```
3 000 réponses IA / mois  ×  0,0550 USD  =  165 USD de coût Meta pour un abonnement à 49 €
```

→ **marge négative**. Alors qu'un client dont les clients finaux sont au **Niger** :

```
3 000 réponses IA / mois  ×  0,0040 USD  =  12 USD  →  marge confortable
```

**Trois modèles possibles — décision D1, à valider (voir `07`)** :

| Modèle                                                                     | Qui paie Meta | Avantages                                                                                                 | Inconvénients                                                                                                                                  |
| -------------------------------------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Le client paie Meta directement** (sa carte est rattachée à son WABA) | Le client     | Marge SaaS ≈ 90–98 %, pas de trésorerie avancée, pas de TVA sur les messages, **modèle standard des BSP** | Le client doit ajouter un moyen de paiement chez Meta (friction d'onboarding)                                                                  |
| B. La plateforme paie Meta (facturation centralisée)                       | Nous          | Expérience fluide, un seul prélèvement                                                                    | Coût variable non plafonné, float, risque de défaut client, TVA/export, **exige un statut de revendeur** ; un client allemand peut nous ruiner |
| C. Hybride : A par défaut + B sur plan Enterprise avec acompte             | Mixte         | Flexibilité                                                                                               | Complexité comptable                                                                                                                           |

✅ **Recommandation CTO : modèle A au lancement**, modèle C plus tard. Le produit doit _mesurer_ et _afficher_ le coût Meta estimé par tenant (transparence = argument de vente) mais **ne pas le porter**.

---

## 3. Faisabilité de la couche IA

### 3.1 🔴 Périmètre autorisé — la clause « AI Providers »

Les _WhatsApp Business Solution Terms_ (section « Providers and developers of AI ») interdisent d'utiliser la plateforme quand l'IA est la **fonctionnalité principale** (« primary rather than incidental or ancillary ») offerte à l'utilisateur. Entrée en vigueur : **15 janvier 2026** pour les utilisateurs existants. Interprétation officielle de Meta et revue de presse concordante : les **entreprises qui utilisent l'IA pour servir leurs propres clients ne sont pas visées** ; ce sont les fournisseurs d'assistants **généralistes** (ChatGPT, Copilot, Perplexity) qui sont exclus.

**Traduction en règles produit non négociables :**

| Interdit                                                                   | Autorisé (notre produit)                                                                                                             |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| « Posez n'importe quelle question à notre IA »                             | L'assistant répond **uniquement** sur le catalogue, les services, les horaires, les commandes, les rendez-vous de **son** entreprise |
| Génération de contenu créatif, résumés de PDF, culture générale, rôle-play | Qualification de prospects, support, prise de rendez-vous, suivi de commande, FAQ                                                    |
| Utilisation de WhatsApp comme canal de distribution d'un LLM               | WhatsApp comme canal de **service client** de l'entreprise                                                                           |
| Recyclage des conversations pour entraîner/améliorer un modèle             | Mémoire conversationnelle courte + base de connaissances **par tenant**; aucun entraînement partagé                                  |

**Mesures d'implémentation obligatoires (Phase 9) :**

1. **Garde-fou de périmètre** : system prompt + classifieur de requête → si la demande sort du domaine de l'entreprise, réponse de repli + proposition de transfert humain. Refus explicite et journalisé.
2. **Divulgation IA** : mention claire que le correspondant est un assistant automatisé (exigence d'honnêteté + AI Act UE art. 50 pour la transparence), avec accès humain à tout moment.
3. **Interdiction contractuelle** dans nos CGU de configurer l'assistant comme généraliste (nous fournissons des garde-fous techniques, pas seulement une clause).
4. **Pas d'entraînement** sur les données WhatsApp (nous n'entraînons rien ; si un jour fine-tuning, il serait strictement pour l'usage exclusif du tenant, seule exception prévue par les conditions).
5. **Journalisation** des décisions de garde-fou (audit + preuve de conformité en cas de contrôle Meta).

> 🔴 **Point de vigilance contractuel** : la rédaction exacte de cette clause a évolué plusieurs fois en 2026 (réintroduction des assistants généralistes contre paiement aux États-Unis/UE, mesures provisoires de la Commission européenne, exemptions Italie/Brésil). **Toute évolution doit être relue avant chaque mise en production majeure.** Un produit positionné « assistant métier » est en zone sûre quel que soit le régime.

### 3.2 Choix du fournisseur IA

Exigence du cahier des charges : **couche d'abstraction multi-fournisseurs**, Gemini en premier. Concrètement : une interface `AiProvider` (`complete`, `stream`, `embed`, `countTokens`, `estimateCost`) avec implémentations interchangeables, sélectionnées **par tenant** (et par tâche : classifieur bon marché ≠ rédaction).

| Fournisseur                                                                                             | Rôle prévu                               | Coût                             | Remarque                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------- | ---------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Google Gemini** (Flash / Flash-Lite)                                                                  | Défaut : rédaction + classification      | Payant à l'usage, tarifs faibles | 🔴 Le **tier gratuit** implique que les données peuvent servir à améliorer les produits Google → **inutilisable pour des données clients d'un SaaS commercial**. Utiliser le **tier payant (Tier 1, sans engagement minimum)** |
| Autre fournisseur compatible (ex. Groq, Mistral, OpenRouter, modèle open-weight auto-hébergé plus tard) | Repli / optimisation coût / souveraineté | Variable                         | À brancher derrière la même interface, sans changer le métier                                                                                                                                                                  |
| Embeddings                                                                                              | Base de connaissances (RAG)              | Faible                           | `pgvector` côté Supabase                                                                                                                                                                                                       |

**Pourquoi l'abstraction n'est pas un luxe :** (a) un fournisseur peut changer de conditions ou fermer un accès du jour au lendemain (cf. §3.1) ; (b) les coûts par pays rendent la mixité rentable ; (c) certains clients exigeront une résidence de données ou un fournisseur précis.

### 3.3 Limites et quotas gratuits IA (à titre indicatif, 🔴 à vérifier dans la console)

Relevés d'octobre 2026, **variables selon le modèle et la région** : Gemini Flash ≈ 1 500 requêtes/jour et 10–15 req/min en tier gratuit ; Gemini Pro ≈ 50–100 req/jour. **Ces quotas ne suffisent pas** pour un SaaS : 1 500 req/jour = ~50 conversations actives/jour. Et surtout, le tier gratuit interdit l'usage commercial avec données clients (voir ci-dessus). Conclusion : **budget IA dès le premier client**, mais de l'ordre de 5–30 USD/mois tant que le volume est faible.

---

## 4. Faisabilité réglementaire — mise en garde honnête

Je ne suis pas juriste et aucun document de ce dépôt ne constitue un avis juridique. Ce qui suit est une **liste de travail** à faire valider.

| Sujet                                               | Applicable si…                                                                                      | Exigence minimale                                                                                                                                             | Statut                               |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **RGPD**                                            | vous traitez les données de personnes dans l'UE (clients finaux d'un client européen, ou vous-même) | base légale, registre des traitements, DPA sous-traitant, droits d'accès/effacement, durée de conservation, transferts hors UE (clauses contractuelles types) | à produire                           |
| **Lois nationales** (Niger, et pays de vos clients) | toujours                                                                                            | consentement, protection des données, e-commerce, facturation locale                                                                                          | à étudier par marché                 |
| **AI Act (UE)**                                     | utilisateurs dans l'UE                                                                              | transparence (indiquer qu'on parle à une IA), information sur les limites ; nos usages sont a priori **à risque limité**, pas à haut risque                   | à documenter                         |
| **ePrivacy / cookies**                              | site marketing destiné à l'UE                                                                       | bandeau de consentement réel, pas décoratif                                                                                                                   | à implémenter                        |
| **CGU / CGV / politique de confidentialité / DPA**  | toujours                                                                                            | documents rédigés et **validés juridiquement**                                                                                                                | à produire — **bloquant commercial** |
| **Facturation / TVA**                               | ventes B2C/B2B internationales                                                                      | TVA UE via MoR ou autoliquidation B2B, mentions légales                                                                                                       | dépend du choix de prestataire (§5)  |
| **Meta**                                            | toujours                                                                                            | Business Solution Terms, Messaging Policy, Brand Guidelines, opt-in, modèles approuvés                                                                        | continu                              |

**Interdits produits explicites** (à refléter dans le code, pas seulement dans les CGU) : pas de scraping/import de contacts non consentis, pas de contournement des limites Meta, pas de contenu interdit (santé, finance sensible, jeux d'argent, contenus adultes…), pas de messagerie de masse à froid.

**Ne jamais afficher** : « certifié RGPD », « ISO 27001 », « partenaire officiel Meta » tant que le statut n'est pas réellement obtenu.

---

## 5. Faisabilité des paiements depuis le Niger (résumé — détail dans `04`)

| Prestataire                                    | Modèle                                                     | Disponibilité pour une entité au Niger                                                                            | Verdict                                                                                |
| ---------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Stripe**                                     | PSP                                                        | ❌ Niger non supporté (Afrique : Afrique du Sud uniquement en direct)                                             | ❌ sauf création d'une entité US/UE (Stripe Atlas/Doola) — coût + obligations fiscales |
| **Paddle**                                     | Merchant of Record (Paddle est le vendeur légal, gère TVA) | ✅ Accepte des vendeurs de nombreux pays ; **à vérifier au cas par cas** (validation KYC, acceptation du produit) | ✅ **Option recommandée pour vendre mondialement sans entité UE/US**                   |
| **Lemon Squeezy** (racheté par Stripe en 2024) | MoR                                                        | ✅ même logique                                                                                                   | ✅ alternative                                                                         |
| **Paystack**                                   | PSP                                                        | ❌ (NG, GH, ZA, KE)                                                                                               | ❌ Niger                                                                               |
| **Flutterwave**                                | PSP                                                        | ✅ présence panafricaine, **inclut le Niger** (à confirmer au KYC)                                                | ✅ pour les clients africains                                                          |
| **CinetPay**                                   | PSP                                                        | ✅ couvre le Niger et 15+ pays francophones, mobile money                                                         | ✅ pour l'Afrique de l'Ouest francophone                                               |
| **Virement / facture manuelle**                | —                                                          | ✅                                                                                                                | ✅ **au démarrage (1–10 clients)**                                                     |

**Recommandation :** abstraction de facturation (`BillingProvider`) + **facturation manuelle au lancement** (aucun coût, aucun risque), puis **Paddle (MoR)** pour l'international et **CinetPay/Flutterwave** pour l'Afrique de l'Ouest. ❌ Ne jamais construire le produit autour d'un seul PSP.

---

## 6. Risques propres à Meta — liste courte (détail dans `05`)

1. **Refus ou retard du statut Tech Provider** / de la vérification d'entreprise → pas de clients. _Mitigation : préparer les documents tôt ; plan B = revendeur BSP, moins margé._
2. **Changement de politique IA** (déjà arrivé 4 fois en 2026) → réécriture du périmètre. _Mitigation : positionnement « assistant métier », abstraction fournisseur, veille contractuelle._
3. **Hausse des tarifs messages** → économie du produit détruite. _Mitigation : modèle A (le client paie Meta), table tarifaire en base, alertes de coût._
4. **Suspension d'un WABA client** (qualité, plaintes, spam) → il nous rend responsables. _Mitigation : garde-fous de campagne, opt-in vérifié, plafonds de débit, sensibilisation._
5. **Fuite de token WABA** → envoi de messages au nom du client. _Mitigation : chiffrement enveloppe (AES-GCM + clé en secret Worker), rotation, jamais dans le frontend, journalisation des accès._
