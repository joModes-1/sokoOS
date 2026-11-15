'use client';

import { useState, useCallback, useRef } from 'react';
import { useProducts } from '@/hooks/use-queries';
import { formatMoney } from '@/lib/format';
import { Button, SearchInput, Badge, Alert, Spinner } from '@/components/ui';
import { api } from '@/lib/api-client';
import { useBusinessContext } from '@/hooks/use-business';

interface CartItem {
  variantId: string;
  variantName: string;
  productName: string;
  unitPriceMinor: number;
  taxBps: number;
  qty: number;
}

type PaymentMethod = 'CASH' | 'MOMO' | 'AIRTEL_MONEY';

export default function POSPage() {
  const { branchId } = useBusinessContext();
  const [tendered, setTendered] = useState('');
  const [q, setQ] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [customerPhone, setCustomerPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<{ id: string; receiptNumber: string; totalMinor: number } | null>(null);

  const orderRef = useRef<HTMLDivElement>(null);

  const { data: products, isLoading: loadingProducts } = useProducts({ q });

  function addToCart(variant: { id: string; name: string; unitPriceMinor: number }, product: { name: string; taxBps: number }) {
    setCart(prev => {
      const existing = prev.find(i => i.variantId === variant.id);
      if (existing) {
        return prev.map(i => i.variantId === variant.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, {
        variantId: variant.id,
        variantName: variant.name,
        productName: product.name,
        unitPriceMinor: variant.unitPriceMinor,
        taxBps: product.taxBps,
        qty: 1,
      }];
    });
  }

  function updateQty(variantId: string, qty: number) {
    if (qty <= 0) {
      setCart(prev => prev.filter(i => i.variantId !== variantId));
    } else {
      setCart(prev => prev.map(i => i.variantId === variantId ? { ...i, qty } : i));
    }
  }

  const cartTotal = cart.reduce((sum, item) => {
    const subtotal = item.unitPriceMinor * item.qty;
    const tax = Math.round((subtotal * item.taxBps) / 10000);
    return sum + subtotal + tax;
  }, 0);

  const cartSubtotal = cart.reduce((sum, item) => sum + item.unitPriceMinor * item.qty, 0);
  const cartTax = cartTotal - cartSubtotal;

  async function commitSale() {
    if (!cart.length) return;
    setLoading(true);
    setError('');
    try {
      const idempotencyKey = `pos-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      if (!branchId) throw new Error('No branch selected. Sign out and sign in again.');
      const tenderedMinor = Number(tendered.replace(/[^0-9]/g, '')) || 0;
      if (paymentMethod === 'CASH' && tenderedMinor > 0 && tenderedMinor < cartTotal) {
        throw new Error('Cash received is less than the total');
      }
      const result = await api.post<{ id: string; receiptNumber: string; totalMinor: number }>('/sales', {
        branchId,
        idempotencyKey,
        items: cart.map(i => ({ productVariantId: i.variantId, quantity: i.qty })),
        payments: [{
          method: paymentMethod === 'MOMO' ? 'MTN_MOMO' : paymentMethod,
          amountMinor: cartTotal,
          ...(paymentMethod === 'CASH' && tenderedMinor >= cartTotal ? { amountTenderedMinor: tenderedMinor } : {}),
          ...(paymentMethod !== 'CASH' && customerPhone ? { phoneNumber: customerPhone } : {}),
        }],
      });
      setReceipt(result);
      setCart([]);
      setTendered('');
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Sale failed');
    } finally {
      setLoading(false);
    }
  }

  if (receipt) {
    return (
      <div className="max-w-sm mx-auto text-center py-12">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-ink font-display">Sale complete!</h2>
        <p className="text-ink/50 text-sm mt-1">Receipt #{receipt.receiptNumber}</p>
        <p className="text-3xl font-bold text-sunset mt-4 font-display">
          {formatMoney(receipt.totalMinor)}
        </p>
        <div className="flex gap-3 justify-center mt-6">
          <Button variant="secondary" onClick={() => window.open(`/print/receipts/${receipt.id}?autoprint=1`, '_blank')}>
            Print receipt
          </Button>
          <Button onClick={() => setReceipt(null)}>
            New sale
          </Button>
        </div>
      </div>
    );
  }

  return (
    // Phones: products then order/payment stacked, page scrolls. Desktop: side by side, fixed height.
    <div className="flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-7rem)]">
      {/* Product grid */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-xl font-bold text-ink font-display">Point of Sale</h1>
        </div>
        <SearchInput value={q} onChange={setQ} placeholder="Search products or scan barcode…" className="mb-4" />

        {loadingProducts ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (
          <div className="flex-1 lg:overflow-y-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {(products?.items ?? []).map(product =>
                product.variants.filter(v => v.isActive).map(variant => (
                  <button
                    key={variant.id}
                    onClick={() => addToCart(variant, { name: product.name, taxBps: product.taxBps })}
                    className="bg-white rounded-xl border border-border p-4 text-left hover:border-sunset hover:shadow-sm transition-all group"
                  >
                    <div className="text-xs text-ink/40 mb-1 truncate">{product.categoryName}</div>
                    <p className="text-sm font-semibold text-ink group-hover:text-sunset transition-colors line-clamp-2">
                      {product.name}
                      {variant.name !== 'Default' && ` — ${variant.name}`}
                    </p>
                    <p className="text-base font-bold text-sunset mt-2 font-display">
                      {formatMoney(variant.unitPriceMinor)}
                    </p>
                  </button>
                ))
              )}
            </div>
            {!products?.items?.length && !loadingProducts && (
              <div className="text-center py-16 text-ink/40">
                <p className="text-4xl mb-3">🔍</p>
                <p className="font-medium">No products found</p>
                <p className="text-sm mt-1">Try a different search term</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Phones: sticky bar while browsing products; settles into place above the order panel */}
      {cart.length > 0 && (
        <button
          onClick={() => orderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="lg:hidden sticky bottom-0 z-10 -mt-3 flex items-center justify-between w-full rounded-xl bg-sunset text-white px-4 py-3 shadow-lg font-semibold text-sm"
        >
          <span>View order · {cart.reduce((n, i) => n + i.qty, 0)} item{cart.reduce((n, i) => n + i.qty, 0) > 1 ? 's' : ''}</span>
          <span className="font-display">{formatMoney(cartTotal)} ↓</span>
        </button>
      )}

      {/* Cart */}
      <div ref={orderRef} className="w-full lg:w-80 flex-shrink-0 flex flex-col bg-white rounded-xl border border-border scroll-mt-4">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-ink">Order</h2>
          {cart.length > 0 && (
            <p className="text-xs text-ink/40 mt-0.5">{cart.length} item{cart.length > 1 ? 's' : ''}</p>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 lg:overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <p className="text-center text-sm text-ink/30 py-8">Add products to start a sale</p>
          ) : (
            cart.map(item => (
              <div key={item.variantId} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{item.productName}</p>
                  {item.variantName !== 'Default' && (
                    <p className="text-xs text-ink/40">{item.variantName}</p>
                  )}
                  <p className="text-xs text-sunset">{formatMoney(item.unitPriceMinor)} × {item.qty}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQty(item.variantId, item.qty - 1)}
                    className="w-8 h-8 lg:w-6 lg:h-6 rounded-full bg-sand hover:bg-peach text-ink font-bold text-sm flex items-center justify-center"
                  >−</button>
                  <span className="w-6 text-center text-sm font-medium">{item.qty}</span>
                  <button
                    onClick={() => updateQty(item.variantId, item.qty + 1)}
                    className="w-8 h-8 lg:w-6 lg:h-6 rounded-full bg-sand hover:bg-peach text-ink font-bold text-sm flex items-center justify-center"
                  >+</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals + payment */}
        <div className="p-4 border-t border-border space-y-3">
          {cart.length > 0 && (
            <>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-ink/60">
                  <span>Subtotal</span>
                  <span>{formatMoney(cartSubtotal)}</span>
                </div>
                {cartTax > 0 && (
                  <div className="flex justify-between text-ink/60">
                    <span>Tax (18% VAT)</span>
                    <span>{formatMoney(cartTax)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-ink text-base pt-1 border-t border-border">
                  <span>Total</span>
                  <span className="text-sunset font-display">{formatMoney(cartTotal)}</span>
                </div>
              </div>

              {/* Payment method */}
              <div>
                <p className="text-xs text-ink/50 font-medium mb-2">Payment method</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['CASH', 'MOMO', 'AIRTEL_MONEY'] as const).map(method => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`py-2 rounded-lg text-xs font-semibold border transition-all ${paymentMethod === method ? 'bg-sunset text-white border-sunset' : 'bg-sand text-ink/60 border-border hover:border-ochre'}`}
                    >
                      {method === 'CASH' ? '💵 Cash' : method === 'MOMO' ? '📱 MoMo' : '📱 Airtel'}
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethod === 'CASH' && (
                <input
                  type="text"
                  inputMode="numeric"
                  value={tendered}
                  onChange={e => setTendered(e.target.value)}
                  placeholder="Cash received (optional)"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                />
              )}

              {paymentMethod !== 'CASH' && (
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="Customer phone (07xx…)"
                  className="form-input w-full text-sm"
                />
              )}
            </>
          )}

          {error && <Alert tone="danger" className="text-xs">{error}</Alert>}

          <Button
            onClick={commitSale}
            loading={loading}
            disabled={cart.length === 0}
            className="w-full"
            size="lg"
          >
            {cart.length === 0 ? 'Add items to sell' : `Charge ${formatMoney(cartTotal)}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
