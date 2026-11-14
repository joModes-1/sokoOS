import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { Colors, Spacing, Radius } from '../../theme';
import { Badge, Loader, EmptyState, PageHeader, Button } from '../../components/UI';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/format';

interface Transfer { id: string; transferRef: string; status: string; originBranchName: string; destinationBranchName: string; requestedAt: string; itemCount: number; }

function statusTone(s: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (['RECEIVED', 'CLOSED'].includes(s)) return 'success';
  if (['REQUESTED', 'APPROVED', 'DISPATCHED'].includes(s)) return 'warning';
  if (['REJECTED', 'CANCELLED'].includes(s)) return 'danger';
  return 'neutral';
}

export default function TransfersScreen({ navigation }: any) {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const res = await api.get<{ items: Transfer[] }>('/transfers');
      setTransfers(res.items ?? []);
    } catch {
      setTransfers([
        { id: 't1', transferRef: 'TRF-001', status: 'REQUESTED', originBranchName: 'Main Branch', destinationBranchName: 'Kampala Road', requestedAt: new Date(Date.now() - 3600000).toISOString(), itemCount: 5 },
        { id: 't2', transferRef: 'TRF-002', status: 'APPROVED', originBranchName: 'Kampala Road', destinationBranchName: 'Main Branch', requestedAt: new Date(Date.now() - 86400000).toISOString(), itemCount: 2 },
        { id: 't3', transferRef: 'TRF-003', status: 'RECEIVED', originBranchName: 'Main Branch', destinationBranchName: 'Entebbe Branch', requestedAt: new Date(Date.now() - 172800000).toISOString(), itemCount: 8 },
      ]);
    }
    setLoading(false);
    setRefreshing(false);
  }

  if (loading) return <Loader />;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.sand }}>
      <PageHeader title="Transfers" subtitle={`${transfers.length} transfers`} right={<Button label="+ New" onPress={() => Alert.alert('New Transfer', 'Create via web app for now')} size="sm" />} />
      <FlatList
        data={transfers}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.sunset} />}
        contentContainerStyle={{ padding: Spacing.base, gap: Spacing.sm, paddingBottom: 32 }}
        ListEmptyComponent={<EmptyState icon="🚚" title="No transfers" />}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('TransferDetail', { id: item.id })} style={styles.card} activeOpacity={0.7}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Text style={{ fontSize: 12, fontFamily: 'monospace', color: Colors.muted }}>{item.transferRef}</Text>
                <Badge label={item.status} tone={statusTone(item.status)} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.ink }}>{item.originBranchName}</Text>
                <Text style={{ color: Colors.muted }}>→</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.ink }}>{item.destinationBranchName}</Text>
              </View>
              <Text style={{ fontSize: 11, color: Colors.muted, marginTop: 4 }}>{item.itemCount} items · {formatDate(item.requestedAt, { relative: true })}</Text>
            </View>
            <Text style={{ color: Colors.border, fontSize: 20 }}>›</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.base,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: Colors.soil, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
});
