import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { Colors, Spacing } from '../../theme';
import { Button, Badge, Loader, Card, Row, Divider } from '../../components/UI';
import { api } from '../../lib/api';
import { formatDate, formatMoney, formatQty } from '../../lib/format';

export default function PODetailScreen({ route, navigation }: any) {
  const { id } = route.params ?? {};
  const [po, setPo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    api.get(`/purchasing/orders/${id}`).then(setPo).catch(() => {
      setPo({
        id, poNumber: 'PO-00042', status: 'DRAFT',
        supplierName: 'Uganda Breweries Ltd', branchName: 'Main Branch',
        totalMinor: 1_200_000, createdAt: new Date().toISOString(),
        items: [
          { variantName: 'Dettol Soap 100g', qty: 100, unitCostMinor: 2500, totalMinor: 250_000 },
          { variantName: 'Blue Band 500g', qty: 50, unitCostMinor: 5500, totalMinor: 275_000 },
          { variantName: 'Omo 500g', qty: 80, unitCostMinor: 4500, totalMinor: 360_000 },
          { variantName: 'Sugar 1kg', qty: 60, unitCostMinor: 3800, totalMinor: 228_000 },
          { variantName: 'Cooking Oil 1L', qty: 25, unitCostMinor: 3480, totalMinor: 87_000 },
        ],
      });
    }).finally(() => setLoading(false));
  }, [id]);

  async function transition(action: string) {
    setActing(true);
    try {
      await api.post(`/purchasing/orders/${id}/transition`, { action: action.toUpperCase() });
      const statusMap: Record<string, string> = { submit: 'SUBMITTED', confirm: 'CONFIRMED', close: 'CLOSED', cancel: 'CANCELLED' };
      setPo((p: any) => ({ ...p, status: statusMap[action] ?? p.status }));
    } catch (e: any) {
      Alert.alert('Failed', e.message ?? 'Action failed');
    }
    setActing(false);
  }

  if (loading) return <Loader />;
  if (!po) return null;

  const tone = po.status === 'CLOSED' ? 'success' : po.status === 'CANCELLED' ? 'danger' : po.status === 'DRAFT' ? 'neutral' : 'warning';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.sand }} contentContainerStyle={{ padding: Spacing.base, gap: Spacing.base, paddingBottom: 32 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: Colors.ink, letterSpacing: -0.4 }}>{po.poNumber}</Text>
          <Text style={{ fontSize: 12, color: Colors.muted, marginTop: 2 }}>{po.supplierName}</Text>
        </View>
        <Badge label={po.status} tone={tone as any} />
      </View>

      <Card>
        <Row label="Supplier" value={po.supplierName} />
        <Row label="Branch" value={po.branchName} />
        <Row label="Date" value={formatDate(po.createdAt)} border={false} />
      </Card>

      <Card>
        <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.ink, marginBottom: Spacing.sm }}>Items</Text>
        {po.items.map((item: any, i: number) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: i < po.items.length - 1 ? 1 : 0, borderBottomColor: Colors.border }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.ink }}>{item.variantName}</Text>
              <Text style={{ fontSize: 12, color: Colors.muted }}>× {formatQty(item.qty)} @ {formatMoney(item.unitCostMinor)}</Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.ink }}>{formatMoney(item.totalMinor)}</Text>
          </View>
        ))}
        <Divider />
        <Row label="Total" value={formatMoney(po.totalMinor)} valueColor={Colors.sunset} border={false} />
      </Card>

      <View style={{ gap: Spacing.sm }}>
        {po.status === 'DRAFT' && (
          <>
            <Button label="Submit PO" onPress={() => transition('submit')} loading={acting} fullWidth />
            <Button label="Cancel PO" onPress={() => transition('cancel')} variant="danger" loading={acting} fullWidth />
          </>
        )}
        {po.status === 'SUBMITTED' && (
          <>
            <Button label="Confirm PO" onPress={() => transition('confirm')} loading={acting} fullWidth />
            <Button label="Cancel PO" onPress={() => transition('cancel')} variant="danger" loading={acting} fullWidth />
          </>
        )}
        {po.status === 'CONFIRMED' && (
          <Button label="Record goods receipt" onPress={() => navigation.navigate('GoodsReceipt', { poId: id })} loading={acting} fullWidth />
        )}
      </View>
    </ScrollView>
  );
}
