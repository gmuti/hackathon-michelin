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
            placeholderTextColor="rgba(186,11,47,0.6)"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            placeholderTextColor="rgba(186,11,47,0.6)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
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
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  header: { alignItems: 'center', marginBottom: 52 },
  logo: { fontSize: 72, marginBottom: 16 },
  title: { color: '#ba0b2f', fontSize: 34, fontWeight: '900', letterSpacing: -1 },
  subtitle: { color: '#222326', fontSize: 15, marginTop: 6 },
  form: { gap: 14 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: 'rgba(186,11,47,0.35)',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    color: '#ba0b2f',
    fontSize: 16,
  },
  btn: {
    backgroundColor: '#ba0b2f',
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  linkBtn: { alignItems: 'center', paddingVertical: 10 },
  linkText: { color: '#222326', fontSize: 14 },
  linkAccent: { color: '#ba0b2f', fontWeight: '700' },
});
