# MichelinMatch — Architecture Technique

## Vue d'ensemble

```
MichelinMatch/
├── apps/
│   └── mobile/               # React Native + Expo (iOS / Android / Web)
│       ├── App.tsx
│       └── src/
│           ├── navigation/   # AppNavigator (Stack + BottomTab)
│           ├── screens/
│           │   ├── onboarding/   OnboardingScreen.tsx   ← Step 1: préfs cuisine
│           │   ├── swipe/        SwipeScreen.tsx        ← Feed swipe (Resto + Hôtel)
│           │   ├── jam/          JamScreen.tsx          ← Lobby + countdown Jam
│           │   ├── community/    CommunityScreen.tsx    ← Feed + groupes
│           │   └── profile/      ProfileScreen.tsx      ← Galerie + rôles
│           ├── components/
│           │   ├── ui/           JamButton, CountdownModal, BadgeRole
│           │   └── cards/        SwipeCard, DishCarousel, MatchOverlay
│           ├── hooks/            useSwipeFeed, useJamSocket, useGeolocation
│           └── store/            Zustand (userStore, jamStore, feedStore)
│
├── packages/
│   ├── shared/               # Types TypeScript partagés front+back
│   │   └── src/types.ts
│   ├── ui/                   # Composants UI cross-platform (web + mobile)
│   └── api-client/           # Client HTTP (fetch wrapper) + WebSocket
│
├── backend/                  # NestJS API
│   ├── prisma/
│   │   └── schema.prisma     # Modèle de données complet
│   └── src/
│       ├── main.ts           # Bootstrap NestJS
│       ├── app.module.ts     # Module racine
│       ├── common/
│       │   ├── database/     PrismaService
│       │   ├── guards/       JwtAuthGuard
│       │   ├── decorators/   @CurrentUser()
│       │   └── interceptors/ LoggingInterceptor
│       └── modules/
│           ├── auth/         JWT auth (Supabase)
│           ├── users/        Profil, rôles, collection, follow
│           ├── restaurants/  Feed géolocalisé, détail, plats
│           ├── hotels/       Feed par destination + disponibilités
│           ├── swipe/        Enregistrement LIKE / DISLIKE / SUPER_LIKE
│           ├── jam/          Sessions groupe + WebSocket Gateway
│           ├── reviews/      Avis certifiés + certification visite
│           └── community/    Groupes + feed + posts
│
├── docker-compose.yml        # PostgreSQL (PostGIS) + Redis
└── package.json              # Monorepo Turborepo
```

## Flux de données clés

### Swipe Feed (Restaurant)
```
App GPS → GET /api/v1/restaurants/feed?lat=&lng=&transportMode=car
→ RestaurantsService.getSwipeFeed()
→ PostgreSQL ST_DWithin (rayon calculé selon mode)
→ Exclure déjà swipés (anti-répétition)
→ Filtrer restrictions alimentaires
→ Retourner 30 fiches paginées
```

### Mode Jam
```
Créateur → POST /api/v1/jam → shareCode généré
Participants → WS jam:join { sessionId, userId }
Créateur → WS jam:start → broadcast countdown 3..2..1
Chaque participant swipe → WS jam:swipe { targetId, action }
→ JamService.recordSwipe() → calcul likeCount/participantCount
→ Si ratio >= threshold → WS jam:match broadcast
→ En fin de session → résumé top-liked + finalMatch
```

### Certification de visite
```
Utilisateur scanne QR en salle
→ POST /api/v1/reviews/certify-qr { restaurantId, qrCode }
→ ReviewsService.certifyVisitWithQR()
→ Valide le qrCode en base
→ Crée Visit(certified: true, certMethod: 'qr_code')
→ Incrémente user.certifiedVisits
→ UsersService.recalculateRole() → mise à jour badge
```

## Base de données

- **PostgreSQL 16** + extension **PostGIS** (requêtes géographiques ST_DWithin)
- **Redis** : cache feed swipe, sessions Jam en cours, rate limiting
- **Prisma** ORM avec migrations versionnées

## Temps réel (Jam)

Socket.IO namespaced `/jam` avec rooms par session :

| Événement client → serveur | Description |
|---------------------------|-------------|
| `jam:join`    | Rejoindre une session              |
| `jam:start`   | Démarrer (créateur seulement)      |
| `jam:swipe`   | Envoyer un swipe                   |

| Événement serveur → clients | Description |
|-----------------------------|-------------|
| `jam:participant_joined`    | Nouveau participant arrivé         |
| `jam:countdown`             | Début du countdown synchronisé     |
| `jam:start_swipe`           | Déblocage du swipe                 |
| `jam:liked_card`            | Propager une fiche likée           |
| `jam:match`                 | Match collectif atteint            |

## Sécurité

- JWT via **Supabase Auth** (access + refresh tokens)
- Guards NestJS sur toutes les routes protégées
- Validation stricte via `class-validator` (DTO whitelisting)
- Médias uploadés via **Cloudflare R2** (signed URLs temporaires)
- Rate limiting sur les endpoints swipe/certification

## Commandes de démarrage

```bash
# Infrastructure
docker-compose up -d

# Backend
cd backend
npm install
npx prisma migrate dev
npm run dev   # → http://localhost:3000/api/v1

# Mobile
cd apps/mobile
npm install
npx expo start   # → scan QR pour iOS/Android, ou 'w' pour web
```
