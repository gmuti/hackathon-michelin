# MichelinMatch — Mobile

Application React Native + Expo pour iOS, Android et Web.

---

## Stack

| Outil | Rôle |
|---|---|
| React Native 0.74 | Framework mobile cross-platform |
| Expo 51 | Toolchain + modules natifs |
| TypeScript 5 (strict) | Typage statique |
| React Navigation 6 | Navigation Stack + BottomTab |
| Socket.io Client 4 | Connexion temps réel (mode Jam) |
| Expo Location | Géolocalisation GPS |
| Expo Linear Gradient | UI dégradés |
| Expo Image | Images optimisées |

---

## Installation

```bash
cd apps/mobile
npm install
```

Créer un fichier `.env` à la racine de `apps/mobile/` :

```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1
EXPO_PUBLIC_WS_URL=http://localhost:3000
```

---

## Lancement

```bash
npx expo start          # Menu interactif
npx expo start --web    # Navigateur directement
npx expo run:android    # Émulateur Android (Android Studio requis)
npx expo run:ios        # Simulateur iOS (macOS + Xcode requis)
```

Scanner le QR code avec **Expo Go** (iOS/Android) pour tester sur appareil physique.

---

## Architecture

```
apps/mobile/
├── App.tsx                        # Point d'entrée Expo
└── src/
    ├── navigation/
    │   └── AppNavigator.tsx       # Stack + BottomTab (Swipe, Jam, Community, Profile)
    ├── screens/
    │   ├── onboarding/
    │   │   └── OnboardingScreen.tsx   # Saisie des préférences cuisine au 1er lancement
    │   ├── swipe/
    │   │   └── SwipeScreen.tsx        # Feed de cartes swipables (restaurant + hôtel)
    │   ├── jam/
    │   │   └── JamScreen.tsx          # Lobby, countdown et swipe collectif
    │   ├── community/
    │   │   └── CommunityScreen.tsx    # Feed communautaire et groupes
    │   └── profile/
    │       └── ProfileScreen.tsx      # Galerie de visites, badge de rôle, follows
    ├── components/
    │   ├── ui/
    │   │   ├── JamButton             # Bouton flottant pour créer/rejoindre un Jam
    │   │   ├── CountdownModal        # Overlay 3-2-1 avant le swipe
    │   │   └── BadgeRole             # Pastille Plongeur → Chef Étoilé
    │   └── cards/
    │       ├── SwipeCard             # Carte restaurant/hôtel avec geste swipe
    │       ├── DishCarousel          # Carousel des plats d'un restaurant
    │       └── MatchOverlay          # Overlay "C'est un Match !" (mode Jam)
    ├── hooks/
    │   ├── useSwipeFeed             # Fetch + pagination du feed restaurants/hôtels
    │   ├── useJamSocket             # Connexion Socket.io, events jam:*
    │   └── useGeolocation           # GPS via expo-location
    └── store/
        ├── userStore                # Zustand : profil, token, rôle
        ├── jamStore                 # Zustand : session en cours, participants, matches
        └── feedStore                # Zustand : cartes en file, filtres actifs
```

---

## Screens

### OnboardingScreen
Premier lancement uniquement. L'utilisateur sélectionne ses types de cuisine préférés et ses restrictions alimentaires. Ces données sont persistées via `PATCH /users/me`.

### SwipeScreen
Feed principal. Les cartes s'affichent une par une avec :
- Photos du restaurant/hôtel
- Nom, étoiles Michelin, fourchette de prix
- Distance calculée depuis la position GPS
- Geste vers la droite (LIKE), gauche (DISLIKE), vers le haut (SUPER_LIKE)

### JamScreen
Mode collaboratif en temps réel :
1. **Lobby** — affiche le `shareCode` à partager, liste des participants connectés
2. **Countdown** — modal 3→2→1 synchronisé via Socket.io
3. **Swipe collectif** — chacun swipe de son côté, les likes se propagent en temps réel
4. **Résultats** — top des établissements avec indicateur de match

### ProfileScreen
- Galerie des visites certifiées
- Badge de rôle actuel avec progression vers le prochain niveau
- Compteurs followers / following
- Bouton de scan QR pour certifier une visite

### CommunityScreen
- Feed de posts de la communauté gastronomique
- Rejoindre / créer des groupes thématiques

---

## Connexion à l'API

Le hook `useSwipeFeed` gère l'authentification automatiquement en lisant le token depuis `userStore` et en l'injectant dans chaque requête :

```ts
const headers = { Authorization: `Bearer ${userStore.token}` };
```

Le hook `useJamSocket` se connecte au namespace `/jam` du serveur Socket.io :

```ts
const socket = io(`${WS_URL}/jam`);
socket.emit('jam:join', { shareCode, userId });
socket.on('jam:match', ({ targetId, targetType }) => { /* ... */ });
```

---

## Variables d'environnement

Expo expose uniquement les variables préfixées `EXPO_PUBLIC_` côté client.

| Variable | Exemple | Description |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `http://localhost:3000/api/v1` | URL de l'API backend |
| `EXPO_PUBLIC_WS_URL` | `http://localhost:3000` | URL du serveur Socket.io |

En production, remplacer par l'URL de votre backend déployé.

---

## Build de production

```bash
# Build EAS (Expo Application Services)
npx eas build --platform android
npx eas build --platform ios

# Preview local
npx expo export --platform web
```
