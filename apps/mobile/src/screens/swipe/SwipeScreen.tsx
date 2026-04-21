import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity,
  Animated, PanResponder, StatusBar, SafeAreaView,
} from 'react-native';

const { width: W, height: H } = Dimensions.get('window');
const SWIPE_THRESHOLD = W * 0.3;

interface Photo { uri: string }
interface Card {
  id: string;
  name: string;
  city: string;
  michelinStars: number;
  cuisineType: string;
  priceRange: number;
  photos: Photo[];
  dishes: Array<{ category: string; emoji: string }>;
}

const MOCK_CARDS: Card[] = [
  {
    id: '1', name: 'Le Grand Véfour', city: 'Paris', michelinStars: 3,
    cuisineType: 'Française', priceRange: 4,
    photos: [
      { uri: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800' },
      { uri: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800' },
    ],
    dishes: [{ category: 'Entrée', emoji: '🥗' }, { category: 'Viande', emoji: '🥩' }, { category: 'Dessert', emoji: '🍰' }],
  },
  {
    id: '2', name: 'Septime', city: 'Paris', michelinStars: 1,
    cuisineType: 'Bistronomique', priceRange: 3,
    photos: [{ uri: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800' }],
    dishes: [{ category: 'Poisson', emoji: '🐟' }, { category: 'Légumes', emoji: '🥦' }],
  },
];

export default function SwipeScreen({ route }: any) {
  const mode = route?.params?.mode ?? 'restaurant';
  const [cards, setCards] = useState<Card[]>(MOCK_CARDS);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [swipeIndicator, setSwipeIndicator] = useState<'like' | 'nope' | 'super' | null>(null);

  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const cardRotation = translateX.interpolate({
    inputRange: [-W, 0, W],
    outputRange: ['-15deg', '0deg', '15deg'],
  });

  const currentCard = cards[0];

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, { dx, dy }) => {
      translateX.setValue(dx);
      translateY.setValue(dy);
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

  const swipeCard = useCallback((direction: 'left' | 'right' | 'up') => {
    const toX = direction === 'right' ? W * 1.5 : direction === 'left' ? -W * 1.5 : 0;
    const toY = direction === 'up' ? -H : 0;
    Animated.parallel([
      Animated.timing(translateX, { toValue: toX, duration: 300, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: toY, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      setCards(prev => prev.slice(1));
      translateX.setValue(0);
      translateY.setValue(0);
      setSwipeIndicator(null);
      setCurrentPhotoIndex(0);
    });
  }, []);

  const resetCard = () => {
    Animated.parallel([
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
    ]).start(() => setSwipeIndicator(null));
  };

  if (!currentCard) return (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>🍽️</Text>
      <Text style={styles.emptyLabel}>Plus de suggestions pour l'instant</Text>
    </View>
  );

  const photo = currentCard.photos[currentPhotoIndex];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <SafeAreaView style={styles.header}>
        <Text style={styles.headerTitle}>
          {mode === 'restaurant' ? '🍽️ Restaurants' : '🏨 Hôtels'}
        </Text>
        <TouchableOpacity style={styles.jamBtn}>
          <Text style={styles.jamBtnText}>🎵 Jam</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Card */}
      <Animated.View
        style={[styles.card, { transform: [{ translateX }, { translateY }, { rotate: cardRotation }] }]}
        {...panResponder.panHandlers}
      >
        {/* Full-screen photo */}
        <Animated.Image source={photo} style={styles.photo} resizeMode="cover" />

        {/* Photo navigation dots */}
        <View style={styles.photoDots}>
          {currentCard.photos.map((_, i) => (
            <View key={i} style={[styles.dot, i === currentPhotoIndex && styles.dotActive]} />
          ))}
        </View>

        {/* Photo nav touch areas */}
        <TouchableOpacity
          style={styles.photoNavLeft}
          onPress={() => setCurrentPhotoIndex(i => Math.max(0, i - 1))}
        />
        <TouchableOpacity
          style={styles.photoNavRight}
          onPress={() => setCurrentPhotoIndex(i => Math.min(currentCard.photos.length - 1, i + 1))}
        />

        {/* Bottom info gradient */}
        <View style={styles.gradient}>
          {currentCard.michelinStars > 0 && (
            <View style={styles.starsRow}>
              {Array.from({ length: currentCard.michelinStars }).map((_, i) => (
                <Text key={i} style={styles.star}>⭐</Text>
              ))}
            </View>
          )}
          <Text style={styles.cardName}>{currentCard.name}</Text>
          <View style={styles.cardMeta}>
            <Text style={styles.cardCity}>📍 {currentCard.city}</Text>
            <Text style={styles.cardCuisine}>{currentCard.cuisineType}</Text>
            <Text style={styles.cardPrice}>{'€'.repeat(currentCard.priceRange)}</Text>
          </View>
        </View>

        {/* Swipe indicators */}
        {swipeIndicator === 'like' && (
          <View style={[styles.indicator, styles.indicatorLike]}>
            <Text style={styles.indicatorText}>LIKE 💚</Text>
          </View>
        )}
        {swipeIndicator === 'nope' && (
          <View style={[styles.indicator, styles.indicatorNope]}>
            <Text style={styles.indicatorText}>NOPE ✕</Text>
          </View>
        )}
        {swipeIndicator === 'super' && (
          <View style={[styles.indicator, styles.indicatorSuper]}>
            <Text style={styles.indicatorText}>SUPER ⭐</Text>
          </View>
        )}
      </Animated.View>

      {/* Category emoji bar */}
      <View style={styles.categoryBar}>
        {currentCard.dishes.map((d) => (
          <TouchableOpacity
            key={d.category}
            style={[styles.categoryItem, activeCategory === d.category && styles.categoryItemActive]}
            onPress={() => setActiveCategory(prev => prev === d.category ? null : d.category)}
          >
            <Text style={styles.categoryEmoji}>{d.emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Action buttons */}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center' },
  header: {
    width: '100%', flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, zIndex: 10,
  },
  headerTitle: { color: '#E8C547', fontSize: 18, fontWeight: '700', letterSpacing: 1 },
  jamBtn: {
    backgroundColor: '#E8C547', paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20,
  },
  jamBtnText: { color: '#0A0A0A', fontWeight: '700', fontSize: 13 },
  card: {
    position: 'absolute', top: 80, width: W - 24, height: H * 0.65,
    borderRadius: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20,
  },
  photo: { width: '100%', height: '100%', position: 'absolute' },
  photoDots: {
    position: 'absolute', top: 12, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 4,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotActive: { backgroundColor: '#fff', width: 20 },
  photoNavLeft: { position: 'absolute', left: 0, top: 0, width: W * 0.35, height: '70%' },
  photoNavRight: { position: 'absolute', right: 0, top: 0, width: W * 0.35, height: '70%' },
  gradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 28,
    backgroundColor: 'transparent',
  },
  starsRow: { flexDirection: 'row', marginBottom: 4 },
  star: { fontSize: 14, marginRight: 2 },
  cardName: { color: '#fff', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  cardCity: { color: 'rgba(255,255,255,0.75)', fontSize: 14 },
  cardCuisine: { color: '#E8C547', fontSize: 13, fontWeight: '600' },
  cardPrice: { color: 'rgba(255,255,255,0.75)', fontSize: 14, marginLeft: 'auto' },
  indicator: {
    position: 'absolute', top: 40, padding: 10, paddingHorizontal: 20,
    borderWidth: 3, borderRadius: 8,
  },
  indicatorLike: { left: 20, borderColor: '#00E676', transform: [{ rotate: '-15deg' }] },
  indicatorNope: { right: 20, borderColor: '#FF4458', transform: [{ rotate: '15deg' }] },
  indicatorSuper: { left: '50%', bottom: 40, borderColor: '#00C2E8' },
  indicatorText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  categoryBar: {
    position: 'absolute', bottom: 100, flexDirection: 'row', gap: 8,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  categoryItem: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  categoryItemActive: { backgroundColor: '#E8C547' },
  categoryEmoji: { fontSize: 22 },
  actions: {
    position: 'absolute', bottom: 24, flexDirection: 'row', gap: 20, alignItems: 'center',
  },
  actionBtn: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#1A1A1A',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  actionNope: { borderColor: '#FF4458', borderWidth: 2 },
  actionSuper: { width: 50, height: 50, borderRadius: 25, borderColor: '#00C2E8', borderWidth: 2 },
  actionLike: { borderColor: '#E8C547', borderWidth: 2 },
  actionIcon: { fontSize: 24 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0A0A' },
  emptyEmoji: { fontSize: 60 },
  emptyLabel: { color: '#555', marginTop: 12, fontSize: 16 },
});
