import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Colors, Spacing, Radius } from '../../theme';
import { Badge, Loader, EmptyState, PageHeader, TabBar } from '../../components/UI';
import { api } from '../../lib/api';
import { formatDate, formatQty, formatMoney } from '../../lib/format';

interface Batch {
  id: string; batchRef: string; variantName: string; branchName: string;
  qty: number; costMinor: number; expiresAt?: string; status: string;
}

export default function BatchesScreen({ navigation }: any) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('active');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const res = await api.get<Batch[]>('/inventory/batches');
      setBatches(res ?? []);
    } catch {
      const now = new Date();
      setBatches([
        { id: '1', batchRef: 'BATCH-001', variantName: 'Dettol Soap 100g', branchName: 'Main Branch', qty: 100, costMinor: 2500, expiresAt: new Date(now.getTime() + 90 * 86400000).toISOString(), status: 'ACTIVE' },
        { id: '2', batchRef: 'BATCH-002', variantName: 'Colgate Toothpaste', branchName: 'Main Branch', qty: 50, costMinor: 4200, expiresAt: new Date(now.getTime() + 10 * 86400000).toISOString(), status: 'EXPIRING_SOON' },
        { id: '3', batchRef: 'BATCH-003', variantName: 'Milk 500ml', branchName: 'Main Branch', qty: 0, costMinor: 1200, expiresAt: new Date(now.getTime() - 2 * 86400000).toISOString(), status: 'EXPIRED' },
      ]);
    }
    setLoading(false);
    setRefreshing(false);
  }

  const filtered = batches.filter(b => {
    if (tab === 'active') return b.status === 'ACTIVE' || b.status === 'EXPIRING_SOON';
    if (tab === 'expired') return b.status === 'EXPIRED';
    return true;
  });

  if (loading) return <Loader />;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.sand }}>
      <PageHeader title="Stock Batches" subtitle="FEFO expiry tracking" />
      <TabBar
        tabs={[{ key: 'active', label: 'Active' }, { key: 'expired', label: 'Expired' }, { key: 'all', label: 'All' }]}
        active={tab}
        onChange={setTab}
      />
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.sunset} />}
        contentContainerStyle={{ padding: Spacing.base, gap: Spacing.sm, paddingBottom: 32 }}
        ListEmptyComponent={<EmptyState icon="📦" title="No batches found" />}
        renderItem={({ item }) => {
          const tone = item.status === 'ACTIVE' ? 'success' : item.status === 'EXPIRING_SOON' ? 'warning' : 'danger';
          return (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.ink }}>{item.variantName}</Text>
                  <Text style={{ fontSize: 11, color: Colors.muted, fontFamily: 'monospace' }}>{item.batchRef}</Text>
                </View>
                <Badge label={item.status.replace('_', ' ')} tone={tone} />
              </View>
              <View style={{ flexDirection: 'row', gap: Spacing.base }}>
                <View>
                  <Text style={{ fontSize: 11, color: Colors.muted }}>Qty</Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: Colors.ink }}>{formatQty(item.qty)}</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 11, color: Colors.muted }}>Unit cost</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.ink }}>{formatMoney(item.costMinor)}</Text>
                </View>
                {item.expiresAt && (
                  <View>
                    <Text style={{ fontSize: 11, color: Colors.muted }}>Expires</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: item.status === 'EXPIRED' ? Colors.danger : item.status === 'EXPIRING_SOON' ? Colors.warning : Colors.ink }}>
                      {formatDate(item.expiresAt)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.base,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: Colors.soil, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
});
