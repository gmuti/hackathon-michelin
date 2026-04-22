import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity,
  Animated, PanResponder, StatusBar, SafeAreaView,
  ActivityIndicator, TextInput, ScrollView,
} from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../config/api';

const { width: W, height: H } = Dimensions.get('window');
const SWIPE_THRESHOLD = W * 0.3;

// ── Types ─────────────────────────────────────────────────────────
type RestaurantCard = {
  _type: 'restaurant';
  id: string; name: string; city: string;
  michelinStars: number; cuisineType: string; priceRange: number;
  photos: { url: string; position: number }[];
  distance: number;
};
type HotelCard = {
  _type: 'hotel';
  id: string; name: string; city: string; country: string;
  environment: string; stars: number; pricePerNight: number; amenities: string[];
};
type AnyCard = RestaurantCard | HotelCard;

// ── Options ───────────────────────────────────────────────────────
const TRANSPORT_MODES = [
  { id: 'walk',  emoji: '🚶', label: 'À pied',   sub: '< 1 km'  },
  { id: 'bike',  emoji: '🚲', label: 'Vélo',     sub: '1–5 km'  },
  { id: 'car',   emoji: '🚗', label: 'Voiture',  sub: '5–30 km' },
  { id: 'train', emoji: '🚆', label: 'Train',    sub: '30 km+'  },
];
const CUISINE_OPTIONS = [
  { id: 'japanese', label: 'Japonaise',    emoji: '🍣' },
  { id: 'italian',  label: 'Italienne',    emoji: '🍝' },
  { id: 'french',   label: 'Française',    emoji: '🥐' },
  { id: 'asian',    label: 'Asiatique',    emoji: '🥢' },
  { id: 'veg',      label: 'Végétarienne', emoji: '🥗' },
  { id: 'fusion',   label: 'Fusion',       emoji: '🌮' },
  { id: 'seafood',  label: 'Fruits de mer',emoji: '🦞' },
  { id: 'bbq',      label: 'Grillades',    emoji: '🥩' },
  { id: 'desserts', label: 'Desserts',     emoji: '🍰' },
  { id: 'brunch',   label: 'Brunch',       emoji: '🥞' },
];
const DIETARY_OPTIONS = [
  { id: 'veg',     label: 'Végétarien',  emoji: '🥦' },
  { id: 'vegan',   label: 'Végan',       emoji: '🌱' },
  { id: 'gluten',  label: 'Sans gluten', emoji: '🌾' },
  { id: 'halal',   label: 'Halal',       emoji: '☪️' },
  { id: 'lactose', label: 'Sans lactose',emoji: '🥛' },
];

function todayStr() { return new Date().toISOString().split('T')[0]; }
function plusDaysStr(n: number) {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

// ── Component ─────────────────────────────────────────────────────
export default function SwipeScreen({ route, navigation }: any) {
  const mode: 'restaurant' | 'hotel' = route?.params?.mode ?? 'restaurant';
  const { token, user } = useAuth();

  // Cards
  const [cards, setCards]                   = useState<AnyCard[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [swipeIndicator, setSwipeIndicator] = useState<'like' | 'nope' | 'super' | null>(null);
  const [loading, setLoading]               = useState(false); // ← false : on montre d'abord le filtre
  const [error, setError]                   = useState<string | null>(null);

  // Filtre — toujours ouvert au démarrage
  const [showFilter, setShowFilter] = useState(true);
  const [filterStep, setFilterStep] = useState(0);

  // Filtres restaurants
  const [cityInput, setCityInput]         = useState('');
  const [transportMode, setTransportMode] = useState('car');
  const [cuisines, setCuisines]           = useState<string[]>(
    (user?.cuisinePreferences ?? []).filter(x => x !== 'all'),
  );
  const [dietary, setDietary]             = useState<string[]>(user?.dietaryRestrictions ?? []);

  // Filtres hôtels
  const [hotelCity, setHotelCity]   = useState('');
  const [checkIn, setCheckIn]       = useState(todayStr);
  const [checkOut, setCheckOut]     = useState(() => plusDaysStr(3));

  // Nombre d'étapes selon le mode
  const totalSteps    = mode === 'restaurant' ? 3 : 2;
  const isLastStep    = filterStep === totalSteps - 1;

  // Ouvrir le filtre depuis la step 0
  const openFilter = useCallback(() => {
    setFilterStep(0);
    setShowFilter(true);
  }, []);

  // Swipe animation
  const translateX    = useRef(new Animated.Value(0)).current;
  const translateY    = useRef(new Animated.Value(0)).current;
  const cardRotation  = translateX.interpolate({
    inputRange: [-W, 0, W], outputRange: ['-15deg', '0deg', '15deg'],
  });

  // ── Géocodage ─────────────────────────────────────────────────
  const geocodeCity = async (city: string) => {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
        { headers: { 'User-Agent': 'MichelinMatch/1.0' } },
      );
      const d = await r.json();
      if (d.length > 0) return { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) };
    } catch {}
    return null;
  };

  const getGPSCity = async (setter: (v: string) => void) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${loc.coords.latitude}&lon=${loc.coords.longitude}&format=json`,
        { headers: { 'User-Agent': 'MichelinMatch/1.0' } },
      );
      const d = await r.json();
      setter(d.address?.city ?? d.address?.town ?? d.address?.village ?? '');
    } catch {}
  };

  const getGPSCoords = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return { lat: loc.coords.latitude, lng: loc.coords.longitude };
    } catch { return null; }
  };

  // ── Fetch ─────────────────────────────────────────────────────
  const fetchRestaurants = useCallback(async () => {
    if (!token) return;
    setShowFilter(false);
    setLoading(true);
    setError(null);

    let coords: { lat: number; lng: number } | null = null;

    if (cityInput.trim()) {
      coords = await geocodeCity(cityInput.trim());
      if (!coords) {
        setError(`Ville introuvable : "${cityInput}"`);
        setLoading(false);
        openFilter();
        return;
      }
    } else {
      coords = await getGPSCoords();
      if (!coords) {
        setError('Saisis une ville ou autorise la géolocalisation.');
        setLoading(false);
        openFilter();
        return;
      }
    }

    const params = new URLSearchParams({ lat: String(coords.lat), lng: String(coords.lng), transportMode });
    cuisines.forEach(c => params.append('cuisineTypes', c));
    dietary.forEach(d => params.append('dietaryRestrictions', d));

    const res = await api.get<Omit<RestaurantCard, '_type'>[]>(`/restaurants/feed?${params}`, token);
    if (res.data) setCards(res.data.map(r => ({ ...r, _type: 'restaurant' as const })));
    else setError(res.error);
    setLoading(false);
  }, [token, cityInput, transportMode, cuisines, dietary, openFilter]);

  const fetchHotels = useCallback(async () => {
    if (!token) return;
    setShowFilter(false);
    setLoading(true);
    setError(null);

    let dest = hotelCity.trim();

    if (!dest) {
      setError('Saisis une ville de destination.');
      setLoading(false);
      openFilter();
      return;
    }

    const params = new URLSearchParams({ destination: dest, checkIn, checkOut });
    const res = await api.get<Omit<HotelCard, '_type'>[]>(`/hotels/feed?${params}`, token);
    if (res.data) setCards(res.data.map(h => ({ ...h, _type: 'hotel' as const })));
    else setError(res.error);
    setLoading(false);
  }, [token, hotelCity, checkIn, checkOut, openFilter]);

  const handleSearch = useCallback(() => {
    if (mode === 'restaurant') fetchRestaurants();
    else fetchHotels();
  }, [mode, fetchRestaurants, fetchHotels]);

  // ── Swipe ────────────────────────────────────────────────────
  const recordSwipe = useCallback(async (card: AnyCard, action: 'LIKE' | 'DISLIKE' | 'SUPER_LIKE') => {
    if (!token) return;
    api.post('/swipe', {
      targetId: card.id,
      targetType: card._type === 'restaurant' ? 'RESTAURANT' : 'HOTEL',
      action,
    }, token);
  }, [token]);

  const swipeCard = useCallback((direction: 'left' | 'right' | 'up') => {
    const card = cards[0]; if (!card) return;
    const action = direction === 'right' ? 'LIKE' : direction === 'left' ? 'DISLIKE' : 'SUPER_LIKE';
    recordSwipe(card, action);
    const toX = direction === 'right' ? W * 1.5 : direction === 'left' ? -W * 1.5 : 0;
    const toY = direction === 'up' ? -H : 0;
    Animated.parallel([
      Animated.timing(translateX, { toValue: toX, duration: 300, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: toY, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      setCards(prev => prev.slice(1));
      translateX.setValue(0); translateY.setValue(0);
      setSwipeIndicator(null); setCurrentPhotoIndex(0);
    });
  }, [cards, recordSwipe]);

  const resetCard = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
    ]).start(() => setSwipeIndicator(null));
  }, []);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, { dx, dy }) => {
      translateX.setValue(dx); translateY.setValue(dy);
      if (dx > 50) setSwipeIndicator('like');
      else if (dx < -50) setSwipeIndicator('nope');
      else if (dy < -80) setSwipeIndicator('super');
      else setSwipeIndicator(null);
    },
    onPanResponderRelease: (_, { dx, dy }) => {
      if (dx > SWIPE_THRESHOLD) swipeCard('right');
      else if (dx < -SWIPE_THRESHOLD) swipeCard('left');
      else if (dy < -SWIPE_THRESHOLD) swipeCard('up');
      else resetCard();
    },
  });

  const toggle = (id: string, list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) =>
    setList(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // ── Écran filtre par étapes ───────────────────────────────────
  if (showFilter) {
    // Titres et sous-titres par étape
    const stepMeta = mode === 'restaurant'
      ? [
          { title: 'Où cherches-tu ? 📍',    sub: 'Entre une ville ou utilise ta position' },
          { title: 'Comment tu te déplaces ? 🗺️', sub: 'Définit le rayon de recherche' },
          { title: 'Tes préférences ? 🍽️',   sub: 'Cuisine et restrictions alimentaires' },
        ]
      : [
          { title: 'Où vas-tu ? 🏨',          sub: 'Entre la ville de destination' },
          { title: 'Quand arrives-tu ? 📅',    sub: 'Dates de check-in et check-out' },
        ];

    const { title, sub } = stepMeta[filterStep];

    return (
      <View style={styles.filterScreen}>
        <SafeAreaView style={{ flex: 1, width: '100%' }}>

          {/* Header */}
          <View style={styles.filterHeader}>
            {filterStep > 0 ? (
              <TouchableOpacity onPress={() => setFilterStep(s => s - 1)} style={styles.backBtn}>
                <Text style={styles.backBtnText}>← Retour</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 72 }} />
            )}
            {/* Dots de progression */}
            <View style={styles.progressDots}>
              {Array.from({ length: totalSteps }).map((_, i) => (
                <View key={i} style={[styles.progressDot, i <= filterStep && styles.progressDotActive]} />
              ))}
            </View>
            {/* Fermer si des cartes existent déjà */}
            {cards.length > 0 ? (
              <TouchableOpacity onPress={() => setShowFilter(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 72 }} />
            )}
          </View>

          {/* Titre de l'étape */}
          <View style={styles.stepTitleBlock}>
            <Text style={styles.stepTitle}>{title}</Text>
            <Text style={styles.stepSub}>{sub}</Text>
          </View>

          {/* Contenu de l'étape */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.stepContent}>

            {/* ── RESTAURANT ───────────────────────────────────── */}
            {mode === 'restaurant' && filterStep === 0 && (
              <>
                <View style={styles.cityRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={cityInput}
                    onChangeText={setCityInput}
                    placeholder="Paris, Lyon, Nantes…"
                    placeholderTextColor="#555"
                    returnKeyType="next"
                  />
                  <TouchableOpacity style={styles.gpsBtn} onPress={() => getGPSCity(setCityInput)}>
                    <Text style={styles.gpsBtnText}>📍</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.hint}>
                  Laisse vide pour utiliser automatiquement ta position GPS
                </Text>
              </>
            )}

            {mode === 'restaurant' && filterStep === 1 && (
              <View style={styles.transportGrid}>
                {TRANSPORT_MODES.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.transportCard, transportMode === t.id && styles.transportCardActive]}
                    onPress={() => setTransportMode(t.id)}
                  >
                    <Text style={styles.transportEmoji}>{t.emoji}</Text>
                    <Text style={[styles.transportLabel, transportMode === t.id && styles.transportLabelActive]}>
                      {t.label}
                    </Text>
                    <Text style={styles.transportSub}>{t.sub}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {mode === 'restaurant' && filterStep === 2 && (
              <>
                <Text style={styles.groupLabel}>Cuisines</Text>
                <View style={styles.chipsWrap}>
                  {CUISINE_OPTIONS.map(c => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.chip, cuisines.includes(c.id) && styles.chipActive]}
                      onPress={() => toggle(c.id, cuisines, setCuisines)}
                    >
                      <Text style={styles.chipEmoji}>{c.emoji}</Text>
                      <Text style={[styles.chipLabel, cuisines.includes(c.id) && styles.chipLabelActive]}>
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={[styles.groupLabel, { marginTop: 20 }]}>Restrictions alimentaires</Text>
                <View style={styles.chipsWrap}>
                  {DIETARY_OPTIONS.map(d => (
                    <TouchableOpacity
                      key={d.id}
                      style={[styles.chip, dietary.includes(d.id) && styles.chipActive]}
                      onPress={() => toggle(d.id, dietary, setDietary)}
                    >
                      <Text style={styles.chipEmoji}>{d.emoji}</Text>
                      <Text style={[styles.chipLabel, dietary.includes(d.id) && styles.chipLabelActive]}>
                        {d.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* ── HOTEL ────────────────────────────────────────── */}
            {mode === 'hotel' && filterStep === 0 && (
              <>
                <View style={styles.cityRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={hotelCity}
                    onChangeText={setHotelCity}
                    placeholder="Paris, Bordeaux, Nice…"
                    placeholderTextColor="#555"
                    returnKeyType="next"
                  />
                  <TouchableOpacity style={styles.gpsBtn} onPress={() => getGPSCity(setHotelCity)}>
                    <Text style={styles.gpsBtnText}>📍</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.hint}>
                  Utilise le bouton 📍 pour remplir avec ta ville actuelle
                </Text>
              </>
            )}

            {mode === 'hotel' && filterStep === 1 && (
              <>
                <Text style={styles.groupLabel}>Check-in</Text>
                <TextInput
                  style={styles.input}
                  value={checkIn}
                  onChangeText={setCheckIn}
                  placeholder="AAAA-MM-JJ"
                  placeholderTextColor="#555"
                />
                <Text style={[styles.groupLabel, { marginTop: 16 }]}>Check-out</Text>
                <TextInput
                  style={styles.input}
                  value={checkOut}
                  onChangeText={setCheckOut}
                  placeholder="AAAA-MM-JJ"
                  placeholderTextColor="#555"
                />
              </>
            )}

          </ScrollView>

          {/* Bouton Continuer / Rechercher */}
          <View style={styles.filterFooter}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TouchableOpacity
              style={styles.nextBtn}
              onPress={() => isLastStep ? handleSearch() : setFilterStep(s => s + 1)}
            >
              <Text style={styles.nextBtnText}>
                {isLastStep ? '🔍 Rechercher' : 'Continuer →'}
              </Text>
            </TouchableOpacity>
          </View>

        </SafeAreaView>
      </View>
    );
  }

  // ── Loading ───────────────────────────────────────────────────
  if (loading) return (
    <View style={styles.empty}>
      <ActivityIndicator color="#E8C547" size="large" />
      <Text style={styles.emptyLabel}>Chargement…</Text>
    </View>
  );

  // ── Vide / erreur ─────────────────────────────────────────────
  if (!cards[0]) return (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>{mode === 'restaurant' ? '🍽️' : '🏨'}</Text>
      <Text style={styles.emptyLabel}>{error ?? 'Aucun résultat dans cette zone'}</Text>
      <TouchableOpacity style={styles.reloadBtn} onPress={openFilter}>
        <Text style={styles.reloadBtnText}>🔍 Modifier les filtres</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Cartes ────────────────────────────────────────────────────
  const card         = cards[0];
  const isRestaurant = card._type === 'restaurant';
  const restaurant   = isRestaurant ? (card as RestaurantCard) : null;
  const hotel        = !isRestaurant ? (card as HotelCard) : null;
  const photoUrl     = restaurant?.photos?.[currentPhotoIndex]?.url;
  const stars        = restaurant?.michelinStars ?? hotel?.stars ?? 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <SafeAreaView style={styles.header}>
        <Text style={styles.headerTitle}>
          {mode === 'restaurant' ? '🍽️ Restaurants' : '🏨 Hôtels'}
        </Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.filterIconBtn} onPress={openFilter}>
            <Text style={styles.filterIconText}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.jamBtn} onPress={() => navigation?.navigate('Jam')}>
            <Text style={styles.jamBtnText}>🎵 Jam</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Card */}
      <Animated.View
        style={[styles.card, { transform: [{ translateX }, { translateY }, { rotate: cardRotation }] }]}
        {...panResponder.panHandlers}
      >
        {photoUrl ? (
          <Animated.Image source={{ uri: photoUrl }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={styles.hotelBg}>
            <Text style={styles.hotelBgEmoji}>🏨</Text>
            <Text style={styles.hotelBgName}>{card.name}</Text>
            {hotel && (
              <Text style={styles.hotelBgEnv}>
                {hotel.environment === 'CITY' ? '🏙️ Ville' : hotel.environment === 'COUNTRY' ? '🌿 Campagne' : '🏘️ Banlieue'}
              </Text>
            )}
          </View>
        )}

        {restaurant && restaurant.photos.length > 1 && (
          <>
            <View style={styles.photoDots}>
              {restaurant.photos.map((_, i) => (
                <View key={i} style={[styles.dot, i === currentPhotoIndex && styles.dotActive]} />
              ))}
            </View>
            <TouchableOpacity style={styles.photoNavLeft}
              onPress={() => setCurrentPhotoIndex(i => Math.max(0, i - 1))} />
            <TouchableOpacity style={styles.photoNavRight}
              onPress={() => setCurrentPhotoIndex(i => Math.min(restaurant.photos.length - 1, i + 1))} />
          </>
        )}

        <View style={styles.gradient}>
          {stars > 0 && (
            <View style={styles.starsRow}>
              {Array.from({ length: Math.min(stars, 3) }).map((_, i) => (
                <Text key={i} style={styles.star}>⭐</Text>
              ))}
            </View>
          )}
          <Text style={styles.cardName}>{card.name}</Text>
          <View style={styles.cardMeta}>
            <Text style={styles.cardCity}>📍 {card.city}</Text>
            {restaurant && <>
              <Text style={styles.cardCuisine}>{restaurant.cuisineType}</Text>
              <Text style={styles.cardPrice}>{'€'.repeat(restaurant.priceRange)}</Text>
            </>}
            {hotel && <Text style={styles.cardPrice}>{hotel.pricePerNight}€/nuit</Text>}
          </View>
          {hotel && hotel.amenities.length > 0 && (
            <Text style={styles.amenities} numberOfLines={1}>
              {hotel.amenities.slice(0, 3).join(' · ')}
            </Text>
          )}
        </View>

        {swipeIndicator === 'like' && <View style={[styles.indicator, styles.indicatorLike]}><Text style={styles.indicatorText}>LIKE 💚</Text></View>}
        {swipeIndicator === 'nope' && <View style={[styles.indicator, styles.indicatorNope]}><Text style={styles.indicatorText}>NOPE ✕</Text></View>}
        {swipeIndicator === 'super' && <View style={[styles.indicator, styles.indicatorSuper]}><Text style={styles.indicatorText}>SUPER ⭐</Text></View>}
      </Animated.View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, styles.actionNope]} onPress={() => swipeCard('left')}>
          <Text style={styles.actionIcon}>✕</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.actionSuper]} onPress={() => swipeCard('up')}>
          <Text style={styles.actionIcon}>⭐</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.actionLike]} onPress={() => swipeCard('right')}>
          <Text style={styles.actionIcon}>💛</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Filtre ──
  filterScreen: { flex: 1, backgroundColor: '#0A0A0A' },
  filterHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#1A1A1A',
  },
  backBtn: { width: 72 },
  backBtnText: { color: '#E8C547', fontSize: 14, fontWeight: '600' },
  closeBtn: { width: 72, alignItems: 'flex-end' },
  closeBtnText: { color: '#666', fontSize: 22, fontWeight: '600' },
  progressDots: { flexDirection: 'row', gap: 6 },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2A2A2A' },
  progressDotActive: { backgroundColor: '#E8C547', width: 24 },
  stepTitleBlock: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 8 },
  stepTitle: { color: '#fff', fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginBottom: 6 },
  stepSub: { color: '#666', fontSize: 15 },
  stepContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 12 },
  filterFooter: { paddingHorizontal: 24, paddingBottom: 24, paddingTop: 8, gap: 10 },
  errorText: { color: '#FF4458', fontSize: 13, textAlign: 'center' },
  nextBtn: {
    backgroundColor: '#E8C547', paddingVertical: 17, borderRadius: 16, alignItems: 'center',
  },
  nextBtnText: { color: '#0A0A0A', fontSize: 17, fontWeight: '800' },

  // ── Champs ──
  cityRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: {
    backgroundColor: '#141414', borderWidth: 1.5, borderColor: '#2A2A2A',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15,
    color: '#fff', fontSize: 16,
  },
  gpsBtn: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: '#141414',
    borderWidth: 1.5, borderColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center',
  },
  gpsBtnText: { fontSize: 24 },
  hint: { color: '#444', fontSize: 12, marginTop: 8 },
  groupLabel: { color: '#888', fontSize: 13, fontWeight: '600', marginBottom: 12 },

  // ── Transport ──
  transportGrid: { gap: 12 },
  transportCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#141414', padding: 18, borderRadius: 16,
    borderWidth: 1.5, borderColor: '#2A2A2A',
  },
  transportCardActive: { borderColor: '#E8C547', backgroundColor: 'rgba(232,197,71,0.1)' },
  transportEmoji: { fontSize: 30 },
  transportLabel: { color: '#888', fontSize: 16, fontWeight: '700', flex: 1 },
  transportLabelActive: { color: '#E8C547' },
  transportSub: { color: '#444', fontSize: 13 },

  // ── Chips ──
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#141414', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 50, borderWidth: 1.5, borderColor: '#2A2A2A',
  },
  chipActive: { backgroundColor: 'rgba(232,197,71,0.15)', borderColor: '#E8C547' },
  chipEmoji: { fontSize: 18 },
  chipLabel: { color: '#888', fontSize: 14, fontWeight: '600' },
  chipLabelActive: { color: '#E8C547' },

  // ── Swipe screen ──
  container: { flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center' },
  header: {
    width: '100%', flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, zIndex: 10,
  },
  headerTitle: { color: '#E8C547', fontSize: 18, fontWeight: '700', letterSpacing: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  filterIconBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#1A1A1A',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2A2A2A',
  },
  filterIconText: { fontSize: 16 },
  jamBtn: { backgroundColor: '#E8C547', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  jamBtnText: { color: '#0A0A0A', fontWeight: '700', fontSize: 13 },
  card: {
    position: 'absolute', top: 80, width: W - 24, height: H * 0.65,
    borderRadius: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20,
  },
  photo: { width: '100%', height: '100%', position: 'absolute' },
  hotelBg: { flex: 1, backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center', gap: 12 },
  hotelBgEmoji: { fontSize: 72 },
  hotelBgName: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center', paddingHorizontal: 20 },
  hotelBgEnv: { color: '#E8C547', fontSize: 16, fontWeight: '600' },
  photoDots: {
    position: 'absolute', top: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 4,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotActive: { backgroundColor: '#fff', width: 20 },
  photoNavLeft: { position: 'absolute', left: 0, top: 0, width: W * 0.35, height: '70%' },
  photoNavRight: { position: 'absolute', right: 0, top: 0, width: W * 0.35, height: '70%' },
  gradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 28,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  starsRow: { flexDirection: 'row', marginBottom: 4 },
  star: { fontSize: 14, marginRight: 2 },
  cardName: { color: '#fff', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  cardCity: { color: 'rgba(255,255,255,0.75)', fontSize: 14 },
  cardCuisine: { color: '#E8C547', fontSize: 13, fontWeight: '600' },
  cardPrice: { color: 'rgba(255,255,255,0.75)', fontSize: 14, marginLeft: 'auto' },
  amenities: { color: '#AAA', fontSize: 12, marginTop: 6 },
  indicator: {
    position: 'absolute', top: 40, padding: 10, paddingHorizontal: 20,
    borderWidth: 3, borderRadius: 8,
  },
  indicatorLike: { left: 20, borderColor: '#00E676', transform: [{ rotate: '-15deg' }] },
  indicatorNope: { right: 20, borderColor: '#FF4458', transform: [{ rotate: '15deg' }] },
  indicatorSuper: { alignSelf: 'center', bottom: 40, borderColor: '#00C2E8' },
  indicatorText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  actions: { position: 'absolute', bottom: 24, flexDirection: 'row', gap: 20, alignItems: 'center' },
  actionBtn: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#1A1A1A',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  actionNope: { borderColor: '#FF4458', borderWidth: 2 },
  actionSuper: { width: 50, height: 50, borderRadius: 25, borderColor: '#00C2E8', borderWidth: 2 },
  actionLike: { borderColor: '#E8C547', borderWidth: 2 },
  actionIcon: { fontSize: 24 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0A0A', gap: 12 },
  emptyEmoji: { fontSize: 60 },
  emptyLabel: { color: '#555', fontSize: 16, textAlign: 'center', paddingHorizontal: 32 },
  reloadBtn: { marginTop: 8, backgroundColor: '#E8C547', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14 },
  reloadBtnText: { color: '#0A0A0A', fontWeight: '700', fontSize: 15 },
});
