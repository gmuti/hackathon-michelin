import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function RegisterScreen({ navigation }: any) {
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!username.trim() || !email.trim() || !password) {
      Alert.alert('Champs requis', 'Veuillez remplir tous les champs');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Mot de passe trop court', 'Minimum 6 caractères');
      return;
    }
    setLoading(true);
    const { error } = await register(email.trim().toLowerCase(), password, username.trim());
    setLoading(false);
    if (error) Alert.alert("Inscription impossible", error);
    // On success: token is set → navigator shows Onboarding (cuisinePreferences empty)
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>Rejoins la communauté Michelin</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Nom d'utilisateur"
            placeholderTextColor="#555"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#555"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Mot de passe (min. 6 caractères)"
            placeholderTextColor="#555"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#0A0A0A" />
              : <Text style={styles.btnText}>Créer mon compte</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.linkText}>
              Déjà inscrit ?{' '}
              <Text style={styles.linkAccent}>Se connecter</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0A0A' },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  backBtn: { position: 'absolute', top: 20, left: 24 },
  backText: { color: '#E8C547', fontSize: 15, fontWeight: '600' },
  header: { alignItems: 'center', marginBottom: 44 },
  title: { color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  subtitle: { color: '#555', fontSize: 15, marginTop: 6 },
  form: { gap: 14 },
  input: {
    backgroundColor: '#141414',
    borderWidth: 1.5,
    borderColor: '#2A2A2A',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    color: '#fff',
    fontSize: 16,
  },
  btn: {
    backgroundColor: '#E8C547',
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  btnText: { color: '#0A0A0A', fontSize: 17, fontWeight: '800' },
  linkBtn: { alignItems: 'center', paddingVertical: 10 },
  linkText: { color: '#555', fontSize: 14 },
  linkAccent: { color: '#E8C547', fontWeight: '700' },
});
