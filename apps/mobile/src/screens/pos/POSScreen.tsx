import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius, Shadow } from '../../theme';
import { Button, Badge, Loader } from '../../components/UI';
import { api } from '../../lib/api';
import { formatMoney } from '../../lib/format';

interface Variant { id: string; name: string; sku: string; unitPriceMinor: number; isActive: boolean; barcode?: string; }
interface Product { id: string; name: string; categoryName?: string; taxBps: number; variants: Variant[]; }
interface CartItem { variantId: string; productName: string; variantName: string; unitPriceMinor: number; taxBps: number; qty: number; }

type PaymentMethod = 'CASH' | 'MTN_MOMO' | 'AIRTEL_MONEY';

const PMLabels: Record<PaymentMethod, string> = { CASH: '💵 Cash', MTN_MOMO: '📱 MoMo', AIRTEL_MONEY: '📱 Airtel' };

export default function POSScreen({ navigation }: any) {
  const [q, setQ] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [pm, setPm] = useState<PaymentMethod>('CASH');
  const [customerPhone, setCustomerPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [receipt, setReceipt] = useState<{ id: string; receiptNumber: string; totalMinor: number } | null>(null);

  useEffect(() => {
    fetchProducts('');
  }, []);

  async function fetchProducts(search: string) {
    setLoading(true);
    try {
      const res = await api.get<{ items: Product[] }>(`/catalogue/products?q=${encodeURIComponent(search)}`);
      setProducts(res.items ?? []);
    } catch {
      // Mock products for dev
      setProducts([
        { id: '1', name: 'Dettol Soap 100g', taxBps: 0, variants: [{ id: 'v1', name: 'Default', sku: 'DTL-001', unitPriceMinor: 3000, isActive: true }] },
        { id: '2', name: 'Blue Band 500g', taxBps: 0, variants: [{ id: 'v2', name: 'Default', sku: 'BB-001', unitPriceMinor: 6000, isActive: true }] },
        { id: '3', name: 'Coca Cola 500ml', taxBps: 0, variants: [{ id: 'v3', name: 'Default', sku: 'CC-001', unitPriceMinor: 2000, isActive: true }] },
        { id: '4', name: 'Omo 500g', taxBps: 0, variants: [{ id: 'v4', name: 'Default', sku: 'OMO-001', unitPriceMinor: 5000, isActive: true }] },
        { id: '5', name: 'Colgate Toothpaste', taxBps: 1800, variants: [{ id: 'v5', name: 'Default', sku: 'CLG-001', unitPriceMinor: 5000, isActive: true }] },
        { id: '6', name: 'Bread Loaf', taxBps: 0, variants: [{ id: 'v6', name: 'Default', sku: 'BRD-001', unitPriceMinor: 4500, isActive: true }] },
        { id: '7', name: 'Sugar 1kg', taxBps: 0, variants: [{ id: 'v7', name: 'Default', sku: 'SGR-001', unitPriceMinor: 4000, isActive: true }] },
        { id: '8', name: 'Milk 500ml', taxBps: 0, variants: [{ id: 'v8', name: 'Default', sku: 'MLK-001', unitPriceMinor: 1500, isActive: true }] },
        { id: '9', name: 'Cooking Oil 1L', taxBps: 1800, variants: [{ id: 'v9', name: 'Default', sku: 'OIL-001', unitPriceMinor: 8000, isActive: true }] },
        { id: '10', name: 'Rice 1kg', taxBps: 0, variants: [{ id: 'v10', name: 'Default', sku: 'RCE-001', unitPriceMinor: 3500, isActive: true }] },
        { id: '11', name: 'Maize Flour 2kg', taxBps: 0, variants: [{ id: 'v11', name: 'Default', sku: 'MZF-001', unitPriceMinor: 6500, isActive: true }] },
        { id: '12', name: 'Panadol 24s', taxBps: 0, variants: [{ id: 'v12', name: 'Default', sku: 'PNL-001', unitPriceMinor: 4000, isActive: true }] },
      ]);
    }
    setLoading(false);
  }

  function addToCart(variant: Variant, product: Product) {
    setCart(prev => {
      const idx = prev.findIndex(i => i.variantId === variant.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], qty: updated[idx].qty + 1 };
        return updated;
      }
      return [...prev, { variantId: variant.id, productName: product.name, variantName: variant.name, unitPriceMinor: variant.unitPriceMinor, taxBps: product.taxBps, qty: 1 }];
    });
  }

  function updateQty(variantId: string, delta: number) {
    setCart(prev => {
      const updated = prev.map(i => i.variantId === variantId ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0);
      return updated;
    });
  }

  const cartSubtotal = cart.reduce((s, i) => s + i.unitPriceMinor * i.qty, 0);
  const cartTax = cart.reduce((s, i) => s + Math.floor((i.unitPriceMinor * i.qty * i.taxBps) / 10000), 0);
  const cartTotal = cartSubtotal + cartTax;
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const filtered = products.filter(p =>
    !q || p.name.toLowerCase().includes(q.toLowerCase()) ||
    p.variants.some(v => v.sku.toLowerCase().includes(q.toLowerCase()) || v.barcode?.includes(q))
  );

  async function commitSale() {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const res = await api.post<{ id: string; receiptNumber: string; totalMinor: number }>('/sales', {
        idempotencyKey: `pos-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        items: cart.map(i => ({ variantId: i.variantId, qty: i.qty })),
        payments: [{ method: pm, amountMinor: cartTotal, ...(pm !== 'CASH' && customerPhone ? { phone: customerPhone } : {}) }],
      });
      setReceipt(res);
      setCart([]);
      setShowCart(false);
    } catch (e: any) {
      Alert.alert('Sale failed', e.message ?? 'Try again');
    }
    setSubmitting(false);
  }

  if (receipt) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.sand, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.success + '20', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.base }}>
          <Text style={{ fontSize: 40 }}>✅</Text>
        </View>
        <Text style={{ fontSize: 26, fontWeight: '800', color: Colors.ink, letterSpacing: -0.5 }}>Sale complete!</Text>
        <Text style={{ color: Colors.muted, fontSize: 14, marginTop: 6 }}>Receipt #{receipt.receiptNumber}</Text>
        <Text style={{ fontSize: 36, fontWeight: '900', color: Colors.sunset, marginVertical: Spacing.lg, letterSpacing: -1 }}>
          {formatMoney(receipt.totalMinor)}
        </Text>
        <View style={{ flexDirection: 'row', gap: Spacing.sm, width: '100%' }}>
          <View style={{ flex: 1 }}>
            <Button label="New sale" onPress={() => setReceipt(null)} fullWidth />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Dashboard" onPress={() => { setReceipt(null); navigation.navigate('Dashboard'); }} variant="secondary" fullWidth />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.sand }}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Text style={{ fontSize: 16, marginRight: Spacing.sm }}>🔍</Text>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search or scan barcode…"
          placeholderTextColor={Colors.muted}
          style={{ flex: 1, fontSize: 14, color: Colors.ink }}
          returnKeyType="search"
        />
        {q ? (
          <TouchableOpacity onPress={() => setQ('')}>
            <Text style={{ color: Colors.muted, fontSize: 18 }}>×</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Product grid */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.grid} keyboardShouldPersistTaps="handled">
        {loading ? <Loader /> : filtered.flatMap(product =>
          product.variants.filter(v => v.isActive).map(variant => (
            <TouchableOpacity
              key={variant.id}
              onPress={() => { addToCart(variant, product); }}
              style={styles.productCard}
              activeOpacity={0.7}
            >
              <View style={styles.productIconBox}>
                <Text style={{ fontSize: 22 }}>📦</Text>
              </View>
              <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
              {variant.name !== 'Default' && (
                <Text style={{ fontSize: 10, color: Colors.muted, marginBottom: 2 }}>{variant.name}</Text>
              )}
              <Text style={styles.productPrice}>{formatMoney(variant.unitPriceMinor)}</Text>
              {cart.find(i => i.variantId === variant.id) && (
                <View style={styles.inCartBadge}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>
                    {cart.find(i => i.variantId === variant.id)?.qty}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Cart FAB */}
      {cart.length > 0 && (
        <TouchableOpacity style={styles.cartFab} onPress={() => setShowCart(true)} activeOpacity={0.9}>
          <Text style={{ color: '#fff', fontSize: 18 }}>🛒</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{cartCount} item{cartCount !== 1 ? 's' : ''}</Text>
          </View>
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>{formatMoney(cartTotal)}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginLeft: 6 }}>→</Text>
        </TouchableOpacity>
      )}

      {/* Cart sheet */}
      {showCart && (
        <View style={StyleSheet.absoluteFillObject}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setShowCart(false)} />
          <View style={styles.cartSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Order</Text>

            <ScrollView style={{ maxHeight: 300 }} contentContainerStyle={{ gap: 2 }}>
              {cart.map(item => (
                <View key={item.variantId} style={styles.cartItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.ink }}>{item.productName}</Text>
                    {item.variantName !== 'Default' && <Text style={{ fontSize: 12, color: Colors.muted }}>{item.variantName}</Text>}
                    <Text style={{ fontSize: 12, color: Colors.sunset }}>{formatMoney(item.unitPriceMinor)} × {item.qty}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity onPress={() => updateQty(item.variantId, -1)} style={styles.qtyBtn}><Text style={{ fontWeight: '800' }}>−</Text></TouchableOpacity>
                    <Text style={{ fontSize: 15, fontWeight: '700', width: 24, textAlign: 'center' }}>{item.qty}</Text>
                    <TouchableOpacity onPress={() => updateQty(item.variantId, 1)} style={styles.qtyBtn}><Text style={{ fontWeight: '800' }}>+</Text></TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Totals */}
            <View style={styles.totals}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: Colors.muted, fontSize: 13 }}>Subtotal</Text>
                <Text style={{ fontSize: 13, color: Colors.ink }}>{formatMoney(cartSubtotal)}</Text>
              </View>
              {cartTax > 0 && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: Colors.muted, fontSize: 13 }}>Tax</Text>
                  <Text style={{ fontSize: 13, color: Colors.ink }}>{formatMoney(cartTax)}</Text>
                </View>
              )}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: Colors.ink }}>Total</Text>
                <Text style={{ fontSize: 20, fontWeight: '900', color: Colors.sunset, letterSpacing: -0.5 }}>{formatMoney(cartTotal)}</Text>
              </View>
            </View>

            {/* Payment method */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: Spacing.sm }}>
              {(['CASH', 'MTN_MOMO', 'AIRTEL_MONEY'] as PaymentMethod[]).map(method => (
                <TouchableOpacity
                  key={method}
                  onPress={() => setPm(method)}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: Radius.md, backgroundColor: pm === method ? Colors.sunset : Colors.peach, alignItems: 'center', borderWidth: 1, borderColor: pm === method ? Colors.sunset : Colors.border }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: pm === method ? '#fff' : Colors.ink }}>
                    {PMLabels[method]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {pm !== 'CASH' && (
              <TextInput
                value={customerPhone}
                onChangeText={setCustomerPhone}
                placeholder="Customer phone (07xx…)"
                keyboardType="phone-pad"
                style={styles.phoneInput}
                placeholderTextColor={Colors.muted}
              />
            )}

            <Button
              label={`Charge ${formatMoney(cartTotal)}`}
              onPress={commitSale}
              loading={submitting}
              fullWidth
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, margin: Spacing.sm,
    borderRadius: Radius.lg, paddingHorizontal: Spacing.base,
    paddingVertical: 10, borderWidth: 1, borderColor: Colors.border,
    ...Shadow.sm,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: Spacing.sm, gap: Spacing.sm },
  productCard: {
    width: '31%', backgroundColor: Colors.surface,
    borderRadius: Radius.lg, padding: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
    ...Shadow.sm, position: 'relative',
  },
  productIconBox: {
    width: 44, height: 44, borderRadius: Radius.md,
    backgroundColor: Colors.peach, alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  productName: { fontSize: 12, fontWeight: '600', color: Colors.ink, marginBottom: 2, lineHeight: 16 },
  productPrice: { fontSize: 14, fontWeight: '800', color: Colors.sunset, letterSpacing: -0.3 },
  inCartBadge: {
    position: 'absolute', top: 6, right: 6,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.sunset, alignItems: 'center', justifyContent: 'center',
  },
  cartFab: {
    position: 'absolute', bottom: Spacing.xl, left: Spacing.base, right: Spacing.base,
    backgroundColor: Colors.sidebarBg, borderRadius: Radius.xl,
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.base, gap: Spacing.sm, ...Shadow.lg,
  },
  cartSheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.base, paddingBottom: 32, gap: Spacing.sm,
    ...Shadow.lg,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.sm },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: Colors.ink, letterSpacing: -0.4, marginBottom: Spacing.sm },
  cartItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.peach, alignItems: 'center', justifyContent: 'center',
  },
  totals: { backgroundColor: Colors.peach, borderRadius: Radius.md, padding: Spacing.base, gap: 6, marginBottom: Spacing.sm },
  phoneInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 10, fontSize: 14, color: Colors.ink,
    marginBottom: Spacing.sm,
  },
});
