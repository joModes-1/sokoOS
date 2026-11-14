import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Colors, Spacing, Radius, Shadow } from '../theme';
import { Avatar } from '../components/UI';
import { clearSession } from '../lib/api';

// ── Screen imports ─────────────────────────────────────────────────────────────
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import VerifyScreen from '../screens/auth/VerifyScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

import DashboardScreen from '../screens/app/DashboardScreen';
import POSScreen from '../screens/pos/POSScreen';
import SalesListScreen from '../screens/app/SalesListScreen';
import SaleDetailScreen from '../screens/app/SaleDetailScreen';
import InventoryScreen from '../screens/inventory/InventoryScreen';
import StockMovementsScreen from '../screens/inventory/StockMovementsScreen';
import BatchesScreen from '../screens/inventory/BatchesScreen';
import AdjustmentScreen from '../screens/inventory/AdjustmentScreen';
import TransfersScreen from '../screens/transfers/TransfersScreen';
import TransferDetailScreen from '../screens/transfers/TransferDetailScreen';
import SuppliersScreen from '../screens/purchasing/SuppliersScreen';
import PurchaseOrdersScreen from '../screens/purchasing/PurchaseOrdersScreen';
import PODetailScreen from '../screens/purchasing/PODetailScreen';
import GoodsReceiptScreen from '../screens/purchasing/GoodsReceiptScreen';
import ReportsScreen from '../screens/reports/ReportsScreen';
import SalesReportScreen from '../screens/reports/SalesReportScreen';
import LowStockReportScreen from '../screens/reports/LowStockReportScreen';
import DayClosureScreen from '../screens/app/DayClosureScreen';
import NotificationsScreen from '../screens/app/NotificationsScreen';
import UsersScreen from '../screens/app/UsersScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import BusinessSettingsScreen from '../screens/settings/BusinessSettingsScreen';
import BranchesScreen from '../screens/settings/BranchesScreen';
import ProfileScreen from '../screens/settings/ProfileScreen';
import AuditLogScreen from '../screens/settings/AuditLogScreen';
import CatalogueProductsScreen from '../screens/app/CatalogueProductsScreen';

// ── Industry nav config ────────────────────────────────────────────────────────
const INDUSTRY_NAV: Record<string, { label: string; icon: string; screen: string }[]> = {
  RETAIL: [
    { label: 'Dashboard', icon: '🏠', screen: 'Dashboard' },
    { label: 'Point of Sale', icon: '🛒', screen: 'POS' },
    { label: 'Sales', icon: '🧾', screen: 'Sales' },
    { label: 'Inventory', icon: '📦', screen: 'Inventory' },
    { label: 'Purchasing', icon: '🚚', screen: 'PurchaseOrders' },
    { label: 'Catalogue', icon: '🏷️', screen: 'Catalogue' },
    { label: 'Reports', icon: '📊', screen: 'Reports' },
    { label: 'Day Closure', icon: '🌙', screen: 'DayClosure' },
  ],
  PHARMACY: [
    { label: 'Dashboard', icon: '🏠', screen: 'Dashboard' },
    { label: 'Dispense', icon: '💊', screen: 'POS' },
    { label: 'Sales', icon: '🧾', screen: 'Sales' },
    { label: 'Stock & Batches', icon: '📦', screen: 'Inventory' },
    { label: 'Expiry Watch', icon: '⏰', screen: 'Batches' },
    { label: 'Purchasing', icon: '🚚', screen: 'PurchaseOrders' },
    { label: 'Reports', icon: '📊', screen: 'Reports' },
    { label: 'Day Closure', icon: '🌙', screen: 'DayClosure' },
  ],
  RESTAURANT: [
    { label: 'Dashboard', icon: '🏠', screen: 'Dashboard' },
    { label: 'Take Order', icon: '🍽️', screen: 'POS' },
    { label: 'Orders', icon: '🧾', screen: 'Sales' },
    { label: 'Kitchen', icon: '👨‍🍳', screen: 'Sales' },
    { label: 'Stock', icon: '📦', screen: 'Inventory' },
    { label: 'Purchasing', icon: '🚚', screen: 'PurchaseOrders' },
    { label: 'Reports', icon: '📊', screen: 'Reports' },
    { label: 'Day Closure', icon: '🌙', screen: 'DayClosure' },
  ],
  WHOLESALE: [
    { label: 'Dashboard', icon: '🏠', screen: 'Dashboard' },
    { label: 'New Order', icon: '📋', screen: 'POS' },
    { label: 'Orders', icon: '🧾', screen: 'Sales' },
    { label: 'Inventory', icon: '📦', screen: 'Inventory' },
    { label: 'Transfers', icon: '🔄', screen: 'Transfers' },
    { label: 'Purchasing', icon: '🚚', screen: 'PurchaseOrders' },
    { label: 'Suppliers', icon: '🏭', screen: 'Suppliers' },
    { label: 'Reports', icon: '📊', screen: 'Reports' },
  ],
  AUTOMOTIVE: [
    { label: 'Dashboard', icon: '🏠', screen: 'Dashboard' },
    { label: 'New Job', icon: '🔧', screen: 'POS' },
    { label: 'Jobs', icon: '🧾', screen: 'Sales' },
    { label: 'Parts Stock', icon: '📦', screen: 'Inventory' },
    { label: 'Purchasing', icon: '🚚', screen: 'PurchaseOrders' },
    { label: 'Reports', icon: '📊', screen: 'Reports' },
  ],
  BEAUTY: [
    { label: 'Dashboard', icon: '🏠', screen: 'Dashboard' },
    { label: 'Appointment', icon: '💆', screen: 'POS' },
    { label: 'Sales', icon: '🧾', screen: 'Sales' },
    { label: 'Products', icon: '📦', screen: 'Inventory' },
    { label: 'Reports', icon: '📊', screen: 'Reports' },
  ],
  HOSPITALITY: [
    { label: 'Dashboard', icon: '🏠', screen: 'Dashboard' },
    { label: 'Bookings', icon: '🏨', screen: 'Sales' },
    { label: 'POS', icon: '🛒', screen: 'POS' },
    { label: 'Inventory', icon: '📦', screen: 'Inventory' },
    { label: 'Reports', icon: '📊', screen: 'Reports' },
  ],
};

function getNavItems(industryCode: string) {
  return INDUSTRY_NAV[industryCode] ?? INDUSTRY_NAV['RETAIL'];
}

// ── Drawer content ─────────────────────────────────────────────────────────────
function SidebarContent({ navigation }: { navigation: any }) {
  const [ctx, setCtx] = useState({ businessName: 'SokoOS', userName: 'User', industry: 'RETAIL' });

  useEffect(() => {
    AsyncStorage.multiGet(['sokoos_business_name', 'sokoos_user_name', 'sokoos_industry']).then(pairs => {
      setCtx({
        businessName: pairs[0][1] ?? 'SokoOS',
        userName: pairs[1][1] ?? 'User',
        industry: pairs[2][1] ?? 'RETAIL',
      });
    });
  }, []);

  const navItems = getNavItems(ctx.industry);

  async function handleLogout() {
    await clearSession();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.sidebarBg }}>
      {/* Business header */}
      <SafeAreaView edges={['top']}>
        <View style={{ padding: Spacing.base, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.sunset, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>S</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: -0.3 }}>{ctx.businessName}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 1 }}>{ctx.industry}</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>

      {/* Nav items */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: Spacing.sm }}>
        {navItems.map(item => (
          <TouchableOpacity
            key={item.screen + item.label}
            onPress={() => navigation.navigate(item.screen)}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: Spacing.base, gap: Spacing.sm, marginHorizontal: 6, borderRadius: Radius.md, marginBottom: 2 }}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{item.icon}</Text>
            <Text style={{ color: Colors.sidebarText, fontSize: 14, fontWeight: '500' }}>{item.label}</Text>
          </TouchableOpacity>
        ))}

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: Spacing.sm, marginHorizontal: Spacing.base }} />

        {/* Fixed bottom items */}
        {[
          { label: 'Team', icon: '👥', screen: 'Users' },
          { label: 'Notifications', icon: '🔔', screen: 'Notifications' },
          { label: 'Settings', icon: '⚙️', screen: 'Settings' },
          { label: 'Audit Log', icon: '📋', screen: 'AuditLog' },
        ].map(item => (
          <TouchableOpacity
            key={item.screen}
            onPress={() => navigation.navigate(item.screen)}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: Spacing.base, gap: Spacing.sm, marginHorizontal: 6, borderRadius: Radius.md, marginBottom: 2 }}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{item.icon}</Text>
            <Text style={{ color: Colors.sidebarText, fontSize: 14, fontWeight: '500' }}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* User + logout */}
      <SafeAreaView edges={['bottom']}>
        <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', padding: Spacing.base, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
          <Avatar name={ctx.userName} size={34} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>{ctx.userName}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={{ padding: 6 }}>
            <Text style={{ fontSize: 18 }}>🚪</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ── Navigators ─────────────────────────────────────────────────────────────────
const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

function AppDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <SidebarContent navigation={props.navigation} />}
      screenOptions={{
        headerStyle: { backgroundColor: Colors.sand },
        headerTintColor: Colors.ink,
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        drawerStyle: { backgroundColor: Colors.sidebarBg, width: 260 },
      }}
    >
      <Drawer.Screen name="Dashboard" component={DashboardScreen} />
      <Drawer.Screen name="POS" component={POSScreen} options={{ title: 'Point of Sale' }} />
      <Drawer.Screen name="Sales" component={SalesListScreen} />
      <Drawer.Screen name="SaleDetail" component={SaleDetailScreen} options={{ title: 'Sale Details' }} />
      <Drawer.Screen name="Inventory" component={InventoryScreen} />
      <Drawer.Screen name="StockMovements" component={StockMovementsScreen} options={{ title: 'Stock Movements' }} />
      <Drawer.Screen name="Batches" component={BatchesScreen} options={{ title: 'Stock Batches' }} />
      <Drawer.Screen name="Adjustment" component={AdjustmentScreen} options={{ title: 'Stock Adjustment' }} />
      <Drawer.Screen name="Transfers" component={TransfersScreen} />
      <Drawer.Screen name="TransferDetail" component={TransferDetailScreen} options={{ title: 'Transfer Details' }} />
      <Drawer.Screen name="Suppliers" component={SuppliersScreen} />
      <Drawer.Screen name="PurchaseOrders" component={PurchaseOrdersScreen} options={{ title: 'Purchase Orders' }} />
      <Drawer.Screen name="PODetail" component={PODetailScreen} options={{ title: 'Purchase Order' }} />
      <Drawer.Screen name="GoodsReceipt" component={GoodsReceiptScreen} options={{ title: 'Goods Receipt' }} />
      <Drawer.Screen name="Reports" component={ReportsScreen} />
      <Drawer.Screen name="SalesReport" component={SalesReportScreen} options={{ title: 'Sales Report' }} />
      <Drawer.Screen name="LowStockReport" component={LowStockReportScreen} options={{ title: 'Low Stock Alert' }} />
      <Drawer.Screen name="DayClosure" component={DayClosureScreen} options={{ title: 'Day Closure' }} />
      <Drawer.Screen name="Notifications" component={NotificationsScreen} />
      <Drawer.Screen name="Users" component={UsersScreen} options={{ title: 'Team' }} />
      <Drawer.Screen name="Catalogue" component={CatalogueProductsScreen} options={{ title: 'Catalogue' }} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
      <Drawer.Screen name="BusinessSettings" component={BusinessSettingsScreen} options={{ title: 'Business Settings' }} />
      <Drawer.Screen name="Branches" component={BranchesScreen} />
      <Drawer.Screen name="Profile" component={ProfileScreen} />
      <Drawer.Screen name="AuditLog" component={AuditLogScreen} options={{ title: 'Audit Log' }} />
    </Drawer.Navigator>
  );
}

export function AppNavigator() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Verify" component={VerifyScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="App" component={AppDrawer} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
