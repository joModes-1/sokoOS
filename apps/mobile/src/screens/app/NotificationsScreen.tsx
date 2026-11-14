import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { Colors, Spacing, Radius } from '../../theme';
import { Loader, EmptyState, PageHeader } from '../../components/UI';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/format';

interface Notification { id: string; type: string; title: string; body: string; isRead: boolean; createdAt: string; }

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const res = await api.get<Notification[]>('/notifications');
      setNotifications(res ?? []);
    } catch {
      setNotifications([
        { id: 'n1', type: 'LOW_STOCK', title: 'Low stock alert', body: 'Blue Band 500g is below reorder level (8 remaining, reorder at 15)', isRead: false, createdAt: new Date(Date.now() - 1800000).toISOString() },
        { id: 'n2', type: 'TRANSFER_REQUESTED', title: 'Transfer requested', body: 'Grace Nakato requested 20 units of Dettol Soap to Kampala Road', isRead: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
        { id: 'n3', type: 'PO_CONFIRMED', title: 'Purchase order confirmed', body: 'Uganda Breweries confirmed PO-00041 (UGX 850,000)', isRead: true, createdAt: new Date(Date.now() - 86400000).toISOString() },
        { id: 'n4', type: 'SALE_COMPLETED', title: 'Large sale completed', body: 'Sale of UGX 480,000 to John Mukasa completed at Main Branch', isRead: true, createdAt: new Date(Date.now() - 172800000).toISOString() },
      ]);
    }
    setLoading(false);
    setRefreshing(false);
  }

  const unread = notifications.filter(n => !n.isRead).length;

  if (loading) return <Loader />;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.sand }}>
      <PageHeader title="Notifications" subtitle={unread > 0 ? `${unread} unread` : 'All caught up'} />
      <FlatList
        data={notifications}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.sunset} />}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListEmptyComponent={<EmptyState icon="🔔" title="No notifications" description="You're all caught up!" />}
        renderItem={({ item }) => {
          const icon = { LOW_STOCK: '⚠️', TRANSFER_REQUESTED: '🔄', PO_CONFIRMED: '✅', SALE_COMPLETED: '🧾', PAYMENT_FAILED: '❌' }[item.type] ?? '🔔';
          return (
            <View style={[styles.notif, !item.isRead && styles.unread]}>
              <View style={styles.iconBox}>
                <Text style={{ fontSize: 20 }}>{icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.ink, flex: 1 }}>{item.title}</Text>
                  {!item.isRead && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.sunset }} />}
                </View>
                <Text style={{ fontSize: 13, color: Colors.muted, lineHeight: 18 }}>{item.body}</Text>
                <Text style={{ fontSize: 11, color: Colors.border, marginTop: 6 }}>{formatDate(item.createdAt, { relative: true })}</Text>
              </View>
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: Colors.border }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  notif: { flexDirection: 'row', padding: Spacing.base, gap: Spacing.md, backgroundColor: Colors.surface },
  unread: { backgroundColor: `${Colors.sunset}06` },
  iconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.peach, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
