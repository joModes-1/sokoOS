import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Colors, Spacing, Radius } from '../../theme';
import { Badge, Loader, EmptyState, PageHeader } from '../../components/UI';
import { api } from '../../lib/api';

export default function BranchesScreen() {
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const res = await api.get<any[]>('/branches');
      setBranches(res ?? []);
    } catch {
      setBranches([
        { id: 'b1', name: 'Main Branch', code: 'MAIN', address: '23 Kampala Road, Kampala', phone: '+256 752 000001', isActive: true, isMain: true },
        { id: 'b2', name: 'Kampala Road Branch', code: 'KLA01', address: '45 Kampala Road', phone: '+256 712 000002', isActive: true, isMain: false },
        { id: 'b3', name: 'Entebbe Branch', code: 'ENT01', address: '12 Entebbe Road', isActive: true, isMain: false },
      ]);
    }
    setLoading(false);
    setRefreshing(false);
  }

  if (loading) return <Loader />;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.sand }}>
      <PageHeader title="Branches" subtitle={`${branches.length} locations`} />
      <FlatList
        data={branches}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.sunset} />}
        contentContainerStyle={{ padding: Spacing.base, gap: Spacing.sm, paddingBottom: 32 }}
        ListEmptyComponent={<EmptyState icon="🏪" title="No branches" />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.branchIcon}>
              <Text style={{ fontSize: 22 }}>🏪</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.ink }}>{item.name}</Text>
                {item.isMain && <Badge label="Main" tone="info" />}
              </View>
              <Text style={{ fontSize: 11, color: Colors.muted, fontFamily: 'monospace' }}>{item.code}</Text>
              {item.address && <Text style={{ fontSize: 12, color: Colors.muted, marginTop: 2 }}>{item.address}</Text>}
              {item.phone && <Text style={{ fontSize: 12, color: Colors.muted }}>{item.phone}</Text>}
            </View>
            <Badge label={item.isActive ? 'Active' : 'Inactive'} tone={item.isActive ? 'success' : 'neutral'} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.base, flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, borderWidth: 1, borderColor: Colors.border, shadowColor: Colors.soil, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  branchIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.peach, alignItems: 'center', justifyContent: 'center' },
});
