import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  TextInput, ScrollView, ActivityIndicator, Dimensions,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../config/api';
import { MichelinStars } from '../../components/MichelinStar';

const { width: W, height: H } = Dimensions.get('window');

type Mode = 'map' | 'search' | 'swipe';

type RestaurantPin = {
  id: string; name: string; lat: number; lng: number;
  michelinStars: number; cuisineType: string; city: string; priceRange: number;
};
type HotelPin = {
  id: string; name: string; lat: number; lng: number;
  stars: number; pricePerNight: number; city: string; accommodationType: string;
};
type AnyPin = RestaurantPin | HotelPin;

const CUISINE_EMOJI: Record<string, string> = {
  'Japonaise': '🍣', 'Italienne': '🍝', 'Française': '🥐', 'Française classique': '🥐',
  'Asiatique': '🥢', 'Végétarienne': '🥗', 'Végétale': '🥗', 'Fusion': '🌮',
  'Fruits de mer': '🦞', 'Grillades': '🥩', 'Bistrot moderne': '🍽️',
  'Franco-britannique': '🍽️', 'Fast-food': '🍔', 'default': '🍴',
};

function cuisineEmoji(type: string): string {
  return CUISINE_EMOJI[type] ?? CUISINE_EMOJI.default;
}

export default function MapScreen({ route, navigation }: any) {
  const mode: 'restaurant' | 'hotel' = route?.params?.mode ?? 'restaurant';
  const { token } = useAuth();

  const [viewMode, setViewMode] = useState<Mode>('map');
  const [pins, setPins] = useState<AnyPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [center, setCenter] = useState({ lat: 48.8566, lng: 2.3522 }); // Paris fallback
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<AnyPin[]>([]);
  const [selectedPin, setSelectedPin] = useState<AnyPin | null>(null);

  const fetchPins = useCallback(async (lat: number, lng: number) => {
    if (!token) return;
    setLoading(true);
    if (mode === 'restaurant') {
      const res = await api.get<RestaurantPin[]>(
        `/restaurants/feed?lat=${lat}&lng=${lng}&distanceKm=10`,
        token,
      );
      if (res.data) setPins(res.data.map(r => ({ ...r })));
    } else {
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      const res = await api.get<HotelPin[]>(
        `/hotels/feed?destination=Paris&lat=${lat}&lng=${lng}&distanceKm=200&checkIn=${today}&checkOut=${nextWeek}`,
        token,
      );
      if (res.data) setPins(res.data.map(h => ({ ...h })));
    }
    setLoading(false);
  }, [token, mode]);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setCenter({ lat: loc.coords.latitude, lng: loc.coords.longitude });
          fetchPins(loc.coords.latitude, loc.coords.longitude);
        } else {
          fetchPins(center.lat, center.lng);
        }
      } catch {
        fetchPins(center.lat, center.lng);
      }
    })();
  }, []);

  const handleSearch = useCallback((text: string) => {
    setSearchText(text);
    if (!text.trim()) { setSearchResults([]); return; }
    const lower = text.toLowerCase();
    setSearchResults(
      pins.filter(p => p.name.toLowerCase().includes(lower) || p.city.toLowerCase().includes(lower))
    );
  }, [pins]);

  const isRestaurant = mode === 'restaurant';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {isRestaurant ? (<Text style={styles.title}>Restaurants</Text>) : (<Text style={styles.title}>Hôtels</Text>)}
      </View>
      <SafeAreaView style={styles.safe}>
        {/* ── 3 top buttons ── */}
        <View style={styles.topBar}>
          {(['map', 'search', 'swipe'] as Mode[]).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.topBtn, viewMode === m && styles.topBtnActive]}
              onPress={() => {
                if (m === 'swipe') {
                  navigation.navigate('Swipe', { mode });
                } else {
                  setViewMode(m);
                }
              }}
            >
              <Text style={[styles.topBtnText, viewMode === m && styles.topBtnTextActive]}>
                {m === 'map' ? 'Carte' : m === 'search' ? 'Recherche' : 'Swipe'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Carte ── */}
        {viewMode === 'map' && (
          <View style={styles.mapContainer}>
            {loading && (
              <View style={styles.mapLoader}>
                <ActivityIndicator color="#ba0b2f" size="large" />
                <Text style={styles.mapLoaderText}>Chargement de la carte…</Text>
              </View>
            )}
            <MapView
              provider={PROVIDER_DEFAULT}
              style={styles.map}
              initialRegion={{
                latitude: center.lat,
                longitude: center.lng,
                latitudeDelta: 0.12,
                longitudeDelta: 0.12,
              }}
            >
              {pins.map(pin => {
                const emoji = isRestaurant
                  ? cuisineEmoji((pin as RestaurantPin).cuisineType)
                  : '🏨';
                const stars = isRestaurant
                  ? (pin as RestaurantPin).michelinStars
                  : (pin as HotelPin).stars;
                return (
                  <Marker
                    key={pin.id}
                    coordinate={{ latitude: pin.lat, longitude: pin.lng }}
                    onPress={() => setSelectedPin(pin)}
                    tracksViewChanges={false}
                  >
                    <View style={styles.markerWrap}>
                      <Text style={styles.markerEmoji}>{emoji}</Text>
                      {stars > 0 && (
                        <View style={styles.markerBadge}>
                          <MichelinStars count={stars} size={8} white />
                        </View>
                      )}
                    </View>
                  </Marker>
                );
              })}
            </MapView>

            {/* ── Pin tooltip ── */}
            {selectedPin && (
              <View style={styles.pinTooltip}>
                <Text style={styles.pinTooltipName}>{selectedPin.name}</Text>
                <Text style={styles.pinTooltipSub}>
                  {isRestaurant
                    ? `${(selectedPin as RestaurantPin).cuisineType} · ${'€'.repeat((selectedPin as RestaurantPin).priceRange)}`
                    : `${(selectedPin as HotelPin).pricePerNight}€/nuit`}
                </Text>
                {isRestaurant && (selectedPin as RestaurantPin).michelinStars > 0 && (
                  <MichelinStars count={(selectedPin as RestaurantPin).michelinStars} size={14} style={{ marginTop: 4 }} />
                )}
                <TouchableOpacity style={styles.pinTooltipClose} onPress={() => setSelectedPin(null)}>
                  <Text style={styles.pinTooltipCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── Legend ── */}
            <View style={styles.legend}>
              <Text style={styles.legendText}>
                {pins.length} {isRestaurant ? 'restaurants' : 'hôtels'} à proximité
              </Text>
            </View>
          </View>
        )}

        {/* ── Recherche ── */}
        {viewMode === 'search' && (
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              value={searchText}
              onChangeText={handleSearch}
              placeholder={isRestaurant ? 'Cherche un restaurant…' : 'Cherche un hôtel…'}
              placeholderTextColor="#555"
              autoFocus
            />
            {searchText.length === 0 && (
              <View style={styles.searchHint}>
                <Text style={styles.searchHintEmoji}>{isRestaurant ? '🍽️' : '🏨'}</Text>
                <Text style={styles.searchHintText}>
                  Tape le nom d'un {isRestaurant ? 'restaurant' : 'hôtel'} ou une ville
                </Text>
              </View>
            )}
            <ScrollView style={styles.searchResults} keyboardShouldPersistTaps="handled">
              {searchResults.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.searchItem}
                  onPress={() => {
                    setCenter({ lat: item.lat, lng: item.lng });
                    setViewMode('map');
                    setSelectedPin(item);
                  }}
                >
                  <Text style={styles.searchItemEmoji}>
                    {isRestaurant ? cuisineEmoji((item as RestaurantPin).cuisineType) : '🏨'}
                  </Text>
                  <View style={styles.searchItemInfo}>
                    <Text style={styles.searchItemName}>{item.name}</Text>
                    <Text style={styles.searchItemSub}>
                      {item.city}
                      {isRestaurant
                        ? ` · ${'€'.repeat((item as RestaurantPin).priceRange)}`
                        : ` · ${(item as HotelPin).pricePerNight}€/nuit`}
                    </Text>
                  </View>
                  {isRestaurant && (item as RestaurantPin).michelinStars > 0 && (
                    <MichelinStars count={(item as RestaurantPin).michelinStars} size={14} />
                  )}
                </TouchableOpacity>
              ))}
              {searchText.length > 0 && searchResults.length === 0 && (
                <View style={styles.noResults}>
                  <Text style={styles.noResultsText}>Aucun résultat pour "{searchText}"</Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  safe: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8 },
  title: { color: '#ba0b2f', fontSize: 24, fontWeight: '800' },

  // ── Top bar ──
  topBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#fff',
    zIndex: 10,
  },
  topBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    backgroundColor: '#fff', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#2A2A2A',
  },
  topBtnActive: { backgroundColor: 'rgba(232,197,71,0.15)', borderColor: '#ba0b2f' },
  topBtnText: { color: '#666', fontSize: 13, fontWeight: '700' },
  topBtnTextActive: { color: '#ba0b2f' },

  // ── Map ──
  mapContainer: { flex: 1, position: 'relative' },
  map: { flex: 1 },
  mapLoader: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    zIndex: 5, gap: 12,
  },
  mapLoaderText: { color: '#666', fontSize: 14 },

  // ── Markers ──
  markerWrap: { alignItems: 'center', justifyContent: 'center' },
  markerEmoji: { fontSize: 28 },
  markerBadge: {
    position: 'absolute', top: -4, right: -8,
    backgroundColor: '#ba0b2f', borderRadius: 6, paddingHorizontal: 2, paddingVertical: 1,
  },
  markerBadgeText: { fontSize: 8, color: '#000', fontWeight: 'bold' },

  // ── Pin tooltip ──
  pinTooltip: {
    position: 'absolute', bottom: 60, left: 16, right: 16,
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#2A2A2A',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12,
  },
  pinTooltipName: { color: '#2A2A2A', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  pinTooltipSub: { color: '#888', fontSize: 13 },
  pinTooltipStars: { fontSize: 14, marginTop: 4 },
  pinTooltipClose: { position: 'absolute', top: 12, right: 16, padding: 4 },
  pinTooltipCloseText: { color: '#666', fontSize: 18 },

  // ── Legend ──
  legend: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: '#2A2A2A',
  },
  legendText: { color: '#888', fontSize: 12, fontWeight: '600' },

  // ── Search ──
  searchContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  searchInput: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#2A2A2A',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    color: '#2A2A2A', fontSize: 16, marginBottom: 12,
  },
  searchHint: { alignItems: 'center', paddingTop: 60, gap: 12 },
  searchHintEmoji: { fontSize: 48 },
  searchHintText: { color: '#555', fontSize: 15, textAlign: 'center' },
  searchResults: { flex: 1 },
  searchItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#fff',
  },
  searchItemEmoji: { fontSize: 28, width: 40, textAlign: 'center' },
  searchItemInfo: { flex: 1 },
  searchItemName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  searchItemSub: { color: '#666', fontSize: 12, marginTop: 2 },
  searchItemStars: { fontSize: 14 },
  noResults: { paddingTop: 32, alignItems: 'center' },
  noResultsText: { color: '#555', fontSize: 14 },
});
