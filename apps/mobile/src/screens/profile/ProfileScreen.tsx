import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, Modal,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import SettingsIcon from '../../../logo/settings.svg';
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
  restaurant: { id: string; name: string; city: string; michelinStars: number } | null;
};

const ROLE_CONFIG = [
  { key: 'PLONGEUR',    label: 'Plongeur',   emoji: '🫧',  min: 0  },
  { key: 'SERVEUR',     label: 'Serveur',     emoji: '🍽️', min: 1  },
  { key: 'COMMIS',      label: 'Commis',      emoji: '👨‍🍳', min: 5  },
  { key: 'SOUS_CHEF',   label: 'Sous-chef',   emoji: '🔪',  min: 15 },
  { key: 'CHEF',        label: 'Chef',        emoji: '⭐',  min: 30 },
  { key: 'CHEF_ETOILE', label: 'Chef Étoilé', emoji: '🌟',  min: 50 },
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
  { id: 'casher',  label: 'Casher',      emoji: '✡️' },
];

export default function ProfileScreen() {
  const { token, user: authUser, logout, updateUser } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmLogout, setConfirmLogout] = useState(false);

  // Preferences edit modal
  const [showPrefModal, setShowPrefModal] = useState(false);
  const [editCuisines, setEditCuisines] = useState<string[]>([]);
  const [editDietary, setEditDietary] = useState<string[]>([]);
  const [savingPrefs, setSavingPrefs] = useState(false);

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

  const openPrefModal = () => {
    const p = profile ?? authUser;
    setEditCuisines((p?.cuisinePreferences ?? []).filter(x => x !== 'all'));
    setEditDietary(p?.dietaryRestrictions ?? []);
    setShowPrefModal(true);
  };

  const savePrefs = async () => {
    setSavingPrefs(true);
    await updateUser({
      cuisinePreferences: editCuisines.length > 0 ? editCuisines : ['all'],
      dietaryRestrictions: editDietary,
    });
    // Refresh profile
    if (token) {
      const res = await api.get<ProfileData>('/users/me', token);
      if (res.data) setProfile(res.data);
    }
    setSavingPrefs(false);
    setShowPrefModal(false);
  };

  const toggle = (id: string, list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) =>
    setList(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color="#ba0b2f" size="large" />
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

  const cuisinePrefs = (p?.cuisinePreferences ?? []).filter(x => x !== 'all');
  const dietaryPrefs = p?.dietaryRestrictions ?? [];

  return (
    <View style={styles.container}>
      {/* Logout modal */}
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

      {/* Preferences edit modal */}
      <Modal visible={showPrefModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '85%' }]}>
            <Text style={styles.modalTitle}>Préférences alimentaires</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.prefModalSection}>Cuisines</Text>
              <View style={styles.chipsWrap}>
                {CUISINE_OPTIONS.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.chip, editCuisines.includes(c.id) && styles.chipActive]}
                    onPress={() => toggle(c.id, editCuisines, setEditCuisines)}
                  >
                    <Text style={styles.chipEmoji}>{c.emoji}</Text>
                    <Text style={[styles.chipLabel, editCuisines.includes(c.id) && styles.chipLabelActive]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.prefModalSection, { marginTop: 20 }]}>Restrictions alimentaires</Text>
              <View style={styles.chipsWrap}>
                {DIETARY_OPTIONS.map(d => (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.chip, editDietary.includes(d.id) && styles.chipActive]}
                    onPress={() => toggle(d.id, editDietary, setEditDietary)}
                  >
                    <Text style={styles.chipEmoji}>{d.emoji}</Text>
                    <Text style={[styles.chipLabel, editDietary.includes(d.id) && styles.chipLabelActive]}>
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.modalBtnPrimary} onPress={savePrefs} disabled={savingPrefs}>
              {savingPrefs
                ? <ActivityIndicator color="#0A0A0A" />
                : <Text style={styles.modalBtnPrimaryText}>Enregistrer</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowPrefModal(false)}>
              <Text style={styles.modalBtnCancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <SafeAreaView>
        <View style={styles.header}>
          <Text style={styles.title}>Profil</Text>
          <TouchableOpacity style={styles.settingsBtn} onPress={() => setConfirmLogout(true)}>
            <SettingsIcon width={24} height={24} fill="#ba0b2f" />
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
              <Text style={styles.nextRoleText}>Prochain : {nextRole.emoji} {nextRole.label}</Text>
              <Text style={styles.nextRoleCount}>
                {nextRole.min - (profile?.certifiedVisits ?? 0)} visites certifiées manquantes
              </Text>
            </View>
          )}
        </View>

        {/* Préférences alimentaires */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Préférences alimentaires</Text>
            <TouchableOpacity style={styles.editBtn} onPress={openPrefModal}>
              <Text style={styles.editBtnText}>Modifier</Text>
            </TouchableOpacity>
          </View>

          {cuisinePrefs.length > 0 ? (
            <>
              <Text style={styles.prefSubtitle}>Cuisines</Text>
              <View style={styles.prefsRow}>
                {cuisinePrefs.map(pref => {
                  const opt = CUISINE_OPTIONS.find(c => c.id === pref);
                  return (
                    <View key={pref} style={styles.prefChip}>
                      {opt && <Text style={styles.prefChipEmoji}>{opt.emoji}</Text>}
                      <Text style={styles.prefChipText}>{opt?.label ?? pref}</Text>
                    </View>
                  );
                })}
              </View>
            </>
          ) : (
            <TouchableOpacity style={styles.emptyPrefs} onPress={openPrefModal}>
              <Text style={styles.emptyPrefsText}>Ajouter mes préférences de cuisine →</Text>
            </TouchableOpacity>
          )}

          {dietaryPrefs.length > 0 && (
            <>
              <Text style={[styles.prefSubtitle, { marginTop: 14 }]}>Restrictions</Text>
              <View style={styles.prefsRow}>
                {dietaryPrefs.map(pref => {
                  const opt = DIETARY_OPTIONS.find(d => d.id === pref);
                  return (
                    <View key={pref} style={[styles.prefChip, styles.prefChipDietary]}>
                      {opt && <Text style={styles.prefChipEmoji}>{opt.emoji}</Text>}
                      <Text style={[styles.prefChipText, styles.prefChipTextDietary]}>{opt?.label ?? pref}</Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </View>

        {/* Collection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ma Collection</Text>
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
                    <Text style={styles.collectionName} numberOfLines={1}>{item.restaurant!.name}</Text>
                    <Text style={styles.collectionCity}>{item.restaurant!.city}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={() => setConfirmLogout(true)}>
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8 },
  title: { color: '#ba0b2f', fontSize: 24, fontWeight: '800' },
  loader: { flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' },
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
  bio: { color: '#222326', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 24, alignItems: 'center' },
  stat: { alignItems: 'center' },
  statNum: { color: '#ba0b2f', fontSize: 20, fontWeight: '800' },
  statLabel: { color: '#222326', fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(186,11,47,0.35)' },
  section: { paddingHorizontal: 20, paddingBottom: 24 },
  sectionTitle: { color: '#ba0b2f', fontSize: 18, fontWeight: '700', marginBottom: 16 },
  roleBadgeWrap: { marginBottom: 10 },
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
  roleLabel: { color: '#222326', fontSize: 9, textAlign: 'center', flex: 1 },
  roleLabelDone: { color: '#ba0b2f' },
  nextRoleBox: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: 'rgba(186,11,47,0.35)', alignItems: 'center',
  },
  nextRoleText: { color: '#ba0b2f', fontWeight: '700', fontSize: 14 },
  nextRoleCount: { color: '#222326', fontSize: 12, marginTop: 4 },
  emptyBox: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyBoxEmoji: { fontSize: 40 },
  emptyBoxText: { color: '#222326', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  roleCircleTextDone: { color: '#fff' },
  collectionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  collectionCard: {
    width: '47%', backgroundColor: '#fff', borderRadius: 14,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: 'rgba(186,11,47,0.28)',
  },
  collectionThumb: { fontSize: 28 },
  collectionInfo: { flex: 1 },
  prefsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  prefChip: {
    backgroundColor: 'rgba(186,11,47,0.1)', borderWidth: 1.5, borderColor: 'rgba(186,11,47,0.35)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  prefChipEmoji: { fontSize: 14, marginRight: 6 },
  prefChipText: { color: '#ba0b2f', fontSize: 13, fontWeight: '600' },
  prefChipDietary: { backgroundColor: '#fff' },
  prefChipTextDietary: { color: '#222326' },
  prefSubtitle: { color: '#222326', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  emptyPrefs: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: 'rgba(186,11,47,0.35)',
    paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12,
  },
  emptyPrefsText: { color: '#ba0b2f', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  editBtn: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(186,11,47,0.35)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
  },
  editBtnText: { color: '#ba0b2f', fontWeight: '700', fontSize: 12 },
  prefModalSection: { color: '#ba0b2f', fontSize: 15, fontWeight: '700', marginBottom: 10 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 9,
    borderRadius: 50, borderWidth: 1.5, borderColor: 'rgba(186,11,47,0.35)',
  },
  chipActive: { backgroundColor: 'rgba(186,11,47,0.1)', borderColor: '#ba0b2f' },
  chipEmoji: { fontSize: 16 },
  chipLabel: { color: '#222326', fontSize: 13, fontWeight: '600' },
  chipLabelActive: { color: '#ba0b2f' },
  modalBtnPrimary: {
    backgroundColor: '#ba0b2f', paddingVertical: 14, borderRadius: 12, alignItems: 'center',
  },
  modalBtnPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  logoutBtn: {
    marginHorizontal: 20, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#ba0b2f', alignItems: 'center',
  },
  logoutText: { color: '#ba0b2f', fontWeight: '700', fontSize: 15 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(186,11,47,0.35)',
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  modalBox: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    width: '100%', gap: 12,
  },
  modalTitle: { color: '#ba0b2f', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  modalSub: { color: '#222326', fontSize: 14, textAlign: 'center', marginBottom: 4 },
  modalBtnDanger: {
    backgroundColor: '#ba0b2f', paddingVertical: 14, borderRadius: 12, alignItems: 'center',
  },
  modalBtnDangerText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  modalBtnCancel: {
    backgroundColor: '#fff', paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(186,11,47,0.35)',
  },
  modalBtnCancelText: { color: '#ba0b2f', fontWeight: '600', fontSize: 15 },
  collectionName: { color: '#ba0b2f', fontWeight: '700', fontSize: 13 },
  collectionCity: { color: '#222326', fontSize: 11, marginTop: 2 },
});
