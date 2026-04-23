import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

const CUISINE_TYPES = [
  { id: 'japanese',  label: 'Japonaise',     emoji: '🍣' },
  { id: 'italian',   label: 'Italienne',     emoji: '🍝' },
  { id: 'french',    label: 'Française',     emoji: '🥐' },
  { id: 'asian',     label: 'Asiatique',     emoji: '🥢' },
  { id: 'veg',       label: 'Végétarienne',  emoji: '🥗' },
  { id: 'fusion',    label: 'Fusion',        emoji: '🌮' },
  { id: 'seafood',   label: 'Fruits de mer', emoji: '🦞' },
  { id: 'bbq',       label: 'Grillades',     emoji: '🥩' },
  { id: 'desserts',  label: 'Desserts',      emoji: '🍰' },
  { id: 'brunch',    label: 'Brunch',        emoji: '🥞' },
];

const DIETARY = [
  { id: 'veg',     label: 'Végétarien',   emoji: '🥦' },
  { id: 'vegan',   label: 'Végan',        emoji: '🌱' },
  { id: 'gluten',  label: 'Sans gluten',  emoji: '🌾' },
  { id: 'halal',   label: 'Halal',        emoji: '☪️' },
  { id: 'lactose', label: 'Sans lactose', emoji: '🥛' },
  { id: 'casher',  label: 'Casher',       emoji: '✡️' },
];

export default function OnboardingScreen() {
  const { updateUser } = useAuth();
  const [step, setStep] = useState(0);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const toggle = (id: string, list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) =>
    setList(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const startCountdown = () => {
    setShowCountdown(true);
    let c = 3;
    const interval = setInterval(() => {
      c -= 1;
      setCountdown(c);
      if (c === 0) clearInterval(interval);
    }, 1000);
  };

  const finish = async () => {
    setSaving(true);
    await updateUser({
      cuisinePreferences: selectedCuisines.length > 0 ? selectedCuisines : ['all'],
      dietaryRestrictions: selectedDietary,
    });
    setSaving(false);
    startCountdown();
  };

  const next = () => {
    if (step < 1) setStep(step + 1);
    else finish();
  };

  if (showCountdown) {
    return (
      <View style={styles.countdown}>
        <Text style={styles.countdownNumber}>{countdown === 0 ? '🚀' : countdown}</Text>
        <Text style={styles.countdownLabel}>
          {countdown === 0 ? "C'est parti !" : countdown === 3 ? 'Prêt ?' : '...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Progress */}
        <View style={styles.progress}>
          {[0, 1].map(i => (
            <View key={i} style={[styles.progressDot, i <= step && styles.progressDotActive]} />
          ))}
        </View>

        {step === 0 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Quelles cuisines t'attirent ? 🍽️</Text>
            <Text style={styles.stepSub}>Sélectionne tout ce qui te fait saliver</Text>
            <View style={styles.grid}>
              {CUISINE_TYPES.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.chip, selectedCuisines.includes(c.id) && styles.chipActive]}
                  onPress={() => toggle(c.id, selectedCuisines, setSelectedCuisines)}
                >
                  <Text style={styles.chipEmoji}>{c.emoji}</Text>
                  <Text style={[styles.chipLabel, selectedCuisines.includes(c.id) && styles.chipLabelActive]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Des restrictions alimentaires ? 🌿</Text>
            <Text style={styles.stepSub}>On les appliquera automatiquement à chaque recherche</Text>
            <View style={styles.grid}>
              {DIETARY.map(d => (
                <TouchableOpacity
                  key={d.id}
                  style={[styles.chip, selectedDietary.includes(d.id) && styles.chipActive]}
                  onPress={() => toggle(d.id, selectedDietary, setSelectedDietary)}
                >
                  <Text style={styles.chipEmoji}>{d.emoji}</Text>
                  <Text style={[styles.chipLabel, selectedDietary.includes(d.id) && styles.chipLabelActive]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.skipHint}>Tu peux passer si tu n'as aucune restriction</Text>
          </View>
        )}

        <TouchableOpacity style={styles.nextBtn} onPress={next} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.nextBtnText}>{step < 2 ? 'Continuer →' : '🚀 Démarrer !'}</Text>
          }
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  progress: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingTop: 16, marginBottom: 8 },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(186,11,47,0.22)' },
  progressDotActive: { backgroundColor: '#ba0b2f', width: 24 },
  stepContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  stepTitle: { color: '#ba0b2f', fontSize: 26, fontWeight: '800', marginBottom: 6, letterSpacing: -0.5 },
  stepSub: { color: '#222326', fontSize: 15, marginBottom: 24 },
  skipHint: { color: '#444', fontSize: 13, marginTop: 16, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 50, borderWidth: 1.5, borderColor: 'rgba(186,11,47,0.35)',
  },
  chipActive: { backgroundColor: 'rgba(186,11,47,0.1)', borderColor: '#ba0b2f' },
  chipEmoji: { fontSize: 18 },
  chipLabel: { color: '#222326', fontSize: 14, fontWeight: '600' },
  chipLabelActive: { color: '#ba0b2f' },
  transportGrid: { gap: 12 },
  transportCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#fff', padding: 18, borderRadius: 16,
    borderWidth: 1.5, borderColor: 'rgba(186,11,47,0.35)',
  },
  transportCardActive: { borderColor: '#ba0b2f', backgroundColor: 'rgba(186,11,47,0.1)' },
  transportEmoji: { fontSize: 30 },
  transportLabel: { color: '#222326', fontSize: 16, fontWeight: '700', flex: 1 },
  transportLabelActive: { color: '#ba0b2f' },
  transportSub: { color: '#222326', fontSize: 13 },
  nextBtn: {
    marginHorizontal: 20, marginBottom: 24, backgroundColor: '#ba0b2f',
    paddingVertical: 16, borderRadius: 16, alignItems: 'center',
  },
  nextBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  countdown: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  countdownNumber: { fontSize: 120, fontWeight: '900', color: '#ba0b2f' },
  countdownLabel: { color: 'rgba(186,11,47,0.8)', fontSize: 22, marginTop: 12, fontWeight: '600' },
});
