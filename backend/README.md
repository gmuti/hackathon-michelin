# MichelinMatch — Backend

API REST + WebSocket construite avec **Express 4**, **TypeScript strict**, **Prisma** et **Supabase**.

---

## Stack

| Outil | Rôle |
|---|---|
| Express 4 | Framework HTTP |
| TypeScript 5 (strict) | Typage statique |
| Prisma 5 | ORM + migrations |
| Supabase | Auth (JWT) + PostgreSQL hébergé |
| Socket.io 4 | Temps réel (mode Jam) |
| Zod | Validation des requêtes |
| tsx | Exécution TypeScript en dev |

---

## Installation

```bash
cd backend
npm install
```

Copier et remplir les variables d'environnement :

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `SUPABASE_URL` | URL de votre projet Supabase |
| `SUPABASE_ANON_KEY` | Clé publique Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service (admin, ne jamais exposer) |
| `DATABASE_URL` | Connexion PostgreSQL via pooler (PgBouncer) |
| `DIRECT_URL` | Connexion directe PostgreSQL (migrations Prisma) |
| `PORT` | Port du serveur (défaut : `3000`) |
| `NODE_ENV` | `development` ou `production` |

---

## Scripts

```bash
npm run dev          # Serveur avec hot-reload (tsx watch)
npm run build        # Compilation TypeScript → dist/
npm run start        # Démarrage production (node dist/index.js)

npm run db:migrate   # Appliquer les migrations Prisma
npm run db:generate  # Regénérer le client Prisma après modif schéma
npm run db:seed      # Insérer les données de test (5 restaurants, 3 hôtels, 2 users)
npm run db:studio    # Ouvrir Prisma Studio (interface DB visuelle)
```

---

## Architecture

```
src/
├── index.ts                  # Point d'entrée : Express + Socket.io
├── config/
│   ├── supabase.ts           # Client anon + client admin (service_role)
│   └── prisma.ts             # Singleton PrismaClient
├── middleware/
│   ├── auth.ts               # Vérifie JWT Supabase → attache req.user
│   ├── validate.ts           # Factory Zod (body ou query)
│   └── errorHandler.ts       # Handler global 4 params
├── utils/
│   ├── asyncHandler.ts       # Wrapper catch → next() (pas de try/catch en route)
│   └── AppError.ts           # Erreur avec statusCode
├── types/
│   └── express.d.ts          # Extension de Request (req.user)
└── modules/
    ├── auth/                 # register, login (routes publiques)
    ├── users/                # profil, collection, follow
    ├── restaurants/          # feed géolocalisé, détail
    ├── hotels/               # feed par destination, détail
    ├── swipe/                # LIKE / DISLIKE / SUPER_LIKE
    ├── jam/                  # sessions groupe + gateway Socket.io
    └── reviews/              # certification QR, avis, listing
```

Chaque module suit la convention : `*.router.ts` → `*.service.ts` → `*.schema.ts`

---

## Endpoints API

Base URL : `http://localhost:3000/api/v1`

Toutes les routes sauf `/auth/*` nécessitent le header :
```
Authorization: Bearer <supabase_jwt>
```

### Auth (public)

| Méthode | Route | Description |
|---|---|---|
| `POST` | `/auth/register` | Créer un compte (Supabase + DB) → retourne le token |
| `POST` | `/auth/login` | Se connecter → retourne le token |

### Users

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/users/me` | Profil complet avec compteurs followers/following/visits |
| `PATCH` | `/users/me` | Mettre à jour bio, username, préférences |
| `GET` | `/users/me/collection` | Visites certifiées avec restaurants |
| `POST` | `/users/:id/follow` | Suivre un utilisateur |
| `DELETE` | `/users/:id/follow` | Ne plus suivre |

### Restaurants

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/restaurants/feed` | 30 restaurants filtrés par distance et préférences |
| `GET` | `/restaurants/:id` | Détail + photos + plats + reviews certifiées |

Paramètres du feed :

| Param | Type | Requis | Description |
|---|---|---|---|
| `lat` | number | oui | Latitude |
| `lng` | number | oui | Longitude |
| `transportMode` | `walk\|bike\|car\|train` | oui | Rayon : 1/5/30/100 km |
| `cuisineTypes` | string[] | non | Filtre par type de cuisine |
| `dietaryRestrictions` | string[] | non | Filtre par régime alimentaire |

### Hôtels

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/hotels/feed` | Hôtels disponibles par destination et dates |
| `GET` | `/hotels/:id` | Détail + disponibilités + reviews |

Paramètres du feed :

| Param | Type | Requis | Description |
|---|---|---|---|
| `destination` | string | oui | Recherche partielle sur la ville |
| `checkIn` | date ISO | oui | Date d'arrivée |
| `checkOut` | date ISO | oui | Date de départ |
| `environment` | `CITY\|COUNTRY\|SUBURB` | non | Environnement de l'hôtel |

### Swipe

| Méthode | Route | Description |
|---|---|---|
| `POST` | `/swipe` | Enregistrer un swipe |

```json
{
  "targetId": "cuid",
  "targetType": "RESTAURANT | HOTEL",
  "action": "LIKE | DISLIKE | SUPER_LIKE",
  "sessionId": "optionnel — si swipe dans une session Jam"
}
```

### Jam

| Méthode | Route | Description |
|---|---|---|
| `POST` | `/jam` | Créer une session → génère un `shareCode` (ex: `JAM-A3F9`) |
| `GET` | `/jam/:shareCode` | Récupérer une session avec ses participants |
| `GET` | `/jam/:id/results` | Résultats triés par likeCount, matches en premier |

### Reviews

| Méthode | Route | Description |
|---|---|---|
| `POST` | `/reviews/certify-qr` | Scanner un QR code → certifie la visite + recalcule le badge |
| `POST` | `/reviews` | Poster un avis (requiert 1 visite certifiée) |
| `GET` | `/reviews/:targetType/:targetId` | Liste des reviews certifiées par likes |

---

## Format des réponses

Toutes les réponses suivent ce format uniforme :

```json
{ "data": { ... }, "error": null }     // Succès
{ "data": null, "error": "message" }   // Erreur
```

---

## Temps réel — Socket.io

Namespace : `/jam`

### Événements client → serveur

| Événement | Payload | Description |
|---|---|---|
| `jam:join` | `{ shareCode, userId }` | Rejoindre la room de la session |
| `jam:start` | `{ shareCode }` | Démarrer le countdown (créateur) |
| `jam:swipe` | `{ shareCode, sessionId, targetId, targetType, action, userId }` | Envoyer un swipe |
| `jam:leave` | `{ shareCode }` | Quitter la room |

### Événements serveur → clients

| Événement | Payload | Description |
|---|---|---|
| `jam:participant_joined` | `{ userId, shareCode }` | Nouveau participant |
| `jam:countdown_tick` | `{ count }` | Tick 3→2→1 |
| `jam:start_swipe` | — | Début du swipe |
| `jam:liked_card` | `{ targetId, likedBy }` | Quelqu'un a liké (broadcast sauf émetteur) |
| `jam:match` | `{ targetId, targetType }` | Match collectif atteint |

---

## Système de rôles

Le badge de l'utilisateur évolue automatiquement après chaque certification de visite :

| Rôle | Visites certifiées |
|---|---|
| Plongeur | 0 |
| Serveur | 1+ |
| Commis | 5+ |
| Sous-Chef | 15+ |
| Chef | 30+ |
| Chef Étoilé | 50+ |

---

## Données de test (seed)

```bash
npm run db:seed
```

Insère :
- **5 restaurants** parisiens (Le Grand Véfour, L'Arpège, Septime, Le Cinq, Frenchie) avec photos, plats et QR codes
- **3 hôtels** (Plaza Athénée, Domaine des Étangs, Maison Estournel) avec disponibilités sur 30 jours
- **2 utilisateurs** de test (`alice@test.michelin` / `bob@test.michelin`)

QR codes de test pour la certification :
```
QR-GRAND-VEFOUR-001
QR-ARPEGE-002
QR-SEPTIME-003
QR-LECINQ-004
QR-FRENCHIE-005
```

---

## Tests avec Postman

Importer `MichelinMatch.postman_collection.json` dans Postman.

Workflow recommandé :
1. `POST /auth/register` → copier le token dans la variable de collection
2. `GET /restaurants/feed` → auto-capture `restaurantId`
3. `POST /reviews/certify-qr` → certifier une visite
4. `POST /reviews` → poster un avis
5. `POST /jam` → auto-capture `jamShareCode` + `jamSessionId`
