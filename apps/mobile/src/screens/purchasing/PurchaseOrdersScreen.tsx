import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { Colors, Spacing, Radius } from '../../theme';
import { Badge, Loader, EmptyState, PageHeader, TabBar } from '../../components/UI';
import { api } from '../../lib/api';
import { formatDate, formatMoney } from '../../lib/format';

interface PO { id: string; poNumber: string; status: string; supplierName: string; branchName: string; totalMinor: number; createdAt: string; itemCount: number; }

function statusTone(s: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (['CLOSED'].includes(s)) return 'success';
  if (['SUBMITTED', 'CONFIRMED'].includes(s)) return 'warning';
  if (['CANCELLED'].includes(s)) return 'danger';
  return 'neutral';
}

export default function PurchaseOrdersScreen({ navigation }: any) {
  const [orders, setOrders] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('');

  useEffect(() => { fetchData(); }, [tab]);

  async function fetchData() {
    try {
      const path = `/purchasing/orders${tab ? `?status=${tab}` : ''}`;
      const res = await api.get<{ items: PO[] }>(path);
      setOrders(res.items ?? []);
    } catch {
      setOrders([
        { id: 'po1', poNumber: 'PO-00042', status: 'DRAFT', supplierName: 'Uganda Breweries Ltd', branchName: 'Main Branch', totalMinor: 1_200_000, createdAt: new Date(Date.now() - 3600000).toISOString(), itemCount: 8 },
        { id: 'po2', poNumber: 'PO-00041', status: 'CONFIRMED', supplierName: 'Bidco Uganda Ltd', branchName: 'Main Branch', totalMinor: 850_000, createdAt: new Date(Date.now() - 86400000).toISOString(), itemCount: 5 },
        { id: 'po3', poNumber: 'PO-00040', status: 'CLOSED', supplierName: 'Mukwano Group', branchName: 'Kampala Road', totalMinor: 450_000, createdAt: new Date(Date.now() - 172800000).toISOString(), itemCount: 3 },
      ]);
    }
    setLoading(false);
    setRefreshing(false);
  }

  if (loading) return <Loader />;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.sand }}>
      <PageHeader title="Purchase Orders" subtitle={`${orders.length} orders`} />
      <TabBar
        tabs={[{ key: '', label: 'All' }, { key: 'DRAFT', label: 'Draft' }, { key: 'CONFIRMED', label: 'Confirmed' }, { key: 'CLOSED', label: 'Closed' }]}
        active={tab}
        onChange={t => { setTab(t); setLoading(true); }}
      />
      <FlatList
        data={orders}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.sunset} />}
        contentContainerStyle={{ padding: Spacing.base, gap: Spacing.sm, paddingBottom: 32 }}
        ListEmptyComponent={<EmptyState icon="📋" title="No purchase orders" />}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('PODetail', { id: item.id })} style={styles.card} activeOpacity={0.7}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Text style={{ fontSize: 12, fontFamily: 'monospace', color: Colors.muted }}>{item.poNumber}</Text>
                <Badge label={item.status} tone={statusTone(item.status)} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.ink }}>{item.supplierName}</Text>
              <Text style={{ fontSize: 12, color: Colors.muted, marginTop: 2 }}>{item.branchName} · {item.itemCount} items · {formatDate(item.createdAt, { relative: true })}</Text>
            </View>
            <Text style={{ fontSize: 16, fontWeight: '800', color: Colors.sunset, letterSpacing: -0.4 }}>{formatMoney(item.totalMinor, 'UGX', { short: true })}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.base, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, shadowColor: Colors.soil, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
});
