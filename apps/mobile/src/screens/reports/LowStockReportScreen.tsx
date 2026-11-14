import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { Colors, Spacing, Radius } from '../../theme';
import { Badge, Loader, EmptyState, PageHeader, Button } from '../../components/UI';
import { api } from '../../lib/api';
import { formatQty } from '../../lib/format';

export default function LowStockReportScreen({ navigation }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const res = await api.get<any[]>('/inventory/low-stock');
      setItems(res ?? []);
    } catch {
      setItems([
        { variantId: 'v2', productName: 'Blue Band 500g', variantName: 'Default', branchName: 'Main Branch', qty: 8, reorderQty: 15 },
        { variantId: 'v5', productName: 'Sugar 1kg', variantName: 'Default', branchName: 'Main Branch', qty: 3, reorderQty: 20 },
        { variantId: 'v8', productName: 'Milk 500ml', variantName: 'Default', branchName: 'Main Branch', qty: 0, reorderQty: 30 },
        { variantId: 'v3', productName: 'Coca Cola 500ml', variantName: 'Default', branchName: 'Kampala Road', qty: 0, reorderQty: 24 },
      ]);
    }
    setLoading(false);
    setRefreshing(false);
  }

  if (loading) return <Loader />;

  if (items.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.sand }}>
        <PageHeader title="Low Stock Alert" />
        <EmptyState icon="✅" title="All stocked up!" description="No items below their reorder level." />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.sand }}>
      <PageHeader
        title="Low Stock Alert"
        subtitle={`${items.length} items need restocking`}
        right={<Button label="Create PO" onPress={() => navigation.navigate('PurchaseOrders')} size="sm" />}
      />
      <FlatList
        data={items}
        keyExtractor={i => i.variantId}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.sunset} />}
        contentContainerStyle={{ padding: Spacing.base, gap: Spacing.sm, paddingBottom: 32 }}
        renderItem={({ item }) => {
          const isOut = item.qty <= 0;
          return (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.ink }}>{item.productName}</Text>
                <Text style={{ fontSize: 12, color: Colors.muted, marginTop: 2 }}>{item.branchName}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Text style={{ fontSize: 20, fontWeight: '900', color: isOut ? Colors.danger : Colors.warning, letterSpacing: -0.5 }}>
                  {formatQty(item.qty)}
                </Text>
                <Badge label={isOut ? 'Out of stock' : 'Low stock'} tone={isOut ? 'danger' : 'warning'} />
                <Text style={{ fontSize: 11, color: Colors.muted }}>reorder at {item.reorderQty}</Text>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.base, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, shadowColor: Colors.soil, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
});
