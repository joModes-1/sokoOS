import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Radius } from '../../theme';
import { StatCard, Card, SectionHeader, Loader, EmptyState } from '../../components/UI';
import { api } from '../../lib/api';
import { formatMoney, formatDate } from '../../lib/format';

interface DashboardData {
  todaySales: number;
  todayTransactions: number;
  lowStockCount: number;
  pendingTransfers: number;
  pendingPOs: number;
  paymentsByMethod: { method: string; total: number }[];
  topSellers: { name: string; qty: number; revenue: number }[];
}

export default function DashboardScreen({ navigation }: any) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ctx, setCtx] = useState({ businessName: '', userName: '', industry: 'RETAIL' });

  useEffect(() => {
    AsyncStorage.multiGet(['sokoos_business_name', 'sokoos_user_name', 'sokoos_industry']).then(pairs => {
      setCtx({ businessName: pairs[0][1] ?? '', userName: pairs[1][1] ?? '', industry: pairs[2][1] ?? 'RETAIL' });
    });
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const res = await api.get<DashboardData>('/reports/dashboard');
      setData(res);
    } catch {
      // Use mock in dev
      setData({
        todaySales: 2_450_000,
        todayTransactions: 47,
        lowStockCount: 8,
        pendingTransfers: 2,
        pendingPOs: 3,
        paymentsByMethod: [
          { method: 'CASH', total: 1_200_000 },
          { method: 'MTN_MOMO', total: 850_000 },
          { method: 'AIRTEL_MONEY', total: 400_000 },
        ],
        topSellers: [
          { name: 'Dettol Soap 100g', qty: 142, revenue: 426_000 },
          { name: 'Blue Band 500g', qty: 89, revenue: 534_000 },
          { name: 'Coke 500ml', qty: 134, revenue: 268_000 },
          { name: 'Omo 500g', qty: 76, revenue: 380_000 },
          { name: 'Colgate Toothpaste', qty: 55, revenue: 275_000 },
        ],
      });
    }
    setLoading(false);
    setRefreshing(false);
  }

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  if (loading) return <Loader />;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.sand }}
      contentContainerStyle={{ padding: Spacing.base, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.sunset} />}
    >
      {/* Greeting */}
      <View style={{ marginBottom: Spacing.lg }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: Colors.ink, letterSpacing: -0.5 }}>
          {greeting}{ctx.businessName ? `,` : '!'}{'\n'}
          {ctx.businessName && <Text style={{ color: Colors.sunset }}>{ctx.businessName}</Text>}
        </Text>
        <Text style={{ color: Colors.muted, fontSize: 13, marginTop: 4 }}>{formatDate(new Date())}</Text>
      </View>

      {/* KPI cards */}
      <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm }}>
        <StatCard label="Today's Sales" value={formatMoney(data?.todaySales ?? 0, 'UGX', { short: true })} sub={`${data?.todayTransactions ?? 0} txns`} />
        <StatCard label="Low Stock" value={String(data?.lowStockCount ?? 0)} sub="items" accentColor={Colors.warning} />
      </View>
      <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl }}>
        <StatCard label="Pending Transfers" value={String(data?.pendingTransfers ?? 0)} accentColor={Colors.ochre} />
        <StatCard label="Open POs" value={String(data?.pendingPOs ?? 0)} accentColor={Colors.info} />
      </View>

      {/* Quick actions */}
      <SectionHeader title="Quick actions" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.xl }}>
        <View style={{ flexDirection: 'row', gap: Spacing.sm, paddingRight: Spacing.base }}>
          {[
            { label: 'New Sale', icon: '🛒', screen: 'POS' },
            { label: 'Inventory', icon: '📦', screen: 'Inventory' },
            { label: 'Reports', icon: '📊', screen: 'Reports' },
            { label: 'Day Closure', icon: '🌙', screen: 'DayClosure' },
            { label: 'Purchase Order', icon: '🚚', screen: 'PurchaseOrders' },
          ].map(item => (
            <TouchableOpacity
              key={item.screen}
              onPress={() => navigation.navigate(item.screen)}
              style={styles.quickAction}
            >
              <Text style={{ fontSize: 24 }}>{item.icon}</Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: Colors.ink, textAlign: 'center', marginTop: 6 }}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Top sellers */}
      <Card>
        <SectionHeader title="Top Sellers Today" action="See all" onAction={() => navigation.navigate('SalesReport')} />
        {data?.topSellers?.length ? (
          data.topSellers.map((item, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: i < data.topSellers.length - 1 ? 1 : 0, borderBottomColor: Colors.border }}>
              <View style={styles.rankCircle}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: Colors.muted }}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.ink }}>{item.name}</Text>
                <Text style={{ fontSize: 11, color: Colors.muted }}>{item.qty} units</Text>
              </View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.sunset }}>
                {formatMoney(item.revenue, 'UGX', { short: true })}
              </Text>
            </View>
          ))
        ) : (
          <Text style={{ textAlign: 'center', color: Colors.muted, padding: Spacing.base }}>No sales today</Text>
        )}
      </Card>

      {/* Payment breakdown */}
      {data?.paymentsByMethod && data.paymentsByMethod.length > 0 && (
        <Card style={{ marginTop: Spacing.base }}>
          <SectionHeader title="Payment Methods" />
          {data.paymentsByMethod.map((p, i) => {
            const total = data.paymentsByMethod.reduce((s, x) => s + x.total, 0);
            const pct = total > 0 ? p.total / total : 0;
            return (
              <View key={i} style={{ marginBottom: Spacing.sm }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                  <Text style={{ fontSize: 13, color: Colors.ink }}>{p.method.replace('_', ' ')}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.ink }}>{formatMoney(p.total, 'UGX', { short: true })}</Text>
                </View>
                <View style={{ height: 6, backgroundColor: Colors.peach, borderRadius: 3 }}>
                  <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: Colors.sunset, borderRadius: 3 }} />
                </View>
                <Text style={{ fontSize: 11, color: Colors.muted, marginTop: 3 }}>{Math.round(pct * 100)}%</Text>
              </View>
            );
          })}
        </Card>
      )}

      {/* Low stock warning */}
      {(data?.lowStockCount ?? 0) > 0 && (
        <TouchableOpacity onPress={() => navigation.navigate('LowStockReport')} style={[styles.alertBanner, { marginTop: Spacing.base }]}>
          <Text style={{ fontSize: 20, marginRight: Spacing.sm }}>⚠️</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#92400E' }}>Low stock alert</Text>
            <Text style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>
              {data?.lowStockCount} item{(data?.lowStockCount ?? 0) > 1 ? 's' : ''} need restocking
            </Text>
          </View>
          <Text style={{ color: '#B45309', fontSize: 18 }}>→</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  quickAction: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    alignItems: 'center',
    width: 90,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.soil, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  rankCircle: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.peach, alignItems: 'center', justifyContent: 'center',
  },
  alertBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: Radius.lg,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
});
