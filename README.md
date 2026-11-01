# AutoWhatsApp

Une application web en français pour **programmer des messages WhatsApp** et **répondre automatiquement aux messages entrants**. Elle fonctionne immédiatement en mode démo, puis utilise la **WhatsApp Business Cloud API** lorsque les identifiants Meta sont configurés.

## Fonctionnalités

- **Site vitrine** : page d’accueil responsive, présentation du produit, parcours et questions fréquentes.
- **Tableau de bord** : indicateurs, activité des 7 derniers jours, prochains envois et événements récents.
- **Messages programmés** : envoi unique, quotidien ou hebdomadaire, annulation et historique des statuts.
- **Chatbot à règles** : correspondance « contient », « exacte » ou « commence par », activation/pause, modification et suppression.
- **Simulateur intégré** : testez les réponses sans envoyer de vrai message.
- **Contacts** : recherche, étiquettes, consentement et envoi manuel.
- **Historique** : messages entrants/sortants, source, statut et filtres.
- **Webhook WhatsApp** : réception des messages texte et déclenchement des règles actives.
- **Persistance locale** : les données sont enregistrées dans `data/store.json` (fichier ignoré par Git).

## Démarrage rapide

Prérequis : **Node.js 20 ou supérieur**.

```bash
npm install
npm run dev
```

Ouvrez ensuite `http://localhost:3000` pour le site vitrine, ou `http://localhost:3000/app` pour le tableau de bord. Le serveur écoute sur `0.0.0.0`, ce qui permet aussi l’utilisation dans un environnement de prévisualisation.

Aucune configuration n’est nécessaire pour le mode démo. Les envois sont simulés et enregistrés dans l’historique ; aucun message n’est transmis à WhatsApp.

## Scripts

```bash
npm run dev        # Serveur Express + Vite avec rechargement
npm run build      # Vérification TypeScript et build de production
npm start          # Sert le build de production sur le port 3000
npm test           # Tests du chatbot et du planificateur
npm run typecheck  # Vérifie le frontend et le backend
```

## Déployer en ligne avec Render et Netlify

Les deux fichiers de déploiement sont fournis : `render.yaml` pour le backend et `netlify.toml` pour le frontend.

### 1. Déployer le backend sur Render

Le Blueprint Render configure le service Node, la vérification de santé `/api/health`, le déploiement automatique et un disque persistant de 1 Go pour `DATA_FILE`.

1. Dans Render, choisissez **New → Blueprint Instance**, puis sélectionnez ce dépôt et la branche contenant `render.yaml`.
2. Vérifiez le plan `0.5c-512mb`, le disque persistant et le tarif affiché avant de valider. Un service qui se met en veille ne convient pas au planificateur.
3. Lancez le déploiement, puis relevez l’URL publique fournie par Render. L’endpoint `/api/health` doit répondre avec `status: ok`.

Le service démarre en mode démo. Dans **Environment**, ajoutez ensuite les identifiants WhatsApp (`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`) lorsque vous êtes prêt à activer les vrais envois. `WHATSAPP_VERIFY_TOKEN` est généré automatiquement par le Blueprint.

### 2. Déployer le frontend sur Netlify

Le fichier `netlify.toml` configure le build `npm run build`, la publication de `dist`, React Router, les en-têtes de sécurité et le cache des assets.

1. Importez le même dépôt et la même branche dans Netlify. Les réglages de build sont lus automatiquement.
2. Dans **Site configuration → Environment variables**, ajoutez l’adresse Render relevée précédemment :

   ```dotenv
   VITE_API_URL=https://votre-service.onrender.com/api
   ```

3. Déployez ou relancez le build Netlify : `VITE_API_URL` est intégrée au frontend au moment du build et ne doit contenir aucun secret.
4. Revenez dans les variables d’environnement Render pour autoriser le domaine Netlify :

   ```dotenv
   FRONTEND_URL=https://votre-site.netlify.app
   ```

   Plusieurs domaines peuvent être séparés par des virgules, par exemple pour une préproduction. Redémarrez le service Render après cette modification.

L’URL du webhook affichée dans **Paramètres** utilisera automatiquement le domaine du backend Render. Les tokens WhatsApp doivent uniquement être saisis dans les variables protégées de Render, jamais dans Git, Netlify ou une conversation.

## Connecter la WhatsApp Cloud API

1. Créez une application dans [Meta for Developers](https://developers.facebook.com/) et ajoutez le produit WhatsApp.
2. Copiez le modèle de configuration :

   ```bash
   cp .env.example .env
   ```

3. Renseignez au minimum :

   ```dotenv
   WHATSAPP_ACCESS_TOKEN=votre_token_d_acces
   WHATSAPP_PHONE_NUMBER_ID=votre_phone_number_id
   WHATSAPP_VERIFY_TOKEN=une_chaine_secrete_choisie_par_vous
   ```

4. Redémarrez l’application. Le badge passe de **Mode démo** à **WhatsApp connecté**.
5. Dans la configuration WhatsApp de Meta, ajoutez le webhook :

   ```text
   https://VOTRE_DOMAINE/api/webhooks/whatsapp
   ```

   Utilisez la même valeur que `WHATSAPP_VERIFY_TOKEN` pour la vérification et abonnez le webhook au champ `messages`.

### Sécurité du webhook

Pour vérifier les signatures `X-Hub-Signature-256`, renseignez également :

```dotenv
WHATSAPP_APP_SECRET=le_secret_de_votre_application_meta
```

Le token d’accès et le secret ne sont jamais envoyés au navigateur ni stockés dans `data/store.json`. Le fichier `.env` est ignoré par Git.

## Configuration disponible

| Variable | Rôle | Défaut |
| --- | --- | --- |
| `WHATSAPP_ACCESS_TOKEN` | Token Bearer de la Cloud API | Vide = démo |
| `WHATSAPP_PHONE_NUMBER_ID` | Identifiant du numéro expéditeur | Vide = démo |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Identifiant du compte professionnel, affiché dans les réglages | Vide |
| `WHATSAPP_VERIFY_TOKEN` | Vérification du webhook par Meta | Vide |
| `WHATSAPP_APP_SECRET` | Vérification cryptographique des webhooks | Vide |
| `WHATSAPP_API_VERSION` | Version de l’API Graph | `v22.0` |
| `PORT` | Port HTTP | `3000` |
| `DATA_FILE` | Emplacement du stockage JSON | `data/store.json` |
| `FRONTEND_URL` | Domaine(s) autorisé(s) par CORS sur le backend | Vide |
| `VITE_API_URL` | URL publique de l’API au build du frontend | `/api` sur le même domaine |

## Architecture

```text
src/                    Interface React + TypeScript
  components/          Layout, formulaires, modales et composants UI
  pages/               Tableau de bord, planning, chatbot, contacts, historique, réglages
server/                 API Express + TypeScript
  automation.ts        Moteur de correspondance du chatbot
  scheduler.ts         Exécution des envois et récurrences
  routes.ts            Routes REST et webhook WhatsApp
  store.ts             Persistance JSON atomique et données de démonstration
  whatsapp.ts          Adaptateur Cloud API / simulateur
shared/types.ts         Types partagés entre le client et le serveur
```

Le planificateur vérifie les échéances toutes les 15 secondes. Les écritures JSON se font via un fichier temporaire puis un renommage atomique.

## Remarques pour une mise en production

Ce dépôt est un MVP mono-espace. Avant une exposition publique multi-utilisateur, ajoutez notamment une authentification, une base de données transactionnelle, une file de jobs persistante, la limitation de débit et la gestion des modèles WhatsApp approuvés.

La Cloud API peut exiger un **modèle approuvé** pour initier une conversation hors fenêtre de service de 24 heures. Respectez aussi le consentement des contacts et les politiques de WhatsApp Business.

Pour repartir avec les données de démonstration, arrêtez l’application puis supprimez `data/store.json` ; il sera recréé au prochain démarrage.
