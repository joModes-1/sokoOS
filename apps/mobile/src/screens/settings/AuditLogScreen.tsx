import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Colors, Spacing, Radius } from '../../theme';
import { Badge, Loader, EmptyState, PageHeader } from '../../components/UI';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/format';

export default function AuditLogScreen() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const res = await api.get<{ items: any[] }>('/audit-logs');
      setLogs(res.items ?? []);
    } catch {
      setLogs([
        { id: 'al1', action: 'SALE_COMMITTED', actorName: 'Grace Nakato', targetType: 'Sale', targetId: 's-001', createdAt: new Date(Date.now() - 1800000).toISOString() },
        { id: 'al2', action: 'STOCK_ADJUSTED', actorName: 'John Ochieng', targetType: 'InventoryBalance', targetId: 'ib-001', createdAt: new Date(Date.now() - 3600000).toISOString() },
        { id: 'al3', action: 'USER_INVITED', actorName: 'Grace Nakato', targetType: 'User', targetId: 'u-004', createdAt: new Date(Date.now() - 86400000).toISOString() },
        { id: 'al4', action: 'TRANSFER_CREATED', actorName: 'Sarah Namukasa', targetType: 'StockTransfer', targetId: 't-003', createdAt: new Date(Date.now() - 172800000).toISOString() },
        { id: 'al5', action: 'PO_CREATED', actorName: 'Grace Nakato', targetType: 'PurchaseOrder', targetId: 'po-042', createdAt: new Date(Date.now() - 259200000).toISOString() },
      ]);
    }
    setLoading(false);
    setRefreshing(false);
  }

  const actionIcon = (action: string) => {
    if (action.includes('SALE')) return '🧾';
    if (action.includes('STOCK')) return '📦';
    if (action.includes('USER')) return '👤';
    if (action.includes('TRANSFER')) return '🔄';
    if (action.includes('PO') || action.includes('PURCHASE')) return '🚚';
    if (action.includes('LOGIN')) return '🔑';
    return '📋';
  };

  if (loading) return <Loader />;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.sand }}>
      <PageHeader title="Audit Log" subtitle="Append-only record of all actions" />
      <FlatList
        data={logs}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.sunset} />}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListEmptyComponent={<EmptyState icon="📋" title="No audit events" />}
        renderItem={({ item }) => (
          <View style={styles.logItem}>
            <View style={styles.iconBox}>
              <Text style={{ fontSize: 18 }}>{actionIcon(item.action)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.ink }}>{item.action.replace(/_/g, ' ')}</Text>
              <Text style={{ fontSize: 12, color: Colors.muted, marginTop: 2 }}>{item.actorName} · {item.targetType}</Text>
              <Text style={{ fontSize: 11, color: Colors.border, marginTop: 3 }}>{formatDate(item.createdAt, { relative: true })}</Text>
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: Colors.border }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  logItem: { flexDirection: 'row', padding: Spacing.base, gap: Spacing.md, backgroundColor: Colors.surface },
  iconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.peach, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
