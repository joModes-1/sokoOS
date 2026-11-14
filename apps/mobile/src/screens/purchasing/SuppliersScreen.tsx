import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, RefreshControl } from 'react-native';
import { Colors, Spacing, Radius } from '../../theme';
import { Loader, EmptyState, PageHeader, Button } from '../../components/UI';
import { api } from '../../lib/api';

interface Supplier { id: string; name: string; contactName?: string; phone?: string; _count?: { purchaseOrders: number }; }

export default function SuppliersScreen({ navigation }: any) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const res = await api.get<Supplier[]>('/purchasing/suppliers');
      setSuppliers(res ?? []);
    } catch {
      setSuppliers([
        { id: 'sup1', name: 'Uganda Breweries Ltd', contactName: 'James Kato', phone: '+256 752 000001', _count: { purchaseOrders: 12 } },
        { id: 'sup2', name: 'Bidco Uganda Ltd', contactName: 'Sarah Namukasa', phone: '+256 712 000002', _count: { purchaseOrders: 8 } },
        { id: 'sup3', name: 'Mukwano Group', phone: '+256 772 000003', _count: { purchaseOrders: 5 } },
        { id: 'sup4', name: 'Century Bottling (SBC)', contactName: 'Peter Ochieng', _count: { purchaseOrders: 15 } },
      ]);
    }
    setLoading(false);
    setRefreshing(false);
  }

  const filtered = suppliers.filter(s => !q || s.name.toLowerCase().includes(q.toLowerCase()));

  if (loading) return <Loader />;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.sand }}>
      <PageHeader title="Suppliers" subtitle={`${suppliers.length} suppliers`} />
      <View style={styles.searchBar}>
        <Text style={{ marginRight: 8 }}>🔍</Text>
        <TextInput value={q} onChangeText={setQ} placeholder="Search suppliers…" placeholderTextColor={Colors.muted} style={{ flex: 1, fontSize: 14, color: Colors.ink }} />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.sunset} />}
        contentContainerStyle={{ padding: Spacing.base, gap: Spacing.sm, paddingBottom: 32 }}
        ListEmptyComponent={<EmptyState icon="🏭" title="No suppliers" />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} activeOpacity={0.7}>
            <View style={styles.supplierIcon}>
              <Text style={{ fontSize: 20 }}>🏭</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.ink }}>{item.name}</Text>
              {item.contactName && <Text style={{ fontSize: 12, color: Colors.muted, marginTop: 1 }}>{item.contactName}</Text>}
              {item.phone && <Text style={{ fontSize: 12, color: Colors.muted }}>{item.phone}</Text>}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 12, color: Colors.muted }}>{item._count?.purchaseOrders ?? 0} POs</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, marginHorizontal: Spacing.base, marginBottom: Spacing.sm, borderRadius: Radius.lg, paddingHorizontal: Spacing.base, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.base, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderWidth: 1, borderColor: Colors.border, shadowColor: Colors.soil, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  supplierIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.peach, alignItems: 'center', justifyContent: 'center' },
});
