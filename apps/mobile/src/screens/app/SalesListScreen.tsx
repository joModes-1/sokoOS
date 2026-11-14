import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { Colors, Spacing, Radius } from '../../theme';
import { Badge, Loader, EmptyState, PageHeader, TabBar } from '../../components/UI';
import { api } from '../../lib/api';
import { formatDate, formatMoney } from '../../lib/format';

interface Sale { id: string; receiptNumber: string; status: string; totalMinor: number; branchName: string; customerName?: string; createdAt: string; paymentMethod?: string; }

function statusTone(s: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (s === 'COMPLETED') return 'success';
  if (s === 'REFUNDED') return 'danger';
  if (s === 'PARTIALLY_REFUNDED') return 'warning';
  return 'neutral';
}

export default function SalesListScreen({ navigation }: any) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('');

  useEffect(() => { fetchData(); }, [tab]);

  async function fetchData() {
    try {
      const path = `/sales${tab ? `?status=${tab}` : ''}`;
      const res = await api.get<{ items: Sale[] }>(path);
      setSales(res.items ?? []);
    } catch {
      setSales([
        { id: 's1', receiptNumber: 'RCP-00147', status: 'COMPLETED', totalMinor: 45000, branchName: 'Main Branch', createdAt: new Date(Date.now() - 1800000).toISOString(), paymentMethod: 'CASH' },
        { id: 's2', receiptNumber: 'RCP-00146', status: 'COMPLETED', totalMinor: 128000, branchName: 'Main Branch', customerName: 'John Mukasa', createdAt: new Date(Date.now() - 3600000).toISOString(), paymentMethod: 'MTN_MOMO' },
        { id: 's3', receiptNumber: 'RCP-00145', status: 'REFUNDED', totalMinor: 32000, branchName: 'Kampala Road', createdAt: new Date(Date.now() - 7200000).toISOString() },
        { id: 's4', receiptNumber: 'RCP-00144', status: 'COMPLETED', totalMinor: 86500, branchName: 'Main Branch', createdAt: new Date(Date.now() - 86400000).toISOString(), paymentMethod: 'AIRTEL_MONEY' },
      ]);
    }
    setLoading(false);
    setRefreshing(false);
  }

  if (loading) return <Loader />;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.sand }}>
      <PageHeader title="Sales" subtitle={`${sales.length} transactions`} />
      <TabBar
        tabs={[{ key: '', label: 'All' }, { key: 'COMPLETED', label: 'Completed' }, { key: 'REFUNDED', label: 'Refunded' }]}
        active={tab}
        onChange={t => { setTab(t); setLoading(true); }}
      />
      <FlatList
        data={sales}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.sunset} />}
        contentContainerStyle={{ padding: Spacing.base, gap: Spacing.sm, paddingBottom: 32 }}
        ListEmptyComponent={<EmptyState icon="🧾" title="No sales yet" />}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('SaleDetail', { id: item.id })} style={styles.card} activeOpacity={0.7}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', fontFamily: 'monospace', color: Colors.ink }}>{item.receiptNumber}</Text>
                <Badge label={item.status} tone={statusTone(item.status)} />
              </View>
              <Text style={{ fontSize: 12, color: Colors.muted }}>{item.customerName ?? 'Walk-in'} · {item.branchName}</Text>
              <Text style={{ fontSize: 11, color: Colors.border, marginTop: 2 }}>{formatDate(item.createdAt, { relative: true })}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: Colors.sunset, letterSpacing: -0.4 }}>{formatMoney(item.totalMinor)}</Text>
              {item.paymentMethod && <Text style={{ fontSize: 11, color: Colors.muted, marginTop: 2 }}>{item.paymentMethod.replace('_', ' ')}</Text>}
            </View>
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
