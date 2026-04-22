import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../config/api';

type Review = {
  id: string;
  content: string;
  rating: number;
  targetType: 'RESTAURANT' | 'HOTEL';
  createdAt: string;
  user: {
    id: string;
    username: string;
    role: string;
    avatar: string | null;
  };
  target: {
    name: string;
    city: string;
  } | null;
};

const ROLE_EMOJIS: Record<string, string> = {
  PLONGEUR: '🫧',
  SERVEUR: '🍽️',
  COMMIS: '👨‍🍳',
  SOUS_CHEF: '🔪',
  CHEF: '⭐',
  CHEF_ETOILE: '🌟',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}j`;
}

function initials(username: string) {
  return username.slice(0, 2).toUpperCase();
}

export default function CommunityScreen() {
  const { token } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReviews = useCallback(async () => {
    if (!token) return;
    const res = await api.get<Review[]>('/reviews/feed', token);
    if (res.data) setReviews(res.data);
    setLoading(false);
    setRefreshing(false);
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchReviews();
    }, [fetchReviews]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchReviews();
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color="#E8C547" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView>
        <View style={styles.header}>
          <Text style={styles.title}>Communauté</Text>
          <Text style={styles.subtitle}>Avis certifiés de la communauté</Text>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E8C547" />}
      >
        {reviews.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🍽️</Text>
            <Text style={styles.emptyTitle}>Aucun avis pour le moment</Text>
            <Text style={styles.emptyText}>
              Certifie une visite et laisse le premier avis !
            </Text>
          </View>
        ) : (
          <View style={styles.feedContainer}>
            {reviews.map(review => (
              <View key={review.id} style={styles.post}>
                {/* Auteur */}
                <View style={styles.postHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials(review.user.username)}</Text>
                  </View>
                  <View style={styles.postMeta}>
                    <Text style={styles.postAuthor}>@{review.user.username}</Text>
                    <Text style={styles.postRole}>
                      {ROLE_EMOJIS[review.user.role] ?? '🍽️'} {review.user.role.replace('_', ' ')}
                    </Text>
                  </View>
                  <Text style={styles.postTime}>{timeAgo(review.createdAt)}</Text>
                </View>

                {/* Cible */}
                {review.target && (
                  <View style={styles.targetBadge}>
                    <Text style={styles.targetIcon}>
                      {review.targetType === 'RESTAURANT' ? '🍽️' : '🏨'}
                    </Text>
                    <Text style={styles.targetName}>
                      {review.target.name} · {review.target.city}
                    </Text>
                  </View>
                )}

                {/* Contenu */}
                <Text style={styles.postContent}>{review.content}</Text>

                {/* Footer */}
                <View style={styles.postFooter}>
                  <View style={styles.ratingRow}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Text key={i} style={[styles.star, i < review.rating && styles.starActive]}>
                        ★
                      </Text>
                    ))}
                    <Text style={styles.ratingNum}>{review.rating.toFixed(1)}</Text>
                  </View>
                  <View style={styles.certifiedBadge}>
                    <Text style={styles.certifiedText}>✓ Certifié</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  loader: { flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { color: '#E8C547', fontSize: 24, fontWeight: '800' },
  subtitle: { color: '#555', fontSize: 13, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32, gap: 10 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptyText: { color: '#555', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  feedContainer: { padding: 16, gap: 12 },
  post: { backgroundColor: '#141414', borderRadius: 16, padding: 16, gap: 10 },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8C547',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#0A0A0A', fontWeight: '700', fontSize: 14 },
  postMeta: { flex: 1 },
  postAuthor: { color: '#fff', fontWeight: '700', fontSize: 14 },
  postRole: { color: '#666', fontSize: 12, marginTop: 1 },
  postTime: { color: '#444', fontSize: 12 },
  targetBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(232,197,71,0.1)', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(232,197,71,0.3)',
    alignSelf: 'flex-start',
  },
  targetIcon: { fontSize: 14 },
  targetName: { color: '#E8C547', fontSize: 13, fontWeight: '600' },
  postContent: { color: '#CCC', lineHeight: 21, fontSize: 14 },
  postFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  star: { color: '#333', fontSize: 16 },
  starActive: { color: '#E8C547' },
  ratingNum: { color: '#888', fontSize: 13, marginLeft: 4 },
  certifiedBadge: {
    backgroundColor: 'rgba(0,200,100,0.15)', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, borderWidth: 1, borderColor: 'rgba(0,200,100,0.4)',
  },
  certifiedText: { color: '#00C864', fontSize: 11, fontWeight: '700' },
});
