// SokoOS shared constants

export const BUSINESS_TYPES = [
  { code: 'RETAIL',         label: 'Shop / Supermarket',         icon: '🛒', description: 'Groceries, hardware, electronics, fashion, spare parts' },
  { code: 'PHARMACY',       label: 'Pharmacy',                   icon: '💊', description: 'Retail or wholesale pharmacy, vet drugs, optical' },
  { code: 'RESTAURANT',     label: 'Restaurant / Café',           icon: '🍽️', description: 'Restaurants, fast food, bakeries, catering, juice bars' },
  { code: 'WHOLESALE',      label: 'Wholesale / Distribution',   icon: '🏭', description: 'FMCG, importers, cash-and-carry, regional distributors' },
  { code: 'MANUFACTURING',  label: 'Manufacturing',              icon: '⚙️', description: 'Soap, furniture, food processing, metal, packaging' },
  { code: 'AGRICULTURE',    label: 'Farm / Agriculture',         icon: '🌾', description: 'Poultry, dairy, crops, cooperatives, agro-dealers' },
  { code: 'HOSPITALITY',    label: 'Hotel / Lodge',              icon: '🏨', description: 'Hotels, guest houses, hostels, lodges, resorts' },
  { code: 'AUTOMOTIVE',     label: 'Garage / Automotive',        icon: '🔧', description: 'Garages, tyre shops, boda repairs, spare parts' },
  { code: 'CONSTRUCTION',   label: 'Construction',               icon: '🏗️', description: 'Contractors, plumbers, electricians, builders' },
  { code: 'BEAUTY',         label: 'Salon / Beauty',             icon: '💇', description: 'Salons, barbers, spas, nail studios, laundry' },
  { code: 'EDUCATION',      label: 'School / Training',          icon: '🎓', description: 'Private schools, vocational and training centres' },
  { code: 'SERVICES',       label: 'Services / Projects',        icon: '🛠️', description: 'Agencies, IT, cleaning, security, couriers, labs' },
  { code: 'FUEL_STATION',   label: 'Fuel Station',              icon: '⛽', description: 'Petrol stations, diesel, lubricants' },
  { code: 'LOGISTICS',      label: 'Logistics / Courier',        icon: '🚚', description: 'Couriers, boda delivery, logistics companies' },
  { code: 'LAUNDRY',        label: 'Laundry / Dry Cleaning',    icon: '👕', description: 'Laundry businesses, dry cleaners' },
  { code: 'LABORATORY',     label: 'Medical Laboratory',         icon: '🔬', description: 'Diagnostic centres, medical labs' },
  { code: 'REAL_ESTATE',    label: 'Property / Real Estate',    icon: '🏠', description: 'Property management, rentals, real estate' },
  { code: 'ELECTRONICS_REPAIR', label: 'Electronics Repair',      icon: '🔌', description: 'Phone, laptop, TV and appliance repair shops' },
  { code: 'OTHER',          label: 'Other Business',             icon: '🏢', description: 'Any other business type' },
] as const;

export const BUSINESS_SIZES = [
  { code: 'MICRO',       label: 'Just me',       workers: '1 person',       description: 'Free basic operations', price: 'Free' },
  { code: 'SMALL',       label: 'Small',         workers: '2–5 workers',    description: 'More users, purchasing, reports', price: 'UGX 25,000/mo' },
  { code: 'GROWING',     label: 'Growing',       workers: '6–15 workers',   description: 'Approvals, multiple cashiers, advanced reports', price: 'UGX 75,000/mo' },
  { code: 'ESTABLISHED', label: 'Established',   workers: '16–50 workers',  description: 'Branches, automation, advanced inventory', price: 'UGX 200,000/mo' },
  { code: 'ENTERPRISE',  label: 'Enterprise',    workers: '50+ workers',    description: 'Custom workflows, integrations, dedicated support', price: 'Custom' },
] as const;

export const TRANSFER_STATUSES = ['REQUESTED', 'APPROVED', 'REJECTED', 'DISPATCHED', 'RECEIVED', 'CLOSED'] as const;
export const PO_STATUSES = ['DRAFT', 'SUBMITTED', 'CONFIRMED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CLOSED', 'CANCELLED'] as const;
export const SALE_STATUSES = ['COMPLETED', 'PARTIALLY_REFUNDED', 'REFUNDED', 'RETURNED'] as const;
export const PAYMENT_STATUSES = ['PENDING', 'SUCCEEDED', 'FAILED', 'EXPIRED'] as const;
export const BATCH_STATUSES = ['ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'WRITTEN_OFF'] as const;

export const PERMISSIONS = {
  // Admin
  ADMIN_ALL: 'admin.*',
  // Sales
  SALES_CREATE: 'sales.create',
  SALES_REFUND: 'sales.refund',
  SALES_DISCOUNT: 'sales.discount',
  SALES_VIEW: 'sales.view',
  // Inventory
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_ADJUST: 'inventory.adjust',
  INVENTORY_COUNT: 'inventory.count',
  // Transfers
  TRANSFER_REQUEST: 'transfer.request',
  TRANSFER_APPROVE: 'transfer.approve',
  TRANSFER_DISPATCH: 'transfer.dispatch',
  TRANSFER_RECEIVE: 'transfer.receive',
  // Purchasing
  PO_CREATE: 'po.create',
  PO_SUBMIT: 'po.submit',
  PO_CONFIRM: 'po.confirm',
  PO_RECEIVE: 'po.receive',
  // Catalogue
  CATALOGUE_MANAGE: 'catalogue.manage',
  // Finance
  FINANCE_VIEW: 'finance.view',
  FINANCE_CLOSE: 'finance.close',
  // Reports
  REPORTS_VIEW: 'reports.view',
  // Users
  USERS_MANAGE: 'users.manage',
  USERS_INVITE: 'users.invite',
} as const;

export const ROLE_DEFAULTS = {
  BUSINESS_ADMIN: Object.values(PERMISSIONS),
  BRANCH_MANAGER: [
    PERMISSIONS.SALES_CREATE, PERMISSIONS.SALES_REFUND, PERMISSIONS.SALES_DISCOUNT,
    PERMISSIONS.SALES_VIEW, PERMISSIONS.INVENTORY_VIEW, PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.INVENTORY_COUNT, PERMISSIONS.TRANSFER_REQUEST, PERMISSIONS.TRANSFER_APPROVE,
    PERMISSIONS.TRANSFER_DISPATCH, PERMISSIONS.TRANSFER_RECEIVE, PERMISSIONS.PO_CREATE,
    PERMISSIONS.PO_SUBMIT, PERMISSIONS.PO_CONFIRM, PERMISSIONS.PO_RECEIVE,
    PERMISSIONS.FINANCE_VIEW, PERMISSIONS.FINANCE_CLOSE, PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.USERS_INVITE,
  ],
  CASHIER: [
    PERMISSIONS.SALES_CREATE, PERMISSIONS.SALES_VIEW, PERMISSIONS.INVENTORY_VIEW,
  ],
  INVENTORY_CLERK: [
    PERMISSIONS.INVENTORY_VIEW, PERMISSIONS.INVENTORY_ADJUST, PERMISSIONS.INVENTORY_COUNT,
    PERMISSIONS.TRANSFER_REQUEST, PERMISSIONS.TRANSFER_RECEIVE, PERMISSIONS.PO_RECEIVE,
  ],
} as const;
