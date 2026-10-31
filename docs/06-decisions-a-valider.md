# PHASE 1.10 — Décisions techniques à valider

> Chaque décision suit le format ADR allégé : **Contexte → Options → Recommandation → Conséquence si on se trompe**.
> Répondez par `D1=A`, `D2=B`… ou en texte libre. Tant qu'une décision n'est pas tranchée, la phase correspondante ne démarre pas.
> 🔴 = décision **bloquante** avant la phase indiquée.
>
> ## ✅ Décisions validées le 31 octobre 2026
> | Réf. | Décision retenue | Conséquence appliquée |
> |---|---|---|
> | **D1** | **A — le client paie Meta directement** | ADR-006, `wa_rate_cards` + simulateur de coût, aucune refacturation de messages |
> | **D3** | **A — facturation manuelle puis Paddle + CinetPay** | ADR-009, interface `BillingProvider`, prix en base |
> | **D4** | **A — Afrique de l'Ouest francophone en priorité** | FR par défaut, `price_book` XOF, `Africa/Niamey` par défaut, `region='africa_west'` |
> | — | **Phase 2 démarrée** | `07-modele-donnees.md`, `08-api-openapi.yaml`, `09-adr.md` |
>
> Restent à trancher : **D2** (recommandation A retenue par défaut, à confirmer), D5 à D14.

---

## D1 ✅ — Qui paie les frais de messages WhatsApp ? *(validée : A)*

**Contexte :** depuis le 1er octobre 2026, les messages de service (les réponses de l'IA) sont facturés. 3 000 réponses/mois = 12 USD (Afrique de l'Ouest) ou 165 USD (Allemagne).
**Options :**
- **A.** Le client rattache sa carte à **son** WABA et paie Meta directement. *(recommandé)*
- B. La plateforme paie Meta et refacture (exige plafonds durs + statut de revendeur).
- C. Hybride : A par défaut, B sur Enterprise avec acompte.

**Recommandation : A.** → Marge SaaS ~94 %, pas de float, pas de risque pays. **Conséquence de B :** un seul client européen peut rendre un compte déficitaire. Bloque la Phase 12.

---

## D2 🔴 — Topologie multi-tenant

**Options :** **A.** Base unique + `tenant_id` + RLS *(recommandé)* — B. Schéma par tenant — C. Base par tenant.
**Recommandation : A**, avec 4 couches d'isolation (JWT, RLS, contexte typé, tests d'isolation en CI). Bloque la Phase 6.
**Conséquence de C :** coût × N, impossible sur l'offre gratuite, sauvegardes ingérables.

---

## D3 ✅ — Prestataire de paiement au lancement *(validée : A)*

**Contexte :** Stripe ne couvre pas le Niger ; Paystack non plus. Paddle/Lemon Squeezy (Merchant of Record) traitent la TVA mais exigent un KYC.
**Options :**
- **A.** **Facturation manuelle** (virement/mobile money) jusqu'à 10 clients, puis Paddle (international) + CinetPay/Flutterwave (zone XOF). *(recommandé)*
- B. Paddle dès le premier client.
- C. Créer une entité US/UE (Stripe Atlas) pour utiliser Stripe.
**Recommandation : A**, derrière une abstraction `BillingProvider`. Bloque la Phase 12.
**Conséquence de C :** coût de structure et obligations fiscales dans un pays où vous ne résidez pas.

---

## D4 ✅ — Marché de lancement *(validée : A)*

**Options :** **A.** Afrique de l'Ouest francophone (Niger, Sénégal, Côte d'Ivoire, Mali, Burkina, Bénin, Togo) — B. Europe francophone (France, Belgique, Suisse) — C. MENA francophone/arabophone — D. Les trois, avec la même grille.
**Recommandation : A** (WhatsApp y est le canal principal, concurrence moins mature, votre réseau local), avec B en second via la diaspora. **Conséquence :** détermine les langues prioritaires (FR + EN), la devise de la landing page et le discours commercial.

---

## D5 — Fournisseur IA par défaut

**Options :** **A.** Gemini Flash (tier **payant** Tier 1) + abstraction multi-fournisseurs *(recommandé)* — B. Gemini tier **gratuit** — C. Autre fournisseur en premier.
**Recommandation : A.** Le tier gratuit ne peut pas traiter des données clients d'un service commercial. **Coût : ~2–5 USD/mois au démarrage.** Bloque la Phase 9.

---

## D6 — Accès base de données depuis le Worker

**Options :** **A.** `postgres.js` (connexion TCP directe) *(recommandé au lancement)* — B. Hyperdrive (100 k requêtes/jour en gratuit, insuffisant en prod) — C. PostgREST/Supabase JS.
**Recommandation : A**, Hyperdrive en P1. Bloque la Phase 7.

---

## D7 — Temps réel de la boîte de réception

**Options :** **A.** SSE depuis le Worker *(recommandé)* — B. Supabase Realtime (200 connexions simultanées en gratuit) — C. Polling TanStack Query (5 s) au démarrage.
**Recommandation : A**, avec repli C. Bloque la Phase 10.

---

## D8 — ORM / accès SQL

**Options :** **A.** Kysely (SQL typé, compatible Workers) *(recommandé)* — B. Prisma — C. SQL brut + types générés.
**Recommandation : A.** Prisma impose un moteur binaire mal adapté à Workers.

---

## D9 — Périmètre du MVP

**Options :** **A.** MVP = Phases 3-10 + 12 (facturer tôt) *(recommandé)* — B. Les 16 phases avant toute commercialisation.
**Recommandation : A.** **Conséquence de B :** ~6 mois sans revenu et sans retour client réel.

---

## D10 — Nom, marque et domaine

**Contraintes :** le nom doit être **configurable**, **ne doit pas contenir « WhatsApp »** (Brand Guidelines Meta), doit être disponible en `.com` ou `.io`.
**Recommandation :** choisir un nom neutre (ex. pistes à évaluer : *Voxa*, *Replya*, *Kadea*, *Sendia* — **à vérifier juridiquement et en disponibilité de domaine**, aucun n'est validé ici), et garder `WHATSAPP_*` uniquement dans le code technique. Bloque la Phase 4.

---

## D11 — Politique de conservation des données

**Options :** **A.** Messages 12 mois, journaux 6 mois, sauvegardes 30 jours, suppression sur demande *(recommandé)* — B. Conservation illimitée — C. 90 jours.
**Recommandation : A**, configurable par plan Enterprise. Impacte Phase 6 et la conformité.

---

## D12 — Région d'hébergement

**Options :** **A.** UE (Francfort/Paris) par défaut *(recommandé : RGPD + proximité Afrique de l'Ouest ~60–80 ms)* — B. Afrique du Sud — C. Multi-région dès le départ.
**Recommandation : A.** C'est un coût et une complexité inutiles au lancement.

---

## D13 — Visibilité du dépôt

**Recommandation :** passer le dépôt en **privé** avant la Phase 5 ; licence propriétaire ; `main` protégée. *(Aucune conséquence technique, forte conséquence sur la confidentialité.)*

---

## D14 — Verticales interdites

**Recommandation :** interdire dès le premier jour (dans le code, pas seulement dans les CGU) : contenus adultes, jeux d'argent, crypto-investissement, tabac/vape, armes, médicaments sur ordonnance, conseils médicaux/juridiques/financiers personnalisés, crédit à taux élevé.

---

## Ce que je ne déciderai pas à votre place

1. **Votre entité juridique** et votre pays de rattachement (impacte paiements, TVA, RGPD).
2. **Votre budget réel** en temps : combien d'heures par semaine pouvez-vous consacrer au projet ? Cela détermine si la roadmap de 33 semaines est réaliste ou doit être découpée en MVP plus réduit.
3. **Votre capacité commerciale** : avez-vous déjà des prospects identifiés ? Un premier client « design partner » accélère tout et valide le produit mieux que 16 phases.
4. **Le nom et l'identité** : je peux proposer, pas trancher.
