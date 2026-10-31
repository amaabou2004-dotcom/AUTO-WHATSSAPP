# D10 — Nom de marque : recherche et recommandation

> **Date de la recherche :** 31 octobre 2026.
> **Nature du document :** recommandation argumentée + trace des vérifications. **Ce n'est pas un avis juridique.**
> **Ce qui a été vérifié :** disponibilité DNS indicative, collisions logicielles/marques par recherche publique.
> **Ce qui n'a PAS été vérifié (impossible depuis cet environnement) :** Whois/RDAP officiel, bases de marques INPI / OAPI / EUIPO / USPTO, disponibilité des identifiants sociaux, dépôt effectif.

---

## 1. Contraintes de départ

| Contrainte                                                                 | Origine                            | Conséquence                                                                       |
| -------------------------------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------- |
| **Aucun « WhatsApp »** (ni « WA », ni bulle de discussion imitant le logo) | Brand Guidelines Meta              | Le nom ne doit rien suggérer d'officiel                                           |
| Prononçable en français, anglais et arabe                                  | Marché international visé          | Éviter les digrammes ambigus (`x`, `q` isolés, `w` en début de mot)               |
| Court et mémorisable                                                       | SaaS B2B                           | 5 à 7 lettres, 2 à 3 syllabes                                                     |
| Sens positif ou neutre                                                     | Afrique de l'Ouest + international | Éviter les faux-amis et les connotations religieuses/politiques                   |
| **Protégeable**                                                            | Actif stratégique                  | Un mot inventé (coïncé) est bien plus facile à défendre qu'un mot du dictionnaire |
| Extensions disponibles                                                     | Crédibilité                        | `.com` de préférence, sinon `.app` / `.io` / `.ai`                                |
| Aucune collision avec une entreprise existante du même secteur             | Éviter un litige                   | Vérification par recherche publique                                               |

---

## 2. Méthode

1. **Génération** de ~90 candidats : racines signifiant « répondre / parler / conversation » en **haoussa** (`amsa`), **bambara** (`jaabi`), **wolof** (`tontu`, `waxtaan`, `yaakaar`), **swahili** (`jibu`, `jawabu`, `sema`), plus des noms inventés.
2. **Test DNS** sur `.com`, `.app`, `.io`, `.ai` : recherche d'enregistrements `NS`, puis `SOA` en repli (une domaine enregistré sans `NS` est ainsi détecté).
3. **Recherche de collisions** par recherche publique (nom + « company / brand / software »), puis lecture des résultats.
4. **Élimination** et classement.

> ⚠️ **Limite méthodologique assumée :** un test DNS négatif **ne prouve pas** qu'un domaine est libre. Un domaine peut être enregistré sans `NS` (ex. parqué chez le registraire) ; c'est d'ailleurs ce qui s'est produit avec `sowaa.com`, déclaré « libre » par le DNS alors que la société Sowaa (bien-être/sommeil) l'exploite. **Toute conclusion doit être confirmée chez un registraire avant achat.**

---

## 3. Résultats — candidats éliminés (et pourquoi c'est utile)

| Candidat                                                            | Sens                          | Motif d'élimination                                                                                                                                                                                                               |
| ------------------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sema, Voxa, Kora, Tala, Nafa, Kelia, Sira, Kanu, Solo, Noria, Zolia | —                             | `.com`, `.app`, `.io`, `.ai` **tous pris**                                                                                                                                                                                        |
| **Jaabi**                                                           | bambara : « réponse »         | ❌ **Collision directe** : _Jaabi_, InsurTech guinéenne (assurance digitale, mobile money), fondée en 2026, même sous-région. Le mot est en outre **descriptif** en bambara → protection faible                                   |
| **Jawabu**                                                          | swahili : « réponse »         | ❌ **Collision** : _Jawabu AI_ (legal tech, Kenya) exploite déjà `jawabu.ai`                                                                                                                                                      |
| **Sowaa**                                                           | —                             | ❌ Société _Sowaa_ (bien-être/sommeil) sur `sowaa.com` — faux négatif du test DNS                                                                                                                                                 |
| Semba, Sanvya, Tontura, Jabaso, Vokara, Sembala, Neylo…             | inventés                      | `.com` pris ; sonorité faible ou trop générique                                                                                                                                                                                   |
| **Tontu**                                                           | wolof : « répondre »          | ⚠️ **Retenu en réserve** : `tontu.app` / `tontu.io` disponibles, mais deux usages logiciels antérieurs (TONTU LTD, Royaume-Uni, **dissoute** en 2024 ; projet GitHub `grinry/tontu`). Mot du dictionnaire → **protection faible** |
| **Waxtaan**                                                         | wolof : « conversation »      | ⚠️ Disponible (`.app/.io/.ai`), mais **orthographe piégeuse** hors locuteurs wolof (`wax` se lit « cire » en anglais)                                                                                                             |
| **Yaakaar**                                                         | wolof : « espoir, confiance » | ⚠️ Disponible (`.com/.io/.ai` selon DNS), beau sens, mais **7 lettres, risque de faute de frappe** ; collisions à vérifier                                                                                                        |

---

## 4. Recommandation : **AMSALI**

| Critère                  | Évaluation                                                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Origine                  | **Coïncé** à partir du haoussa **`amsa`** (« répondre ») — langue la plus parlée au Niger et dans le nord du Nigéria, donc du marché de lancement |
| Longueur / sonorité      | 6 lettres, 3 syllabes (`am-SAH-li`), lisible en français, anglais, arabe, portugais, espagnol                                                     |
| Marque                   | **Nom inventé** : distinctif, donc **protégeable** (contrairement à un mot du dictionnaire wolof ou bambara)                                      |
| Conformité Meta          | Ne contient ni « WhatsApp », ni « WA », ni référence à Meta                                                                                       |
| Collisions               | **Aucune entreprise logicielle trouvée** portant ce nom (recherche du 31/10/2026 : seuls des patronymes et une société de négoce apparaissent)    |
| Domaines (DNS indicatif) | **`amsali.com` libre**, `amsali.io` libre, `amsali.app` libre, `amsali.ai` libre                                                                  |
| Verbe possible           | « Envoie-le sur Amsali », « ton Amsali répond » — utilisable en discours produit                                                                  |
| Extension internationale | Aucune connotation négative identifiée ; le suffixe `-li` est neutre dans les langues cibles                                                      |

**Positionnement rédactionnel**

- FR : « **Amsali** — l'assistant qui répond, l'équipe qui vend. »
- EN : « **Amsali** — every message answered. »
- Description factuelle obligatoire (et seule autorisée) : « Amsali est une plateforme d'automatisation des conversations, compatible avec la WhatsApp Business Platform. » — jamais « partenaire officiel » avant obtention du statut.

**Nommage interne**

- La marque affichée est **configurable** (`BRAND_NAME`), jamais codée en dur.
- Le dépôt et les packages conservent leur identifiant technique neutre (`whatsauto-*`) : renommer des packages n'apporte aucune valeur et casserait la traçabilité. À faire seulement si la marque est confirmée **et** au moment d'une opération de maintenance planifiée.

---

## 5. Plan de vérification avant tout dépôt (à faire par vous, 1 à 3 jours)

| #   | Action                                                                                                                                                      | Coût             | Où                                       |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------- |
| 1   | Confirmer la disponibilité réelle et le prix de `amsali.com` (+ `.io`, `.app`)                                                                              | 10–40 USD/an     | Cloudflare Registrar, Porkbun, Namecheap |
| 2   | Recherche d'antériorité **INPI** (France), **OAPI** (17 pays africains dont le Niger), **EUIPO**, **USPTO** — classes **9** (logiciel) et **42** (SaaS)     | gratuit en ligne | bases officielles                        |
| 3   | Réserver les identifiants sociaux (`@amsali`) et le nom sur les annuaires (Product Hunt, LinkedIn, Crunchbase)                                              | 0                | —                                        |
| 4   | Vérifier l'absence d'usage dans les moteurs de recherche pour « Amsali + logiciel/WhatsApp/chatbot »                                                        | 0                | —                                        |
| 5   | Test de prononciation : 5 personnes extérieures (FR, EN, AR) écrivent le nom après l'avoir entendu                                                          | 0                | —                                        |
| 6   | Si `amsali.com` est indisponible au registraire : basculer sur **Tontu** (`.app`) ou **Yaakaar** (`.com`) — la marque est déjà isolée dans la configuration | 0                | —                                        |
| 7   | Dépôt de marque (OAPI couvre le Niger ; classe 42)                                                                                                          | à budgéter       | conseil juridique                        |

⚠️ **Ne pas déposer, ne pas imprimer, ne pas réserver de domaine avant l'étape 2.** Un dépôt après une recherche d'antériorité sérieuse est une décision ; un dépôt sans recherche est un risque financier.

---

## 6. Ce qui a été modifié dans le code avec cette recommandation

| Élément                                                    | Valeur                                             | Réversible en             |
| ---------------------------------------------------------- | -------------------------------------------------- | ------------------------- |
| `BRAND_NAME` (valeur par défaut, `apps/api/src/config.ts`) | `Amsali`                                           | 1 ligne                   |
| `apps/api/wrangler.toml` (dev / staging / production)      | `BRAND_NAME = "Amsali"`                            | 1 ligne par environnement |
| Titre de la console (`apps/web/index.html`)                | `Amsali — console`                                 | 1 ligne                   |
| README / documentation                                     | mention « Amsali (nom de travail : WhatsAuto AI) » | documentaire              |

Aucun nom de package, de dépôt, de dossier ou de variable d'environnement n'a été renommé : la marque reste **une valeur de configuration**, comme l'exige le cahier des charges.

---

## 7. Si vous refusez « Amsali »

Ordre de repli, du meilleur au moins bon :

1. **Tontu** — sens parfait (wolof : répondre), `tontu.app` + `tontu.io`, mais mot courant → marque faible et deux antériorités logicielles mineures.
2. **Yaakaar** — sens fort (espoir, confiance), `.com` apparemment libre, mais orthographe fragile.
3. **Waxtaan** — sens exact (conversation), mais illisible hors Afrique de l'Ouest.

Dans les trois cas, je fournirai la même procédure de vérification avant tout usage public.
