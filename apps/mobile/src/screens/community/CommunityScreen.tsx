import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Image } from 'react-native';

const COMMUNITIES = [
  { id: '1', name: 'Fans de Ramen', emoji: '🍜', members: 4820, banner: 'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400' },
  { id: '2', name: 'Chasseurs d\'Étoiles', emoji: '⭐', members: 12300, banner: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400' },
  { id: '3', name: 'Végétariens Gourmets', emoji: '🥗', members: 7100, banner: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400' },
  { id: '4', name: 'Brunch Addicts', emoji: '🥞', members: 9550, banner: 'https://images.unsplash.com/photo-1533089860892-a7c6f10a081a?w=400' },
];

const FEED_POSTS = [
  { id: '1', author: 'Marie L.', role: '👨‍🍳 Commis', avatar: 'ML', content: 'Incroyable dîner chez Septime hier soir 🌟 Le carpaccio de saint-pierre était un poème.', likes: 142, community: 'Chasseurs d\'Étoiles', time: '2h' },
  { id: '2', author: 'Thomas R.', role: '🍽️ Serveur', avatar: 'TR', content: 'Test du nouveau ramen shop rue de la Roquette — pas encore sur l\'app mais ça va venir 🍜🔥', likes: 89, community: 'Fans de Ramen', time: '4h' },
  { id: '3', author: 'Sofia M.', role: '🫧 Plongeur', avatar: 'SM', content: 'Premier brunch certifié au Café de Flore ! L\'ambiance parisienne au max ☕', likes: 215, community: 'Brunch Addicts', time: '6h' },
];

export default function CommunityScreen() {
  const [activeTab, setActiveTab] = useState<'feed' | 'discover'>('feed');

  return (
    <View style={styles.container}>
      <SafeAreaView>
        <View style={styles.header}>
          <Text style={styles.title}>Communautés</Text>
          <View style={styles.tabs}>
            <TouchableOpacity style={[styles.tab, activeTab === 'feed' && styles.tabActive]} onPress={() => setActiveTab('feed')}>
              <Text style={[styles.tabText, activeTab === 'feed' && styles.tabTextActive]}>Feed</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, activeTab === 'discover' && styles.tabActive]} onPress={() => setActiveTab('discover')}>
              <Text style={[styles.tabText, activeTab === 'discover' && styles.tabTextActive]}>Découvrir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {activeTab === 'feed' ? (
          <View style={styles.feedContainer}>
            {FEED_POSTS.map(post => (
              <View key={post.id} style={styles.post}>
                <View style={styles.postHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{post.avatar}</Text>
                  </View>
                  <View style={styles.postMeta}>
                    <Text style={styles.postAuthor}>{post.author}</Text>
                    <Text style={styles.postRole}>{post.role} · {post.community}</Text>
                  </View>
                  <Text style={styles.postTime}>{post.time}</Text>
                </View>
                <Text style={styles.postContent}>{post.content}</Text>
                <View style={styles.postFooter}>
                  <TouchableOpacity style={styles.likeBtn}>
                    <Text style={styles.likeIcon}>♥</Text>
                    <Text style={styles.likeCount}>{post.likes}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.commentBtn}>
                    <Text style={styles.commentIcon}>💬</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.discoverContainer}>
            <Text style={styles.sectionTitle}>Communautés populaires</Text>
            {COMMUNITIES.map(c => (
              <TouchableOpacity key={c.id} style={styles.communityCard}>
                <Image source={{ uri: c.banner }} style={styles.communityBanner} />
                <View style={styles.communityOverlay}>
                  <Text style={styles.communityEmoji}>{c.emoji}</Text>
                  <View>
                    <Text style={styles.communityName}>{c.name}</Text>
                    <Text style={styles.communityMembers}>{c.members.toLocaleString()} membres</Text>
                  </View>
                  <TouchableOpacity style={styles.joinBtn}>
                    <Text style={styles.joinBtnText}>Rejoindre</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 0 },
  title: { color: '#E8C547', fontSize: 24, fontWeight: '800', marginBottom: 14 },
  tabs: { flexDirection: 'row', gap: 4, backgroundColor: '#1A1A1A', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#E8C547' },
  tabText: { color: '#666', fontWeight: '600' },
  tabTextActive: { color: '#0A0A0A' },
  feedContainer: { padding: 16, gap: 12 },
  post: { backgroundColor: '#141414', borderRadius: 16, padding: 16 },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8C547',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#0A0A0A', fontWeight: '700', fontSize: 14 },
  postMeta: { flex: 1 },
  postAuthor: { color: '#fff', fontWeight: '700', fontSize: 14 },
  postRole: { color: '#666', fontSize: 12, marginTop: 1 },
  postTime: { color: '#444', fontSize: 12 },
  postContent: { color: '#CCC', lineHeight: 20, marginBottom: 12 },
  postFooter: { flexDirection: 'row', gap: 16 },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  likeIcon: { color: '#E8C547', fontSize: 16 },
  likeCount: { color: '#888', fontSize: 13 },
  commentBtn: {},
  commentIcon: { fontSize: 16 },
  discoverContainer: { padding: 16 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  communityCard: { marginBottom: 12, borderRadius: 16, overflow: 'hidden' },
  communityBanner: { width: '100%', height: 120 },
  communityOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  communityEmoji: { fontSize: 28 },
  communityName: { color: '#fff', fontWeight: '700', fontSize: 15 },
  communityMembers: { color: '#AAA', fontSize: 12 },
  joinBtn: {
    marginLeft: 'auto', backgroundColor: '#E8C547',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
  },
  joinBtnText: { color: '#0A0A0A', fontWeight: '700', fontSize: 13 },
});
