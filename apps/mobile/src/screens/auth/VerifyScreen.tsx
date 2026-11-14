import React, { useState } from 'react';
import { View, Text, Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius } from '../../theme';
import { Button, Input } from '../../components/UI';
import { api } from '../../lib/api';

export default function VerifyScreen({ route, navigation }: any) {
  const { email } = route.params ?? {};
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function onVerify() {
    if (code.length < 4) { Alert.alert('Required', 'Enter the verification code'); return; }
    setLoading(true);
    try {
      await api.post('/auth/verify-email', { token: code });
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (e: any) {
      Alert.alert('Invalid code', e.message ?? 'Try again or resend');
    }
    setLoading(false);
  }

  async function onResend() {
    try {
      await api.post('/auth/resend-verification', { email });
      Alert.alert('Sent!', 'Check your inbox for a new code.');
    } catch {}
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.sand }}>
      <View style={styles.container}>
        <Text style={{ fontSize: 56, marginBottom: Spacing.base }}>📧</Text>
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to{'\n'}
          <Text style={{ color: Colors.ink, fontWeight: '600' }}>{email}</Text>
        </Text>

        <View style={styles.card}>
          <Input
            label="Verification code"
            value={code}
            onChangeText={setCode}
            placeholder="000000"
            keyboardType="number-pad"
            maxLength={6}
          />
          <Button label="Verify email" onPress={onVerify} loading={loading} fullWidth style={{ marginTop: Spacing.base }} />
        </View>

        <TouchableOpacity onPress={onResend}>
          <Text style={{ color: Colors.muted, fontSize: 13 }}>
            Didn't receive it? <Text style={{ color: Colors.sunset, fontWeight: '600' }}>Resend code</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginTop: Spacing.sm }}>
          <Text style={{ color: Colors.muted, fontSize: 13 }}>← Back to login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.xl, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },
  title: { fontSize: 26, fontWeight: '800', color: Colors.ink, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 22 },
  card: { width: '100%', backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.xl, shadowColor: Colors.soil, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
});
