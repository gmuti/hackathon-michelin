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
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 0 },
  title: { color: '#ba0b2f', fontSize: 24, fontWeight: '800', marginBottom: 14 },
  tabs: { flexDirection: 'row', gap: 4, backgroundColor: 'rgba(186,11,47,0.12)', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#ba0b2f' },
  tabText: { color: 'rgba(186,11,47,0.75)', fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  feedContainer: { padding: 16, gap: 12 },
  post: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(186,11,47,0.28)' },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#ba0b2f',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  postMeta: { flex: 1 },
  postAuthor: { color: '#ba0b2f', fontWeight: '700', fontSize: 14 },
  postRole: { color: 'rgba(186,11,47,0.8)', fontSize: 12, marginTop: 1 },
  postTime: { color: 'rgba(186,11,47,0.75)', fontSize: 12 },
  postContent: { color: '#ba0b2f', lineHeight: 20, marginBottom: 12 },
  postFooter: { flexDirection: 'row', gap: 16 },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  likeIcon: { color: '#ba0b2f', fontSize: 16 },
  likeCount: { color: 'rgba(186,11,47,0.85)', fontSize: 13 },
  commentBtn: {},
  commentIcon: { fontSize: 16 },
  discoverContainer: { padding: 16 },
  sectionTitle: { color: '#ba0b2f', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  communityCard: { marginBottom: 12, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(186,11,47,0.28)' },
  communityBanner: { width: '100%', height: 120 },
  communityOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10,
    backgroundColor: 'rgba(186,11,47,0.88)',
  },
  communityEmoji: { fontSize: 28 },
  communityName: { color: '#fff', fontWeight: '700', fontSize: 15 },
  communityMembers: { color: '#fff', fontSize: 12 },
  joinBtn: {
    marginLeft: 'auto', backgroundColor: '#fff',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
  },
  joinBtnText: { color: '#ba0b2f', fontWeight: '700', fontSize: 13 },
});
