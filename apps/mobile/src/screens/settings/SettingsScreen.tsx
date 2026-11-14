import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, Radius, Shadow } from '../../theme';
import { PageHeader } from '../../components/UI';

const SETTINGS_ITEMS = [
  { icon: '🏢', label: 'Business profile', sub: 'Name, type, address, TIN', screen: 'BusinessSettings' },
  { icon: '🏪', label: 'Branches', sub: 'Manage your business locations', screen: 'Branches' },
  { icon: '👤', label: 'My profile', sub: 'Name, email, password', screen: 'Profile' },
  { icon: '🔐', label: 'Roles & permissions', sub: 'Manage staff access', screen: 'AuditLog' },
  { icon: '🔔', label: 'Notifications', sub: 'Email and push preferences', screen: 'Notifications' },
  { icon: '📋', label: 'Audit log', sub: 'View all business actions', screen: 'AuditLog' },
];

export default function SettingsScreen({ navigation }: any) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.sand }} contentContainerStyle={{ padding: Spacing.base, paddingBottom: 32 }}>
      <PageHeader title="Settings" />
      <View style={{ gap: Spacing.sm }}>
        {SETTINGS_ITEMS.map(item => (
          <TouchableOpacity
            key={item.screen + item.label}
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

      <View style={{ marginTop: Spacing.xl, padding: Spacing.base, backgroundColor: `${Colors.sunset}10`, borderRadius: Radius.lg, borderWidth: 1, borderColor: `${Colors.sunset}30` }}>
        <Text style={{ fontSize: 12, color: Colors.sunset, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>SokoOS v1.0.0</Text>
        <Text style={{ fontSize: 12, color: Colors.muted }}>Business OS for Uganda · Made with ❤️ in Kampala</Text>
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
