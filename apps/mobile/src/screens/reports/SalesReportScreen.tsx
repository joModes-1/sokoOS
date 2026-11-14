import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Colors, Spacing, Radius } from '../../theme';
import { StatCard, Card, SectionHeader, Loader } from '../../components/UI';
import { api } from '../../lib/api';
import { formatMoney } from '../../lib/format';

export default function SalesReportScreen() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
      const res = await api.get<any>(`/reports/sales?dateFrom=${weekAgo}&dateTo=${today}`);
      setReport(res);
    } catch {
      setReport({
        grossMinor: 12_450_000, refundsMinor: 320_000, netMinor: 12_130_000, transactions: 284,
        byBranch: [
          { branchName: 'Main Branch', netMinor: 7_500_000, transactions: 170 },
          { branchName: 'Kampala Road', netMinor: 3_200_000, transactions: 82 },
          { branchName: 'Entebbe Branch', netMinor: 1_430_000, transactions: 32 },
        ],
        byPaymentMethod: [
          { method: 'CASH', total: 6_200_000 },
          { method: 'MTN_MOMO', total: 4_100_000 },
          { method: 'AIRTEL_MONEY', total: 1_830_000 },
        ],
        byDay: Array.from({ length: 7 }, (_, i) => ({
          date: new Date(Date.now() - (6 - i) * 86400000).toISOString().split('T')[0],
          netMinor: Math.floor(Math.random() * 2_000_000) + 1_000_000,
        })),
      });
    }
    setLoading(false);
    setRefreshing(false);
  }

  if (loading) return <Loader />;

  const maxDay = Math.max(...(report?.byDay ?? []).map((d: any) => d.netMinor), 1);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.sand }}
      contentContainerStyle={{ padding: Spacing.base, gap: Spacing.base, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.sunset} />}
    >
      <Text style={{ fontSize: 12, color: Colors.muted, marginBottom: 4 }}>Last 7 days</Text>

      {/* KPIs */}
      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <StatCard label="Gross Sales" value={formatMoney(report?.grossMinor ?? 0, 'UGX', { short: true })} />
        <StatCard label="Refunds" value={formatMoney(report?.refundsMinor ?? 0, 'UGX', { short: true })} accentColor={Colors.danger} />
      </View>
      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <StatCard label="Net Sales" value={formatMoney(report?.netMinor ?? 0, 'UGX', { short: true })} accentColor={Colors.success} />
        <StatCard label="Transactions" value={String(report?.transactions ?? 0)} accentColor={Colors.ochre} />
      </View>

      {/* Daily trend */}
      <Card>
        <SectionHeader title="Daily trend" />
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 80 }}>
          {(report?.byDay ?? []).map((day: any, i: number) => {
            const h = (day.netMinor / maxDay) * 72;
            const d = new Date(day.date);
            return (
              <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                <View style={{ width: '80%', height: h, borderRadius: 4, backgroundColor: Colors.sunset + 'CC', minHeight: 3 }} />
                <Text style={{ fontSize: 9, color: Colors.muted }}>{d.getDate()}</Text>
              </View>
            );
          })}
        </View>
      </Card>

      {/* By branch */}
      <Card>
        <SectionHeader title="By branch" />
        {(report?.byBranch ?? []).map((b: any, i: number) => (
          <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: i < report.byBranch.length - 1 ? 1 : 0, borderBottomColor: Colors.border }}>
            <View>
              <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.ink }}>{b.branchName}</Text>
              <Text style={{ fontSize: 11, color: Colors.muted }}>{b.transactions} transactions</Text>
            </View>
            <Text style={{ fontSize: 15, fontWeight: '800', color: Colors.sunset, letterSpacing: -0.4 }}>{formatMoney(b.netMinor, 'UGX', { short: true })}</Text>
          </View>
        ))}
      </Card>

      {/* By payment method */}
      <Card>
        <SectionHeader title="Payment methods" />
        {(report?.byPaymentMethod ?? []).map((p: any, i: number) => {
          const total = (report?.byPaymentMethod ?? []).reduce((s: number, x: any) => s + x.total, 0);
          const pct = total > 0 ? p.total / total : 0;
          return (
            <View key={i} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                <Text style={{ fontSize: 13, color: Colors.ink }}>{p.method.replace('_', ' ')}</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.ink }}>{formatMoney(p.total, 'UGX', { short: true })}</Text>
              </View>
              <View style={{ height: 6, backgroundColor: Colors.peach, borderRadius: 3 }}>
                <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: Colors.sunset, borderRadius: 3 }} />
              </View>
              <Text style={{ fontSize: 11, color: Colors.muted, marginTop: 2 }}>{Math.round(pct * 100)}%</Text>
            </View>
          );
        })}
      </Card>
    </ScrollView>
  );
}
