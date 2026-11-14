/**
 * TanStack Query keys — every key includes tenantId (businessId) and optional branchId
 * to ensure tenant isolation in the client cache.
 */

export const queryKeys = {
  // Auth
  me: () => ['me'] as const,

  // Dashboard
  dashboard: (businessId: string, branchId?: string) => ['dashboard', businessId, branchId] as const,

  // Catalogue
  products: (businessId: string, filters?: object) => ['products', businessId, filters] as const,
  product: (businessId: string, id: string) => ['product', businessId, id] as const,
  categories: (businessId: string) => ['categories', businessId] as const,
  brands: (businessId: string) => ['brands', businessId] as const,

  // Inventory
  balances: (businessId: string, branchId?: string, filters?: object) => ['balances', businessId, branchId, filters] as const,
  movements: (businessId: string, filters?: object) => ['movements', businessId, filters] as const,
  batches: (businessId: string, filters?: object) => ['batches', businessId, filters] as const,
  lowStock: (businessId: string, branchId?: string) => ['low-stock', businessId, branchId] as const,
  adjustments: (businessId: string, filters?: object) => ['adjustments', businessId, filters] as const,
  counts: (businessId: string, branchId?: string) => ['counts', businessId, branchId] as const,

  // Transfers
  transfers: (businessId: string, filters?: object) => ['transfers', businessId, filters] as const,
  transfer: (businessId: string, id: string) => ['transfer', businessId, id] as const,

  // Purchasing
  suppliers: (businessId: string, q?: string) => ['suppliers', businessId, q] as const,
  purchaseOrders: (businessId: string, filters?: object) => ['purchase-orders', businessId, filters] as const,
  purchaseOrder: (businessId: string, id: string) => ['purchase-order', businessId, id] as const,
  goodsReceipts: (businessId: string, poId?: string) => ['goods-receipts', businessId, poId] as const,

  // Sales
  sales: (businessId: string, filters?: object) => ['sales', businessId, filters] as const,
  sale: (businessId: string, id: string) => ['sale', businessId, id] as const,

  // Payments
  payments: (businessId: string, filters?: object) => ['payments', businessId, filters] as const,

  // Debts (customer credit)
  debts: (businessId: string, filters?: object) => ['debts', businessId, filters] as const,
  debtSummary: (businessId: string) => ['debts-summary', businessId] as const,
  debtsByPerson: (businessId: string, q?: string) => ['debts-by-person', businessId, q] as const,

  // Reports
  salesReport: (businessId: string, filters?: object) => ['report-sales', businessId, filters] as const,
  stockReport: (businessId: string, branchId?: string) => ['report-stock', businessId, branchId] as const,
  purchasingReport: (businessId: string, filters?: object) => ['report-purchasing', businessId, filters] as const,

  // Users & RBAC
  users: (businessId: string) => ['users', businessId] as const,
  roles: (businessId: string) => ['roles', businessId] as const,
  permissions: () => ['permissions'] as const,
  invitations: (businessId: string) => ['invitations', businessId] as const,

  // Branches
  branches: (businessId: string) => ['branches', businessId] as const,

  // Notifications
  notifications: (userId: string, businessId: string) => ['notifications', userId, businessId] as const,
  unreadCount: (userId: string, businessId: string) => ['unread-count', userId, businessId] as const,

  // Audit
  auditLogs: (businessId: string, filters?: object) => ['audit-logs', businessId, filters] as const,
} as const;
