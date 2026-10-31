# PHASE 1.5 — Registre des risques

> Échelle : **P** = probabilité (1–5), **I** = impact (1–5), **Criticité** = P × I.
> Tout risque ≥ 12 est **bloquant** : il doit avoir un plan d'action avant la phase concernée.
> Dernière revue : 31 octobre 2026.

## A. Risques réglementaires et plateforme

| #   | Risque                                                                                                                       | P   | I   | Crit.  | Mitigation                                                                                                                                                                                                              | Phase       |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | --- | --- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| R1  | **Refus / retard du statut Meta Tech Provider** ou de la vérification d'entreprise → aucun client ne peut connecter WhatsApp | 3   | 5   | **15** | Préparer les documents (registre de commerce, adresse, site web, domaine, e-mail pro) **avant** la Phase 8 ; plan B = statut de revendeur via un BSP (marge réduite) ; ne rien promettre publiquement avant l'obtention | 8           |
| R2  | **Changement de politique IA de Meta** (déjà 4 évolutions en 2026) rendant notre usage non conforme                          | 3   | 5   | **15** | Positionnement strict « assistant métier » avec garde-fous techniques ; abstraction fournisseur ; veille contractuelle trimestrielle ; clause de révision dans nos CGU                                                  | 9 / continu |
| R3  | **Hausse des tarifs messages Meta** détruisant l'économie du produit                                                         | 4   | 4   | **16** | Modèle A (le client paie Meta) ; table tarifaire en base versionnée ; simulateur de coût ; alertes                                                                                                                      | 12          |
| R4  | **Suspension d'un WABA client** (spam, plaintes, qualité) et mise en cause de notre plateforme                               | 3   | 4   | 12     | Opt-in vérifié obligatoire, plafonds de débit, blocage des envois à froid, surveillance de la qualité du numéro, suspension préventive de l'expéditeur                                                                  | 11          |
| R5  | **Contentieux sur la marque** : nom du produit incluant « WhatsApp »                                                         | 4   | 3   | 12     | Nom neutre, configurable ; mention « compatible avec WhatsApp Business Platform » uniquement en descriptif ; recherche d'antériorité avant Phase 4                                                                      | 4           |
| R6  | **Non-conformité RGPD / absence de documents légaux** (CGU, confidentialité, DPA)                                            | 4   | 4   | **16** | Rédiger les documents en Phase 15 et les faire **valider par un juriste** ; registre des traitements ; procédure de droits ; pas de revendication de certification                                                      | 15          |

## B. Risques techniques

| #   | Risque                                                                                      | P   | I   | Crit.  | Mitigation                                                                                                                                                    | Phase |
| --- | ------------------------------------------------------------------------------------------- | --- | --- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| R7  | **Fuite inter-tenant** (l'assistant ou l'API d'une entreprise voit les données d'une autre) | 3   | 5   | **15** | RLS + `TenantContext` typé + **suite de tests d'isolation en CI** (croisement systématique de 2 tenants sur chaque endpoint/table) ; revue de sécurité dédiée | 6, 15 |
| R8  | **Fuite de token WABA** → messages envoyés au nom du client                                 | 2   | 5   | 10     | Chiffrement enveloppe AES-GCM, secrets Workers, jamais dans le bundle frontend, rotation, journal d'accès, révocation immédiate                               | 8     |
| R9  | **Injection de prompt** via message client ou document de connaissance                      | 4   | 3   | 12     | Traitement des contenus comme données, délimiteurs, filtrage de motifs, pas de tool-calling libre, tests adversariaux, journalisation des blocages            | 9     |
| R10 | **Hallucinations** (prix/délais inventés) → perte commerciale du client                     | 4   | 3   | 12     | RAG obligatoire, refus en cas d'absence d'info, température basse, jeu d'évaluation, transfert humain                                                         | 9     |
| R11 | **Perte de données** : Supabase gratuit sans sauvegarde + pause à 7 jours                   | 3   | 5   | **15** | Passage en Pro au 1er client **ou** dump quotidien chiffré vers R2 + test de restauration mensuel documenté                                                   | 6, 16 |
| R12 | **Limite 10 ms CPU** des Workers gratuits (crypto, HMAC, gros JSON)                         | 3   | 3   | 9      | Mesurer ; Workers Paid (30 s) dès P1 ; découpage des traitements lourds en jobs                                                                               | 7     |
| R13 | **Webhooks Meta non idempotents / perdus** → messages dupliqués ou manquants                | 3   | 4   | 12     | `unique(meta_event_id)`, réponse 200 immédiat, queue + cron de reprise, réconciliation périodique                                                             | 8     |
| R14 | **Boucles IA** (deux bots se répondent, réponses infinies)                                  | 3   | 4   | 12     | Limite de tours consécutifs, anti-répétition, coupure + transfert humain, plafond de coût par conversation                                                    | 9     |
| R15 | **Dérive des coûts IA** (un tenant épuise le budget du fournisseur)                         | 3   | 4   | 12     | Quotas par tenant, plafond quotidien, `hard limit` par défaut, alerte admin                                                                                   | 9, 13 |
| R16 | **Fuite de secret dans le dépôt** (repo public)                                             | 3   | 5   | **15** | Repo privé dès Phase 5, `.gitignore` dès Phase 3, `gitleaks` en CI, `.env.example` sans valeur, rotation immédiate si incident                                | 3     |
| R17 | **Indisponibilité Meta** (panne API)                                                        | 3   | 3   | 9      | File d'attente persistante, retries, écran d'état, reprise automatique, communication client                                                                  | 7, 8  |
| R18 | **Dépendance à un seul fournisseur IA**                                                     | 3   | 3   | 9      | Interface `AiProvider` + 2e implémentation testée dès la Phase 9                                                                                              | 9     |

## C. Risques projet et commerciaux

| #   | Risque                                                                                                | P   | I   | Crit.  | Mitigation                                                                                                                                      |
| --- | ----------------------------------------------------------------------------------------------------- | --- | --- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| R19 | **Sur-construction** : 16 phases avant le premier euro                                                | 4   | 4   | **16** | Découper un **MVP commercialisable** (Phases 3–10 + 12 minimal) ; tout le reste après le 1er client payant. Voir `05-roadmap.md`                |
| R20 | **Solo founder / bus factor 1**                                                                       | 4   | 4   | **16** | Documentation systématique (ce dépôt), CI qui protège, secrets sauvegardés en coffre, pas de dépendance à un poste unique                       |
| R21 | **Absence de prestataire de paiement adapté au Niger**                                                | 3   | 4   | 12     | Facturation manuelle au démarrage ; MoR (Paddle) pour l'international ; CinetPay/Flutterwave pour la zone XOF ; abstraction `BillingProvider`   |
| R22 | **Prix inadapté au marché local**                                                                     | 3   | 3   | 9      | `price_books` par devise ; test de 2 grilles ; prix en XOF ancré sur la valeur (commandes sauvées), pas sur le coût                             |
| R23 | **Support submergé** au premier succès                                                                | 3   | 3   | 9      | Documentation client, réponses types, limitations du plan Starter, support asynchrone assumé                                                    |
| R24 | **Pause Supabase pendant une période d'inactivité** (démos, vacances)                                 | 4   | 3   | 12     | Cron de « ping » applicatif + passage en Pro avant toute promesse commerciale                                                                   |
| R25 | **Promesse commerciale non tenable** (afficher des chiffres, témoignages, certifications inexistants) | 3   | 5   | **15** | Règle absolue : aucune donnée inventée. Témoignages uniquement réels et autorisés, chiffres uniquement mesurés, aucune mention de certification |

## D. Risques juridiques et financiers

| #   | Risque                                                                     | P   | I   | Crit. | Mitigation                                                                                                                             |
| --- | -------------------------------------------------------------------------- | --- | --- | ----- | -------------------------------------------------------------------------------------------------------------------------------------- |
| R26 | **Nous sommes sous-traitant de données de santé/finance** sans encadrement | 2   | 5   | 10    | Politique de verticales interdites (santé, finance sensible, jeux d'argent, contenu adulte) appliquée **dans le code** et dans les CGU |
| R27 | **TVA / fiscalité internationale** mal traitée                             | 3   | 4   | 12    | MoR (Paddle) pour l'international ; comptable local pour la structure ; factures conformes                                             |
| R28 | **Litige avec un client sur une campagne non consentie**                   | 3   | 4   | 12    | Preuve d'opt-in horodatée et exportable ; blocage technique sans consentement ; journal d'audit                                        |

## E. Top 6 des risques à traiter en priorité

1. **R19 — sur-construction** : c'est le risque qui tue le plus de projets SaaS. → MVP commercialisable défini dans la roadmap.
2. **R3 + R1 — modèle économique et accès Meta** : à trancher **avant** la Phase 12 et à préparer dès la Phase 8.
3. **R7 — isolation inter-tenant** : un seul incident détruit la crédibilité. → tests automatisés, pas de bonne intention.
4. **R16 + R11 — secrets et sauvegardes** : irréversibles quand ils arrivent.
5. **R2 — politique IA** : à surveiller en continu, à intégrer dans les CGU.
6. **R6 — documents légaux** : bloquants pour vendre, à lancer tôt (rédaction dès la Phase 15, validation externe).
