import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius } from '../../theme';
import { Button, Input } from '../../components/UI';
import { api } from '../../lib/api';

const REASONS = ['COUNT_CORRECTION', 'DAMAGED', 'THEFT', 'EXPIRY', 'OPENING_STOCK', 'RETURN', 'OTHER'];

export default function AdjustmentScreen({ navigation }: any) {
  const [products, setProducts] = useState<{ id: string; name: string; variants: { id: string; name: string; sku: string }[] }[]>([]);
  const [variantId, setVariantId] = useState('');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('COUNT_CORRECTION');
  const [reasonText, setReasonText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get<{ items: typeof products }>('/catalogue/products').then(res => setProducts(res.items ?? [])).catch(() => {});
  }, []);

  async function onSave() {
    if (!variantId || !qty || !reasonText.trim()) {
      Alert.alert('Required', 'Fill in product, quantity, and reason details');
      return;
    }
    setLoading(true);
    try {
      await api.post('/inventory/adjustments', {
        variantId, qtyDelta: parseInt(qty), reason, reasonText: reasonText.trim(),
      });
      Alert.alert('Done', 'Stock adjustment recorded', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e: any) {
      Alert.alert('Failed', e.message ?? 'Adjustment failed');
    }
    setLoading(false);
  }

  const allVariants = products.flatMap(p => p.variants.map(v => ({ ...v, productName: p.name })));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.sand }}>
      <ScrollView contentContainerStyle={{ padding: Spacing.base, gap: Spacing.base, paddingBottom: 32 }}>
        {/* Warning banner */}
        <View style={styles.warnBanner}>
          <Text style={{ fontSize: 20, marginRight: 10 }}>⚠️</Text>
          <Text style={{ flex: 1, fontSize: 13, color: '#92400E', lineHeight: 20 }}>
            Adjustments are permanently logged in the audit trail and cannot be deleted. A reason is required.
          </Text>
        </View>

        {/* Product picker */}
        <View>
          <Text style={styles.label}>Product / variant</Text>
          <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
            {allVariants.map(v => (
              <TouchableOpacity
                key={v.id}
                onPress={() => setVariantId(v.id)}
                style={[styles.pickerItem, variantId === v.id && styles.pickerItemActive]}
              >
                <Text style={{ fontSize: 13, color: variantId === v.id ? Colors.sunset : Colors.ink, fontWeight: variantId === v.id ? '700' : '400' }}>
                  {v.productName}{v.name !== 'Default' ? ` — ${v.name}` : ''} ({v.sku})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <Input
          label="Quantity change"
          value={qty}
          onChangeText={setQty}
          placeholder="e.g. -5 or +20"
          keyboardType="numeric"
          hint="Negative = reduce stock. Positive = add stock."
        />

        {/* Reason selector */}
        <View>
          <Text style={styles.label}>Reason</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {REASONS.map(r => (
              <TouchableOpacity
                key={r}
                onPress={() => setReason(r)}
                style={[styles.reasonChip, reason === r && styles.reasonChipActive]}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: reason === r ? Colors.sunset : Colors.muted }}>
                  {r.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Input
          label="Reason details (required)"
          value={reasonText}
          onChangeText={setReasonText}
          placeholder="Describe what happened and why the adjustment is needed…"
          multiline
          numberOfLines={3}
          style={{ height: 80 } as any}
        />

        <Button label="Save adjustment" onPress={onSave} loading={loading} fullWidth />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  warnBanner: { backgroundColor: '#FEF3C7', borderRadius: Radius.lg, padding: Spacing.base, flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderColor: '#FDE68A' },
  label: { fontSize: 13, fontWeight: '600', color: Colors.ink, marginBottom: 6 },
  pickerScroll: { maxHeight: 160, backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
  pickerItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pickerItemActive: { backgroundColor: `${Colors.sunset}10` },
  reasonChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface },
  reasonChipActive: { borderColor: Colors.sunset, backgroundColor: `${Colors.sunset}10` },
});
