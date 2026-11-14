import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Colors, Spacing, Radius } from '../../theme';
import { Badge, Loader, EmptyState, PageHeader } from '../../components/UI';
import { api } from '../../lib/api';
import { formatDate, formatQty } from '../../lib/format';

interface Movement {
  id: string; type: string; variantName: string; branchName: string;
  qty: number; actorName: string; createdAt: string;
}

function typeTone(type: string): 'success' | 'danger' | 'info' | 'neutral' {
  if (['PURCHASE', 'TRANSFER_IN', 'OPENING_STOCK'].includes(type)) return 'success';
  if (['SALE', 'TRANSFER_OUT', 'WRITE_OFF'].includes(type)) return 'danger';
  if (type === 'ADJUSTMENT') return 'info';
  return 'neutral';
}

export default function StockMovementsScreen({ navigation, route }: any) {
  const { variantId, productName } = route.params ?? {};
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const path = variantId ? `/inventory/movements?variantId=${variantId}` : '/inventory/movements';
      const res = await api.get<{ items: Movement[] }>(path);
      setMovements(res.items ?? []);
    } catch {
      setMovements([
        { id: '1', type: 'PURCHASE', variantName: productName ?? 'Product', branchName: 'Main Branch', qty: 100, actorName: 'Grace N.', createdAt: new Date(Date.now() - 3600000).toISOString() },
        { id: '2', type: 'SALE', variantName: productName ?? 'Product', branchName: 'Main Branch', qty: -5, actorName: 'John D.', createdAt: new Date(Date.now() - 1800000).toISOString() },
        { id: '3', type: 'SALE', variantName: productName ?? 'Product', branchName: 'Main Branch', qty: -3, actorName: 'Grace N.', createdAt: new Date(Date.now() - 900000).toISOString() },
        { id: '4', type: 'ADJUSTMENT', variantName: productName ?? 'Product', branchName: 'Main Branch', qty: -2, actorName: 'Grace N.', createdAt: new Date(Date.now() - 600000).toISOString() },
      ]);
    }
    setLoading(false);
    setRefreshing(false);
  }

  if (loading) return <Loader />;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.sand }}>
      <PageHeader title={productName ?? 'Stock Movements'} subtitle="Append-only ledger" />
      <FlatList
        data={movements}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.sunset} />}
        contentContainerStyle={{ padding: Spacing.base, gap: Spacing.sm, paddingBottom: 32 }}
        ListEmptyComponent={<EmptyState icon="📋" title="No movements yet" />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Badge label={item.type.replace('_', ' ')} tone={typeTone(item.type)} />
              <Text style={[styles.qty, item.qty > 0 ? { color: Colors.success } : { color: Colors.danger }]}>
                {item.qty > 0 ? '+' : ''}{formatQty(item.qty)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: Colors.muted }}>{item.branchName}</Text>
              <Text style={{ fontSize: 12, color: Colors.muted }}>{item.actorName}</Text>
            </View>
            <Text style={{ fontSize: 11, color: Colors.border, marginTop: 4 }}>{formatDate(item.createdAt, { relative: true })}</Text>
          </View>
        )}
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
  qty: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
});
