import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  TextInput, ScrollView, ActivityIndicator, Dimensions,
} from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../config/api';

const { width: W } = Dimensions.get('window');

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

function makeLeafletHtml(pins: AnyPin[], isRestaurant: boolean, centerLat: number, centerLng: number): string {
  const markersJs = pins.map((p) => {
    const emoji = isRestaurant ? cuisineEmoji((p as RestaurantPin).cuisineType) : '🏨';
    const stars = isRestaurant ? (p as RestaurantPin).michelinStars : (p as HotelPin).stars;
    const starsHtml = stars > 0
      ? `<span style="font-size:10px;position:absolute;top:-4px;right:-4px;background:#ba0b2f;border-radius:8px;padding:0 3px;color:#000;font-weight:bold;">${'⭐'.repeat(Math.min(stars, 3))}</span>`
      : '';
    const label = `<div style="position:relative;display:inline-block;font-size:28px;line-height:1;">${emoji}${starsHtml}</div>`;
    return `
      var icon_${p.id.replace(/-/g, '_')} = L.divIcon({
        html: '${label.replace(/'/g, "\\'")}',
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
      });
      L.marker([${p.lat}, ${p.lng}], { icon: icon_${p.id.replace(/-/g, '_')} })
        .addTo(map)
        .on('click', function() {
          window.parent.postMessage(JSON.stringify({ type: 'pin', id: '${p.id}' }), '*');
        });
    `;
  }).join('\n');

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #fff; }
    #map { width: 100vw; height: 100vh; }
    .leaflet-tile { filter: brightness(0.85) saturate(0.9); }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      zoomControl: true,
      attributionControl: false,
    }).setView([${centerLat}, ${centerLng}], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    ${markersJs}
  </script>
</body>
</html>`;
}

export default function MapScreen({ route, navigation }: any) {
  const mode: 'restaurant' | 'hotel' = route?.params?.mode ?? 'restaurant';
  const { token } = useAuth();

  const [viewMode, setViewMode] = useState<Mode>('map');
  const [pins, setPins] = useState<AnyPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [center, setCenter] = useState({ lat: 48.8566, lng: 2.3522 });
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<AnyPin[]>([]);
  const [selectedPin, setSelectedPin] = useState<AnyPin | null>(null);
  // key forces iframe re-mount when center changes (from search result click)
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    const handler = (e: any) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'pin') {
          const found = pins.find(p => p.id === msg.id);
          if (found) setSelectedPin(found);
        }
      } catch {}
    };
    (window as any).addEventListener('message', handler);
    return () => (window as any).removeEventListener('message', handler);
  }, [pins]);

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
  const leafletHtml = makeLeafletHtml(pins, isRestaurant, center.lat, center.lng);

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
            {(React.createElement as any)('iframe', {
              key: iframeKey,
              srcDoc: leafletHtml,
              style: { width: '100%', height: '100%', border: 'none' },
              title: 'map',
              sandbox: 'allow-scripts allow-same-origin',
              onLoad: () => setLoading(false),
            })}

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
                  <Text style={styles.pinTooltipStars}>
                    {'⭐'.repeat(Math.min((selectedPin as RestaurantPin).michelinStars, 3))}
                  </Text>
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
                    setIframeKey(k => k + 1);
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
                    <Text style={styles.searchItemStars}>
                      {'⭐'.repeat(Math.min((item as RestaurantPin).michelinStars, 3))}
                    </Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8 },
  title: { color: '#ba0b2f', fontSize: 24, fontWeight: '800' },
  container: { flex: 1, backgroundColor: '#fff' },
  safe: { flex: 1 },

  topBar: {
    flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10,
    gap: 8, backgroundColor: '#fff', zIndex: 10,
  },
  topBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    backgroundColor: '#fff', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#2A2A2A',
  },
  topBtnActive: { backgroundColor: 'rgba(232,197,71,0.15)', borderColor: '#ba0b2f' },
  topBtnText: { color: '#666', fontSize: 13, fontWeight: '700' },
  topBtnTextActive: { color: '#ba0b2f' },

  mapContainer: { flex: 1, position: 'relative' },
  mapLoader: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    zIndex: 5, gap: 12,
  },
  mapLoaderText: { color: '#666', fontSize: 14 },

  pinTooltip: {
    position: 'absolute', bottom: 60, left: 16, right: 16,
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#2A2A2A',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12,
  },
  pinTooltipName: { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  pinTooltipSub: { color: '#888', fontSize: 13 },
  pinTooltipStars: { fontSize: 14, marginTop: 4 },
  pinTooltipClose: { position: 'absolute', top: 12, right: 16, padding: 4 },
  pinTooltipCloseText: { color: '#666', fontSize: 18 },

  legend: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: 'rgba(10,10,10,0.85)', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: '#2A2A2A',
  },
  legendText: { color: '#888', fontSize: 12, fontWeight: '600' },

  searchContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  searchInput: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#2A2A2A',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    color: '#fff', fontSize: 16, marginBottom: 12,
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
