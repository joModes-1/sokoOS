import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius } from '../../theme';
import { Button, Input } from '../../components/UI';
import { api } from '../../lib/api';

const BUSINESS_TYPES = [
  { code: 'RETAIL', label: 'Shop / Supermarket', icon: '🛒' },
  { code: 'PHARMACY', label: 'Pharmacy', icon: '💊' },
  { code: 'RESTAURANT', label: 'Restaurant', icon: '🍽️' },
  { code: 'WHOLESALE', label: 'Wholesale', icon: '🏭' },
  { code: 'MANUFACTURING', label: 'Manufacturing', icon: '⚙️' },
  { code: 'AGRICULTURE', label: 'Agriculture', icon: '🌾' },
  { code: 'HOSPITALITY', label: 'Hotel / Lodge', icon: '🏨' },
  { code: 'AUTOMOTIVE', label: 'Garage / Auto', icon: '🔧' },
  { code: 'BEAUTY', label: 'Salon / Spa', icon: '💆' },
  { code: 'EDUCATION', label: 'School', icon: '🎓' },
  { code: 'SERVICES', label: 'Services', icon: '💼' },
  { code: 'FUEL_STATION', label: 'Fuel Station', icon: '⛽' },
  { code: 'LAUNDRY', label: 'Laundry', icon: '👕' },
  { code: 'LABORATORY', label: 'Laboratory', icon: '🔬' },
  { code: 'REAL_ESTATE', label: 'Real Estate', icon: '🏠' },
  { code: 'LOGISTICS', label: 'Logistics', icon: '🚛' },
  { code: 'CONSTRUCTION', label: 'Construction', icon: '🏗️' },
  { code: 'OTHER', label: 'Other Business', icon: '📋' },
];

export default function RegisterScreen({ navigation }: any) {
  const [step, setStep] = useState(0); // 0=account, 1=business
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', password: '', confirmPassword: '',
    businessName: '', businessType: 'RETAIL', branchName: 'Main Branch', branchCode: 'MAIN',
  });
  const [loading, setLoading] = useState(false);

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function goNext() {
    if (!form.fullName || !form.email || !form.phone || !form.password) {
      Alert.alert('Required', 'Fill in all fields'); return;
    }
    if (form.password !== form.confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match'); return;
    }
    if (form.password.length < 8) {
      Alert.alert('Too short', 'Password must be at least 8 characters'); return;
    }
    setStep(1);
  }

  async function onSubmit() {
    if (!form.businessName) { Alert.alert('Required', 'Enter your business name'); return; }
    setLoading(true);
    try {
      await api.post('/auth/register', {
        fullName: form.fullName, email: form.email,
        phone: form.phone, password: form.password,
      });
      navigation.navigate('Verify', {
        email: form.email,
        bizData: {
          businessName: form.businessName, businessType: form.businessType,
          branchName: form.branchName, branchCode: form.branchCode,
        },
      });
    } catch (e: any) {
      Alert.alert('Registration failed', e.message ?? 'Try again');
    }
    setLoading(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.sand }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: Spacing.base, gap: Spacing.lg }} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View>
            <TouchableOpacity onPress={() => step === 0 ? navigation.goBack() : setStep(0)} style={{ marginBottom: Spacing.base }}>
              <Text style={{ color: Colors.sunset, fontSize: 15, fontWeight: '600' }}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{step === 0 ? 'Create account' : 'Your business'}</Text>
            <Text style={{ color: Colors.muted, fontSize: 13, marginTop: 4 }}>Step {step + 1} of 2</Text>
          </View>

          {/* Step indicator */}
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[0, 1].map(i => (
              <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= step ? Colors.sunset : Colors.border }} />
            ))}
          </View>

          {step === 0 ? (
            <View style={[styles.card, { gap: Spacing.md }]}>
              <Input label="Full name" value={form.fullName} onChangeText={v => set('fullName', v)} placeholder="Grace Nakato" />
              <Input label="Email" value={form.email} onChangeText={v => set('email', v)} placeholder="grace@example.com" keyboardType="email-address" autoCapitalize="none" />
              <Input label="Phone" value={form.phone} onChangeText={v => set('phone', v)} placeholder="+256 700 000000" keyboardType="phone-pad" />
              <Input label="Password" value={form.password} onChangeText={v => set('password', v)} placeholder="Min 8 characters" secureTextEntry />
              <Input label="Confirm password" value={form.confirmPassword} onChangeText={v => set('confirmPassword', v)} placeholder="Repeat password" secureTextEntry />
              <Button label="Continue →" onPress={goNext} fullWidth />
            </View>
          ) : (
            <View style={[styles.card, { gap: Spacing.md }]}>
              <Input label="Business name" value={form.businessName} onChangeText={v => set('businessName', v)} placeholder="Nakato Traders Ltd" />

              {/* Business type grid */}
              <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.ink }}>Business type</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {BUSINESS_TYPES.map(t => (
                  <TouchableOpacity
                    key={t.code}
                    onPress={() => set('businessType', t.code)}
                    style={{
                      width: '31%', padding: 10, borderRadius: Radius.md, alignItems: 'center', gap: 4,
                      borderWidth: 1.5,
                      borderColor: form.businessType === t.code ? Colors.sunset : Colors.border,
                      backgroundColor: form.businessType === t.code ? `${Colors.sunset}10` : Colors.surface,
                    }}
                  >
                    <Text style={{ fontSize: 22 }}>{t.icon}</Text>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: form.businessType === t.code ? Colors.sunset : Colors.muted, textAlign: 'center' }}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Input label="First branch name" value={form.branchName} onChangeText={v => set('branchName', v)} placeholder="Main Branch" />
                </View>
                <View style={{ flex: 1 }}>
                  <Input label="Branch code" value={form.branchCode} onChangeText={v => set('branchCode', v.toUpperCase())} placeholder="MAIN" />
                </View>
              </View>

              <Button label="Create business" onPress={onSubmit} loading={loading} fullWidth />
            </View>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Text style={{ color: Colors.muted, fontSize: 13 }}>Already have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={{ color: Colors.sunset, fontWeight: '600', fontSize: 13 }}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '800', color: Colors.ink, letterSpacing: -0.5 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    shadowColor: Colors.soil, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
});
