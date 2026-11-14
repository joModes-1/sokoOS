import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius } from '../../theme';
import { Button, Input } from '../../components/UI';
import { api } from '../../lib/api';

export default function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit() {
    if (!email.trim()) return;
    setLoading(true);
    try { await api.post('/auth/forgot-password', { email }); } catch {}
    setSent(true);
    setLoading(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.sand }}>
      <View style={{ padding: Spacing.base }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: Colors.sunset, fontSize: 15, fontWeight: '600' }}>← Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        {!sent ? (
          <>
            <Text style={styles.title}>Reset password</Text>
            <Text style={{ color: Colors.muted, fontSize: 14, marginBottom: Spacing.lg }}>
              Enter your email and we'll send reset instructions.
            </Text>
            <View style={styles.card}>
              <Input label="Email address" value={email} onChangeText={setEmail} placeholder="grace@example.com" keyboardType="email-address" autoCapitalize="none" />
              <Button label="Send reset link" onPress={onSubmit} loading={loading} fullWidth style={{ marginTop: Spacing.base }} />
            </View>
          </>
        ) : (
          <View style={{ alignItems: 'center', gap: Spacing.base }}>
            <Text style={{ fontSize: 56 }}>✅</Text>
            <Text style={styles.title}>Check your email</Text>
            <Text style={{ color: Colors.muted, fontSize: 14, textAlign: 'center', lineHeight: 22 }}>
              If <Text style={{ color: Colors.ink, fontWeight: '600' }}>{email}</Text> exists in our system, you'll receive a password reset link.
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={{ color: Colors.sunset, fontWeight: '600', fontSize: 15 }}>Back to login →</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.xl, justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: Colors.ink, letterSpacing: -0.5, marginBottom: Spacing.sm },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.xl, shadowColor: Colors.soil, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
});
