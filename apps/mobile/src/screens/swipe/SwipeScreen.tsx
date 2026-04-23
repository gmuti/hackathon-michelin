import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity,
  Animated, PanResponder, StatusBar, SafeAreaView,
  ActivityIndicator, TextInput, ScrollView, Modal, Linking,
} from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../config/api';
import MiniMap from "../../components/MiniMap.web";
import { MichelinStar, MichelinStars } from '../../components/MichelinStar';

const { width: W, height: H } = Dimensions.get('window');
const SWIPE_THRESHOLD = W * 0.3;

// ── Types ──────────────────────────────────────────────────────────────────
type RestaurantCard = {
  _type: 'restaurant';
  id: string; name: string; city: string; address: string;
  lat: number; lng: number;
  michelinStars: number; cuisineType: string; priceRange: number;
  photos: { url: string; position: number }[];
  distance: number;
  chef?: string; phone?: string; email?: string; website?: string;
  hours?: Record<string, string>;
  reviews?: Review[];
};
type HotelCard = {
  _type: 'hotel';
  id: string; name: string; city: string; country: string;
  lat: number; lng: number;
  environment: string; stars: number; pricePerNight: number;
  amenities: string[]; accommodationType: string;
  maxGuests: number; numBeds: number;
  phone?: string; email?: string; website?: string;
  reviews?: Review[];
};
type Review = {
  id: string; rating: number; content: string; likes: number;
  user: { id: string; username: string; role: string; certifiedVisits: number };
};
type AnyCard = RestaurantCard | HotelCard;

// ── Options ────────────────────────────────────────────────────────────────
const DISTANCE_OPTIONS = [
  { id: '1',  label: '< 1 km',    km: 1   },
  { id: '5',  label: '1 – 5 km',  km: 5   },
  { id: '15', label: '5 – 15 km', km: 15  },
  { id: '50', label: '15 – 50 km',km: 50  },
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
const AMENITY_OPTIONS = [
  { id: 'piscine',       label: 'Piscine',       emoji: '🏊' },
  { id: 'plage',         label: 'Plage',          emoji: '🏖️' },
  { id: 'salle de sport',label: 'Salle de sport', emoji: '🏋️' },
  { id: 'spa',           label: 'Spa',            emoji: '🧖' },
  { id: 'animaux acceptés', label: 'Animaux',    emoji: '🐾' },
  { id: 'restaurant gastronomique', label: 'Restaurant', emoji: '🍽️' },
];
const ACCOMMODATION_TYPES = [
  { id: 'hotel',     label: 'Hôtel',       emoji: '🏨' },
  { id: 'apartment', label: 'Appartement', emoji: '🏢' },
  { id: 'house',     label: 'Maison',      emoji: '🏠' },
  { id: 'chalet',    label: 'Chalet',      emoji: '🏡' },
  { id: 'camping',   label: 'Camping',     emoji: '⛺' },
];

function todayStr() { return new Date().toISOString().split('T')[0]; }
function plusDaysStr(n: number) {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}


function weightedRating(reviews: Review[]): number {
  if (reviews.length === 0) return 0;
  const ROLE_WEIGHT: Record<string, number> = {
    CHEF_ETOILE: 5, CHEF: 4, SOUS_CHEF: 3, COMMIS: 2, SERVEUR: 1.5, PLONGEUR: 1,
  };
  let total = 0; let weights = 0;
  for (const r of reviews) {
    const rw = ROLE_WEIGHT[r.user.role] ?? 1;
    const vw = Math.min(1 + r.user.certifiedVisits * 0.1, 3);
    const lw = 1 + Math.log1p(r.likes) * 0.2;
    const w = rw * vw * lw;
    total += r.rating * w;
    weights += w;
  }
  return weights > 0 ? total / weights : 0;
}

// ── Component ──────────────────────────────────────────────────────────────
export default function SwipeScreen({ route, navigation }: any) {
  const mode: 'restaurant' | 'hotel' = route?.params?.mode ?? 'restaurant';
  const { token, user } = useAuth();

  // Cards state
  const [cards, setCards]                   = useState<AnyCard[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [showFilter, setShowFilter]         = useState(true);
  const [filterStep, setFilterStep]         = useState(0);
  const [showCountdown, setShowCountdown]   = useState(false);
  const [countdown, setCountdown]           = useState(3);
  const [showDetail, setShowDetail]         = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matches, setMatches]               = useState<AnyCard[]>([]);

  // Restaurant filters
  const [cityInput, setCityInput]   = useState('');
  const [distanceId, setDistanceId] = useState('15');
  const [cuisines, setCuisines]     = useState<string[]>(
    (user?.cuisinePreferences ?? []).filter(x => x !== 'all'),
  );
  const [dietary, setDietary]       = useState<string[]>(user?.dietaryRestrictions ?? []);

  // Hotel filters
  const [hotelCity, setHotelCity]               = useState('');
  const [hotelDistanceId, setHotelDistanceId]   = useState('50');
  const [checkIn, setCheckIn]                   = useState(todayStr);
  const [checkOut, setCheckOut]                 = useState(() => plusDaysStr(3));
  const [guestCount, setGuestCount]             = useState(2);
  const [bedCount, setBedCount]                 = useState(1);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [accommodationType, setAccommodationType] = useState('');

  const totalSteps    = mode === 'restaurant' ? 3 : 5;
  const isLastStep    = filterStep === totalSteps - 1;

  const openFilter = useCallback(() => { setFilterStep(0); setShowFilter(true); }, []);

  // ── Swipe animation ──────────────────────────────────────────────────────
  const translateX   = useRef(new Animated.Value(0)).current;
  const translateY   = useRef(new Animated.Value(0)).current;
  const cardRotation = translateX.interpolate({ inputRange: [-W, 0, W], outputRange: ['-15deg', '0deg', '15deg'] });

  // Progressive indicator opacity
  const likeOpacity  = translateX.interpolate({ inputRange: [20, 120],  outputRange: [0, 1], extrapolate: 'clamp' });
  const nopeOpacity  = translateX.interpolate({ inputRange: [-120, -20], outputRange: [1, 0], extrapolate: 'clamp' });
  const superOpacity = translateY.interpolate({ inputRange: [-120, -40], outputRange: [1, 0], extrapolate: 'clamp' });

  // ── GPS helpers ──────────────────────────────────────────────────────────
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

  const getGPSCoords = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return { lat: loc.coords.latitude, lng: loc.coords.longitude };
    } catch { return null; }
  };

  // ── Countdown ────────────────────────────────────────────────────────────
  const startCountdown = useCallback((onDone: () => void) => {
    setShowFilter(false);
    setShowCountdown(true);
    setCountdown(3);
    let c = 3;
    const interval = setInterval(() => {
      c -= 1;
      setCountdown(c);
      if (c === 0) {
        clearInterval(interval);
        setTimeout(() => {
          setShowCountdown(false);
          onDone();
        }, 500);
      }
    }, 1000);
  }, []);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchRestaurants = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError(null);

    let coords: { lat: number; lng: number } | null = null;
    if (cityInput.trim()) {
      coords = await geocodeCity(cityInput.trim());
      if (!coords) { setError(`Ville introuvable : "${cityInput}"`); setLoading(false); openFilter(); return; }
    } else {
      coords = await getGPSCoords();
      if (!coords) { setError('Saisis une ville ou autorise la géolocalisation.'); setLoading(false); openFilter(); return; }
    }

    const distanceKm = DISTANCE_OPTIONS.find(d => d.id === distanceId)?.km ?? 15;
    const params = new URLSearchParams({
      lat: String(coords.lat), lng: String(coords.lng), distanceKm: String(distanceKm),
    });
    cuisines.forEach(c => params.append('cuisineTypes', c));
    dietary.forEach(d => params.append('dietaryRestrictions', d));

    const res = await api.get<Omit<RestaurantCard, '_type'>[]>(`/restaurants/feed?${params}`, token);
    if (res.data) setCards(res.data.map(r => ({ ...r, _type: 'restaurant' as const })));
    else setError(res.error);
    setLoading(false);
  }, [token, cityInput, distanceId, cuisines, dietary]);

  const fetchHotels = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError(null);

    const dest = hotelCity.trim();
    if (!dest) { setError('Saisis une ville de destination.'); setLoading(false); openFilter(); return; }

    const distanceKm = DISTANCE_OPTIONS.find(d => d.id === hotelDistanceId)?.km ?? 50;
    const params = new URLSearchParams({ destination: dest, distanceKm: String(distanceKm), checkIn, checkOut });
    if (guestCount) params.set('maxGuests', String(guestCount));
    if (accommodationType) params.set('accommodationType', accommodationType);
    selectedAmenities.forEach(a => params.append('amenities', a));

    const res = await api.get<Omit<HotelCard, '_type'>[]>(`/hotels/feed?${params}`, token);
    if (res.data) setCards(res.data.map(h => ({ ...h, _type: 'hotel' as const })));
    else setError(res.error);
    setLoading(false);
  }, [token, hotelCity, hotelDistanceId, checkIn, checkOut, guestCount, bedCount, selectedAmenities, accommodationType]);

  const handleSearch = useCallback(() => {
    startCountdown(() => {
      if (mode === 'restaurant') fetchRestaurants();
      else fetchHotels();
    });
  }, [mode, fetchRestaurants, fetchHotels, startCountdown]);

  // ── Swipe ────────────────────────────────────────────────────────────────
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
      const next = cards.slice(1);
      setCards(next);
      translateX.setValue(0); translateY.setValue(0);
      setCurrentPhotoIndex(0);
      // Show match modal when last card swiped
      if (next.length === 0) {
        loadMatches();
      }
    });
  }, [cards, recordSwipe]);

  const loadMatches = useCallback(async () => {
    if (!token) return;
    const targetType = mode === 'restaurant' ? 'RESTAURANT' : 'HOTEL';
    const res = await api.get<AnyCard[]>(`/swipe/matches?targetType=${targetType}`, token);
    if (res.data && res.data.length > 0) {
      setMatches(res.data.map(m => ({ ...m, _type: mode })) as AnyCard[]);
      setShowMatchModal(true);
    }
  }, [token, mode]);

  const resetCard = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
    ]).start();
  }, []);

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, { dx, dy }) => {
      translateX.setValue(dx);
      translateY.setValue(dy);
    },
    onPanResponderRelease: (_, { dx, dy }) => {
      if (dx > SWIPE_THRESHOLD) swipeCard('right');
      else if (dx < -SWIPE_THRESHOLD) swipeCard('left');
      else if (dy < -SWIPE_THRESHOLD) swipeCard('up');
      else resetCard();
    },
  })).current;

  const toggle = (id: string, list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) =>
    setList(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // ── Countdown screen ─────────────────────────────────────────────────────
  if (showCountdown) {
    return (
      <View style={styles.countdown}>
        <Text style={styles.countdownNum}>{countdown === 0 ? '🚀' : countdown}</Text>
        <Text style={styles.countdownLabel}>
          {countdown === 3 ? 'Prêt ?' : countdown === 0 ? "C'est parti !" : '…'}
        </Text>
      </View>
    );
  }

  // ── Filter screen ────────────────────────────────────────────────────────
  if (showFilter) {
    const stepMeta = mode === 'restaurant'
      ? [
          { title: 'Où cherches-tu ? 📍',    sub: 'Entre une ville ou utilise ta position' },
          { title: 'Quelle distance ? 📏',    sub: 'Rayon de recherche autour de toi' },
          { title: 'Tes préférences ? 🍽️',   sub: 'Cuisine et restrictions alimentaires' },
        ]
      : [
          { title: 'Où vas-tu ? 🏨',          sub: 'Entre la ville de destination' },
          { title: 'Quelle distance ? 📏',     sub: 'Rayon autour de la destination' },
          { title: 'Combien de personnes ? 👥', sub: 'Capacité et nombre de lits' },
          { title: 'Équipements ? ✨',         sub: 'Sélectionne ce qui compte pour toi' },
          { title: 'Type de logement ? 🏠',    sub: 'Choisis le style qui te convient' },
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
              <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
                <Text style={styles.backBtnText}>← Carte</Text>
              </TouchableOpacity>
            )}
            <View style={styles.progressDots}>
              {Array.from({ length: totalSteps }).map((_, i) => (
                <View key={i} style={[styles.progressDot, i <= filterStep && styles.progressDotActive]} />
              ))}
            </View>
            {cards.length > 0 ? (
              <TouchableOpacity onPress={() => setShowFilter(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 72 }} />
            )}
          </View>

          {/* Title */}
          <View style={styles.stepTitleBlock}>
            <Text style={styles.stepTitle}>{title}</Text>
            <Text style={styles.stepSub}>{sub}</Text>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.stepContent}>

            {/* ── RESTAURANT steps ── */}
            {mode === 'restaurant' && filterStep === 0 && (
              <>
                <View style={styles.cityRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={cityInput} onChangeText={setCityInput}
                    placeholder="Paris, Lyon, Nantes…" placeholderTextColor="#555"
                  />
                  <TouchableOpacity style={styles.gpsBtn} onPress={() => getGPSCity(setCityInput)}>
                    <Text style={styles.gpsBtnText}>📍</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.hint}>Laisse vide pour utiliser ta position GPS</Text>
              </>
            )}

            {mode === 'restaurant' && filterStep === 1 && (
              <View style={styles.distanceGrid}>
                {DISTANCE_OPTIONS.map(d => (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.distanceCard, distanceId === d.id && styles.distanceCardActive]}
                    onPress={() => setDistanceId(d.id)}
                  >
                    <Text style={[styles.distanceLabel, distanceId === d.id && styles.distanceLabelActive]}>
                      {d.label}
                    </Text>
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
                      <Text style={[styles.chipLabel, cuisines.includes(c.id) && styles.chipLabelActive]}>{c.label}</Text>
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
                      <Text style={[styles.chipLabel, dietary.includes(d.id) && styles.chipLabelActive]}>{d.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* ── HOTEL steps ── */}
            {mode === 'hotel' && filterStep === 0 && (
              <>
                <View style={styles.cityRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={hotelCity} onChangeText={setHotelCity}
                    placeholder="Paris, Bordeaux, Nice…" placeholderTextColor="#555"
                  />
                  <TouchableOpacity style={styles.gpsBtn} onPress={() => getGPSCity(setHotelCity)}>
                    <Text style={styles.gpsBtnText}>📍</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.groupLabel, { marginTop: 20 }]}>Check-in</Text>
                <TextInput style={styles.input} value={checkIn} onChangeText={setCheckIn} placeholder="AAAA-MM-JJ" placeholderTextColor="#555" />
                <Text style={[styles.groupLabel, { marginTop: 12 }]}>Check-out</Text>
                <TextInput style={styles.input} value={checkOut} onChangeText={setCheckOut} placeholder="AAAA-MM-JJ" placeholderTextColor="#555" />
              </>
            )}

            {mode === 'hotel' && filterStep === 1 && (
              <View style={styles.distanceGrid}>
                {DISTANCE_OPTIONS.map(d => (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.distanceCard, hotelDistanceId === d.id && styles.distanceCardActive]}
                    onPress={() => setHotelDistanceId(d.id)}
                  >
                    <Text style={[styles.distanceLabel, hotelDistanceId === d.id && styles.distanceLabelActive]}>
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {mode === 'hotel' && filterStep === 2 && (
              <>
                <Text style={styles.groupLabel}>Voyageurs</Text>
                <View style={styles.counterRow}>
                  <TouchableOpacity style={styles.counterBtn} onPress={() => setGuestCount(g => Math.max(1, g - 1))}>
                    <Text style={styles.counterBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.counterValue}>👤 {guestCount} personne{guestCount > 1 ? 's' : ''}</Text>
                  <TouchableOpacity style={styles.counterBtn} onPress={() => setGuestCount(g => Math.min(20, g + 1))}>
                    <Text style={styles.counterBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.groupLabel, { marginTop: 24 }]}>Lits</Text>
                <View style={styles.counterRow}>
                  <TouchableOpacity style={styles.counterBtn} onPress={() => setBedCount(b => Math.max(1, b - 1))}>
                    <Text style={styles.counterBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.counterValue}>🛏️ {bedCount} lit{bedCount > 1 ? 's' : ''}</Text>
                  <TouchableOpacity style={styles.counterBtn} onPress={() => setBedCount(b => Math.min(10, b + 1))}>
                    <Text style={styles.counterBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {mode === 'hotel' && filterStep === 3 && (
              <>
                <Text style={styles.groupLabel}>Équipements souhaités</Text>
                <View style={styles.chipsWrap}>
                  {AMENITY_OPTIONS.map(a => (
                    <TouchableOpacity
                      key={a.id}
                      style={[styles.chip, selectedAmenities.includes(a.id) && styles.chipActive]}
                      onPress={() => toggle(a.id, selectedAmenities, setSelectedAmenities)}
                    >
                      <Text style={styles.chipEmoji}>{a.emoji}</Text>
                      <Text style={[styles.chipLabel, selectedAmenities.includes(a.id) && styles.chipLabelActive]}>{a.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {mode === 'hotel' && filterStep === 4 && (
              <>
                <Text style={styles.groupLabel}>Type de logement</Text>
                <View style={styles.distanceGrid}>
                  {ACCOMMODATION_TYPES.map(t => (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.distanceCard, accommodationType === t.id && styles.distanceCardActive]}
                      onPress={() => setAccommodationType(prev => prev === t.id ? '' : t.id)}
                    >
                      <Text style={styles.accomEmoji}>{t.emoji}</Text>
                      <Text style={[styles.distanceLabel, accommodationType === t.id && styles.distanceLabelActive]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.hint}>Laisse vide pour voir tous les types</Text>
              </>
            )}

          </ScrollView>

          <View style={styles.filterFooter}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TouchableOpacity style={styles.nextBtn} onPress={() => isLastStep ? handleSearch() : setFilterStep(s => s + 1)}>
              <Text style={styles.nextBtnText}>{isLastStep ? '🚀 Lancer la recherche' : 'Continuer →'}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <View style={styles.empty}>
      <ActivityIndicator color="#ba0b2f" size="large" />
      <Text style={styles.emptyLabel}>Chargement…</Text>
    </View>
  );

  // ── Empty ─────────────────────────────────────────────────────────────────
  if (!cards[0]) return (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>{mode === 'restaurant' ? '🍽️' : '🏨'}</Text>
      <Text style={styles.emptyLabel}>{error ?? 'Aucun résultat dans cette zone'}</Text>
      <TouchableOpacity style={styles.reloadBtn} onPress={openFilter}>
        <Text style={styles.reloadBtnText}>Modifier les filtres</Text>
      </TouchableOpacity>
      {/* Match modal trigger if we have matches */}
      <TouchableOpacity style={[styles.reloadBtn, { marginTop: 10, backgroundColor: '#fff' }]}
        onPress={() => loadMatches()}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MichelinStar size={15} />
          <Text style={[styles.reloadBtnText, { color: '#ba0b2f' }]}>Voir mes favoris</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  // ── Swipe cards ───────────────────────────────────────────────────────────
  const card         = cards[0];
  const isRestaurant = card._type === 'restaurant';
  const restaurant   = isRestaurant ? (card as RestaurantCard) : null;
  const hotel        = !isRestaurant ? (card as HotelCard) : null;
  const photoUrl     = restaurant?.photos?.[currentPhotoIndex]?.url;
  const stars        = restaurant?.michelinStars ?? hotel?.stars ?? 0;
  const reviews      = card.reviews ?? [];
  const wRating      = weightedRating(reviews);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <SafeAreaView style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backArrow}>
          <Text style={styles.backArrowText}>←</Text>
        </TouchableOpacity>
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

      {/* Cards stack (background card) */}
      {cards[1] && (
        <View style={[styles.card, styles.cardBehind]}>
          <View style={styles.hotelBg}>
            <Text style={styles.hotelBgName}>{cards[1].name}</Text>
          </View>
        </View>
      )}

      {/* Front card */}
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

        {/* Photo navigation */}
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

        {/* Card info overlay */}
        <View style={styles.gradient}>
          {stars > 0 && <MichelinStars count={stars} size={14} style={styles.starsRow} />}
          <Text style={styles.cardName}>{card.name}</Text>
          <View style={styles.cardMeta}>
            <Text style={styles.cardCity}>📍 {card.city}</Text>
            {restaurant && (
              <>
                <Text style={styles.cardCuisine}>{restaurant.cuisineType}</Text>
                <Text style={styles.cardPrice}>{'€'.repeat(restaurant.priceRange)}</Text>
              </>
            )}
            {hotel && <Text style={styles.cardPrice}>{hotel.pricePerNight}€/nuit</Text>}
          </View>
          {wRating > 0 && (
            <Text style={styles.cardRating}>★ {wRating.toFixed(1)} pondéré</Text>
          )}
          {/* Voir plus */}
          <TouchableOpacity style={styles.detailBtn} onPress={() => setShowDetail(true)}>
            <Text style={styles.detailBtnText}>Voir plus ↓</Text>
          </TouchableOpacity>
        </View>

        {/* Progressive indicators */}
        <Animated.View style={[styles.indicator, styles.indicatorLike, { opacity: likeOpacity }]}>
          <Text style={styles.indicatorText}>❤️</Text>
        </Animated.View>
        <Animated.View style={[styles.indicator, styles.indicatorNope, { opacity: nopeOpacity }]}>
          <Text style={styles.indicatorText}>❌</Text>
        </Animated.View>
        <Animated.View style={[styles.indicator, styles.indicatorSuper, { opacity: superOpacity }]}>
          <MichelinStar size={28} />
        </Animated.View>
      </Animated.View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, styles.actionNope]} onPress={() => swipeCard('left')}>
          <Text style={styles.actionIcon}>✕</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.actionSuper]} onPress={() => swipeCard('up')}>
          <MichelinStar size={24} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.actionLike]} onPress={() => swipeCard('right')}>
          <Text style={styles.actionIcon}>💛</Text>
        </TouchableOpacity>
      </View>

      {/* ── Detail Modal ── */}
      <Modal visible={showDetail} animationType="slide" onRequestClose={() => setShowDetail(false)}>
        <View style={styles.detailModal}>
          <SafeAreaView style={styles.detailSafe}>
            <TouchableOpacity style={styles.detailClose} onPress={() => setShowDetail(false)}>
              <Text style={styles.detailCloseText}>✕ Fermer</Text>
            </TouchableOpacity>
          </SafeAreaView>
          <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailContent}>
            {/* Name + stars */}
            <Text style={styles.detailName}>{card.name}</Text>
            {stars > 0 && <MichelinStars count={stars} size={20} style={{ marginBottom: 16 }} />}

            {/* Chef */}
            {restaurant?.chef && (
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>👨‍🍳</Text>
                <View>
                  <Text style={styles.detailRowLabel}>Chef</Text>
                  <Text style={styles.detailRowValue}>{restaurant.chef}</Text>
                </View>
              </View>
            )}

            {/* Mini-map */}
            <Text style={styles.detailSectionTitle}>📍 Localisation</Text>
            <MiniMap lat={card.lat} lng={card.lng} style={styles.miniMap} />
            <Text style={styles.detailAddress}>
              {restaurant?.address ?? `${card.city}, ${hotel?.country}`}
            </Text>

            {/* Price */}
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>💰</Text>
              <View>
                <Text style={styles.detailRowLabel}>Prix</Text>
                <Text style={styles.detailRowValue}>
                  {restaurant
                    ? `${'€'.repeat(restaurant.priceRange)} (gamme ${['entrée de gamme', 'milieu de gamme', 'premium', 'luxe'][restaurant.priceRange - 1] ?? ''})`
                    : `${hotel?.pricePerNight}€ / nuit`}
                </Text>
              </View>
            </View>

            {/* Hours */}
            {restaurant?.hours && (
              <>
                <Text style={styles.detailSectionTitle}>🕒 Horaires</Text>
                {Object.entries(restaurant.hours).map(([day, hours]) => (
                  <View key={day} style={styles.hoursRow}>
                    <Text style={styles.hoursDay}>{day.charAt(0).toUpperCase() + day.slice(1)}</Text>
                    <Text style={[styles.hoursValue, hours === 'Fermé' && styles.hoursClosed]}>{hours}</Text>
                  </View>
                ))}
              </>
            )}

            {/* Hotel amenities */}
            {hotel && hotel.amenities.length > 0 && (
              <>
                <Text style={styles.detailSectionTitle}>✨ Équipements</Text>
                <View style={styles.amenitiesWrap}>
                  {hotel.amenities.map(a => (
                    <View key={a} style={styles.amenityChip}>
                      <Text style={styles.amenityChipText}>{a}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 16 }}>
                  <MichelinStar size={14} />
                  <Text style={[styles.detailSectionTitle, { marginVertical: 0 }]}>Avis</Text>
                </View>
                <View style={styles.ratingBig}>
                  <Text style={styles.ratingBigNum}>{wRating.toFixed(1)}</Text>
                  <Text style={styles.ratingBigSub}>score pondéré · {reviews.length} avis certifiés</Text>
                </View>
                {reviews.map(rv => (
                  <View key={rv.id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <Text style={styles.reviewUser}>@{rv.user.username}</Text>
                      <Text style={styles.reviewBadge}>{rv.user.role.replace('_', ' ')}</Text>
                    </View>
                    <Text style={styles.reviewRating}>{'★'.repeat(Math.round(rv.rating))} {rv.rating}/5</Text>
                    <Text style={styles.reviewContent}>{rv.content}</Text>
                    <Text style={styles.reviewLikes}>👍 {rv.likes}</Text>
                  </View>
                ))}
              </>
            )}

            {/* Contact */}
            <Text style={styles.detailSectionTitle}>📞 Contact</Text>
            {(restaurant?.phone ?? hotel?.phone) && (
              <TouchableOpacity style={styles.contactRow}
                onPress={() => Linking.openURL(`tel:${restaurant?.phone ?? hotel?.phone}`)}>
                <Text style={styles.contactIcon}>📞</Text>
                <Text style={styles.contactValue}>{restaurant?.phone ?? hotel?.phone}</Text>
              </TouchableOpacity>
            )}
            {(restaurant?.email ?? hotel?.email) && (
              <TouchableOpacity style={styles.contactRow}
                onPress={() => Linking.openURL(`mailto:${restaurant?.email ?? hotel?.email}`)}>
                <Text style={styles.contactIcon}>✉️</Text>
                <Text style={styles.contactValue}>{restaurant?.email ?? hotel?.email}</Text>
              </TouchableOpacity>
            )}
            {(restaurant?.website ?? hotel?.website) && (
              <TouchableOpacity style={styles.contactRow}
                onPress={() => Linking.openURL(restaurant?.website ?? hotel?.website ?? '')}>
                <Text style={styles.contactIcon}>🌐</Text>
                <Text style={styles.contactValue}>{restaurant?.website ?? hotel?.website}</Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* ── Match Modal ── */}
      <Modal visible={showMatchModal} animationType="fade" transparent onRequestClose={() => setShowMatchModal(false)}>
        <View style={styles.matchOverlay}>
          <View style={styles.matchBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
              <MichelinStar size={20} />
              <Text style={[styles.matchTitle, { marginBottom: 0 }]}>Tes Matches</Text>
              <MichelinStar size={20} />
            </View>
            <Text style={styles.matchSub}>Basés sur ton historique de swipe</Text>
            <ScrollView style={{ maxHeight: 350 }}>
              {matches.map((m, idx) => {
                const isSuperLike = (m as any).isSuperLike;
                return (
                  <View key={m.id} style={styles.matchItem}>
                    {isSuperLike
                      ? <MichelinStar size={24} />
                      : <Text style={styles.matchItemEmoji}>❤️</Text>}
                    <View style={styles.matchItemInfo}>
                      <Text style={styles.matchItemName}>{m.name}</Text>
                      <Text style={styles.matchItemSub}>{m.city}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.matchClose} onPress={() => { setShowMatchModal(false); openFilter(); }}>
              <Text style={styles.matchCloseText}>🔍 Nouvelle recherche</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.matchCloseSecondary} onPress={() => setShowMatchModal(false)}>
              <Text style={styles.matchCloseSecondaryText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Filter ──
  filterScreen: { flex: 1, backgroundColor: '#fff' },
  filterHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#ba0b2f',
  },
  backBtn: { width: 72 },
  backBtnText: { color: '#ba0b2f', fontSize: 14, fontWeight: '600' },
  closeBtn: { width: 72, alignItems: 'flex-end' },
  closeBtnText: { color: '#666', fontSize: 22, fontWeight: '600' },
  progressDots: { flexDirection: 'row', gap: 6 },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2A2A2A' },
  progressDotActive: { backgroundColor: '#ba0b2f', width: 24 },
  stepTitleBlock: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 8 },
  stepTitle: { color: '#1A1A1A', fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginBottom: 6 },
  stepSub: { color: '#666', fontSize: 15 },
  stepContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 12 },
  filterFooter: { paddingHorizontal: 24, paddingBottom: 24, paddingTop: 8, gap: 10 },
  errorText: { color: '#FF4458', fontSize: 13, textAlign: 'center' },
  nextBtn: { backgroundColor: '#ba0b2f', paddingVertical: 17, borderRadius: 16, alignItems: 'center' },
  nextBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },

  // ── Inputs ──
  cityRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: {
    backgroundColor: '#f7f7f7', borderWidth: 1.5, borderColor: '#ba0b2f',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15,
    color: '#000000', fontSize: 16, marginBottom: 8,
  },
  gpsBtn: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: '#ba0b2f', alignItems: 'center', justifyContent: 'center',
  },
  gpsBtnText: { fontSize: 24 },
  hint: { color: '#444', fontSize: 12, marginTop: 4 },
  groupLabel: { color: '#888', fontSize: 13, fontWeight: '600', marginBottom: 12 },

  // ── Distance ──
  distanceGrid: { gap: 12 },
  distanceCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    backgroundColor: '#fff', padding: 20, borderRadius: 16,
    borderWidth: 1.5, borderColor: '#ba0b2f',
  },
  distanceCardActive: { borderColor: '#ba0b2f', backgroundColor: 'rgba(232,197,71,0.1)' },
  distanceLabel: { color: '#888', fontSize: 17, fontWeight: '700' },
  distanceLabelActive: { color: '#ba0b2f' },
  accomEmoji: { fontSize: 24 },

  // ── Counter ──
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  counterBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: '#ba0b2f', alignItems: 'center', justifyContent: 'center',
  },
  counterBtnText: { color: '#ba0b2f', fontSize: 22, fontWeight: '700' },
  counterValue: { color: '#1A1A1A', fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },

  // ── Chips ──
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 50, borderWidth: 1.5, borderColor: '#ba0b2f',
  },
  chipActive: { backgroundColor: 'rgba(232,197,71,0.15)', borderColor: '#ba0b2f' },
  chipEmoji: { fontSize: 18 },
  chipLabel: { color: '#888', fontSize: 14, fontWeight: '600' },
  chipLabelActive: { color: '#ba0b2f' },

  // ── Countdown ──
  countdown: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  countdownNum: { fontSize: 120, fontWeight: '900', color: '#ba0b2f' },
  countdownLabel: { color: '#888', fontSize: 22, marginTop: 12, fontWeight: '600' },

  // ── Swipe screen ──
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center' },
  header: {
    width: '100%', flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, zIndex: 10,
  },
  backArrow: { padding: 8 },
  backArrowText: { color: '#ba0b2f', fontSize: 22, fontWeight: '700' },
  headerTitle: { color: '#ba0b2f', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterIconBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2A2A2A',
  },
  filterIconText: { fontSize: 16 },
  jamBtn: { backgroundColor: '#ba0b2f', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  jamBtnText: { color: '#0A0A0A', fontWeight: '700', fontSize: 12 },

  // ── Cards ──
  card: {
    position: 'absolute', top: 80, width: W - 24, height: H * 0.65,
    borderRadius: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20,
  },
  cardBehind: {
    top: 86, transform: [{ scale: 0.97 }],
    shadowOpacity: 0.2, zIndex: -1,
  },
  photo: { width: '100%', height: '100%', position: 'absolute' },
  hotelBg: { flex: 1, backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center', gap: 12 },
  hotelBgEmoji: { fontSize: 72 },
  hotelBgName: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center', paddingHorizontal: 20 },
  hotelBgEnv: { color: '#ba0b2f', fontSize: 16, fontWeight: '600' },
  photoDots: {
    position: 'absolute', top: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 4,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotActive: { backgroundColor: '#fff', width: 20 },
  photoNavLeft: { position: 'absolute', left: 0, top: 0, width: W * 0.35, height: '70%' },
  photoNavRight: { position: 'absolute', right: 0, top: 0, width: W * 0.35, height: '70%' },

  // ── Card overlay ──
  gradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  starsRow: { flexDirection: 'row', marginBottom: 4 },
  star: { fontSize: 14, marginRight: 2 },
  cardName: { color: '#fff', fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  cardCity: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  cardCuisine: { color: '#ba0b2f', fontSize: 12, fontWeight: '600' },
  cardPrice: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginLeft: 'auto' },
  cardRating: { color: '#ba0b2f', fontSize: 12, fontWeight: '600', marginTop: 4 },
  detailBtn: {
    marginTop: 10, paddingVertical: 8, paddingHorizontal: 16,
    backgroundColor: 'rgba(232,197,71,0.15)', borderRadius: 20, alignSelf: 'flex-start',
    borderWidth: 1, borderColor: 'rgba(232,197,71,0.4)',
  },
  detailBtnText: { color: '#ba0b2f', fontSize: 13, fontWeight: '700' },

  // ── Progressive indicators ──
  indicator: {
    position: 'absolute', top: '30%', padding: 14, paddingHorizontal: 24,
    borderWidth: 3, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.4)',
  },
  indicatorLike: { left: 20, borderColor: '#00E676', transform: [{ rotate: '-15deg' }] },
  indicatorNope: { right: 20, borderColor: '#FF4458', transform: [{ rotate: '15deg' }] },
  indicatorSuper: { alignSelf: 'center', left: W / 2 - 60, bottom: 100, top: undefined, borderColor: '#ba0b2f' },
  indicatorText: { fontSize: 28, fontWeight: '900' },

  // ── Actions ──
  actions: { position: 'absolute', bottom: 24, flexDirection: 'row', gap: 20, alignItems: 'center' },
  actionBtn: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  actionNope: { borderColor: '#FF4458', borderWidth: 2 },
  actionSuper: { width: 50, height: 50, borderRadius: 25, borderColor: '#ba0b2f', borderWidth: 2 },
  actionLike: { borderColor: '#00E676', borderWidth: 2 },
  actionIcon: { fontSize: 24 },

  // ── Empty ──
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', gap: 12 },
  emptyEmoji: { fontSize: 60 },
  emptyLabel: { color: '#555', fontSize: 16, textAlign: 'center', paddingHorizontal: 32 },
  reloadBtn: { marginTop: 8, backgroundColor: '#ba0b2f', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14 },
  reloadBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // ── Detail Modal ──
  detailModal: { flex: 1, backgroundColor: '#0A0A0A' },
  detailSafe: { backgroundColor: '#0D0D0D' },
  detailClose: { paddingHorizontal: 20, paddingVertical: 14 },
  detailCloseText: { color: '#ba0b2f', fontWeight: '700', fontSize: 15 },
  detailScroll: { flex: 1 },
  detailContent: { paddingHorizontal: 20, paddingBottom: 40 },
  detailName: { color: '#ffffff', fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginBottom: 6 },
  detailStars: { fontSize: 20, marginBottom: 16 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 20 },
  detailIcon: { fontSize: 24, marginTop: 2 },
  detailRowLabel: { color: '#888', fontSize: 12, fontWeight: '600', marginBottom: 2 },
  detailRowValue: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  detailSectionTitle: { color: '#ba0b2f', fontSize: 14, fontWeight: '800', letterSpacing: 1, marginVertical: 16 },
  miniMap: { marginBottom: 8 },
  detailAddress: { color: '#888', fontSize: 13, marginBottom: 16 },

  // ── Hours ──
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
  hoursDay: { color: '#ffffff', fontSize: 14, fontWeight: '600', width: 100 },
  hoursValue: { color: '#aaa', fontSize: 13, flex: 1, textAlign: 'right' },
  hoursClosed: { color: '#FF4458' },

  // ── Amenities ──
  amenitiesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  amenityChip: { backgroundColor: '#1A1A1A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#333' },
  amenityChipText: { color: '#ccc', fontSize: 13 },

  // ── Reviews ──
  ratingBig: {
    backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16, alignItems: 'center',
    marginBottom: 16, borderWidth: 1, borderColor: '#333',
  },
  ratingBigNum: { color: '#ba0b2f', fontSize: 42, fontWeight: '900' },
  ratingBigSub: { color: '#888', fontSize: 12, marginTop: 4 },
  reviewCard: {
    backgroundColor: '#141414', borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#222',
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reviewUser: { color: '#ba0b2f', fontWeight: '700', fontSize: 13 },
  reviewBadge: { color: '#999', fontSize: 11, backgroundColor: '#1A1A1A', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  reviewRating: { color: '#FFD700', fontSize: 13, marginBottom: 6 },
  reviewContent: { color: '#ccc', fontSize: 14, lineHeight: 20 },
  reviewLikes: { color: '#888', fontSize: 12, marginTop: 8 },

  // ── Contact ──
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
  contactIcon: { fontSize: 20 },
  contactValue: { color: '#ba0b2f', fontSize: 14, fontWeight: '600', flex: 1 },

  // ── Match Modal ──
  matchOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  matchBox: { backgroundColor: '#1A1A1A', borderRadius: 24, padding: 24, width: '100%', borderWidth: 1, borderColor: '#ba0b2f' },
  matchTitle: { color: '#ba0b2f', fontSize: 26, fontWeight: '900', textAlign: 'center', marginBottom: 6 },
  matchSub: { color: '#666', fontSize: 14, textAlign: 'center', marginBottom: 20 },
  matchItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
  matchItemEmoji: { fontSize: 24 },
  matchItemInfo: { flex: 1 },
  matchItemName: { color: '#fff', fontWeight: '700', fontSize: 15 },
  matchItemSub: { color: '#666', fontSize: 12, marginTop: 2 },
  matchClose: { backgroundColor: '#ba0b2f', paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginTop: 20 },
  matchCloseText: { color: '#0A0A0A', fontWeight: '800', fontSize: 15 },
  matchCloseSecondary: { paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  matchCloseSecondaryText: { color: '#666', fontSize: 14 },
});
