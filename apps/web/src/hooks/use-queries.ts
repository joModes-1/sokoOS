'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useBusinessContext } from './use-business';

interface ApiPage<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

const num = (value: unknown): number => Number(value ?? 0);

// ── Dashboard ──────────────────────────────────────────────────────────────────
export function useDashboard() {
  const { businessId, branchId } = useBusinessContext();
  return useQuery({
    queryKey: queryKeys.dashboard(businessId, branchId),
    queryFn: () => api.get<DashboardData>('/reports/dashboard?days=30'),
    refetchInterval: 60_000,
    enabled: !!businessId,
  });
}

export interface DashboardData {
  currency: string;
  rangeDays: number;
  asOf: string;
  kpis: {
    revenueToday: number; revenueYesterday: number;
    transactionsToday: number; transactionsYesterday: number;
    revenue7d: number; revenuePrev7d: number;
    revenueRange: number; profitRange: number; transactionsRange: number; avgBasketRange: number;
  };
  salesByDay: { date: string; revenue: number; profit: number; transactions: number }[];
  salesByHour: { hour: number; revenue: number; transactions: number }[];
  topProducts: { name: string; qty: number; revenue: number; profit: number }[];
  categories: { name: string; revenue: number }[];
  payments: { method: string; total: number; transactions: number }[];
  lowStock: { name: string; onHand: number; reorderLevel: number }[];
  lowStockCount: number;
  outOfStockCount: number;
  pendingTransfers: number;
  pendingPOs: number;
  /** Customer credit: money owed to the business that has not been paid yet. */
  debts: { outstandingMinor: number; openCount: number; overdueCount: number };
  recentSales: { id: string; receiptNumber: string; totalMinor: number; items: number; method: string; completedAt: string }[];
}

// ── Products ──────────────────────────────────────────────────────────────────
export function useProducts(filters?: { q?: string; categoryId?: string; brandId?: string; page?: number }) {
  const { businessId } = useBusinessContext();
  return useQuery({
    queryKey: queryKeys.products(businessId, filters),
    queryFn: () => {
      const p = new URLSearchParams();
      if (filters?.q) p.set('q', filters.q);
      if (filters?.categoryId) p.set('categoryId', filters.categoryId);
      if (filters?.brandId) p.set('brandId', filters.brandId);
      if (filters?.page) p.set('page', String(filters.page));
      return api.get<ApiProductsPage>(`/catalogue/products?${p}`).then(adaptProductsPage);
    },
    enabled: !!businessId,
  });
}

interface ApiVariant {
  id: string; sku: string; variantName?: string | null; barcode?: string | null;
  costPriceMinor?: number | null; sellingPriceMinor?: number | null; isActive: boolean;
}
interface ApiProduct {
  id: string; name: string; categoryId?: string | null; brandId?: string | null;
  category?: { name: string } | null; brand?: { name: string } | null;
  costPriceMinor: number; sellingPriceMinor: number; taxRateBp?: number; isActive: boolean;
  variants: ApiVariant[];
}
interface ApiProductsPage { data: ApiProduct[]; total: number; page: number; limit: number }

/** The API returns { data, limit } with product-level pricing; the UI works with { items, pageSize } and per-variant prices. */
function adaptProductsPage(raw: ApiProductsPage): ProductsPage {
  return {
    items: raw.data.map(p => ({
      id: p.id,
      sku: p.variants[0]?.sku ?? '',
      name: p.name,
      categoryId: p.categoryId ?? '',
      ...(p.category?.name && { categoryName: p.category.name }),
      ...(p.brandId && { brandId: p.brandId }),
      ...(p.brand?.name && { brandName: p.brand.name }),
      taxBps: p.taxRateBp ?? 0,
      isActive: p.isActive,
      variants: p.variants.map(v => ({
        id: v.id,
        sku: v.sku,
        name: v.variantName ?? 'Default',
        ...(v.barcode && { barcode: v.barcode }),
        unitCostMinor: Number(v.costPriceMinor ?? p.costPriceMinor ?? 0),
        unitPriceMinor: Number(v.sellingPriceMinor ?? p.sellingPriceMinor ?? 0),
        reorderQty: 0,
        isActive: v.isActive,
      })),
    })),
    total: raw.total,
    page: raw.page,
    pageSize: raw.limit,
  };
}

export interface ProductsPage {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  categoryName?: string;
  brandId?: string;
  brandName?: string;
  variants: Variant[];
  taxBps: number;
  isActive: boolean;
}

export interface Variant {
  id: string;
  sku: string;
  name: string;
  barcode?: string;
  unitCostMinor: number;
  unitPriceMinor: number;
  reorderQty: number;
  isActive: boolean;
}

export function useCategories() {
  const { businessId } = useBusinessContext();
  return useQuery({
    queryKey: queryKeys.categories(businessId),
    queryFn: () => api.get<Category[]>('/catalogue/categories'),
    enabled: !!businessId,
  });
}

export interface Category {
  id: string;
  name: string;
  parentId?: string;
  _count?: { products: number };
}

export function useBrands() {
  const { businessId } = useBusinessContext();
  return useQuery({
    queryKey: queryKeys.brands(businessId),
    queryFn: () => api.get<Brand[]>('/catalogue/brands'),
    enabled: !!businessId,
  });
}

export interface Brand {
  id: string;
  name: string;
  _count?: { products: number };
}

// ── Inventory ─────────────────────────────────────────────────────────────────
export function useInventoryBalances(filters?: { q?: string; lowStock?: boolean }) {
  const { businessId, branchId } = useBusinessContext();
  return useQuery({
    queryKey: queryKeys.balances(businessId, branchId, filters),
    queryFn: () => {
      const p = new URLSearchParams();
      if (branchId) p.set('branchId', branchId);
      if (filters?.q) p.set('q', filters.q);
      if (filters?.lowStock) p.set('lowStockOnly', 'true');
      return api.get<ApiPage<ApiBalanceRow>>(`/inventory/balances?${p}`).then(adaptBalancesPage);
    },
    enabled: !!businessId,
  });
}

export interface BalancePage {
  items: InventoryBalance[];
  total: number;
}

interface ApiBalanceRow {
  branchId: string;
  branch?: { name?: string } | null;
  quantityOnHand: string | number;
  batchId?: string | null;
  variant?: {
    id?: string;
    variantName?: string | null;
    sku?: string;
    product?: { name?: string; reorderLevel?: string | number } | null;
  } | null;
}

/** The API returns one row per batch; the UI shows one row per variant and branch. */
function adaptBalances(rows: ApiBalanceRow[]): InventoryBalance[] {
  const grouped = new Map<string, InventoryBalance>();
  for (const row of rows) {
    const variant = row.variant;
    const key = `${row.branchId}:${variant?.id ?? ''}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.qty += num(row.quantityOnHand);
      existing.batchCount += 1;
      continue;
    }
    grouped.set(key, {
      variantId: variant?.id ?? '',
      variantName: variant?.variantName ?? 'Default',
      productName: variant?.product?.name ?? '',
      branchId: row.branchId,
      branchName: row.branch?.name ?? '',
      qty: num(row.quantityOnHand),
      reservedQty: 0,
      reorderQty: num(variant?.product?.reorderLevel),
      batchCount: 1,
    });
  }
  return [...grouped.values()];
}

function adaptBalancesPage(raw: ApiPage<ApiBalanceRow>): BalancePage {
  const items = adaptBalances(raw.data);
  return { items, total: items.length };
}

export interface InventoryBalance {
  variantId: string;
  variantName: string;
  productName: string;
  branchId: string;
  branchName: string;
  qty: number;
  reservedQty: number;
  reorderQty: number;
  batchCount: number;
}

export function useLowStock() {
  const { businessId, branchId } = useBusinessContext();
  return useQuery({
    queryKey: queryKeys.lowStock(businessId, branchId),
    queryFn: () =>
      api
        .get<ApiBalanceRow[]>('/inventory/low-stock')
        .then((rows) => adaptBalances(rows)),
    enabled: !!businessId,
  });
}

export function useStockBatches(filters?: { variantId?: string; expired?: boolean }) {
  const { businessId } = useBusinessContext();
  return useQuery({
    queryKey: queryKeys.batches(businessId, filters),
    queryFn: () => {
      const p = new URLSearchParams();
      if (filters?.variantId) p.set('variantId', filters.variantId);
      if (filters?.expired) p.set('expired', '1');
      return api.get<StockBatch[]>(`/inventory/batches?${p}`);
    },
    enabled: !!businessId,
  });
}

export interface StockBatch {
  id: string;
  batchRef: string;
  variantId: string;
  variantName: string;
  branchId: string;
  branchName: string;
  qty: number;
  costMinor: number;
  expiresAt?: string;
  status: string;
}

export function useStockMovements(filters?: { variantId?: string; type?: string; page?: number }) {
  const { businessId } = useBusinessContext();
  return useQuery({
    queryKey: queryKeys.movements(businessId, filters),
    queryFn: () => {
      const p = new URLSearchParams();
      if (filters?.variantId) p.set('variantId', filters.variantId);
      if (filters?.type) p.set('type', filters.type);
      if (filters?.page) p.set('page', String(filters.page));
      return api
        .get<ApiPage<ApiMovementRow>>(`/inventory/movements?${p}`)
        .then(adaptMovementsPage);
    },
    enabled: !!businessId,
  });
}

export interface MovementsPage {
  items: StockMovement[];
  total: number;
}

interface ApiMovementRow {
  id: string;
  movementType: string;
  quantityDelta: string | number;
  branchId: string;
  branch?: { name?: string } | null;
  occurredAt: string;
  referenceType?: string | null;
  referenceId?: string | null;
  actorUserId?: string | null;
  variant?: {
    id?: string;
    variantName?: string | null;
    product?: { name?: string } | null;
  } | null;
}

function adaptMovementsPage(raw: ApiPage<ApiMovementRow>): MovementsPage {
  return {
    items: raw.data.map((row) => ({
      id: row.id,
      type: row.movementType,
      variantId: row.variant?.id ?? '',
      variantName:
        [row.variant?.product?.name, row.variant?.variantName]
          .filter((v) => v && v !== 'Default')
          .join(' — ') || '',
      branchId: row.branchId,
      branchName: row.branch?.name ?? '',
      qty: num(row.quantityDelta),
      refType: row.referenceType ?? '',
      refId: row.referenceId ?? '',
      createdAt: row.occurredAt,
      actorName: row.actorUserId ?? '',
    })),
    total: raw.total,
  };
}

export interface StockMovement {
  id: string;
  type: string;
  variantId: string;
  variantName: string;
  branchId: string;
  branchName: string;
  qty: number;
  refType: string;
  refId: string;
  createdAt: string;
  actorName: string;
}

// ── Transfers ─────────────────────────────────────────────────────────────────
export function useTransfers(filters?: { status?: string; page?: number }) {
  const { businessId } = useBusinessContext();
  return useQuery({
    queryKey: queryKeys.transfers(businessId, filters),
    queryFn: () => {
      const p = new URLSearchParams();
      if (filters?.status) p.set('status', filters.status);
      if (filters?.page) p.set('page', String(filters.page));
      return api.get<ApiPage<ApiTransferRow>>(`/transfers?${p}`).then(adaptTransfersPage);
    },
    enabled: !!businessId,
  });
}

export interface TransfersPage {
  items: Transfer[];
  total: number;
}

interface ApiTransferRow {
  id: string;
  transferNumber: string;
  status: string;
  requestedAt: string;
  requestedBy?: string | null;
  originBranch?: { name?: string } | null;
  destinationBranch?: { name?: string } | null;
  items?: unknown[];
}

function adaptTransfersPage(raw: ApiPage<ApiTransferRow>): TransfersPage {
  return {
    items: raw.data.map((row) => ({
      id: row.id,
      transferRef: row.transferNumber,
      status: row.status,
      originBranchName: row.originBranch?.name ?? '',
      destinationBranchName: row.destinationBranch?.name ?? '',
      requestedAt: row.requestedAt,
      createdByName: row.requestedBy ?? '',
      itemCount: row.items?.length ?? 0,
    })),
    total: raw.total,
  };
}

export interface Transfer {
  id: string;
  transferRef: string;
  status: string;
  originBranchName: string;
  destinationBranchName: string;
  requestedAt: string;
  createdByName: string;
  itemCount: number;
}

// ── Purchasing ────────────────────────────────────────────────────────────────
export function useSuppliers(q?: string) {
  const { businessId } = useBusinessContext();
  return useQuery({
    queryKey: queryKeys.suppliers(businessId, q),
    queryFn: () => api.get<Supplier[]>(`/purchasing/suppliers${q ? `?q=${encodeURIComponent(q)}` : ''}`),
    enabled: !!businessId,
  });
}

export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  _count?: { purchaseOrders: number };
}

export function usePurchaseOrders(filters?: { status?: string; supplierId?: string; page?: number }) {
  const { businessId } = useBusinessContext();
  return useQuery({
    queryKey: queryKeys.purchaseOrders(businessId, filters),
    queryFn: () => {
      const p = new URLSearchParams();
      if (filters?.status) p.set('status', filters.status);
      if (filters?.supplierId) p.set('supplierId', filters.supplierId);
      if (filters?.page) p.set('page', String(filters.page));
      return api
        .get<ApiPage<ApiPurchaseOrderRow>>(`/purchasing/purchase-orders?${p}`)
        .then(adaptPurchaseOrdersPage);
    },
    enabled: !!businessId,
  });
}

export interface POsPage {
  items: PurchaseOrder[];
  total: number;
}

interface ApiPurchaseOrderRow {
  id: string;
  poNumber: string;
  status: string;
  supplierId: string;
  branchId: string;
  totalMinor: string | number;
  createdAt: string;
  supplier?: { name?: string } | null;
  branch?: { name?: string } | null;
  items?: unknown[];
}

function adaptPurchaseOrdersPage(raw: ApiPage<ApiPurchaseOrderRow>): POsPage {
  return {
    items: raw.data.map((row) => ({
      id: row.id,
      poNumber: row.poNumber,
      status: row.status,
      supplierId: row.supplierId,
      supplierName: row.supplier?.name ?? '',
      branchId: row.branchId,
      branchName: row.branch?.name ?? '',
      totalMinor: num(row.totalMinor),
      createdAt: row.createdAt,
      itemCount: row.items?.length ?? 0,
    })),
    total: raw.total,
  };
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  status: string;
  supplierId: string;
  supplierName: string;
  branchId: string;
  branchName: string;
  totalMinor: number;
  createdAt: string;
  itemCount: number;
}

// ── Sales ─────────────────────────────────────────────────────────────────────
export function useSales(filters?: { status?: string; dateFrom?: string; dateTo?: string; page?: number }) {
  const { businessId } = useBusinessContext();
  return useQuery({
    queryKey: queryKeys.sales(businessId, filters),
    queryFn: () => {
      const p = new URLSearchParams();
      if (filters?.status) p.set('status', filters.status);
      if (filters?.dateFrom) p.set('dateFrom', filters.dateFrom);
      if (filters?.dateTo) p.set('dateTo', filters.dateTo);
      if (filters?.page) p.set('page', String(filters.page));
      return api.get<ApiPage<ApiSaleRow>>(`/sales?${p}`).then(adaptSalesPage);
    },
    enabled: !!businessId,
  });
}

export interface SalesPage {
  items: Sale[];
  total: number;
}

interface ApiSaleRow {
  id: string;
  saleNumber: string;
  status: string;
  totalMinor: string | number;
  createdAt: string;
  completedAt?: string | null;
  receipt?: { receiptNumber?: string } | null;
  branch?: { name?: string } | null;
  customer?: { name?: string } | null;
  payments?: { method?: string }[];
  items?: unknown[];
}

function adaptSalesPage(raw: ApiPage<ApiSaleRow>): SalesPage {
  return {
    items: raw.data.map((row) => ({
      id: row.id,
      receiptNumber: row.receipt?.receiptNumber ?? row.saleNumber,
      status: row.status,
      totalMinor: num(row.totalMinor),
      branchName: row.branch?.name ?? '',
      ...(row.customer?.name && { customerName: row.customer.name }),
      createdAt: row.completedAt ?? row.createdAt,
      itemCount: row.items?.length ?? 0,
      ...(row.payments?.[0]?.method && { paymentMethod: row.payments[0].method }),
    })),
    total: raw.total,
  };
}

export interface Sale {
  id: string;
  receiptNumber: string;
  status: string;
  totalMinor: number;
  branchName: string;
  customerName?: string;
  createdAt: string;
  itemCount: number;
  paymentMethod?: string;
}

// ── Reports ───────────────────────────────────────────────────────────────────
export function useSalesReport(filters?: { dateFrom?: string; dateTo?: string; branchId?: string }) {
  const { businessId } = useBusinessContext();
  return useQuery({
    queryKey: queryKeys.salesReport(businessId, filters),
    queryFn: () => {
      const p = new URLSearchParams();
      if (filters?.dateFrom) p.set('dateFrom', filters.dateFrom);
      if (filters?.dateTo) p.set('dateTo', filters.dateTo);
      if (filters?.branchId) p.set('branchId', filters.branchId);
      return api.get<SalesReport>(`/reports/sales?${p}`);
    },
    enabled: !!businessId,
  });
}

export interface SalesReport {
  grossMinor: number;
  refundsMinor: number;
  netMinor: number;
  transactions: number;
  byBranch: { branchName: string; netMinor: number; transactions: number }[];
  byPaymentMethod: { method: string; total: number }[];
  byDay: { date: string; netMinor: number }[];
}

// ── Users ─────────────────────────────────────────────────────────────────────
export function useUsers() {
  const { businessId } = useBusinessContext();
  return useQuery({
    queryKey: queryKeys.users(businessId),
    queryFn: () => api.get<UserRecord[]>('/users'),
    enabled: !!businessId,
  });
}

export interface UserRecord {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  status: string;
  roles: { roleName: string; branchName: string }[];
  createdAt: string;
}

export function useRoles() {
  const { businessId } = useBusinessContext();
  return useQuery({
    queryKey: queryKeys.roles(businessId),
    queryFn: () => api.get<Role[]>('/roles'),
    enabled: !!businessId,
  });
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  permissions: string[];
  _count?: { userRoles: number };
}

export function useBranches() {
  const { businessId } = useBusinessContext();
  return useQuery({
    queryKey: queryKeys.branches(businessId),
    queryFn: () => api.get<BranchRecord[]>('/branches'),
    enabled: !!businessId,
  });
}

export interface BranchRecord {
  id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  isActive: boolean;
  isMain: boolean;
}

// ── Notifications ─────────────────────────────────────────────────────────────
export function useNotifications() {
  const { businessId, userName } = useBusinessContext();
  return useQuery({
    queryKey: queryKeys.notifications(userName, businessId),
    queryFn: () => api.get<Notification[]>('/notifications'),
    enabled: !!businessId,
    refetchInterval: 60_000,
  });
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  link?: string;
}

// ── Audit Logs ────────────────────────────────────────────────────────────────
export function useAuditLogs(filters?: { action?: string; actorId?: string; page?: number }) {
  const { businessId } = useBusinessContext();
  return useQuery({
    queryKey: queryKeys.auditLogs(businessId, filters),
    queryFn: () => {
      const p = new URLSearchParams();
      if (filters?.action) p.set('action', filters.action);
      if (filters?.actorId) p.set('actorUserId', filters.actorId);
      if (filters?.page) p.set('page', String(filters.page));
      return api.get<ApiPage<ApiAuditRow>>(`/audit-logs?${p}`).then(adaptAuditPage);
    },
    enabled: !!businessId,
  });
}

export interface AuditPage {
  items: AuditLog[];
  total: number;
}

interface ApiAuditRow {
  id: string;
  action: string;
  actorUserId?: string | null;
  targetType: string;
  targetId: string;
  createdAt: string;
  after?: Record<string, unknown> | null;
}

function adaptAuditPage(raw: ApiPage<ApiAuditRow>): AuditPage {
  return {
    items: raw.data.map((row) => ({
      id: row.id,
      action: row.action,
      actorName: row.actorUserId ?? '',
      targetType: row.targetType,
      targetId: row.targetId,
      createdAt: row.createdAt,
      ...(row.after && { metadata: row.after }),
    })),
    total: raw.total,
  };
}

export interface AuditLog {
  id: string;
  action: string;
  actorName: string;
  targetType: string;
  targetId: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

// ── Debts (customer credit) ───────────────────────────────────────────────────
export type DebtStatus = 'OPEN' | 'PARTIALLY_PAID' | 'SETTLED' | 'WRITTEN_OFF';

export interface DebtPayment {
  id: string;
  amountMinor: number;
  method: string;
  note: string | null;
  paidAt: string;
}

export interface Debt {
  id: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string | null;
  itemSummary: string | null;
  amountMinor: number;
  paidMinor: number;
  balanceMinor: number;
  currency: string;
  status: DebtStatus;
  dueAt: string | null;
  note: string | null;
  settledAt: string | null;
  createdAt: string;
  updatedAt: string;
  payments: DebtPayment[];
}

export interface DebtSummary {
  outstandingMinor: number;
  openCount: number;
  overdueCount: number;
  debtorCount: number;
  collectedThisMonthMinor: number;
  topDebtors: { name: string; phone: string | null; outstandingMinor: number }[];
}

export interface PersonDebt {
  key: string;
  customerId: string | null;
  name: string;
  phone: string | null;
  debtCount: number;
  outstandingMinor: number;
  totalMinor: number;
  lastPaymentAt: string | null;
  lastActivityAt: string;
  oldestDueAt: string | null;
  items: string[];
}

export interface DebtsPage {
  items: Debt[];
  total: number;
  outstandingMinor: number;
}

/** Debts that still owe money by default; pass `status: 'ALL'` to see settled ones too. */
export function useDebts(filters?: { status?: string; q?: string; customerId?: string; page?: number }) {
  const { businessId } = useBusinessContext();
  return useQuery({
    queryKey: queryKeys.debts(businessId, filters),
    queryFn: () => {
      const p = new URLSearchParams();
      if (filters?.status) p.set('status', filters.status);
      if (filters?.q) p.set('q', filters.q);
      if (filters?.customerId) p.set('customerId', filters.customerId);
      if (filters?.page) p.set('page', String(filters.page));
      return api.get<{ data: Debt[]; total: number; outstandingMinor: number }>(`/debts?${p}`)
        .then(raw => ({ items: raw.data, total: raw.total, outstandingMinor: raw.outstandingMinor }) as DebtsPage);
    },
    enabled: !!businessId,
  });
}

export function useDebtSummary() {
  const { businessId } = useBusinessContext();
  return useQuery({
    queryKey: queryKeys.debtSummary(businessId),
    queryFn: () => api.get<DebtSummary>('/debts/summary'),
    enabled: !!businessId,
  });
}

export function useDebtsByPerson(q?: string) {
  const { businessId } = useBusinessContext();
  return useQuery({
    queryKey: queryKeys.debtsByPerson(businessId, q),
    queryFn: () => {
      const p = new URLSearchParams();
      if (q) p.set('q', q);
      return api.get<{ data: PersonDebt[] }>(`/debts/by-person?${p}`).then(r => r.data);
    },
    enabled: !!businessId,
  });
}

/** Every debt mutation moves the summary and the dashboard totals, so they share one invalidator. */
function useDebtInvalidator() {
  const qc = useQueryClient();
  const { businessId, branchId } = useBusinessContext();
  return () => {
    void qc.invalidateQueries({ queryKey: ['debts', businessId] });
    void qc.invalidateQueries({ queryKey: ['debts-by-person', businessId] });
    void qc.invalidateQueries({ queryKey: queryKeys.debtSummary(businessId) });
    void qc.invalidateQueries({ queryKey: queryKeys.dashboard(businessId, branchId) });
  };
}

export interface CreateDebtPayload {
  customerName: string;
  customerPhone?: string;
  itemSummary?: string;
  amountMinor: number;
  dueAt?: string;
  note?: string;
}

export function useCreateDebt() {
  const invalidate = useDebtInvalidator();
  return useMutation({
    mutationFn: (payload: CreateDebtPayload) => api.post<Debt>('/debts', payload),
    onSuccess: invalidate,
  });
}

export function useRecordDebtPayment() {
  const invalidate = useDebtInvalidator();
  return useMutation({
    mutationFn: ({ debtId, ...payload }: {
      debtId: string; amountMinor: number; method: 'CASH' | 'MTN_MOMO' | 'AIRTEL_MONEY'; note?: string;
    }) => api.post<Debt>(`/debts/${debtId}/payments`, payload),
    onSuccess: invalidate,
  });
}

export function useWriteOffDebt() {
  const invalidate = useDebtInvalidator();
  return useMutation({
    mutationFn: ({ debtId, reason }: { debtId: string; reason?: string }) =>
      api.post<Debt>(`/debts/${debtId}/write-off`, { reason }),
    onSuccess: invalidate,
  });
}

export interface DemoSeedResult {
  ok: boolean;
  businessName?: string;
  businessType?: string;
  products?: number;
  sales?: number;
  revenueMinor?: number;
  lowStock?: number;
  debts?: number;
}

/**
 * Developer-only: asks the API to run `prisma/seed-demo-business.mjs` against the signed-in
 * business. The seeder picks its catalogue from the business type (a pharmacy gets medicines, a
 * repair shop gets services), so the same button produces sensible data in any demo tenant.
 *
 * Every screen derives from the server, so the whole cache is dropped afterwards rather than
 * trying to guess which keys changed.
 */
export function useLoadDemoData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<DemoSeedResult>('/dev/demo-data', {}),
    onSuccess: () => { void qc.invalidateQueries(); },
  });
}
