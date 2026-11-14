// SokoOS mock data — realistic Ugandan business data

export const MOCK_USER = {
  id: 'usr_001',
  fullName: 'Grace Nakato',
  email: 'grace@nakatotraders.ug',
  phone: '+256 772 100 201',
  role: 'BUSINESS_ADMIN',
  mfaEnabled: true,
  activeBusiness: {
    id: 'biz_001',
    name: 'Nakato Traders',
    slug: 'nakato-traders',
    businessType: 'RETAIL',
    activeBranch: { id: 'br_001', name: 'Kampala Road', code: 'KLA-01' },
  },
};

export const MOCK_BRANCHES = [
  { id: 'br_001', name: 'Kampala Road', code: 'KLA-01', isWarehouse: false, status: 'ACTIVE' },
  { id: 'br_002', name: 'Ntinda', code: 'NTD-01', isWarehouse: false, status: 'ACTIVE' },
  { id: 'br_003', name: 'Jinja', code: 'JIN-01', isWarehouse: false, status: 'ACTIVE' },
  { id: 'br_004', name: 'Mbarara Store', code: 'MBR-01', isWarehouse: true, status: 'ACTIVE' },
];

export const MOCK_DASHBOARD = {
  salesTotal: 4_820_500,
  salesChange: '+12%',
  transactions: 126,
  avgBasket: 38_260,
  lowStockCount: 14,
  outOfStockCount: 3,
  approvalsCount: 5,
  pendingTransfers: 2,
  pendingPOs: 3,
  cashSessionOpen: true,
  cashSessionSince: '08:02',
  cashSessionUser: 'Grace',
  salesByHour: [
    { hour: '08', amount: 120 }, { hour: '09', amount: 210 }, { hour: '10', amount: 340 },
    { hour: '11', amount: 280 }, { hour: '12', amount: 390 }, { hour: '13', amount: 460 },
    { hour: '14', amount: 300 }, { hour: '15', amount: 260 }, { hour: '16', amount: 410 },
    { hour: '17', amount: 520 }, { hour: '18', amount: 610 }, { hour: '19', amount: 380 },
  ],
  paymentMethods: [
    { method: 'Cash', amount: 2_220_000, percent: 46 },
    { method: 'MTN MoMo', amount: 1_490_000, percent: 31 },
    { method: 'Airtel Money', amount: 1_110_000, percent: 23 },
  ],
  topSellers: [
    { product: 'Sugar 1 kg', sku: 'SUG-1KG', qty: 84, revenue: 378_000, onHand: 212 },
    { product: 'Rice Super 5 kg', sku: 'RICE-5KG', qty: 31, revenue: 620_000, onHand: 18, lowStock: true },
    { product: 'Maize flour 2 kg', sku: 'POSHO-2KG', qty: 57, revenue: 342_000, onHand: 140 },
    { product: 'Cooking oil 3 L', sku: 'OIL-3L', qty: 22, revenue: 506_000, onHand: 0, outOfStock: true },
    { product: 'Bar soap 800 g', sku: 'SOAP-800', qty: 40, revenue: 200_000, onHand: 96 },
  ],
  needsDecision: [
    { type: 'Transfer', ref: 'TR-0192', title: 'Mbarara Store → Kampala Rd', detail: '12 lines · requested by Okello', path: '/transfers/tr_192' },
    { type: 'PO', ref: 'PO-0418', title: 'Lake Basin Sugar Distributors', detail: 'UGX 9,450,000 · submitted', path: '/purchasing/po_418' },
    { type: 'Count', ref: 'Stock count', title: 'Ntinda · aisle 3', detail: '−6 units variance to apply', path: '/inventory/counts/cnt_03' },
    { type: 'Close', ref: 'Close Monday 9 Nov', title: 'Cash counted, UGX 4,000 short', detail: '', path: '/finance/day-closure' },
  ],
};

export const MOCK_PRODUCTS = [
  {
    id: 'prod_001', name: 'Sugar', sku: 'SUG', category: 'Groceries', brand: 'Kakira',
    variants: [
      { id: 'var_001', name: '1 kg', sku: 'SUG-1KG', barcode: '0000000011011', price: 4_500, cost: 3_900, stock: 212, reorderAt: 60 },
      { id: 'var_002', name: '2 kg', sku: 'SUG-2KG', barcode: '0000000011012', price: 8_800, cost: 7_600, stock: 88, reorderAt: 30 },
    ],
    isActive: true,
  },
  {
    id: 'prod_002', name: 'Rice Super', sku: 'RICE', category: 'Groceries', brand: 'Local mills',
    variants: [
      { id: 'var_003', name: '5 kg', sku: 'RICE-5KG', barcode: '6009800512345', price: 20_000, cost: 17_500, stock: 18, reorderAt: 25, lowStock: true },
      { id: 'var_004', name: '10 kg', sku: 'RICE-10KG', barcode: '6009800512352', price: 39_000, cost: 34_000, stock: 42, reorderAt: 15 },
      { id: 'var_005', name: '25 kg', sku: 'RICE-25KG', barcode: '6009800512369', price: 95_000, cost: 84_000, stock: 12, reorderAt: 5 },
    ],
    isActive: true,
  },
  {
    id: 'prod_003', name: 'Maize flour', sku: 'POSHO', category: 'Groceries', brand: 'Mwea',
    variants: [
      { id: 'var_006', name: '2 kg', sku: 'POSHO-2KG', barcode: '6001070100012', price: 6_000, cost: 4_800, stock: 140, reorderAt: 50 },
      { id: 'var_007', name: '5 kg', sku: 'POSHO-5KG', barcode: '6001070100029', price: 14_000, cost: 11_200, stock: 85, reorderAt: 30 },
    ],
    isActive: true,
  },
  {
    id: 'prod_004', name: 'Cooking oil', sku: 'OIL', category: 'Groceries', brand: 'Bidco',
    variants: [
      { id: 'var_008', name: '3 L', sku: 'OIL-3L', barcode: '6009801703003', price: 23_000, cost: 18_500, stock: 0, reorderAt: 20, outOfStock: true },
      { id: 'var_009', name: '5 L', sku: 'OIL-5L', barcode: '6009801705005', price: 37_500, cost: 30_000, stock: 28, reorderAt: 15 },
    ],
    isActive: true,
  },
  {
    id: 'prod_005', name: 'Bar soap', sku: 'SOAP', category: 'Household', brand: 'Mukwano',
    variants: [
      { id: 'var_010', name: '800 g', sku: 'SOAP-800', barcode: '6009801710800', price: 5_000, cost: 4_000, stock: 96, reorderAt: 30 },
    ],
    isActive: true,
  },
  {
    id: 'prod_006', name: 'Black tea leaves', sku: 'TEA', category: 'Beverages', brand: 'Kericho Gold',
    variants: [
      { id: 'var_011', name: '250 g', sku: 'TEA-250G', barcode: '6001069000012', price: 3_500, cost: 2_800, stock: 64, reorderAt: 40 },
      { id: 'var_012', name: '500 g', sku: 'TEA-500G', barcode: '6001069000029', price: 6_500, cost: 5_200, stock: 38, reorderAt: 20 },
    ],
    isActive: true,
  },
  {
    id: 'prod_007', name: 'UHT milk', sku: 'MILK', category: 'Beverages', brand: 'Brookside',
    variants: [
      { id: 'var_013', name: '500 ml', sku: 'MILK-500', barcode: '5000000500123', price: 2_500, cost: 1_950, stock: 120, reorderAt: 48, batchTracked: true },
    ],
    isActive: true,
  },
  {
    id: 'prod_008', name: 'Salt', sku: 'SALT', category: 'Groceries', brand: 'Kensalt',
    variants: [
      { id: 'var_014', name: '500 g', sku: 'SALT-500G', barcode: '6001100500001', price: 1_000, cost: 750, stock: 310, reorderAt: 100 },
    ],
    isActive: true,
  },
  {
    id: 'prod_009', name: 'Soda', sku: 'SODA', category: 'Beverages', brand: 'Coca-Cola',
    variants: [
      { id: 'var_015', name: '500 ml × 24', sku: 'SODA-24', barcode: '5449000131805', price: 28_000, cost: 24_000, stock: 33, reorderAt: 10 },
    ],
    isActive: true,
  },
  {
    id: 'prod_010', name: 'Beans (Nambale)', sku: 'BEANS', category: 'Groceries', brand: 'Local',
    variants: [
      { id: 'var_016', name: '1 kg', sku: 'BEANS-1KG', barcode: '0000000031011', price: 5_500, cost: 4_200, stock: 88, reorderAt: 40 },
    ],
    isActive: true,
  },
];

export const MOCK_INVENTORY = [
  { id: 'inv_001', product: 'Sugar 1 kg', sku: 'SUG-1KG', batch: 'B-2410-07', expiry: null, branch: 'Kampala Road', qty: 212, reorderAt: 60, value: 826_800, status: 'ok' },
  { id: 'inv_002', product: 'Rice Super 5 kg', sku: 'RICE-5KG', batch: 'B-2411-02', expiry: null, branch: 'Kampala Road', qty: 18, reorderAt: 25, value: 315_000, status: 'low' },
  { id: 'inv_003', product: 'Cooking oil 3 L', sku: 'OIL-3L', batch: null, expiry: null, branch: 'Kampala Road', qty: 0, reorderAt: 20, value: 0, status: 'out' },
  { id: 'inv_004', product: 'UHT milk 500 ml', sku: 'MILK-500', batch: 'B-2410-19', expiry: '2026-11-28', branch: 'Ntinda', qty: 120, reorderAt: 48, value: 240_000, status: 'expiring' },
  { id: 'inv_005', product: 'Maize flour 2 kg', sku: 'POSHO-2KG', batch: 'B-2411-05', expiry: null, branch: 'Mbarara Store', qty: 1_460, reorderAt: 300, value: 6_570_000, status: 'ok' },
  { id: 'inv_006', product: 'Bar soap 800 g', sku: 'SOAP-800', batch: 'B-2409-11', expiry: null, branch: 'Jinja', qty: -6, reorderAt: 30, value: -24_000, status: 'negative' },
  { id: 'inv_007', product: 'Soda 500 ml × 24', sku: 'SODA-24', batch: 'B-2411-01', expiry: '2027-05-02', branch: 'Kampala Road', qty: 33, reorderAt: 10, value: 792_000, status: 'ok' },
  { id: 'inv_008', product: 'Beans 1 kg', sku: 'BEANS-1KG', batch: 'B-2410-22', expiry: null, branch: 'Ntinda', qty: 88, reorderAt: 40, value: 396_000, status: 'ok' },
];

export const MOCK_SALES = [
  {
    id: 'sale_001', saleNumber: 'KR-000482', date: '2026-11-10T18:41:00', branch: 'Kampala Road',
    cashier: 'Aisha Namubiru', total: 86_500, paymentMethod: 'MTN_MOMO', status: 'COMPLETED',
    items: [
      { product: 'Sugar 1 kg', qty: 10, price: 4_500, subtotal: 45_000 },
      { product: 'Cooking oil 3 L', qty: 1, price: 23_000, subtotal: 23_000 },
      { product: 'Black tea 250 g', qty: 1, price: 3_500, subtotal: 3_500 },
      { product: 'Salt 500 g', qty: 3, price: 1_000, subtotal: 3_000 },
    ],
  },
  {
    id: 'sale_002', saleNumber: 'KR-000481', date: '2026-11-10T18:37:00', branch: 'Kampala Road',
    cashier: 'Aisha Namubiru', total: 12_000, paymentMethod: 'AIRTEL_MONEY', status: 'COMPLETED',
    items: [{ product: 'Rice Super 5 kg', qty: 1, price: 20_000, subtotal: 20_000 }],
  },
  {
    id: 'sale_003', saleNumber: 'KR-000480', date: '2026-11-10T18:22:00', branch: 'Kampala Road',
    cashier: 'Aisha Namubiru', total: 230_000, paymentMethod: 'CASH', status: 'PARTIALLY_REFUNDED',
    items: [{ product: 'Maize flour 2 kg', qty: 25, price: 6_000, subtotal: 150_000 }],
  },
  {
    id: 'sale_004', saleNumber: 'NTD-000204', date: '2026-11-10T17:55:00', branch: 'Ntinda',
    cashier: 'Moses Kato', total: 54_500, paymentMethod: 'CASH', status: 'COMPLETED',
    items: [{ product: 'Bar soap 800 g', qty: 10, price: 5_000, subtotal: 50_000 }],
  },
];

export const MOCK_TRANSFERS = [
  {
    id: 'tr_192', transferNumber: 'TR-0192', from: 'Mbarara Store', to: 'Kampala Road',
    requestedBy: 'Okello Peter', date: '2026-11-10', items: 5, status: 'REQUESTED',
    lines: [
      { product: 'Rice Super 5 kg', batch: 'B-2411-02', requested: 60, available: 240, ok: true },
      { product: 'Cooking oil 3 L', batch: 'B-2410-30', requested: 40, available: 72, ok: true },
      { product: 'Maize flour 2 kg', batch: 'B-2411-05', requested: 120, available: 1460, ok: true },
      { product: 'Sugar 1 kg', batch: 'B-2410-07', requested: 300, available: 180, short: 120 },
      { product: 'Bar soap 800 g', batch: 'B-2409-11', requested: 48, available: 310, ok: true },
    ],
  },
  {
    id: 'tr_190', transferNumber: 'TR-0190', from: 'Mbarara Store', to: 'Ntinda',
    requestedBy: 'Moses Kato', date: '2026-11-09', items: 3, status: 'DISPATCHED',
    lines: [],
  },
  {
    id: 'tr_188', transferNumber: 'TR-0188', from: 'Mbarara Store', to: 'Jinja',
    requestedBy: 'Sarah Atim', date: '2026-11-08', items: 6, status: 'CLOSED',
    lines: [],
  },
];

export const MOCK_PURCHASE_ORDERS = [
  {
    id: 'po_418', poNumber: 'PO-0418', supplier: 'Lake Basin Sugar Distributors',
    branch: 'Mbarara Store', date: '2026-11-07', expectedDate: '2026-11-13',
    total: 9_450_000, status: 'PARTIALLY_RECEIVED', receivedPercent: 62,
    items: [
      { product: 'Sugar 1 kg (bale of 20)', ordered: 1000, received: 1000, outstanding: 0, unitCost: 3_900, lineTotal: 3_900_000, progress: 100 },
      { product: 'Sugar 2 kg', ordered: 600, received: 240, outstanding: 360, unitCost: 7_750, lineTotal: 4_650_000, progress: 40 },
      { product: 'Brown sugar 1 kg', ordered: 200, received: 0, outstanding: 200, unitCost: 4_500, lineTotal: 900_000, progress: 0 },
    ],
    receipts: [
      { number: 'GRN-0233', date: '2026-11-06', receivedBy: 'Okello P.', lines: 2 },
      { number: 'GRN-0219', date: '2026-11-02', receivedBy: 'Okello P.', lines: 1 },
    ],
    history: [
      { status: 'Partially received', date: '06 Nov', actor: 'Okello P.' },
      { status: 'Confirmed', date: '31 Oct', actor: 'Grace N.' },
      { status: 'Submitted', date: '30 Oct', actor: 'Grace N.' },
      { status: 'Draft', date: '30 Oct', actor: 'Grace N.' },
    ],
  },
  {
    id: 'po_415', poNumber: 'PO-0415', supplier: 'Bidco Uganda Ltd',
    branch: 'Kampala Road', date: '2026-11-05', expectedDate: '2026-11-10',
    total: 2_450_000, status: 'CONFIRMED', receivedPercent: 0,
    items: [], receipts: [], history: [],
  },
  {
    id: 'po_410', poNumber: 'PO-0410', supplier: 'Kericho Gold Tea',
    branch: 'Kampala Road', date: '2026-11-01', expectedDate: '2026-11-08',
    total: 840_000, status: 'RECEIVED', receivedPercent: 100,
    items: [], receipts: [], history: [],
  },
  {
    id: 'po_405', poNumber: 'PO-0405', supplier: 'Mukwano Industries',
    branch: 'Mbarara Store', date: '2026-10-28', expectedDate: '2026-11-02',
    total: 5_200_000, status: 'CLOSED', receivedPercent: 100,
    items: [], receipts: [], history: [],
  },
];

export const MOCK_SUPPLIERS = [
  { id: 'sup_001', name: 'Lake Basin Sugar Distributors', contact: 'James Opio', phone: '+256 772 000 418', email: 'orders@lakebasin.co.ug', paymentTerms: 'Net 30', tin: '1001234567' },
  { id: 'sup_002', name: 'Bidco Uganda Ltd', contact: 'Mary Nambi', phone: '+256 414 505 050', email: 'trade@bidco.co.ug', paymentTerms: 'Cash on delivery', tin: '1009876543' },
  { id: 'sup_003', name: 'Kericho Gold Tea', contact: 'Peter Ssekito', phone: '+256 414 789 012', email: 'uganda@kerichoGold.com', paymentTerms: 'Net 14', tin: null },
  { id: 'sup_004', name: 'Mukwano Industries', contact: 'Agnes Nantongo', phone: '+256 414 441 000', email: 'sales@mukwano.com', paymentTerms: 'Net 7', tin: '1004567890' },
  { id: 'sup_005', name: 'Equator Beverages', contact: 'John Byarugaba', phone: '+256 756 220 913', email: 'orders@equatorbev.ug', paymentTerms: 'Cash on delivery', tin: null },
];

export const MOCK_USERS = [
  { id: 'usr_001', name: 'Grace Nakato', phone: '+256 772 100 201', email: 'grace@nakatotraders.ug', role: 'Business Admin', branches: 'All branches', mfa: 'On', status: 'Active', lastActive: 'Now' },
  { id: 'usr_002', name: 'Okello Peter', phone: '+256 701 334 118', email: null, role: 'Inventory Clerk', branches: 'Mbarara Store', mfa: 'Off', status: 'Active', lastActive: '12 min ago' },
  { id: 'usr_003', name: 'Aisha Namubiru', phone: '+256 783 552 040', email: null, role: 'Cashier', branches: 'Kampala Road', mfa: 'Off', status: 'Active', lastActive: '2 min ago' },
  { id: 'usr_004', name: 'Moses Kato', phone: '+256 756 220 913', email: null, role: 'Branch Manager', branches: 'Ntinda, Jinja', mfa: 'On', status: 'Active', lastActive: '1 h ago' },
  { id: 'usr_005', name: 'Sarah Atim', phone: '+256 712 908 377', email: null, role: 'Cashier', branches: 'Jinja', mfa: 'Off', status: 'Locked · 11 min', lastActive: 'Yesterday' },
  { id: 'usr_006', name: 'Brian Wasswa', email: 'brian.w@nakatotraders.ug', phone: null, role: 'Branch Manager', branches: 'Kampala Road', mfa: 'Setup needed', status: 'Invited', lastActive: 'Invite expires in 5 days' },
];

export const MOCK_DAY_CLOSURE = {
  date: 'Monday, 9 November',
  branch: 'Kampala Road',
  till: 'Till 1',
  status: 'Counting',
  expected: 4_504_000,
  openingFloat: 200_000,
  cashSales96: 4_358_000,
  cashRefunds2: -54_000,
  denominations: [
    { value: 50_000, count: 62, amount: 3_100_000 },
    { value: 20_000, count: 41, amount: 820_000 },
    { value: 10_000, count: 38, amount: 380_000 },
    { value: 5_000, count: 27, amount: 135_000 },
    { value: 2_000, count: 19, amount: 38_000 },
    { value: 1_000, count: 22, amount: 22_000 },
    { value: 500, count: 10, amount: 5_000 },
    { value: 200, count: 0, amount: 0 },
  ],
  counted: 4_500_000,
  discrepancy: -4_000,
  mtnMomoReconciled: true,
  airtelMoneyReconciled: true,
  orphanedPayments: 0,
};

export const MOCK_SALES_REPORT = {
  period: '28 Oct – 10 Nov 2026',
  grossSales: 64_200_000,
  refunds: 900_000,
  netSales: 63_300_000,
  transactions: 1_712,
  avgBasket: 37_500,
  salesByDay: [
    { date: '28', amount: 3.9 }, { date: '29', amount: 4.2 }, { date: '30', amount: 4.0 },
    { date: '31', amount: 6.8 }, { date: '01', amount: 2.1 }, { date: '02', amount: 4.6 },
    { date: '03', amount: 4.1 }, { date: '04', amount: 4.4 }, { date: '05', amount: 4.3 },
    { date: '06', amount: 4.7 }, { date: '07', amount: 7.3 }, { date: '08', amount: 2.4 },
    { date: '09', amount: 5.7 }, { date: '10', amount: 4.8 },
  ],
  byBranch: [
    { branch: 'Kampala Road', net: 28_140_000, receipts: 742, refunds: 6 },
    { branch: 'Ntinda', net: 17_920_000, receipts: 488, refunds: 5 },
    { branch: 'Jinja', net: 12_060_000, receipts: 331, refunds: 4 },
    { branch: 'Mbarara Store', net: 5_180_000, receipts: 151, refunds: 2 },
  ],
  byCategory: [
    { category: 'Groceries', amount: 31_600_000 },
    { category: 'Beverages', amount: 13_300_000 },
    { category: 'Household', amount: 9_800_000 },
    { category: 'Personal care', amount: 5_700_000 },
    { category: 'Baby', amount: 2_900_000 },
  ],
};

export const formatUGX = (n: number, short = false): string => {
  if (short) {
    if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
    if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  }
  const neg = n < 0;
  const formatted = Math.abs(n).toLocaleString('en-UG');
  return `${neg ? '−' : ''}UGX ${formatted}`;
};
