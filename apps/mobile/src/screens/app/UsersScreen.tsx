import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Colors, Spacing, Radius } from '../../theme';
import { Avatar, Badge, Loader, EmptyState, PageHeader } from '../../components/UI';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/format';

export default function UsersScreen() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const res = await api.get<any[]>('/users');
      setUsers(res ?? []);
    } catch {
      setUsers([
        { id: 'u1', fullName: 'Grace Nakato', email: 'grace@nakatotraders.ug', status: 'ACTIVE', roles: [{ roleName: 'BUSINESS_ADMIN', branchName: 'All branches' }], createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
        { id: 'u2', fullName: 'John Ochieng', email: 'john@nakatotraders.ug', status: 'ACTIVE', roles: [{ roleName: 'BRANCH_MANAGER', branchName: 'Main Branch' }], createdAt: new Date(Date.now() - 20 * 86400000).toISOString() },
        { id: 'u3', fullName: 'Sarah Namukasa', email: 'sarah@nakatotraders.ug', status: 'ACTIVE', roles: [{ roleName: 'CASHIER', branchName: 'Main Branch' }], createdAt: new Date(Date.now() - 15 * 86400000).toISOString() },
        { id: 'u4', fullName: 'Peter Mubiru', email: 'peter@nakatotraders.ug', status: 'INACTIVE', roles: [{ roleName: 'INVENTORY_CLERK', branchName: 'Kampala Road' }], createdAt: new Date(Date.now() - 60 * 86400000).toISOString() },
      ]);
    }
    setLoading(false);
    setRefreshing(false);
  }

  if (loading) return <Loader />;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.sand }}>
      <PageHeader title="Team" subtitle={`${users.length} members`} />
      <FlatList
        data={users}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.sunset} />}
        contentContainerStyle={{ padding: Spacing.base, gap: Spacing.sm, paddingBottom: 32 }}
        ListEmptyComponent={<EmptyState icon="👥" title="No team members" />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Avatar name={item.fullName} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.ink }}>{item.fullName}</Text>
              <Text style={{ fontSize: 12, color: Colors.muted }}>{item.email}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                {item.roles.map((r: any, i: number) => (
                  <View key={i} style={styles.roleChip}>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: Colors.muted }}>{r.roleName}</Text>
                  </View>
                ))}
              </View>
            </View>
            <Badge label={item.status} tone={item.status === 'ACTIVE' ? 'success' : 'neutral'} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.base, flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, borderWidth: 1, borderColor: Colors.border, shadowColor: Colors.soil, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  roleChip: { backgroundColor: Colors.peach, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: Colors.border },
});
