import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert, StyleSheet } from 'react-native';
import { Colors, Spacing, Radius } from '../../theme';
import { Button, Badge, Loader, Card, Row, Divider } from '../../components/UI';
import { api } from '../../lib/api';
import { formatDate, formatQty } from '../../lib/format';

export default function TransferDetailScreen({ route, navigation }: any) {
  const { id } = route.params ?? {};
  const [transfer, setTransfer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    api.get(`/transfers/${id}`).then(setTransfer).catch(() => {
      setTransfer({
        id, transferRef: 'TRF-001', status: 'REQUESTED',
        originBranchName: 'Main Branch', destinationBranchName: 'Kampala Road',
        requestedAt: new Date().toISOString(), createdByName: 'Grace Nakato',
        items: [
          { variantName: 'Dettol Soap 100g', requestedQty: 20 },
          { variantName: 'Blue Band 500g', requestedQty: 10 },
          { variantName: 'Omo 500g', requestedQty: 15 },
        ],
      });
    }).finally(() => setLoading(false));
  }, [id]);

  async function action(act: string) {
    setActing(true);
    try {
      await api.post(`/transfers/${id}/${act}`, {});
      setTransfer((t: any) => ({ ...t, status: { approve: 'APPROVED', reject: 'REJECTED', dispatch: 'DISPATCHED', receive: 'RECEIVED' }[act] ?? t.status }));
      Alert.alert('Done', `Transfer ${act}d successfully`);
    } catch (e: any) {
      Alert.alert('Failed', e.message ?? 'Action failed');
    }
    setActing(false);
  }

  if (loading) return <Loader />;
  if (!transfer) return null;

  const tone = (() => {
    if (['RECEIVED', 'CLOSED'].includes(transfer.status)) return 'success';
    if (['REJECTED', 'CANCELLED'].includes(transfer.status)) return 'danger';
    return 'warning';
  })() as 'success' | 'danger' | 'warning';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.sand }} contentContainerStyle={{ padding: Spacing.base, gap: Spacing.base, paddingBottom: 32 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: Colors.ink, letterSpacing: -0.4 }}>{transfer.transferRef}</Text>
          <Text style={{ fontSize: 12, color: Colors.muted, marginTop: 2 }}>by {transfer.createdByName}</Text>
        </View>
        <Badge label={transfer.status} tone={tone} />
      </View>

      <Card>
        <Row label="From" value={transfer.originBranchName} />
        <Row label="To" value={transfer.destinationBranchName} />
        <Row label="Date" value={formatDate(transfer.requestedAt)} border={false} />
      </Card>

      <Card>
        <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.ink, marginBottom: Spacing.sm }}>Items ({transfer.items.length})</Text>
        {transfer.items.map((item: any, i: number) => (
          <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: i < transfer.items.length - 1 ? 1 : 0, borderBottomColor: Colors.border }}>
            <Text style={{ fontSize: 13, color: Colors.ink, flex: 1 }}>{item.variantName}</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.ink }}>{formatQty(item.requestedQty)}</Text>
          </View>
        ))}
      </Card>

      {/* Actions */}
      <View style={{ gap: Spacing.sm }}>
        {transfer.status === 'REQUESTED' && (
          <>
            <Button label="Approve transfer" onPress={() => action('approve')} loading={acting} fullWidth />
            <Button label="Reject" onPress={() => action('reject')} loading={acting} variant="danger" fullWidth />
          </>
        )}
        {transfer.status === 'APPROVED' && (
          <Button label="Mark as dispatched" onPress={() => action('dispatch')} loading={acting} fullWidth />
        )}
        {transfer.status === 'DISPATCHED' && (
          <Button label="Confirm received" onPress={() => action('receive')} loading={acting} fullWidth />
        )}
      </View>
    </ScrollView>
  );
}
