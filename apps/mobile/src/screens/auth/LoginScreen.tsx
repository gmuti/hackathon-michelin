import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Champs requis', 'Veuillez remplir tous les champs');
      return;
    }
    setLoading(true);
    const { error } = await login(email.trim().toLowerCase(), password);
    setLoading(false);
    if (error) Alert.alert('Connexion impossible', error);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.logo}>🍽️</Text>
          <Text style={styles.title}>MichelinMatch</Text>
          <Text style={styles.subtitle}>Retrouve ta passion culinaire</Text>
        </View>

        <View style={styles.form}>
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
            placeholder="Mot de passe"
            placeholderTextColor="#555"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#0A0A0A" />
              : <Text style={styles.btnText}>Se connecter</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.linkText}>
              Pas encore de compte ?{' '}
              <Text style={styles.linkAccent}>S'inscrire</Text>
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
  header: { alignItems: 'center', marginBottom: 52 },
  logo: { fontSize: 72, marginBottom: 16 },
  title: { color: '#fff', fontSize: 34, fontWeight: '900', letterSpacing: -1 },
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
