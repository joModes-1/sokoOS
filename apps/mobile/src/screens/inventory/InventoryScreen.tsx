import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, RefreshControl } from 'react-native';
import { Colors, Spacing, Radius } from '../../theme';
import { Badge, Loader, EmptyState, PageHeader, TabBar } from '../../components/UI';
import { api } from '../../lib/api';
import { formatQty } from '../../lib/format';

interface Balance {
  variantId: string; variantName: string; productName: string;
  branchName: string; qty: number; reservedQty: number; reorderQty: number;
}

export default function InventoryScreen({ navigation }: any) {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('all');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const res = await api.get<{ items: Balance[] }>('/inventory/balances');
      setBalances(res.items ?? []);
    } catch {
      setBalances([
        { variantId: 'v1', variantName: 'Default', productName: 'Dettol Soap 100g', branchName: 'Main Branch', qty: 142, reservedQty: 0, reorderQty: 20 },
        { variantId: 'v2', variantName: 'Default', productName: 'Blue Band 500g', branchName: 'Main Branch', qty: 8, reservedQty: 0, reorderQty: 15 },
        { variantId: 'v3', variantName: 'Default', productName: 'Coca Cola 500ml', branchName: 'Main Branch', qty: 0, reservedQty: 0, reorderQty: 24 },
        { variantId: 'v4', variantName: 'Default', productName: 'Omo 500g', branchName: 'Main Branch', qty: 56, reservedQty: 2, reorderQty: 10 },
        { variantId: 'v5', variantName: 'Default', productName: 'Sugar 1kg', branchName: 'Main Branch', qty: 3, reservedQty: 0, reorderQty: 20 },
        { variantId: 'v6', variantName: 'Default', productName: 'Rice 1kg', branchName: 'Main Branch', qty: 88, reservedQty: 0, reorderQty: 15 },
        { variantId: 'v7', variantName: 'Default', productName: 'Cooking Oil 1L', branchName: 'Main Branch', qty: 25, reservedQty: 0, reorderQty: 10 },
        { variantId: 'v8', variantName: 'Default', productName: 'Milk 500ml', branchName: 'Main Branch', qty: 0, reservedQty: 0, reorderQty: 30 },
      ]);
    }
    setLoading(false);
    setRefreshing(false);
  }

  const filtered = balances.filter(b => {
    const matchSearch = !q || b.productName.toLowerCase().includes(q.toLowerCase());
    if (tab === 'low') return matchSearch && b.qty > 0 && b.qty <= b.reorderQty;
    if (tab === 'out') return matchSearch && b.qty <= 0;
    return matchSearch;
  });

  if (loading) return <Loader />;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.sand }}>
      <PageHeader
        title="Inventory"
        subtitle={`${balances.length} items tracked`}
        right={
          <TouchableOpacity onPress={() => navigation.navigate('Adjustment')} style={styles.addBtn}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Adjust</Text>
          </TouchableOpacity>
        }
      />

      {/* Search */}
      <View style={styles.searchBar}>
        <Text style={{ fontSize: 14, marginRight: 8 }}>🔍</Text>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search products…"
          placeholderTextColor={Colors.muted}
          style={{ flex: 1, fontSize: 14, color: Colors.ink }}
        />
      </View>

      <TabBar
        tabs={[{ key: 'all', label: 'All stock' }, { key: 'low', label: 'Low stock' }, { key: 'out', label: 'Out of stock' }]}
        active={tab}
        onChange={setTab}
      />

      <FlatList
        data={filtered}
        keyExtractor={i => i.variantId}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.sunset} />}
        contentContainerStyle={{ padding: Spacing.base, gap: Spacing.sm, paddingBottom: 32 }}
        ListEmptyComponent={<EmptyState icon="📦" title={tab === 'out' ? 'No out-of-stock items' : 'No items found'} />}
        renderItem={({ item }) => {
          const isOut = item.qty <= 0;
          const isLow = !isOut && item.qty <= item.reorderQty;
          const tone = isOut ? 'danger' : isLow ? 'warning' : 'success';
          const statusLabel = isOut ? 'Out of stock' : isLow ? 'Low stock' : 'In stock';
          return (
            <TouchableOpacity
              onPress={() => navigation.navigate('StockMovements', { variantId: item.variantId, productName: item.productName })}
              style={styles.card}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.ink }}>{item.productName}</Text>
                <Text style={{ fontSize: 12, color: Colors.muted, marginTop: 2 }}>{item.branchName}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={[styles.qtyText, isOut ? { color: Colors.danger } : isLow ? { color: Colors.warning } : { color: Colors.ink }]}>
                  {formatQty(item.qty)}
                </Text>
                <Badge label={statusLabel} tone={tone} />
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  addBtn: { backgroundColor: Colors.sunset, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 7 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, marginHorizontal: Spacing.base, marginBottom: Spacing.sm,
    borderRadius: Radius.lg, paddingHorizontal: Spacing.base, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.base, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: Colors.soil, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  qtyText: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
});
