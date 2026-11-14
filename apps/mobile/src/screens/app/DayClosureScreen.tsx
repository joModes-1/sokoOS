import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, Alert, StyleSheet } from 'react-native';
import { Colors, Spacing, Radius } from '../../theme';
import { Button, Card } from '../../components/UI';
import { api } from '../../lib/api';
import { formatMoney } from '../../lib/format';

const DENOMS = [50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50];

export default function DayClosureScreen({ navigation }: any) {
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const cashTotal = DENOMS.reduce((s, d) => s + d * (counts[d] ?? 0), 0);

  async function closDay() {
    setLoading(true);
    try {
      await api.post('/finance/day-closures', {
        denominationCounts: Object.entries(counts).map(([d, c]) => ({ denomination: parseInt(d), count: c })),
        countedCashMinor: cashTotal,
      });
      setDone(true);
    } catch (e: any) {
      Alert.alert('Failed', e.message ?? 'Day closure failed');
    }
    setLoading(false);
  }

  if (done) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.sand, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl }}>
        <Text style={{ fontSize: 64, marginBottom: Spacing.base }}>🌙</Text>
        <Text style={{ fontSize: 24, fontWeight: '800', color: Colors.ink, letterSpacing: -0.5 }}>Day closed!</Text>
        <Text style={{ color: Colors.muted, marginTop: 8, fontSize: 14 }}>Cash counted: {formatMoney(cashTotal)}</Text>
        <Button label="Go to dashboard" onPress={() => navigation.navigate('Dashboard')} style={{ marginTop: Spacing.xl }} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.sand }} contentContainerStyle={{ padding: Spacing.base, gap: Spacing.base, paddingBottom: 32 }}>
      <Card>
        <Text style={{ fontSize: 16, fontWeight: '800', color: Colors.ink, marginBottom: Spacing.base }}>💵 Cash count</Text>

        {DENOMS.map(denom => (
          <View key={denom} style={styles.denomRow}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.ink, width: 80 }}>
              {denom >= 1000 ? `${denom / 1000}K` : denom}
            </Text>
            <Text style={{ color: Colors.muted, fontSize: 14, marginHorizontal: 8 }}>×</Text>
            <TextInput
              value={counts[denom] ? String(counts[denom]) : ''}
              onChangeText={v => setCounts({ ...counts, [denom]: parseInt(v) || 0 })}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={Colors.muted}
              style={styles.denomInput}
            />
            <Text style={{ color: Colors.muted, fontSize: 12, flex: 1, textAlign: 'right' }}>
              = {formatMoney(denom * (counts[denom] ?? 0))}
            </Text>
          </View>
        ))}

        <View style={styles.totalRow}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.ink }}>Total cash</Text>
          <Text style={{ fontSize: 24, fontWeight: '900', color: Colors.sunset, letterSpacing: -0.5 }}>
            {formatMoney(cashTotal)}
          </Text>
        </View>
      </Card>

      <Button label="Close day" onPress={closDay} loading={loading} fullWidth size="lg" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  denomRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  denomInput: {
    width: 56, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.sm,
    paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, color: Colors.ink,
    textAlign: 'right', backgroundColor: Colors.surface,
  },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: Spacing.base, marginTop: Spacing.sm,
  },
});
