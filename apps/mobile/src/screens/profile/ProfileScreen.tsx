import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../config/api';

type ProfileData = {
  id: string;
  username: string;
  bio: string | null;
  role: string;
  certifiedVisits: number;
  cuisinePreferences: string[];
  dietaryRestrictions: string[];
  _count: { followers: number; followings: number; visits: number };
};

type CollectionItem = {
  id: string;
  visitedAt: string;
  restaurant: {
    id: string;
    name: string;
    city: string;
    michelinStars: number;
  } | null;
};

const ROLE_CONFIG = [
  { key: 'PLONGEUR',    label: 'Plongeur',     emoji: '🫧',  min: 0  },
  { key: 'SERVEUR',     label: 'Serveur',       emoji: '🍽️', min: 1  },
  { key: 'COMMIS',      label: 'Commis',        emoji: '👨‍🍳', min: 5  },
  { key: 'SOUS_CHEF',   label: 'Sous-chef',     emoji: '🔪',  min: 15 },
  { key: 'CHEF',        label: 'Chef',          emoji: '⭐',  min: 30 },
  { key: 'CHEF_ETOILE', label: 'Chef Étoilé',   emoji: '🌟',  min: 50 },
];

export default function ProfileScreen() {
  const { token, user: authUser, logout } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmLogout, setConfirmLogout] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      setLoading(true);
      Promise.all([
        api.get<ProfileData>('/users/me', token),
        api.get<CollectionItem[]>('/users/me/collection', token),
      ]).then(([profileRes, collectionRes]) => {
        if (profileRes.data) setProfile(profileRes.data);
        if (collectionRes.data) setCollection(collectionRes.data);
        setLoading(false);
      });
    }, [token]),
  );

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color="#E8C547" size="large" />
      </View>
    );
  }

  const p = profile ?? authUser;
  const roleIndex = ROLE_CONFIG.findIndex(r => r.key === (profile?.role ?? authUser?.role));
  const currentRoleIdx = roleIndex >= 0 ? roleIndex : 0;
  const roleConfig = ROLE_CONFIG[currentRoleIdx];
  const nextRole = ROLE_CONFIG[currentRoleIdx + 1];
  const initials = (p?.username ?? 'U').slice(0, 2).toUpperCase();
  const stats = profile?._count;

  return (
    <View style={styles.container}>
      {/* Modale de confirmation */}
      <Modal visible={confirmLogout} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Se déconnecter ?</Text>
            <Text style={styles.modalSub}>Tu devras te reconnecter pour accéder à l'app.</Text>
            <TouchableOpacity style={styles.modalBtnDanger} onPress={logout}>
              <Text style={styles.modalBtnDangerText}>Déconnexion</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setConfirmLogout(false)}>
              <Text style={styles.modalBtnCancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <SafeAreaView>
        <View style={styles.header}>
          <Text style={styles.title}>Profil</Text>
          <TouchableOpacity style={styles.settingsBtn} onPress={() => setConfirmLogout(true)}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.avatarLg}>
            <Text style={styles.avatarLgText}>{initials}</Text>
          </View>
          <Text style={styles.username}>@{p?.username}</Text>
          <View style={styles.roleBadgeWrap}>
            <Text style={styles.roleBadge}>{roleConfig.emoji} {roleConfig.label}</Text>
          </View>
          {p?.bio ? <Text style={styles.bio}>{p.bio}</Text> : null}

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{profile?.certifiedVisits ?? 0}</Text>
              <Text style={styles.statLabel}>Certifiées</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statNum}>{stats?.followers ?? 0}</Text>
              <Text style={styles.statLabel}>Abonnés</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statNum}>{stats?.followings ?? 0}</Text>
              <Text style={styles.statLabel}>Abonnements</Text>
            </View>
          </View>
        </View>

        {/* Progression */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Progression</Text>
          <View style={styles.roleTrack}>
            {ROLE_CONFIG.map((r, i) => {
              const done = i <= currentRoleIdx;
              return (
                <View key={r.key} style={styles.roleStep}>
                  <View style={[styles.roleCircle, done && styles.roleCircleDone]}>
                    <Text style={[styles.roleCircleText, done && styles.roleCircleTextDone]}>
                      {done ? '✓' : String(i + 1)}
                    </Text>
                  </View>
                  {i < ROLE_CONFIG.length - 1 && (
                    <View style={[styles.roleLine, done && styles.roleLineDone]} />
                  )}
                </View>
              );
            })}
          </View>
          <View style={styles.roleLabels}>
            {ROLE_CONFIG.map((r, i) => (
              <Text key={r.key} style={[styles.roleLabel, i <= currentRoleIdx && styles.roleLabelDone]}>
                {r.emoji}
              </Text>
            ))}
          </View>
          {nextRole && (
            <View style={styles.nextRoleBox}>
              <Text style={styles.nextRoleText}>
                Prochain : {nextRole.emoji} {nextRole.label}
              </Text>
              <Text style={styles.nextRoleCount}>
                {nextRole.min - (profile?.certifiedVisits ?? 0)} visites certifiées manquantes
              </Text>
            </View>
          )}
        </View>

        {/* Collection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ma Collection 🏆</Text>
          {collection.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyBoxEmoji}>🍽️</Text>
              <Text style={styles.emptyBoxText}>
                Scanne le QR code d'un restaurant pour certifier ta première visite
              </Text>
            </View>
          ) : (
            <View style={styles.collectionGrid}>
              {collection.filter(item => item.restaurant).map(item => (
                <View key={item.id} style={styles.collectionCard}>
                  <Text style={styles.collectionThumb}>
                    {item.restaurant!.michelinStars > 0
                      ? '⭐'.repeat(Math.min(item.restaurant!.michelinStars, 3))
                      : '🍽️'}
                  </Text>
                  <View style={styles.collectionInfo}>
                    <Text style={styles.collectionName} numberOfLines={1}>
                      {item.restaurant!.name}
                    </Text>
                    <Text style={styles.collectionCity}>{item.restaurant!.city}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Préférences */}
        {(p?.cuisinePreferences ?? []).filter(x => x !== 'all').length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Préférences</Text>
            <View style={styles.prefsRow}>
              {(p?.cuisinePreferences ?? []).filter(x => x !== 'all').map(pref => (
                <View key={pref} style={styles.prefChip}>
                  <Text style={styles.prefChipText}>{pref}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Déconnexion */}
        <TouchableOpacity style={styles.logoutBtn} onPress={() => setConfirmLogout(true)}>
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  loader: { flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8,
  },
  title: { color: '#E8C547', fontSize: 24, fontWeight: '800' },
  settingsBtn: { padding: 4 },
  settingsIcon: { fontSize: 22 },
  hero: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20 },
  avatarLg: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: '#E8C547',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    borderWidth: 3, borderColor: '#F5D66A',
  },
  avatarLgText: { color: '#0A0A0A', fontSize: 28, fontWeight: '800' },
  username: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 6 },
  roleBadgeWrap: { marginBottom: 10 },
  roleBadge: {
    color: '#0A0A0A', backgroundColor: '#E8C547',
    paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20,
    fontSize: 13, fontWeight: '700',
  },
  bio: { color: '#888', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 24, alignItems: 'center', marginTop: 8 },
  stat: { alignItems: 'center' },
  statNum: { color: '#fff', fontSize: 20, fontWeight: '800' },
  statLabel: { color: '#666', fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: '#2A2A2A' },
  section: { paddingHorizontal: 20, paddingBottom: 28 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 16 },
  roleTrack: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  roleStep: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  roleCircle: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#1A1A1A',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#333',
  },
  roleCircleDone: { backgroundColor: '#E8C547', borderColor: '#E8C547' },
  roleCircleText: { color: '#555', fontSize: 11, fontWeight: '700' },
  roleCircleTextDone: { color: '#0A0A0A' },
  roleLine: { flex: 1, height: 2, backgroundColor: '#2A2A2A' },
  roleLineDone: { backgroundColor: '#E8C547' },
  roleLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  roleLabel: { color: '#555', fontSize: 16, textAlign: 'center', flex: 1 },
  roleLabelDone: { color: '#E8C547' },
  nextRoleBox: {
    backgroundColor: '#141414', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#2A2A2A', alignItems: 'center',
  },
  nextRoleText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  nextRoleCount: { color: '#E8C547', fontSize: 12, marginTop: 4 },
  emptyBox: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyBoxEmoji: { fontSize: 40 },
  emptyBoxText: { color: '#555', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  collectionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  collectionCard: {
    width: '47%', backgroundColor: '#141414', borderRadius: 14,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  collectionThumb: { fontSize: 28 },
  collectionInfo: { flex: 1 },
  collectionName: { color: '#fff', fontWeight: '700', fontSize: 13 },
  collectionCity: { color: '#666', fontSize: 11, marginTop: 2 },
  prefsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  prefChip: {
    backgroundColor: 'rgba(232,197,71,0.12)', borderWidth: 1.5, borderColor: '#E8C547',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  prefChipText: { color: '#E8C547', fontSize: 13, fontWeight: '600' },
  logoutBtn: {
    marginHorizontal: 20, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#FF4458', alignItems: 'center',
  },
  logoutText: { color: '#FF4458', fontWeight: '700', fontSize: 15 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  modalBox: {
    backgroundColor: '#1A1A1A', borderRadius: 20, padding: 24,
    width: '100%', gap: 12,
  },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  modalSub: { color: '#666', fontSize: 14, textAlign: 'center', marginBottom: 4 },
  modalBtnDanger: {
    backgroundColor: '#FF4458', paddingVertical: 14, borderRadius: 12, alignItems: 'center',
  },
  modalBtnDangerText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  modalBtnCancel: {
    backgroundColor: '#2A2A2A', paddingVertical: 14, borderRadius: 12, alignItems: 'center',
  },
  modalBtnCancelText: { color: '#888', fontWeight: '600', fontSize: 15 },
});
