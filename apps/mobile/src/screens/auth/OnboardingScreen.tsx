import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius } from '../../theme';
import { Button, Input } from '../../components/UI';
import { api, saveSession, setContext } from '../../lib/api';

const { width } = Dimensions.get('window');

const STEPS = ['Account', 'Business type', 'Size & branch', 'Go live!'];

export default function OnboardingScreen({ navigation }: any) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    fullName: '', email: '', phone: '', password: '',
    businessName: '', businessType: 'RETAIL', businessSize: 'MICRO',
    branchName: 'Main Branch', branchCode: 'MAIN',
  });
  const [loading, setLoading] = useState(false);

  function set(key: string, value: string) {
    setData(d => ({ ...d, [key]: value }));
  }

  async function finish() {
    setLoading(true);
    try {
      await api.post('/auth/register', { fullName: data.fullName, email: data.email, phone: data.phone, password: data.password });
      navigation.navigate('Verify', { email: data.email, bizData: data });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setLoading(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.sand }}>
      {/* Progress */}
      <View style={{ padding: Spacing.base }}>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {STEPS.map((s, i) => (
            <View key={i} style={{ flex: 1 }}>
              <View style={{ height: 4, borderRadius: 2, backgroundColor: i <= step ? Colors.sunset : Colors.border }} />
              <Text style={{ fontSize: 9, color: i === step ? Colors.sunset : Colors.muted, marginTop: 4, textAlign: 'center', fontWeight: i === step ? '700' : '400' }}>
                {s}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.base, gap: Spacing.lg }} keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <View style={styles.card}>
            <Text style={styles.stepTitle}>Create your account</Text>
            <View style={{ gap: Spacing.md }}>
              <Input label="Full name" value={data.fullName} onChangeText={v => set('fullName', v)} placeholder="Grace Nakato" />
              <Input label="Email" value={data.email} onChangeText={v => set('email', v)} placeholder="grace@example.com" keyboardType="email-address" autoCapitalize="none" />
              <Input label="Phone" value={data.phone} onChangeText={v => set('phone', v)} placeholder="+256 700 000000" keyboardType="phone-pad" />
              <Input label="Password" value={data.password} onChangeText={v => set('password', v)} placeholder="Min 8 characters" secureTextEntry />
            </View>
            <Button label="Next →" onPress={() => setStep(1)} fullWidth style={{ marginTop: Spacing.sm }} />
          </View>
        )}

        {step === 1 && (
          <View style={styles.card}>
            <Text style={styles.stepTitle}>What type of business?</Text>
            <Text style={{ color: Colors.muted, fontSize: 13, marginBottom: Spacing.md }}>
              This shapes your dashboard, features and navigation.
            </Text>
            {[
              ['🛒 Shop / Supermarket', 'RETAIL'],
              ['💊 Pharmacy', 'PHARMACY'],
              ['🍽️ Restaurant / Café', 'RESTAURANT'],
              ['🏭 Wholesale / Distribution', 'WHOLESALE'],
              ['🏨 Hotel / Hospitality', 'HOSPITALITY'],
              ['🔧 Garage / Auto', 'AUTOMOTIVE'],
              ['💆 Salon / Spa / Beauty', 'BEAUTY'],
              ['🎓 School / Education', 'EDUCATION'],
              ['⛽ Fuel Station', 'FUEL_STATION'],
              ['🌾 Agriculture / Farm', 'AGRICULTURE'],
              ['🏗️ Construction', 'CONSTRUCTION'],
              ['🚛 Logistics / Transport', 'LOGISTICS'],
              ['🏠 Real Estate', 'REAL_ESTATE'],
              ['👕 Laundry', 'LAUNDRY'],
              ['🔬 Laboratory / Clinic', 'LABORATORY'],
              ['⚙️ Manufacturing', 'MANUFACTURING'],
              ['💼 Services', 'SERVICES'],
              ['📋 Other', 'OTHER'],
            ].map(([label, code]) => (
              <TouchableOpacity
                key={code}
                onPress={() => set('businessType', code)}
                style={{
                  flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14,
                  borderRadius: Radius.md, marginBottom: 6,
                  backgroundColor: data.businessType === code ? `${Colors.sunset}12` : Colors.sand,
                  borderWidth: 1.5,
                  borderColor: data.businessType === code ? Colors.sunset : Colors.border,
                }}
              >
                <Text style={{ fontSize: 16, marginRight: 10 }}>{(label as string).split(' ')[0]}</Text>
                <Text style={{ fontSize: 14, fontWeight: data.businessType === code ? '700' : '400', color: data.businessType === code ? Colors.sunset : Colors.ink }}>
                  {(label as string).split(' ').slice(1).join(' ')}
                </Text>
                {data.businessType === code && <Text style={{ marginLeft: 'auto', color: Colors.sunset }}>✓</Text>}
              </TouchableOpacity>
            ))}
            <Button label="Next →" onPress={() => setStep(2)} fullWidth style={{ marginTop: Spacing.sm }} />
          </View>
        )}

        {step === 2 && (
          <View style={styles.card}>
            <Text style={styles.stepTitle}>Business details</Text>
            <View style={{ gap: Spacing.md }}>
              <Input label="Business name" value={data.businessName} onChangeText={v => set('businessName', v)} placeholder="Nakato Traders Ltd" />
              <View>
                <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.ink, marginBottom: 6 }}>Business size</Text>
                <View style={{ gap: 6 }}>
                  {[['MICRO', '1–5 people'], ['SMALL', '6–20 people'], ['MEDIUM', '21–50 people'], ['LARGE', '51–200 people'], ['ENTERPRISE', '200+ people']].map(([code, label]) => (
                    <TouchableOpacity
                      key={code}
                      onPress={() => set('businessSize', code)}
                      style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: Radius.md, backgroundColor: data.businessSize === code ? `${Colors.sunset}12` : Colors.sand, borderWidth: 1.5, borderColor: data.businessSize === code ? Colors.sunset : Colors.border }}
                    >
                      <Text style={{ flex: 1, fontSize: 14, fontWeight: data.businessSize === code ? '700' : '400', color: data.businessSize === code ? Colors.sunset : Colors.ink }}>{code}: {label}</Text>
                      {data.businessSize === code && <Text style={{ color: Colors.sunset }}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Input label="Branch name" value={data.branchName} onChangeText={v => set('branchName', v)} placeholder="Main Branch" />
                </View>
                <View style={{ flex: 1 }}>
                  <Input label="Branch code" value={data.branchCode} onChangeText={v => set('branchCode', v.toUpperCase())} placeholder="MAIN" />
                </View>
              </View>
            </View>
            <Button label="Next →" onPress={() => setStep(3)} fullWidth style={{ marginTop: Spacing.sm }} />
          </View>
        )}

        {step === 3 && (
          <View style={styles.card}>
            <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: Spacing.base }}>🚀</Text>
            <Text style={[styles.stepTitle, { textAlign: 'center' }]}>Ready to launch!</Text>
            <Text style={{ color: Colors.muted, fontSize: 14, textAlign: 'center', marginBottom: Spacing.xl, lineHeight: 20 }}>
              You'll set up {data.businessName} as a {data.businessType} business.{'\n'}
              We'll send a verification code to your email.
            </Text>

            <View style={{ backgroundColor: Colors.peach, borderRadius: Radius.md, padding: Spacing.base, gap: 6, marginBottom: Spacing.xl }}>
              <Text style={{ fontSize: 12, color: Colors.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Summary</Text>
              {[
                ['Owner', data.fullName],
                ['Email', data.email],
                ['Business', data.businessName],
                ['Type', data.businessType],
                ['Branch', `${data.branchName} (${data.branchCode})`],
              ].map(([k, v]) => (
                <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, color: Colors.muted }}>{k}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.ink }}>{v}</Text>
                </View>
              ))}
            </View>

            <Button label="Create my workspace" onPress={finish} loading={loading} fullWidth />
            <TouchableOpacity onPress={() => setStep(0)} style={{ marginTop: Spacing.sm, alignItems: 'center' }}>
              <Text style={{ color: Colors.muted, fontSize: 13 }}>← Edit details</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    shadowColor: Colors.soil, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  stepTitle: {
    fontSize: 22, fontWeight: '800', color: Colors.ink, letterSpacing: -0.5, marginBottom: Spacing.base,
  },
});
