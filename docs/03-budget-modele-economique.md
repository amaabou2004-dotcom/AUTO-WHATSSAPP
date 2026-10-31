# PHASE 1.6–1.7–1.8 — Services gratuits, budget prévisionnel, modèle économique

> **Relevés du 31 octobre 2026.** Les offres gratuites changent sans préavis. Chaque limite ci-dessous porte sa source et doit être re-vérifiée avant de s'engager sur un client. **Aucun service gratuit n'est illimité** et aucun n'est garanti dans le temps.
> **Devise de référence : USD.** Conversion indicative : 1 USD ≈ 600 XOF (à actualiser, le taux du franc CFA est fixe vis-à-vis de l'euro : 1 EUR = 655,957 XOF).

---

## 1. Ce qui est réellement gratuit (et ses limites)

### 1.1 Hébergement et exécution

| Service | Offre gratuite (relevé oct. 2026) | Limite qui mordra en premier | Risque de suspension / coupure |
|---|---|---|---|
| **Cloudflare Workers** | 100 000 requêtes/jour, 10 ms CPU/invocation, 5 Cron Triggers/compte, 100 Workers | **10 ms de CPU** → attention aux opérations crypto lourdes ; 100 k req/jour ≈ ~1 req/s en moyenne | Faible (dépassement = erreurs, pas de suspension) |
| **Cloudflare Pages** | Statique illimité en pratique, builds | — | Faible |
| **Cloudflare Queues** | 10 000 opérations/jour, rétention 24 h | **10 k/jour** ≈ quelques centaines de messages WhatsApp/jour | Faible |
| **Cloudflare Durable Objects** | 100 k requêtes/jour, 13 000 GB-s/jour, backend SQLite uniquement | Utile pour rate-limit et SSE à l'échelle | Faible |
| **Cloudflare KV** | 1 Go, 100 k lectures/jour, **1 000 écritures/jour** | Les 1 000 écritures/jour interdisent d'y stocker du comptage temps réel | Faible |
| **Cloudflare R2** | 10 Go stockés, 1 M opérations classe A, 10 M classe B/mois | Sauvegardes et pièces jointes | Faible |
| **Cloudflare Hyperdrive** | 100 000 requêtes base/jour (offre gratuite) | **Trop bas pour la production** → bascule en P1 | Faible |

### 1.2 Base de données et authentification

| Service | Offre gratuite (relevé oct. 2026) | Limite qui mordra en premier | Risque |
|---|---|---|---|
| **Supabase (Free)** | 500 Mo de base, 1 Go de stockage fichiers, 5 Go d'egress, **50 000 MAU**, 2 projets actifs, 500 k invocations Edge Functions, 200 connexions Realtime simultanées, 2 M messages Realtime/mois | **500 Mo** (une base de messages WhatsApp se remplit vite) ; **aucune sauvegarde automatique** ; **mise en pause après 7 jours d'inactivité** | ⚠️ **Élevé** : pause = service hors ligne jusqu'à réactivation manuelle ; perte de données possible sans sauvegardes propres |
| **GitHub** | Dépôt privé, Actions 2 000 min/mois (privé), Pages | Minutes CI | Faible |

> 🔴 **Décision à prendre tôt :** l'offre Supabase gratuite **n'est pas acceptable en production payante** à cause de la pause après 7 jours et de l'absence de sauvegardes. Deux options : (a) passer en Pro (25 USD/mois) dès le premier client payant ; (b) rester en gratuit avec un **dump quotidien vers R2** (script CI) assumé comme rustine, et accepter le risque de pause. Recommandation : **facturer avant de servir**, et passer en Pro au premier euro encaissé.

### 1.3 Intelligence artificielle

| Fournisseur | Offre gratuite | Verdict pour un SaaS commercial |
|---|---|---|
| **Google Gemini (tier gratuit)** | ~1 500 requêtes/jour sur Flash, 10–30 req/min selon modèle (🔴 variable) | ❌ **Non** : les données du tier gratuit peuvent servir à améliorer les produits Google → incompatible avec des conversations de clients finaux |
| **Google Gemini (Tier 1, PAYG)** | Pas de minimum, facturation à l'usage | ✅ **Retenu** : coût réel de quelques USD/mois au démarrage |
| Cloudflare Workers AI | ~10 000 inferences/jour sur modèles sélectionnés | ⚠️ Option de repli à évaluer (politique de données à relire), qualité inférieure pour du multilingue |
| Groq / Mistral / OpenRouter | Offres gratuites limitées | ⚠️ Repli technique uniquement, politiques de données à vérifier |

**Estimation de coût IA** (ordre de grandeur, à mesurer réellement) : un tour de conversation avec RAG ≈ 1 500–3 000 tokens d'entrée + 150–300 de sortie. À 0,30 USD/M entrée et 2,50 USD/M sortie (Gemini Flash, tarif relevé) : ≈ **0,0012 USD par réponse**, soit **1,2 USD pour 1 000 réponses**. Avec un modèle Flash-Lite (0,10/0,40) : ≈ 0,0003 USD/réponse → **0,30 USD / 1 000 réponses**. Ce sont les **tokens qui coûtent, pas les messages** : le budget IA est négligeable tant que le volume reste sous ~100 k réponses/mois, et les embeddings sont encore moins chers.

### 1.4 WhatsApp / Meta

| Poste | Coût |
|---|---|
| Accès à la plateforme, application, WABA | **0 USD** |
| Vérification d'entreprise Meta | **0 USD** (délai humain) |
| Messages livrés | **Facturés au client final** (modèle recommandé, cf. §4) — voir tarifs dans `01` §2.3 |
| Numéro de téléphone dédié | Variable : numéro virtuel selon opérateur local ; un numéro existant peut suffire |

### 1.5 Paiement

| Prestataire | Coût fixe | Commission indicative | Pour qui |
|---|---|---|---|
| Facture manuelle / virement | 0 | frais bancaires | **Démarrage** |
| **Paddle** (Merchant of Record) | 0 | ~5 % + 0,50 USD | Ventes mondiales, TVA gérée |
| **Lemon Squeezy** (MoR) | 0 | ~5 % + 0,50 USD | Idem |
| Stripe | 0 | 1,5 % + 0,25 € (UE) | ❌ Nécessite une entité pays supporté |
| Paystack | 0 | ~1,95 % local | ❌ Niger non couvert |
| **Flutterwave** | 0 | ~2,9–3,9 % international | Afrique |
| **CinetPay** | 0 | variable | Afrique de l'Ouest francophone, mobile money |

### 1.6 Divers

| Poste | Coût |
|---|---|
| Nom de domaine | ~10–15 USD/an (à prendre **en Phase 16**, pas avant) |
| Certificats TLS | 0 (Cloudflare / Supabase) |
| Monitoring | 0 possible (Cloudflare Analytics + logs Workers + `health` endpoint + alerte e-mail) |
| E-mail transactionnel (vérification, invitations) | 0 au démarrage via Supabase Auth (limites d'envoi) ; sinon ~0–15 USD/mois |
| Outils de design / icônes | 0 (Lucide, polices libres) |

---

## 2. Budget prévisionnel réaliste

### Scénario A — Développement, 0 client (mois 1 à 3)

| Poste | Coût mensuel |
|---|---|
| Cloudflare (gratuit) | 0 |
| Supabase (gratuit) | 0 |
| GitHub (gratuit) | 0 |
| IA : tests uniquement, tier payant Tier 1 | 1–5 USD |
| Domaine (différé) | 0 |
| **Total** | **1–5 USD/mois** |

### Scénario B — 1 à 10 clients payants

| Poste | Coût mensuel |
|---|---|
| Cloudflare Workers Paid (CPU, Queues au-delà de 10 k/j, Hyperdrive) | 5 USD |
| Supabase Pro (pas de pause, sauvegardes 7 j, 8 Go) | 25 USD |
| IA (≈ 50 000 réponses/mois) | 15–60 USD |
| E-mail transactionnel | 0–15 USD |
| **Total** | **45–105 USD/mois** |
| Revenu (10 × 39 USD moyen) | 390 USD |
| **Marge brute** | **~285–345 USD/mois (73–88 %)** |

### Scénario C — 100 clients

| Poste | Coût mensuel estimé |
|---|---|
| Cloudflare (Workers, Queues, DO, R2) | 25–60 USD |
| Supabase Pro + compute + stockage | 35–90 USD |
| IA (≈ 500 000 réponses, mix Flash-Lite/Flash) | 60–250 USD |
| E-mail, monitoring | 15–40 USD |
| **Total** | **135–440 USD/mois** |
| Revenu (100 × 55 USD moyen) | 5 500 USD |
| **Marge brute** | **~92 %** |

### Conclusion budgétaire

- **Coût incompressible pour démarrer : ~2 à 5 USD/mois** (clé IA payante). C'est le seul vrai « ticket d'entrée ».
- **Le premier client payant doit déclencher Supabase Pro (25 USD).** Ne pas facturer en restant sur l'offre gratuite : la pause à 7 jours et l'absence de sauvegardes sont inacceptables vis-à-vis d'un client.
- **Le coût WhatsApp ne doit pas être porté par vous** (modèle A, §4). Sinon un seul client allemand peut coûter plus que son abonnement.
- ⚠️ **Le vrai coût, c'est le temps.** 16 phases représentent plusieurs mois de travail ; le budget monétaire n'est pas la contrainte, la charge de développement l'est.

---

## 3. Modèle économique

### 3.1 Positionnement

Deux segments, deux discours :

1. **PME / commerces d'Afrique de l'Ouest francophone** (Niger, Burkina, Sénégal, Côte d'Ivoire, Mali, Bénin, Togo) : WhatsApp est **le** canal commercial. Besoin : répondre vite, ne pas perdre de commandes, vendre en français + langues locales. Prix sensible, paiement mobile money, facturation en XOF.
2. **PME / agences / e-commerçants internationaux** : besoin d'inbox partagée + IA multilingue + campagnes conformes. Prix en USD/EUR, carte bancaire, attentes de conformité.

**Ne pas mélanger les deux grilles tarifaires** : une table `price_books` par devise/région, mêmes `plans`, prix différents. C'est exactement ce que permet l'architecture retenue.

### 3.2 Grille de plans (proposition — **entièrement configurable en base**, à valider)

| | **Starter** | **Pro** | **Business** | **Enterprise** |
|---|---|---|---|---|
| Prix indicatif (international) | 19 USD/mois | 49 USD/mois | 99 USD/mois | sur devis |
| Prix indicatif (Afrique de l'Ouest) | 7 500 XOF/mois | 19 000 XOF/mois | 39 000 XOF/mois | sur devis |
| Espaces professionnels | 1 | 2 | 5 | illimité |
| Membres d'équipe | 1 | 3 | 10 | négocié |
| Assistants IA | 1 | 2 | 5 | négocié |
| Comptes WhatsApp | 1 | 2 | 5 | négocié |
| Réponses IA incluses / mois | 500 | 3 000 | 10 000 | négocié |
| Conversations actives / mois | 500 | 5 000 | 25 000 | négocié |
| Contacts | 1 000 | 10 000 | 100 000 | négocié |
| Campagnes | ❌ | 5 / mois | 50 / mois | négocié |
| Automatisations | 3 | 20 | illimitées | négocié |
| Rapports | essentiels | avancés | avancés + export | sur mesure |
| Support | e-mail | e-mail prioritaire | prioritaire | dédié |
| Essai gratuit | 14 jours | 14 jours | 14 jours | POC |

**Ce que le prix n'inclut pas (à dire explicitement) :** les **frais de messages WhatsApp**, réglés directement par le client à Meta sur son propre compte. C'est transparent, standard dans l'industrie, et cela protège la marge. Une page « comprendre les coûts WhatsApp » avec un simulateur par pays est un **excellent argument de vente** (personne ne le fait bien).

### 3.3 Add-ons

- Pack IA supplémentaire (+2 000 réponses : 9 USD / 3 500 XOF).
- Assistant IA supplémentaire (5 USD / 2 000 XOF).
- Numéro WhatsApp supplémentaire (5 USD / 2 000 XOF).
- Espace professionnel supplémentaire.
- Accompagnement à la configuration (prestation unique) : 50–150 USD — **le meilleur revenu au démarrage**, sans dépendre de la plateforme.
- Sur mesure / intégrations : sur devis.

### 3.4 Politique commerciale
- Essai **14 jours** sans carte (limité : 1 espace, 1 numéro, 200 réponses IA) → réduit l'abus sans friction.
- Mensuel par défaut, **-20 % en annuel**.
- Pas de « plan gratuit à vie » : il attire une charge de support sans revenu. Alternative assumée : offre « découverte » avec quota très bas et badge.
- Remise association/ONG/éducation configurable par coupon.

### 3.5 Revenus prévisionnels (scénario prudent, à valider)
- Mois 1–2 : 0 (construction).
- Mois 3–6 : 3 à 10 clients (réseau direct, Niamey + diaspora) → 100–500 USD/mois.
- Mois 7–12 : 20 à 60 clients → 1 000–3 000 USD/mois.
- **Point d'équilibre financier : ~3 clients Pro** (couvre l'infrastructure). Le point d'équilibre *du temps investi* est beaucoup plus élevé : c'est la vraie question à se poser.

---

## 4. Décision économique n°1 : qui paie les messages Meta ?

Rappel du calcul (détail dans `01` §2.3) : 3 000 réponses IA/mois coûtent **12 USD** si les destinataires sont en Afrique de l'Ouest, **165 USD** s'ils sont en Allemagne.

| Modèle | Marge sur un plan Pro 49 USD | Risque |
|---|---|---|
| **A. Le client paie Meta** (recommandé) | 49 − ~3 USD d'infra/IA = **~94 %** | Friction d'onboarding (ajouter une carte chez Meta) |
| B. La plateforme paie Meta | De **−116 USD** (Allemagne) à **+34 USD** (Afrique) | **Inacceptable** sans plafonds stricts et sans être revendeur |
| C. Hybride (Enterprise, acompte) | négocié | Complexité comptable |

**Décision recommandée : A**, avec affichage du coût Meta estimé par tenant (transparence → confiance) et un simulateur public sur le site.

---

## 5. Ce qu'il ne faut pas acheter maintenant

❌ Serveur VPS (inutile : Workers) ❌ base managée payante avant le 1er client ❌ Stripe Atlas / société US (coût + obligations fiscales) tant que le revenu n'est pas prouvé ❌ outil d'e-mail marketing payant ❌ Sentry/DataDog payants (les logs Workers + un endpoint `/health` suffisent au début) ❌ agence de design (le design system shadcn/ui bien utilisé suffit) ❌ API WhatsApp de revendeur (marge perdue).

---

## 6. Sources à re-vérifier avant contractualisation

- Tarifs et politiques WhatsApp Business Platform (Meta) — 🔴 **obligatoire** avant toute grille tarifaire publique.
- Quotas Cloudflare (Workers, Queues, DO, Hyperdrive, R2).
- Quotas et politique de données Supabase.
- Tarifs et politique de données Gemini API (tier payant vs gratuit).
- Conditions d'éligibilité du prestataire de paiement retenu pour une entité basée au Niger.
