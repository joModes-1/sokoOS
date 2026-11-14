import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, Alert, StyleSheet } from 'react-native';
import { Colors, Spacing, Radius } from '../../theme';
import { Button, Loader, Card } from '../../components/UI';
import { api } from '../../lib/api';
import { formatQty } from '../../lib/format';

export default function GoodsReceiptScreen({ route, navigation }: any) {
  const { poId } = route.params ?? {};
  const [po, setPo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [received, setReceived] = useState<Record<string, number>>({});
  const [batchRefs, setBatchRefs] = useState<Record<string, string>>({});
  const [expiries, setExpiries] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/purchasing/orders/${poId}`).then((res: any) => {
      setPo(res);
      const init: Record<string, number> = {};
      res.items?.forEach((i: any) => { init[i.id] = i.qty; });
      setReceived(init);
    }).catch(() => {
      const mockItems = [
        { id: 'pi1', variantId: 'v1', variantName: 'Dettol Soap 100g', qty: 100, unitCostMinor: 2500 },
        { id: 'pi2', variantId: 'v2', variantName: 'Blue Band 500g', qty: 50, unitCostMinor: 5500 },
      ];
      setPo({ id: poId, poNumber: 'PO-00042', supplierName: 'Uganda Breweries Ltd', items: mockItems });
      setReceived({ pi1: 100, pi2: 50 });
    }).finally(() => setLoading(false));
  }, [poId]);

  async function onSave() {
    setSaving(true);
    try {
      await api.post(`/purchasing/orders/${poId}/goods-receipts`, {
        items: po.items.map((item: any) => ({
          purchaseOrderItemId: item.id,
          variantId: item.variantId,
          receivedQty: received[item.id] ?? item.qty,
          unitCostMinor: item.unitCostMinor,
          batchRef: batchRefs[item.id] || undefined,
          expiresAt: expiries[item.id] || undefined,
        })),
      });
      Alert.alert('Received!', 'Goods receipt recorded. Stock has been updated.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e: any) {
      Alert.alert('Failed', e.message ?? 'Failed to record receipt');
    }
    setSaving(false);
  }

  if (loading) return <Loader />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.sand }} contentContainerStyle={{ padding: Spacing.base, gap: Spacing.base, paddingBottom: 32 }}>
      <Text style={{ fontSize: 14, color: Colors.muted }}>PO: {po?.poNumber} · {po?.supplierName}</Text>

      {po?.items?.map((item: any) => (
        <Card key={item.id}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.ink, marginBottom: Spacing.sm }}>{item.variantName}</Text>
          <Text style={{ fontSize: 12, color: Colors.muted, marginBottom: Spacing.sm }}>Ordered: {formatQty(item.qty)}</Text>
          <View style={{ gap: Spacing.sm }}>
            <View>
              <Text style={styles.label}>Received qty</Text>
              <TextInput
                value={String(received[item.id] ?? item.qty)}
                onChangeText={v => setReceived({ ...received, [item.id]: parseInt(v) || 0 })}
                keyboardType="number-pad"
                style={styles.input}
              />
            </View>
            <View>
              <Text style={styles.label}>Batch reference (optional)</Text>
              <TextInput
                value={batchRefs[item.id] ?? ''}
                onChangeText={v => setBatchRefs({ ...batchRefs, [item.id]: v })}
                placeholder="BATCH-001"
                style={styles.input}
              />
            </View>
            <View>
              <Text style={styles.label}>Expiry date (YYYY-MM-DD)</Text>
              <TextInput
                value={expiries[item.id] ?? ''}
                onChangeText={v => setExpiries({ ...expiries, [item.id]: v })}
                placeholder="2027-01-01"
                style={styles.input}
              />
            </View>
          </View>
        </Card>
      ))}

      <Button label="Record receipt" onPress={onSave} loading={saving} fullWidth />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '600', color: Colors.ink, marginBottom: 4 },
  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.ink, backgroundColor: Colors.surface },
});
