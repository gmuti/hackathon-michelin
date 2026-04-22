import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';

const USER = {
  username: 'gastronaute_paris',
  bio: 'Chasseuse d\'étoiles 🌟 | 50 restaurants certifiés',
  role: '⭐ Chef cuisinier',
  certifiedVisits: 27,
  followers: 1240,
  following: 380,
  collection: [
    { id: '1', name: 'L\'Ambroisie', stars: 3, city: 'Paris', thumb: '🏆' },
    { id: '2', name: 'Septime', stars: 1, city: 'Paris', thumb: '🍽️' },
    { id: '3', name: 'Le Bernardin', stars: 3, city: 'New York', thumb: '🐟' },
    { id: '4', name: 'Mirazur', stars: 3, city: 'Menton', thumb: '🌿' },
    { id: '5', name: 'Arpège', stars: 3, city: 'Paris', thumb: '🌱' },
    { id: '6', name: 'Astrance', stars: 2, city: 'Paris', thumb: '✨' },
  ],
};

const ROLE_PROGRESS = [
  { role: '🫧 Plongeur', done: true },
  { role: '🍽️ Serveur', done: true },
  { role: '👨‍🍳 Commis', done: true },
  { role: '🔪 Sous-chef', done: true },
  { role: '⭐ Chef', done: true },
  { role: '⭐⭐ Chef Étoilé', done: false },
];

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <SafeAreaView>
        <View style={styles.header}>
          <Text style={styles.title}>Profil</Text>
          <TouchableOpacity style={styles.settingsBtn}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile hero */}
        <View style={styles.hero}>
          <View style={styles.avatarLg}>
            <Text style={styles.avatarLgText}>GP</Text>
          </View>
          <Text style={styles.username}>@{USER.username}</Text>
          <Text style={styles.roleBadge}>{USER.role}</Text>
          <Text style={styles.bio}>{USER.bio}</Text>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{USER.certifiedVisits}</Text>
              <Text style={styles.statLabel}>Visites</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statNum}>{USER.followers.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Abonnés</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statNum}>{USER.following}</Text>
              <Text style={styles.statLabel}>Abonnements</Text>
            </View>
          </View>
        </View>

        {/* Role progression */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Progression</Text>
          <View style={styles.roleTrack}>
            {ROLE_PROGRESS.map((r, i) => (
              <View key={i} style={styles.roleStep}>
                <View style={[styles.roleCircle, r.done && styles.roleCircleDone]}>
                  <Text style={styles.roleCircleText}>{r.done ? '✓' : String(i + 1)}</Text>
                </View>
                {i < ROLE_PROGRESS.length - 1 && (
                  <View style={[styles.roleLine, r.done && styles.roleLineDone]} />
                )}
              </View>
            ))}
          </View>
          <View style={styles.roleLabels}>
            {ROLE_PROGRESS.map((r, i) => (
              <Text key={i} style={[styles.roleLabel, r.done && styles.roleLabelDone]}>
                {r.role.split(' ').slice(1).join(' ')}
              </Text>
            ))}
          </View>
        </View>

        {/* Collection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ma Collection 🏆</Text>
          <View style={styles.collectionGrid}>
            {USER.collection.map(item => (
              <TouchableOpacity key={item.id} style={styles.collectionCard}>
                <Text style={styles.collectionThumb}>{item.thumb}</Text>
                <View style={styles.collectionInfo}>
                  <Text style={styles.collectionName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.collectionCity}>{item.city}</Text>
                  <View style={styles.collectionStars}>
                    {Array.from({ length: item.stars }).map((_, i) => (
                      <Text key={i} style={styles.collectionStar}>⭐</Text>
                    ))}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8 },
  title: { color: '#ba0b2f', fontSize: 24, fontWeight: '800' },
  settingsBtn: { padding: 4 },
  settingsIcon: { fontSize: 22 },
  hero: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20 },
  avatarLg: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: '#ba0b2f',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    borderWidth: 3, borderColor: '#ba0b2f',
  },
  avatarLgText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  username: { color: '#ba0b2f', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  roleBadge: {
    color: '#fff', backgroundColor: '#ba0b2f', paddingHorizontal: 12,
    paddingVertical: 4, borderRadius: 20, fontSize: 13, fontWeight: '700', marginBottom: 8,
  },
  bio: { color: 'rgba(186,11,47,0.8)', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 24, alignItems: 'center' },
  stat: { alignItems: 'center' },
  statNum: { color: '#ba0b2f', fontSize: 20, fontWeight: '800' },
  statLabel: { color: 'rgba(186,11,47,0.8)', fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(186,11,47,0.35)' },
  section: { paddingHorizontal: 20, paddingBottom: 24 },
  sectionTitle: { color: '#ba0b2f', fontSize: 18, fontWeight: '700', marginBottom: 16 },
  roleTrack: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  roleStep: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  roleCircle: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#ba0b2f',
  },
  roleCircleDone: { backgroundColor: '#ba0b2f', borderColor: '#ba0b2f' },
  roleCircleText: { color: '#ba0b2f', fontSize: 11, fontWeight: '700' },
  roleLine: { flex: 1, height: 2, backgroundColor: 'rgba(186,11,47,0.35)' },
  roleLineDone: { backgroundColor: '#ba0b2f' },
  roleLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  roleLabel: { color: 'rgba(186,11,47,0.7)', fontSize: 9, textAlign: 'center', flex: 1 },
  roleLabelDone: { color: '#ba0b2f' },
  collectionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  collectionCard: {
    width: '47%', backgroundColor: '#fff', borderRadius: 14,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: 'rgba(186,11,47,0.28)',
  },
  collectionThumb: { fontSize: 28 },
  collectionInfo: { flex: 1 },
  collectionName: { color: '#ba0b2f', fontWeight: '700', fontSize: 13 },
  collectionCity: { color: 'rgba(186,11,47,0.8)', fontSize: 11, marginTop: 2 },
  collectionStars: { flexDirection: 'row', marginTop: 4 },
  collectionStar: { fontSize: 10 },
});
