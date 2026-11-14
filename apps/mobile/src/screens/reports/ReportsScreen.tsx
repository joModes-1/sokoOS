import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Colors, Spacing, Radius, Shadow } from '../../theme';
import { PageHeader } from '../../components/UI';

const REPORT_ITEMS = [
  { icon: '📈', label: 'Sales Report', sub: 'Revenue, transactions, trends', screen: 'SalesReport' },
  { icon: '📦', label: 'Stock Report', sub: 'Current inventory levels', screen: 'Inventory' },
  { icon: '⚠️', label: 'Low Stock Alert', sub: 'Items below reorder level', screen: 'LowStockReport' },
  { icon: '🚚', label: 'Purchasing Report', sub: 'PO spend and supplier analysis', screen: 'PurchaseOrders' },
  { icon: '💰', label: 'Day Closure', sub: 'Cash count and day-end reconciliation', screen: 'DayClosure' },
  { icon: '🔄', label: 'Transfers Report', sub: 'Inter-branch stock movements', screen: 'Transfers' },
];

export default function ReportsScreen({ navigation }: any) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.sand }} contentContainerStyle={{ padding: Spacing.base, paddingBottom: 32 }}>
      <PageHeader title="Reports" subtitle="Analytics & insights" />
      <View style={{ gap: Spacing.sm }}>
        {REPORT_ITEMS.map(item => (
          <TouchableOpacity
            key={item.screen}
            onPress={() => navigation.navigate(item.screen)}
            style={styles.card}
            activeOpacity={0.7}
          >
            <View style={styles.iconBox}>
              <Text style={{ fontSize: 24 }}>{item.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.ink }}>{item.label}</Text>
              <Text style={{ fontSize: 12, color: Colors.muted, marginTop: 2 }}>{item.sub}</Text>
            </View>
            <Text style={{ color: Colors.border, fontSize: 20 }}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.base,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.base,
    borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
  },
  iconBox: { width: 50, height: 50, borderRadius: 14, backgroundColor: Colors.peach, alignItems: 'center', justifyContent: 'center' },
});
