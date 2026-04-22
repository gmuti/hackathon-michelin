# MichelinMatch

> Tinder × Spotify × Instagram pour la gastronomie — découvrez, swipez et partagez les meilleures tables et hôtels avec vos proches en temps réel.

---

## Concept

MichelinMatch transforme la recherche de restaurant en expérience sociale et ludique. Swipez des établissements Michelin, certifiez vos visites via QR code pour gagner des badges (de Plongeur à Chef Étoilé), et lancez des sessions **Jam** pour décider en groupe où aller dîner — tout le monde swipe en simultané, le match gagne.

---

## Stack technique

| Couche | Technologie |
|---|---|
| Mobile | React Native 0.74 + Expo 51 |
| Backend | Node.js 20 + Express 4 + TypeScript strict |
| Base de données | PostgreSQL (Supabase) via Prisma ORM |
| Authentification | Supabase Auth (JWT) |
| Temps réel | Socket.io (namespace `/jam`) |
| Validation | Zod |

---

## Structure du monorepo

```
MichelinMatch2/
├── apps/
│   └── mobile/          # Application React Native + Expo
├── backend/             # API REST + WebSocket
│   ├── prisma/          # Schéma et seed
│   └── src/
│       ├── config/      # Supabase, Prisma
│       ├── middleware/  # Auth, validation, erreurs
│       └── modules/     # auth, users, restaurants, hotels, swipe, jam, reviews
└── ARCHITECTURE.md
```

---

## Démarrage rapide

### Prérequis
- Node.js 20+
- Un projet [Supabase](https://supabase.com) avec les clés API

### 1. Backend

```bash
cd backend
cp .env.example .env        # remplir les clés Supabase
npm install
npm run db:migrate          # créer les tables
npm run db:seed             # insérer les données de test
npm run dev                 # → http://localhost:3000/api/v1
```

### 2. Mobile

```bash
cd apps/mobile
npm install
npx expo start              # scanner le QR pour iOS/Android, ou 'w' pour web
```

---

## Fonctionnalités principales

- **Swipe Feed** — restaurants filtrés par distance (marche/vélo/voiture/train) et restrictions alimentaires
- **Hôtels** — recherche par destination et disponibilités en temps réel
- **Mode Jam** — session de swipe collaborative avec countdown et match collectif via WebSocket
- **Certification** — scan QR code en salle → badge de progression (6 niveaux de Plongeur à Chef Étoilé)
- **Reviews certifiées** — seuls les visiteurs vérifiés peuvent poster un avis
- **Communauté** — follow, collection personnelle, profil gastronomique

---

## Documentation

| Fichier | Contenu |
|---|---|
| [`backend/README.md`](./backend/README.md) | API, endpoints, architecture backend |
| [`apps/mobile/README.md`](./apps/mobile/README.md) | Screens, navigation, hooks mobile |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Flux de données, schéma DB, temps réel |
| [`backend/MichelinMatch.postman_collection.json`](./backend/MichelinMatch.postman_collection.json) | Collection Postman complète |

---

## Contributeurs

Projet développé dans le cadre d'un hackathon Michelin.
