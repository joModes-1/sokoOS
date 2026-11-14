import { test, expect, type Page } from '@playwright/test';

const API = process.env.API_URL ?? 'http://localhost:3001/v1';
const OWNER = { email: 'owner02@sokoos.test', password: 'Soko02Pass!2026' };

async function api(path: string, opts: { method?: string; token?: string; ctx?: { businessId: string; branchId: string }; body?: unknown } = {}) {
  const res = await fetch(`${API}${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token && { Authorization: `Bearer ${opts.token}` }),
      ...(opts.ctx && { 'X-Business-Id': opts.ctx.businessId, 'X-Branch-Id': opts.ctx.branchId }),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  return { status: res.status, body: (await res.json().catch(() => ({}))) as Record<string, any> };
}

async function loginUi(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Email address').fill(OWNER.email);
  await page.getByLabel('Password', { exact: true }).fill(OWNER.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe('POS sale prints a receipt', () => {
  test('cashier sells an item for cash and gets a printable receipt', async ({ page, context }) => {
    // ── Arrange: a product with stock, created through the API ────────────
    const login = await api('/auth/login', { method: 'POST', body: OWNER });
    expect(login.status).toBe(200);
    const token = login.body.accessToken as string;
    const ctx = { businessId: login.body.business.id as string, branchId: login.body.branch.id as string };

    const productName = `E2E Receipt Item ${Date.now()}`;
    const product = await api('/catalogue/products', {
      method: 'POST', token, ctx,
      body: { name: productName, costPriceMinor: 3000, sellingPriceMinor: 5000, taxRateBp: 0 },
    });
    expect(product.status).toBe(201);
    const variantId = product.body.variants[0].id as string;
    const stock = await api('/inventory/adjustments', {
      method: 'POST', token, ctx,
      body: { branchId: ctx.branchId, productVariantId: variantId, quantityDelta: 20, reasonCode: 'MANUAL', reasonText: 'E2E opening stock' },
    });
    expect(stock.status).toBe(201);

    // Headless Chrome has no printer: record print() calls instead of opening a dialog.
    await context.addInitScript(() => {
      (window as any).__printCalls = 0;
      window.print = () => { (window as any).__printCalls++; };
    });

    // ── Act: sign in, sell 2 units for cash ───────────────────────────────
    await loginUi(page);
    await page.goto('/pos');
    await page.getByPlaceholder(/Search products/).fill(productName);
    await page.getByRole('button', { name: new RegExp(productName) }).click();
    await page.getByRole('button', { name: '+' }).click(); // quantity 2
    await expect(page.getByRole('button', { name: /Charge/ })).toContainText('10,000');
    await page.getByPlaceholder('Cash received (optional)').fill('20000');
    await page.getByRole('button', { name: /Charge/ }).click();

    // ── Assert: sale complete screen with a receipt number ────────────────
    await expect(page.getByText('Sale complete!')).toBeVisible();
    await expect(page.getByText(/Receipt #RCP-\d{4}-\d{4}/)).toBeVisible();

    // ── Print: the receipt opens in a new tab and triggers print ──────────
    const [receiptTab] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('button', { name: 'Print receipt' }).click(),
    ]);
    await receiptTab.waitForLoadState();
    const receipt = receiptTab.getByTestId('receipt');
    await expect(receipt).toBeVisible();
    await expect(receipt).toContainText('Wellness Pharmacy');
    await expect(receipt).toContainText(productName);
    await expect(receiptTab.getByTestId('receipt-total')).toContainText('10,000');
    await expect(receipt).toContainText('Cash received');
    await expect(receipt).toContainText('Change');
    await expect(receipt).toContainText('10,000'); // change = 20,000 - 10,000
    await expect(receipt).toContainText('Served by: Owner 02');
    await expect(receiptTab.getByTestId('receipt-number')).toHaveText(/RCP-\d{4}-\d{4}/);
    await expect.poll(() => receiptTab.evaluate(() => (window as any).__printCalls)).toBeGreaterThan(0);

    // ── Stock was deducted: 20 - 2 = 18 ───────────────────────────────────
    const balances = await api(`/inventory/balances?branchId=${ctx.branchId}`, { token, ctx });
    const rows = (balances.body.data ?? balances.body) as Array<Record<string, any>>;
    const mine = rows.find(r => r.productVariantId === variantId);
    expect(Number(mine?.quantityOnHand)).toBe(18);
  });
});
