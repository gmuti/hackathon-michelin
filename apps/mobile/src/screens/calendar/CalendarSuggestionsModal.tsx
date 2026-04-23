import React, { useState, useCallback } from 'react';
import { MichelinStars } from '../../components/MichelinStar';
import {
  View, Text, Modal, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, SafeAreaView,
} from 'react-native';
import { useGoogleCalendar, CalendarEvent, EventCoords } from '../../hooks/useGoogleCalendar';
import { api } from '../../config/api';
import { useAuth } from '../../context/AuthContext';

type Restaurant = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  michelinStars: number;
  cuisineType: string;
  city: string;
  priceRange: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

function formatDate(start: { dateTime?: string; date?: string }): string {
  const raw = start.dateTime ?? start.date ?? '';
  const d = new Date(raw);
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function CalendarSuggestionsModal({ visible, onClose }: Props) {
  const { token } = useAuth();
  const { isConnected, events, loading, error, connect, disconnect, geocodeEvent, requestReady } =
    useGoogleCalendar();

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventCoords, setEventCoords] = useState<EventCoords | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(false);
  const [geocodeError, setGeocodeError] = useState(false);
  const [distanceKm, setDistanceKm] = useState(30);

  const DISTANCE_OPTIONS = [5, 10, 20, 30, 50];

  const handleSelectEvent = useCallback(
    async (event: CalendarEvent, distance = distanceKm) => {
      setSelectedEvent(event);
      setRestaurants([]);
      setGeocodeError(false);
      setLoadingRestaurants(true);

      const coords = await geocodeEvent(event);
      if (!coords) {
        setGeocodeError(true);
        setLoadingRestaurants(false);
        return;
      }
      setEventCoords(coords);

      const res = await api.get<Restaurant[]>(
        `/restaurants/feed?lat=${coords.lat}&lng=${coords.lng}&distanceKm=${distance}`,
        token ?? undefined,
      );
      setRestaurants(res.data ?? []);
      setLoadingRestaurants(false);
    },
    [geocodeEvent, token, distanceKm],
  );

  const handleDistanceChange = useCallback(
    async (km: number) => {
      setDistanceKm(km);
      if (selectedEvent && eventCoords) {
        setLoadingRestaurants(true);
        const res = await api.get<Restaurant[]>(
          `/restaurants/feed?lat=${eventCoords.lat}&lng=${eventCoords.lng}&distanceKm=${km}`,
          token ?? undefined,
        );
        setRestaurants(res.data ?? []);
        setLoadingRestaurants(false);
      }
    },
    [selectedEvent, eventCoords, token],
  );

  const handleBack = useCallback(() => {
    setSelectedEvent(null);
    setRestaurants([]);
    setEventCoords(null);
    setGeocodeError(false);
  }, []);

  const handleClose = useCallback(() => {
    handleBack();
    onClose();
  }, [handleBack, onClose]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          {selectedEvent ? (
            <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
              <Text style={styles.backBtnText}>← Retour</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backBtn} />
          )}
          <Text style={styles.headerTitle}>📅 Google Calendar</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Contenu selon l'état */}
        {!isConnected ? (
          <NotConnectedView
            onConnect={connect}
            requestReady={requestReady}
            error={error}
          />
        ) : loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color="#ba0b2f" size="large" />
            <Text style={styles.loadingText}>Récupération de tes événements…</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorEmoji}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={disconnect}>
              <Text style={styles.retryBtnText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : selectedEvent ? (
          <RestaurantsView
            event={selectedEvent}
            restaurants={restaurants}
            loading={loadingRestaurants}
            geocodeError={geocodeError}
            distanceKm={distanceKm}
            distanceOptions={DISTANCE_OPTIONS}
            onDistanceChange={handleDistanceChange}
          />
        ) : (
          <EventsListView
            events={events}
            onSelect={handleSelectEvent}
            onDisconnect={disconnect}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

/* ── Sous-composants ── */

function NotConnectedView({
  onConnect,
  requestReady,
  error,
}: {
  onConnect: () => void;
  requestReady: boolean;
  error: string | null;
}) {
  return (
    <View style={styles.centered}>
      <Text style={styles.illustration}>📅</Text>
      <Text style={styles.connectTitle}>Connecte Google Calendar</Text>
      <Text style={styles.connectSub}>
        Découvre les meilleurs restaurants près de tes prochains événements
      </Text>
      {error && <Text style={styles.errorText}>{error}</Text>}
      <TouchableOpacity
        style={[styles.connectBtn, !requestReady && styles.connectBtnDisabled]}
        onPress={onConnect}
        disabled={!requestReady}
      >
        <Text style={styles.connectBtnText}>
          {requestReady ? 'Se connecter avec Google' : 'Chargement…'}
        </Text>
      </TouchableOpacity>
      <Text style={styles.privacyNote}>
        Lecture seule · Uniquement les 7 prochains jours
      </Text>
    </View>
  );
}

function EventsListView({
  events,
  onSelect,
  onDisconnect,
}: {
  events: CalendarEvent[];
  onSelect: (e: CalendarEvent) => void;
  onDisconnect: () => void;
}) {
  if (events.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.illustration}>🗓️</Text>
        <Text style={styles.connectTitle}>Aucun événement avec lieu</Text>
        <Text style={styles.connectSub}>
          Ajoute une adresse à tes événements Google Calendar pour obtenir des suggestions.
        </Text>
        <TouchableOpacity style={styles.disconnectBtn} onPress={onDisconnect}>
          <Text style={styles.disconnectBtnText}>Déconnecter</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.sectionHint}>
        {events.length} événement{events.length > 1 ? 's' : ''} avec un lieu · Appuie pour voir les restaurants à proximité
      </Text>
      <ScrollView contentContainerStyle={styles.listContent}>
        {events.map((event) => (
          <TouchableOpacity
            key={event.id}
            style={styles.eventCard}
            onPress={() => onSelect(event)}
          >
            <View style={styles.eventIconWrap}>
              <Text style={styles.eventIcon}>📍</Text>
            </View>
            <View style={styles.eventInfo}>
              <Text style={styles.eventName} numberOfLines={1}>{event.summary}</Text>
              <Text style={styles.eventDate}>{formatDate(event.start)}</Text>
              <Text style={styles.eventLocation} numberOfLines={1}>{event.location}</Text>
            </View>
            <Text style={styles.eventArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <TouchableOpacity style={styles.disconnectBtnBottom} onPress={onDisconnect}>
        <Text style={styles.disconnectBtnText}>Déconnecter Google Calendar</Text>
      </TouchableOpacity>
    </View>
  );
}

function RestaurantsView({
  event,
  restaurants,
  loading,
  geocodeError,
  distanceKm,
  distanceOptions,
  onDistanceChange,
}: {
  event: CalendarEvent;
  restaurants: Restaurant[];
  loading: boolean;
  geocodeError: boolean;
  distanceKm: number;
  distanceOptions: number[];
  onDistanceChange: (km: number) => void;
}) {
  if (geocodeError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.illustration}>🗺️</Text>
        <Text style={styles.connectTitle}>Adresse introuvable</Text>
        <Text style={styles.connectSub}>
          L'adresse "{event.location}" n'a pas pu être géolocalisée. Essaie de la préciser dans Google Calendar.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.eventBanner}>
        <Text style={styles.eventBannerName} numberOfLines={1}>{event.summary}</Text>
        <Text style={styles.eventBannerSub} numberOfLines={1}>📍 {event.location}</Text>
      </View>

      <View style={styles.distanceRow}>
        <Text style={styles.distanceLabel}>Rayon :</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.distancePills}>
          {distanceOptions.map((km) => (
            <TouchableOpacity
              key={km}
              style={[styles.distancePill, distanceKm === km && styles.distancePillActive]}
              onPress={() => onDistanceChange(km)}
            >
              <Text style={[styles.distancePillText, distanceKm === km && styles.distancePillTextActive]}>
                {km} km
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#ba0b2f" size="large" />
          <Text style={styles.loadingText}>Recherche des restaurants à proximité…</Text>
        </View>
      ) : restaurants.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.illustration}>🍽️</Text>
          <Text style={styles.connectTitle}>Aucun restaurant trouvé</Text>
          <Text style={styles.connectSub}>Pas de restaurant Michelin dans un rayon de {distanceKm} km.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          <Text style={styles.sectionHint}>
            {restaurants.length} restaurant{restaurants.length > 1 ? 's' : ''} à moins de {distanceKm} km
          </Text>
          {restaurants.map((r) => (
            <View key={r.id} style={styles.restaurantCard}>
              {r.michelinStars > 0
                ? <MichelinStars count={r.michelinStars} size={28} style={{ minWidth: 40, justifyContent: 'center' }} />
                : <Text style={styles.restaurantEmoji}>🍽️</Text>}
              <View style={styles.restaurantInfo}>
                <Text style={styles.restaurantName} numberOfLines={1}>{r.name}</Text>
                <Text style={styles.restaurantSub}>
                  {r.cuisineType} · {'€'.repeat(r.priceRange)} · {r.city}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

/* ── Styles ── */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
    borderBottomColor: 'rgba(186,11,47,0.15)',
  },
  headerTitle: { color: '#ba0b2f', fontSize: 17, fontWeight: '800' },
  backBtn: { width: 80 },
  backBtnText: { color: '#ba0b2f', fontSize: 15, fontWeight: '600' },
  closeBtn: { width: 80, alignItems: 'flex-end' },
  closeBtnText: { color: '#ba0b2f', fontSize: 20, fontWeight: '600' },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  illustration: { fontSize: 64, marginBottom: 8 },
  loadingText: { color: '#888', fontSize: 14, marginTop: 12 },
  errorEmoji: { fontSize: 40 },
  errorText: { color: '#ba0b2f', fontSize: 14, textAlign: 'center' },

  connectTitle: { color: '#ba0b2f', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  connectSub: { color: '#666', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  connectBtn: {
    backgroundColor: '#ba0b2f', paddingVertical: 14, paddingHorizontal: 32,
    borderRadius: 14, marginTop: 8,
  },
  connectBtnDisabled: { opacity: 0.5 },
  connectBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  privacyNote: { color: '#aaa', fontSize: 11, textAlign: 'center' },

  retryBtn: {
    borderWidth: 1.5, borderColor: '#ba0b2f', paddingVertical: 10,
    paddingHorizontal: 24, borderRadius: 12, marginTop: 8,
  },
  retryBtnText: { color: '#ba0b2f', fontWeight: '700' },

  sectionHint: {
    color: '#888', fontSize: 12, paddingHorizontal: 20, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  listContent: { padding: 16, gap: 12 },

  eventCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(186,11,47,0.2)',
    shadowColor: '#ba0b2f', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  eventIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(186,11,47,0.08)', alignItems: 'center', justifyContent: 'center',
  },
  eventIcon: { fontSize: 22 },
  eventInfo: { flex: 1 },
  eventName: { color: '#1a1a1a', fontSize: 15, fontWeight: '700' },
  eventDate: { color: '#ba0b2f', fontSize: 12, fontWeight: '600', marginTop: 2 },
  eventLocation: { color: '#888', fontSize: 12, marginTop: 2 },
  eventArrow: { color: '#ba0b2f', fontSize: 22, fontWeight: '600' },

  disconnectBtn: {
    borderWidth: 1, borderColor: 'rgba(186,11,47,0.35)', paddingVertical: 12,
    paddingHorizontal: 24, borderRadius: 12, marginTop: 8,
  },
  disconnectBtnBottom: {
    margin: 20, borderWidth: 1, borderColor: 'rgba(186,11,47,0.35)',
    paddingVertical: 12, borderRadius: 12, alignItems: 'center',
  },
  disconnectBtnText: { color: '#ba0b2f', fontWeight: '600', fontSize: 14, textAlign: 'center' },

  eventBanner: {
    backgroundColor: 'rgba(186,11,47,0.06)', padding: 16, borderBottomWidth: 1,
    borderBottomColor: 'rgba(186,11,47,0.15)',
  },
  eventBannerName: { color: '#ba0b2f', fontSize: 16, fontWeight: '800' },
  eventBannerSub: { color: '#888', fontSize: 13, marginTop: 4 },

  distanceRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', gap: 8,
  },
  distanceLabel: { color: '#888', fontSize: 13, fontWeight: '600' },
  distancePills: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  distancePill: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1.5, borderColor: 'rgba(186,11,47,0.3)',
  },
  distancePillActive: { backgroundColor: '#ba0b2f', borderColor: '#ba0b2f' },
  distancePillText: { color: '#ba0b2f', fontSize: 13, fontWeight: '600' },
  distancePillTextActive: { color: '#fff' },

  restaurantCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(186,11,47,0.15)',
  },
  restaurantEmoji: { fontSize: 28, width: 40, textAlign: 'center' },
  restaurantInfo: { flex: 1 },
  restaurantName: { color: '#1a1a1a', fontSize: 15, fontWeight: '700' },
  restaurantSub: { color: '#888', fontSize: 12, marginTop: 3 },
});
