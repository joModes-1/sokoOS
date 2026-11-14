import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, RefreshControl } from 'react-native';
import { Colors, Spacing, Radius } from '../../theme';
import { Badge, Loader, EmptyState, PageHeader } from '../../components/UI';
import { api } from '../../lib/api';
import { formatMoney } from '../../lib/format';

export default function CatalogueProductsScreen({ navigation }: any) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const res = await api.get<{ items: any[] }>('/catalogue/products');
      setProducts(res.items ?? []);
    } catch {
      setProducts([
        { id: 'p1', name: 'Dettol Soap 100g', categoryName: 'Personal Care', isActive: true, variants: [{ sku: 'DTL-001', unitPriceMinor: 3000, unitCostMinor: 2000, isActive: true }] },
        { id: 'p2', name: 'Blue Band 500g', categoryName: 'Food & Beverages', isActive: true, variants: [{ sku: 'BB-001', unitPriceMinor: 6000, unitCostMinor: 4800, isActive: true }] },
        { id: 'p3', name: 'Omo 500g', categoryName: 'Household', isActive: true, variants: [{ sku: 'OMO-001', unitPriceMinor: 5000, unitCostMinor: 4000, isActive: true }] },
        { id: 'p4', name: 'Colgate Toothpaste', categoryName: 'Personal Care', isActive: true, variants: [{ sku: 'CLG-001', unitPriceMinor: 5000, unitCostMinor: 3800, isActive: true }] },
        { id: 'p5', name: 'Cooking Oil 1L', categoryName: 'Food & Beverages', isActive: true, variants: [{ sku: 'OIL-001', unitPriceMinor: 8000, unitCostMinor: 6500, isActive: true }] },
      ]);
    }
    setLoading(false);
    setRefreshing(false);
  }

  const filtered = products.filter(p => !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.categoryName?.toLowerCase().includes(q.toLowerCase()));

  if (loading) return <Loader />;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.sand }}>
      <PageHeader title="Catalogue" subtitle={`${products.length} products`} />
      <View style={styles.searchBar}>
        <Text style={{ marginRight: 8 }}>🔍</Text>
        <TextInput value={q} onChangeText={setQ} placeholder="Search products…" placeholderTextColor={Colors.muted} style={{ flex: 1, fontSize: 14, color: Colors.ink }} />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.sunset} />}
        contentContainerStyle={{ padding: Spacing.base, gap: Spacing.sm, paddingBottom: 32 }}
        ListEmptyComponent={<EmptyState icon="🏷️" title="No products found" />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.productIcon}>
              <Text style={{ fontSize: 22 }}>📦</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.ink }}>{item.name}</Text>
              {item.categoryName && <Text style={{ fontSize: 12, color: Colors.muted, marginTop: 1 }}>{item.categoryName}</Text>}
              <Text style={{ fontSize: 11, color: Colors.border, marginTop: 2 }}>{item.variants[0]?.sku}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: Colors.sunset, letterSpacing: -0.4 }}>{formatMoney(item.variants[0]?.unitPriceMinor ?? 0)}</Text>
              <Text style={{ fontSize: 11, color: Colors.muted }}>cost: {formatMoney(item.variants[0]?.unitCostMinor ?? 0)}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, marginHorizontal: Spacing.base, marginBottom: Spacing.sm, borderRadius: Radius.lg, paddingHorizontal: Spacing.base, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.base, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderWidth: 1, borderColor: Colors.border, shadowColor: Colors.soil, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  productIcon: { width: 50, height: 50, borderRadius: 14, backgroundColor: Colors.peach, alignItems: 'center', justifyContent: 'center' },
});
