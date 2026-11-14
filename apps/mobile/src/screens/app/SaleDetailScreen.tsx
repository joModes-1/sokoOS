import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert, StyleSheet } from 'react-native';
import { Colors, Spacing, Radius } from '../../theme';
import { Button, Badge, Loader, Card, Row, Divider } from '../../components/UI';
import { api } from '../../lib/api';
import { formatDate, formatMoney, formatQty } from '../../lib/format';

export default function SaleDetailScreen({ route, navigation }: any) {
  const { id } = route.params ?? {};
  const [sale, setSale] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refunding, setRefunding] = useState(false);

  useEffect(() => {
    api.get(`/sales/${id}`).then(setSale).catch(() => {
      setSale({
        id, receiptNumber: 'RCP-00147', status: 'COMPLETED',
        branchName: 'Main Branch', customerName: null,
        createdAt: new Date().toISOString(),
        totalMinor: 45000, subtotalMinor: 40000, taxMinor: 5000, discountMinor: 0,
        items: [
          { variantName: 'Dettol Soap 100g', qty: 5, unitPriceMinor: 3000, totalMinor: 15000 },
          { variantName: 'Blue Band 500g', qty: 2, unitPriceMinor: 6000, totalMinor: 12000 },
          { variantName: 'Sugar 1kg', qty: 2, unitPriceMinor: 4000, totalMinor: 8000 },
          { variantName: 'Omo 500g', qty: 1, unitPriceMinor: 5000, totalMinor: 5000 },
        ],
        payments: [{ method: 'CASH', amountMinor: 45000, status: 'SUCCEEDED' }],
        cashierName: 'Grace Nakato',
      });
    }).finally(() => setLoading(false));
  }, [id]);

  async function refund() {
    setRefunding(true);
    try {
      await api.post(`/sales/${id}/refunds`, { items: sale.items.map((i: any) => ({ variantId: '', qty: i.qty })), reason: 'Full refund', restock: true });
      Alert.alert('Refund issued', 'Sale has been refunded.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e: any) {
      Alert.alert('Failed', e.message ?? 'Refund failed');
    }
    setRefunding(false);
  }

  if (loading) return <Loader />;
  if (!sale) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text>Not found</Text></View>;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.sand }} contentContainerStyle={{ padding: Spacing.base, gap: Spacing.base, paddingBottom: 32 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: Colors.ink, letterSpacing: -0.4 }}>#{sale.receiptNumber}</Text>
          <Text style={{ fontSize: 12, color: Colors.muted, marginTop: 2 }}>{sale.branchName} · {sale.customerName ?? 'Walk-in'}</Text>
        </View>
        <Badge label={sale.status} tone={sale.status === 'COMPLETED' ? 'success' : 'danger'} />
      </View>

      {/* Summary */}
      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <Card style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: Colors.muted }}>Date</Text>
          <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.ink, marginTop: 3 }}>{formatDate(sale.createdAt)}</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: Colors.muted }}>Total</Text>
          <Text style={{ fontSize: 18, fontWeight: '900', color: Colors.sunset, marginTop: 3, letterSpacing: -0.4 }}>{formatMoney(sale.totalMinor)}</Text>
        </Card>
      </View>

      {/* Items */}
      <Card>
        <Text style={styles.sectionTitle}>Items</Text>
        {sale.items.map((item: any, i: number) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: i < sale.items.length - 1 ? 1 : 0, borderBottomColor: Colors.border }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.ink }}>{item.variantName}</Text>
              <Text style={{ fontSize: 12, color: Colors.muted }}>× {formatQty(item.qty)} @ {formatMoney(item.unitPriceMinor)}</Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.ink }}>{formatMoney(item.totalMinor)}</Text>
          </View>
        ))}
        <Divider />
        {sale.discountMinor > 0 && <Row label="Discount" value={`-${formatMoney(sale.discountMinor)}`} valueColor={Colors.success} border={false} />}
        {sale.taxMinor > 0 && <Row label="Tax (VAT)" value={formatMoney(sale.taxMinor)} border={false} />}
        <Row label="Total" value={formatMoney(sale.totalMinor)} valueColor={Colors.sunset} border={false} />
      </Card>

      {/* Payment */}
      <Card>
        <Text style={styles.sectionTitle}>Payment</Text>
        {sale.payments.map((p: any, i: number) => (
          <Row key={i} label={p.method.replace('_', ' ')} value={formatMoney(p.amountMinor)} border={false} />
        ))}
      </Card>

      {/* Actions */}
      {sale.status === 'COMPLETED' && (
        <Button label="Issue refund" onPress={refund} loading={refunding} variant="secondary" fullWidth />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.ink, marginBottom: Spacing.sm },
});
