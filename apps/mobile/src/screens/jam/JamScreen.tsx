import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';

type JamState = 'lobby' | 'countdown' | 'swiping';

export default function JamScreen({ route, navigation }: any) {
  const mode = route?.params?.mode ?? 'restaurant';
  const [state, setState] = useState<JamState>('lobby');
  const [participants] = useState([
    { id: '1', username: 'gastronaute_paris', avatar: 'GP', ready: true },
    { id: '2', username: 'thomas_r', avatar: 'TR', ready: true },
    { id: '3', username: 'sofia_m', avatar: 'SM', ready: false },
  ]);
  const [countdown, setCountdown] = useState(3);
  const shareCode = 'JAM-7F3K';

  const startJam = () => {
    setState('countdown');
    let c = 3;
    const interval = setInterval(() => {
      c -= 1;
      setCountdown(c);
      if (c === 0) {
        clearInterval(interval);
        setTimeout(() => setState('swiping'), 500);
      }
    }, 1000);
  };

  if (state === 'countdown') return (
    <View style={styles.countdown}>
      <Text style={styles.countdownNum}>{countdown === 0 ? '🎉' : countdown}</Text>
      <Text style={styles.countdownLabel}>{countdown === 0 ? "C'est parti !" : 'Prêt à swiper ?'}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.title}>🎵 Jam Session</Text>
          <View style={{ width: 70 }} />
        </View>

        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Partage ce code</Text>
          <Text style={styles.code}>{shareCode}</Text>
          <TouchableOpacity style={styles.shareBtn}>
            <Text style={styles.shareBtnText}>📤 Partager</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Participants ({participants.length})</Text>
          {participants.map(p => (
            <View key={p.id} style={styles.participant}>
              <View style={styles.participantAvatar}>
                <Text style={styles.participantAvatarText}>{p.avatar}</Text>
              </View>
              <Text style={styles.participantName}>@{p.username}</Text>
              <View style={[styles.readyBadge, p.ready && styles.readyBadgeActive]}>
                <Text style={styles.readyText}>{p.ready ? '✓ Prêt' : '...'}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.matchSettings}>
          <Text style={styles.sectionTitle}>Match si</Text>
          <View style={styles.matchOptions}>
            <TouchableOpacity style={[styles.matchOption, styles.matchOptionActive]}>
              <Text style={styles.matchOptionText}>🏆 Unanimité</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.matchOption}>
              <Text style={styles.matchOptionText}>👥 Majorité</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.startBtn} onPress={startJam}>
          <Text style={styles.startBtnText}>🚀 Lancer la session</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, marginBottom: 20 },
  backBtn: { color: '#888', fontSize: 15 },
  title: { color: '#E8C547', fontSize: 18, fontWeight: '800' },
  codeCard: {
    marginHorizontal: 20, backgroundColor: '#141414', borderRadius: 20,
    padding: 24, alignItems: 'center', marginBottom: 24,
    borderWidth: 1, borderColor: '#E8C547',
  },
  codeLabel: { color: '#888', fontSize: 14, marginBottom: 8 },
  code: { color: '#E8C547', fontSize: 36, fontWeight: '900', letterSpacing: 4, marginBottom: 16 },
  shareBtn: { backgroundColor: '#1A1A1A', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  shareBtnText: { color: '#fff', fontWeight: '600' },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  participant: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  participantAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8C547',
    alignItems: 'center', justifyContent: 'center',
  },
  participantAvatarText: { color: '#0A0A0A', fontWeight: '700' },
  participantName: { flex: 1, color: '#fff', fontSize: 15 },
  readyBadge: { backgroundColor: '#1A1A1A', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  readyBadgeActive: { backgroundColor: 'rgba(0,200,100,0.2)' },
  readyText: { color: '#888', fontSize: 12, fontWeight: '600' },
  matchSettings: { paddingHorizontal: 20, marginBottom: 24 },
  matchOptions: { flexDirection: 'row', gap: 10 },
  matchOption: {
    flex: 1, backgroundColor: '#141414', padding: 14, borderRadius: 14,
    alignItems: 'center', borderWidth: 1.5, borderColor: '#2A2A2A',
  },
  matchOptionActive: { borderColor: '#E8C547', backgroundColor: 'rgba(232,197,71,0.1)' },
  matchOptionText: { color: '#fff', fontWeight: '600' },
  startBtn: {
    marginHorizontal: 20, backgroundColor: '#E8C547',
    paddingVertical: 16, borderRadius: 16, alignItems: 'center',
  },
  startBtnText: { color: '#0A0A0A', fontSize: 17, fontWeight: '800' },
  countdown: { flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' },
  countdownNum: { fontSize: 120, fontWeight: '900', color: '#E8C547' },
  countdownLabel: { color: '#888', fontSize: 22, marginTop: 12 },
});
