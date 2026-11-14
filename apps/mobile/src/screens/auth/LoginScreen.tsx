import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius } from '../../theme';
import { Button, Input } from '../../components/UI';
import { api, saveSession, setContext } from '../../lib/api';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  // MFA
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');

  async function onLogin() {
    if (!email.trim() || !password) { Alert.alert('Required', 'Enter your email and password'); return; }
    setLoading(true);
    try {
      const res = await api.post<any>('/auth/login', { email: email.trim(), password });
      if (res.mfaRequired) {
        setMfaToken(res.mfaToken);
        setMfaStep(true);
        setLoading(false);
        return;
      }
      await finalizeLogin(res);
    } catch (e: any) {
      Alert.alert('Login failed', e.message ?? 'Check your credentials and try again');
    }
    setLoading(false);
  }

  async function onMfaVerify() {
    setLoading(true);
    try {
      const res = await api.post<any>('/auth/mfa/verify', { mfaToken, code: mfaCode });
      await finalizeLogin(res);
    } catch (e: any) {
      Alert.alert('Invalid code', e.message ?? 'Try again');
    }
    setLoading(false);
  }

  async function finalizeLogin(res: any) {
    await saveSession(res.accessToken, res.refreshToken);
    if (res.business) {
      await setContext(res.business.id, res.branch?.id ?? '', res.business.type, res.business.name, res.user.fullName);
    }
    navigation.reset({ index: 0, routes: [{ name: 'App' }] });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.sand }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={styles.logoArea}>
            <View style={styles.logoBox}>
              <Text style={styles.logoLetter}>S</Text>
            </View>
            <Text style={styles.logoText}>SokoOS</Text>
            <Text style={styles.tagline}>Business OS for Uganda</Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {mfaStep ? 'Two-factor verification' : 'Sign in'}
            </Text>

            {!mfaStep ? (
              <>
                <View style={{ gap: Spacing.md }}>
                  <Input
                    label="Email address"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="grace@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Input
                    label="Password"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Your password"
                    secureTextEntry={!showPass}
                    rightIcon={
                      <TouchableOpacity onPress={() => setShowPass(s => !s)}>
                        <Text style={{ fontSize: 16 }}>{showPass ? '🙈' : '👁️'}</Text>
                      </TouchableOpacity>
                    }
                  />
                </View>

                <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={{ alignSelf: 'flex-end', marginTop: 4 }}>
                  <Text style={styles.link}>Forgot password?</Text>
                </TouchableOpacity>

                <Button label="Sign in" onPress={onLogin} loading={loading} fullWidth style={{ marginTop: Spacing.base }} />
              </>
            ) : (
              <>
                <Text style={{ fontSize: 13, color: Colors.muted, marginBottom: Spacing.md }}>
                  Enter the 6-digit code from your authenticator app.
                </Text>
                <Input
                  label="Authentication code"
                  value={mfaCode}
                  onChangeText={setMfaCode}
                  placeholder="000000"
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <Button label="Verify" onPress={onMfaVerify} loading={loading} fullWidth style={{ marginTop: Spacing.base }} />
                <TouchableOpacity onPress={() => setMfaStep(false)} style={{ marginTop: Spacing.sm, alignItems: 'center' }}>
                  <Text style={styles.link}>← Back to login</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Register link */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Text style={{ fontSize: 14, color: Colors.muted }}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={[styles.link, { fontSize: 14 }]}>Create one</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: Spacing.base,
    justifyContent: 'center',
    gap: Spacing.xl,
  },
  logoArea: {
    alignItems: 'center',
    gap: 8,
  },
  logoBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: Colors.sidebarBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    color: Colors.sunset,
    fontSize: 32,
    fontWeight: '900',
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: -0.8,
  },
  tagline: {
    fontSize: 13,
    color: Colors.muted,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.sm,
    shadowColor: Colors.soil,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: -0.5,
    marginBottom: Spacing.sm,
  },
  link: {
    color: Colors.sunset,
    fontWeight: '600',
    fontSize: 13,
  },
});
