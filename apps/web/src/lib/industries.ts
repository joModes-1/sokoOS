// SokoOS industry configuration — 60+ business types across 18 categories

export interface NavItem {
  label: string;
  icon: string;
  path: string;
  badge?: string;
}

export interface IndustryConfig {
  code: string;
  label: string;
  icon: string;
  description: string;
  dashboardTitle: string;
  nav: NavItem[];
  dashboardWidgets: string[];
  features: string[];
  primaryAction: { label: string; path: string };
}

const INDUSTRIES: Record<string, IndustryConfig> = {

  // ── 1. RETAIL ─────────────────────────────────────────────────────────────
  RETAIL: {
    code: 'RETAIL', label: 'Shop / Supermarket', icon: '🛒',
    description: 'Groceries, hardware, electronics, fashion, spare parts',
    dashboardTitle: 'Store overview',
    primaryAction: { label: 'New sale', path: '/pos' },
    nav: [
      { label: 'Dashboard', icon: 'grid', path: '/dashboard' },
      { label: 'Point of sale', icon: 'monitor', path: '/pos' },
      { label: 'Sales', icon: 'receipt', path: '/sales' },
      { label: 'Inventory', icon: 'cube', path: '/inventory' },
      { label: 'Purchasing', icon: 'truck', path: '/purchasing' },
      { label: 'Catalogue', icon: 'tag', path: '/catalogue' },
      { label: 'Finance', icon: 'banknotes', path: '/finance' },
      { label: 'Reports', icon: 'chart', path: '/reports' },
      { label: 'Users', icon: 'users', path: '/users' },
      { label: 'Settings', icon: 'settings', path: '/settings' },
    ],
    dashboardWidgets: ['sales_today', 'transactions', 'low_stock', 'approvals', 'sales_chart', 'top_sellers', 'payment_methods'],
    features: ['pos', 'barcode', 'inventory', 'batches', 'transfers', 'purchasing', 'reports', 'day_closure'],
  },

  // ── 2. PHARMACY ───────────────────────────────────────────────────────────
  PHARMACY: {
    code: 'PHARMACY', label: 'Pharmacy', icon: '💊',
    description: 'Retail or wholesale pharmacy, vet drugs, optical',
    dashboardTitle: 'Pharmacy overview',
    primaryAction: { label: 'New sale', path: '/pos' },
    nav: [
      { label: 'Dashboard', icon: 'grid', path: '/dashboard' },
      { label: 'Dispense & sell', icon: 'monitor', path: '/pos' },
      { label: 'Stock & batches', icon: 'cube', path: '/inventory' },
      { label: 'Expiry watch', icon: 'clock', path: '/inventory/expired' },
      { label: 'Purchasing', icon: 'truck', path: '/purchasing' },
      { label: 'Catalogue', icon: 'tag', path: '/catalogue' },
      { label: 'Reports', icon: 'chart', path: '/reports' },
      { label: 'Settings', icon: 'settings', path: '/settings' },
    ],
    dashboardWidgets: ['sales_today', 'expiring_batches', 'blocked_from_sale', 'essentials_low', 'expiry_horizon', 'expiring_soonest', 'deliveries_due'],
    features: ['pos', 'batch_tracking', 'expiry_management', 'purchasing', 'reports'],
  },

  // ── 3. RESTAURANT ─────────────────────────────────────────────────────────
  RESTAURANT: {
    code: 'RESTAURANT', label: 'Restaurant / Café', icon: '🍽️',
    description: 'Restaurants, fast food, bakeries, catering, juice bars',
    dashboardTitle: 'Restaurant overview',
    primaryAction: { label: 'Seat walk-in', path: '/floor' },
    nav: [
      { label: 'Dashboard', icon: 'grid', path: '/dashboard' },
      { label: 'Floor', icon: 'table', path: '/floor' },
      { label: 'Kitchen tickets', icon: 'fire', path: '/kitchen' },
      { label: 'Menu', icon: 'book', path: '/catalogue' },
      { label: 'Recipes & costing', icon: 'calculator', path: '/recipes' },
      { label: 'Ingredients', icon: 'cube', path: '/inventory' },
      { label: 'Reservations', icon: 'calendar', path: '/reservations' },
      { label: 'Reports', icon: 'chart', path: '/reports' },
      { label: 'Settings', icon: 'settings', path: '/settings' },
    ],
    dashboardWidgets: ['covers', 'open_bills', 'avg_ticket', 'floor_status', 'kitchen_queue', 'revenue_today'],
    features: ['floor_management', 'kitchen_tickets', 'recipes', 'reservations', 'table_billing'],
  },

  // ── 4. WHOLESALE ──────────────────────────────────────────────────────────
  WHOLESALE: {
    code: 'WHOLESALE', label: 'Wholesale / Distribution', icon: '🏭',
    description: 'FMCG, importers, cash-and-carry, regional distributors',
    dashboardTitle: 'Distribution overview',
    primaryAction: { label: 'New bulk sale', path: '/sales/new' },
    nav: [
      { label: 'Dashboard', icon: 'grid', path: '/dashboard' },
      { label: 'Bulk sales', icon: 'receipt', path: '/sales' },
      { label: 'Warehouses', icon: 'warehouse', path: '/inventory' },
      { label: 'Transfers', icon: 'arrows', path: '/transfers' },
      { label: 'Purchasing', icon: 'truck', path: '/purchasing' },
      { label: 'Customers', icon: 'building', path: '/customers' },
      { label: 'Catalogue', icon: 'tag', path: '/catalogue' },
      { label: 'Reports', icon: 'chart', path: '/reports' },
      { label: 'Settings', icon: 'settings', path: '/settings' },
    ],
    dashboardWidgets: ['sales_this_week', 'stock_value', 'open_pos', 'transfers_in_transit', 'locations', 'moving_now', 'top_lines'],
    features: ['bulk_pricing', 'multi_warehouse', 'customer_credit', 'wholesale_orders', 'purchasing'],
  },

  // ── 5. MANUFACTURING ──────────────────────────────────────────────────────
  MANUFACTURING: {
    code: 'MANUFACTURING', label: 'Manufacturing', icon: '⚙️',
    description: 'Soap, furniture, food processing, metal, packaging',
    dashboardTitle: 'Production overview',
    primaryAction: { label: 'New work order', path: '/production/new' },
    nav: [
      { label: 'Dashboard', icon: 'grid', path: '/dashboard' },
      { label: 'Production board', icon: 'factory', path: '/production' },
      { label: 'Work orders', icon: 'clipboard', path: '/work-orders' },
      { label: 'Bills of materials', icon: 'list', path: '/bom' },
      { label: 'Raw materials', icon: 'cube', path: '/inventory' },
      { label: 'Finished goods', icon: 'box', path: '/finished-goods' },
      { label: 'Quality checks', icon: 'check', path: '/quality' },
      { label: 'Purchasing', icon: 'truck', path: '/purchasing' },
      { label: 'Reports', icon: 'chart', path: '/reports' },
      { label: 'Settings', icon: 'settings', path: '/settings' },
    ],
    dashboardWidgets: ['production_today', 'raw_materials_low', 'work_orders_active', 'quality_pending', 'output_log', 'wastage'],
    features: ['bom', 'work_orders', 'production_tracking', 'raw_materials', 'quality_control'],
  },

  // ── 6. AGRICULTURE ────────────────────────────────────────────────────────
  AGRICULTURE: {
    code: 'AGRICULTURE', label: 'Farm / Agriculture', icon: '🌾',
    description: 'Poultry, dairy, crops, cooperatives, agro-dealers',
    dashboardTitle: 'Farm overview',
    primaryAction: { label: 'Record intake', path: '/intake/new' },
    nav: [
      { label: 'Dashboard', icon: 'grid', path: '/dashboard' },
      { label: 'Intake & weighing', icon: 'scale', path: '/intake' },
      { label: 'Farmers', icon: 'users', path: '/farmers' },
      { label: 'Payouts', icon: 'banknotes', path: '/payouts' },
      { label: 'Store by grade', icon: 'cube', path: '/inventory' },
      { label: 'Collection points', icon: 'location', path: '/locations' },
      { label: 'Buyer contracts', icon: 'document', path: '/contracts' },
      { label: 'Inputs on credit', icon: 'credit', path: '/inputs' },
      { label: 'Reports', icon: 'chart', path: '/reports' },
      { label: 'Settings', icon: 'settings', path: '/settings' },
    ],
    dashboardWidgets: ['received_today', 'owed_to_farmers', 'season_to_date', 'avg_moisture', 'weigh_a_delivery', 'latest_deliveries'],
    features: ['intake_weighing', 'farmer_records', 'payouts', 'grade_tracking', 'seasonal_reports'],
  },

  // ── 7. HOSPITALITY (Hotel) ────────────────────────────────────────────────
  HOSPITALITY: {
    code: 'HOSPITALITY', label: 'Hotel / Lodge', icon: '🏨',
    description: 'Hotels, guest houses, hostels, lodges, resorts',
    dashboardTitle: 'Front desk',
    primaryAction: { label: 'New booking', path: '/bookings/new' },
    nav: [
      { label: 'Dashboard', icon: 'grid', path: '/dashboard' },
      { label: 'Room chart', icon: 'table', path: '/rooms' },
      { label: 'Bookings', icon: 'calendar', path: '/bookings' },
      { label: 'Guests & folios', icon: 'users', path: '/guests' },
      { label: 'Housekeeping', icon: 'home', path: '/housekeeping' },
      { label: 'Restaurant & bar', icon: 'fork', path: '/restaurant' },
      { label: 'Stores', icon: 'cube', path: '/inventory' },
      { label: 'Occupancy reports', icon: 'chart', path: '/reports' },
      { label: 'Settings', icon: 'settings', path: '/settings' },
    ],
    dashboardWidgets: ['occupied_tonight', 'arrivals_today', 'departures_today', 'rooms_to_clean', 'room_chart', 'arrivals_list', 'housekeeping_status'],
    features: ['room_management', 'bookings', 'check_in_out', 'housekeeping', 'folios', 'restaurant_billing'],
  },

  // ── 8. AUTOMOTIVE (Garage) ────────────────────────────────────────────────
  AUTOMOTIVE: {
    code: 'AUTOMOTIVE', label: 'Garage / Automotive', icon: '🔧',
    description: 'Garages, tyre shops, boda repairs, spare parts',
    dashboardTitle: 'Workshop board',
    primaryAction: { label: 'New job card', path: '/jobs/new' },
    nav: [
      { label: 'Dashboard', icon: 'grid', path: '/dashboard' },
      { label: 'Workshop board', icon: 'wrench', path: '/workshop' },
      { label: 'Job cards', icon: 'clipboard', path: '/jobs' },
      { label: 'Vehicles', icon: 'car', path: '/vehicles' },
      { label: 'Parts store', icon: 'cube', path: '/inventory' },
      { label: 'Mechanics', icon: 'users', path: '/mechanics' },
      { label: 'Quotes & invoices', icon: 'receipt', path: '/invoices' },
      { label: 'Reports', icon: 'chart', path: '/reports' },
      { label: 'Settings', icon: 'settings', path: '/settings' },
    ],
    dashboardWidgets: ['cars_in_today', 'labour_billed', 'parts_issued', 'bay_use', 'workshop_kanban', 'pending_approvals'],
    features: ['job_cards', 'vehicle_records', 'parts_inventory', 'labour_tracking', 'quotes'],
  },

  // ── 9. CONSTRUCTION ───────────────────────────────────────────────────────
  CONSTRUCTION: {
    code: 'CONSTRUCTION', label: 'Construction', icon: '🏗️',
    description: 'Contractors, plumbers, electricians, builders',
    dashboardTitle: 'Projects overview',
    primaryAction: { label: 'New project', path: '/projects/new' },
    nav: [
      { label: 'Dashboard', icon: 'grid', path: '/dashboard' },
      { label: 'Projects', icon: 'building', path: '/projects' },
      { label: 'Budgets & costs', icon: 'banknotes', path: '/budgets' },
      { label: 'Site stores', icon: 'cube', path: '/inventory' },
      { label: 'Material requests', icon: 'truck', path: '/requests' },
      { label: 'Workers & subcontractors', icon: 'users', path: '/workers' },
      { label: 'Equipment', icon: 'wrench', path: '/equipment' },
      { label: 'Reports', icon: 'chart', path: '/reports' },
      { label: 'Settings', icon: 'settings', path: '/settings' },
    ],
    dashboardWidgets: ['active_projects', 'total_contract_value', 'spent_to_date', 'milestones', 'budget_vs_spent', 'site_requests'],
    features: ['project_management', 'budget_tracking', 'site_stores', 'material_requests', 'worker_management'],
  },

  // ── 10. BEAUTY (Salon) ────────────────────────────────────────────────────
  BEAUTY: {
    code: 'BEAUTY', label: 'Salon / Beauty', icon: '💇',
    description: 'Salons, barbers, spas, nail studios, laundry',
    dashboardTitle: "Today's bookings",
    primaryAction: { label: 'New booking', path: '/calendar/new' },
    nav: [
      { label: 'Dashboard', icon: 'grid', path: '/dashboard' },
      { label: 'Calendar', icon: 'calendar', path: '/calendar' },
      { label: 'Walk-in queue', icon: 'users', path: '/queue' },
      { label: 'Services & prices', icon: 'tag', path: '/catalogue' },
      { label: 'Clients', icon: 'person', path: '/customers' },
      { label: 'Commissions', icon: 'banknotes', path: '/commissions' },
      { label: 'Products & supplies', icon: 'cube', path: '/inventory' },
      { label: 'Reports', icon: 'chart', path: '/reports' },
      { label: 'Settings', icon: 'settings', path: '/settings' },
    ],
    dashboardWidgets: ['bookings_today', 'walk_ins_waiting', 'revenue_today', 'commissions', 'staff_calendar', 'supplies_used'],
    features: ['appointment_scheduling', 'staff_calendars', 'commissions', 'walk_in_queue', 'supplies_tracking'],
  },

  // ── 11. EDUCATION (School) ────────────────────────────────────────────────
  EDUCATION: {
    code: 'EDUCATION', label: 'School / Training', icon: '🎓',
    description: 'Private schools, vocational and training centres',
    dashboardTitle: 'Fee collection',
    primaryAction: { label: 'Record payment', path: '/fees/payment' },
    nav: [
      { label: 'Dashboard', icon: 'grid', path: '/dashboard' },
      { label: 'Fees', icon: 'banknotes', path: '/fees' },
      { label: 'Students', icon: 'users', path: '/students' },
      { label: 'Classes & terms', icon: 'calendar', path: '/classes' },
      { label: 'Fee structures', icon: 'list', path: '/fee-structures' },
      { label: 'Stores & uniforms', icon: 'cube', path: '/inventory' },
      { label: 'Purchasing', icon: 'truck', path: '/purchasing' },
      { label: 'Reports', icon: 'chart', path: '/reports' },
      { label: 'Settings', icon: 'settings', path: '/settings' },
    ],
    dashboardWidgets: ['expected_this_term', 'collected', 'outstanding', 'paid_via_momo', 'by_class', 'largest_balances'],
    features: ['fee_management', 'student_records', 'payment_tracking', 'bursaries', 'inventory'],
  },

  // ── 12. FUEL_STATION ──────────────────────────────────────────────────────
  FUEL_STATION: {
    code: 'FUEL_STATION', label: 'Fuel Station', icon: '⛽',
    description: 'Petrol stations, diesel, lubricants',
    dashboardTitle: 'Pumps & shift',
    primaryAction: { label: 'Close shift', path: '/shifts/close' },
    nav: [
      { label: 'Dashboard', icon: 'grid', path: '/dashboard' },
      { label: 'Pumps & shift', icon: 'fuel', path: '/pumps' },
      { label: 'Tanks & dips', icon: 'cube', path: '/tanks' },
      { label: 'Fuel deliveries', icon: 'truck', path: '/deliveries' },
      { label: 'Shop & lubricants', icon: 'store', path: '/shop' },
      { label: 'Credit customers', icon: 'credit', path: '/customers' },
      { label: 'Cash & banking', icon: 'banknotes', path: '/finance' },
      { label: 'Reports', icon: 'chart', path: '/reports' },
      { label: 'Settings', icon: 'settings', path: '/settings' },
    ],
    dashboardWidgets: ['litres_sold_shift', 'expected_cash_momo', 'credit_accounts', 'pump_prices', 'pump_meters', 'tank_levels'],
    features: ['pump_management', 'tank_dips', 'fuel_deliveries', 'shift_management', 'credit_customers'],
  },

  // ── 13. LOGISTICS ─────────────────────────────────────────────────────────
  LOGISTICS: {
    code: 'LOGISTICS', label: 'Logistics / Courier', icon: '🚚',
    description: 'Couriers, boda delivery, logistics companies',
    dashboardTitle: 'Dispatch board',
    primaryAction: { label: 'New pickup', path: '/pickups/new' },
    nav: [
      { label: 'Dashboard', icon: 'grid', path: '/dashboard' },
      { label: 'Dispatch', icon: 'truck', path: '/dispatch' },
      { label: 'Parcels', icon: 'box', path: '/parcels' },
      { label: 'Riders & drivers', icon: 'users', path: '/riders' },
      { label: 'Zones & rates', icon: 'location', path: '/zones' },
      { label: 'Cash on delivery', icon: 'banknotes', path: '/cod' },
      { label: 'Fleet & fuel', icon: 'car', path: '/fleet' },
      { label: 'Business clients', icon: 'building', path: '/customers' },
      { label: 'Reports', icon: 'chart', path: '/reports' },
      { label: 'Settings', icon: 'settings', path: '/settings' },
    ],
    dashboardWidgets: ['delivered_today', 'on_time_rate', 'cod_held', 'failed_returns', 'dispatch_board', 'rider_columns'],
    features: ['parcel_tracking', 'rider_management', 'cod', 'zone_pricing', 'dispatch'],
  },

  // ── 14. LAUNDRY ───────────────────────────────────────────────────────────
  LAUNDRY: {
    code: 'LAUNDRY', label: 'Laundry / Dry Cleaning', icon: '👕',
    description: 'Laundry businesses, dry cleaners',
    dashboardTitle: "Orders",
    primaryAction: { label: 'New drop-off', path: '/orders/new' },
    nav: [
      { label: 'Dashboard', icon: 'grid', path: '/dashboard' },
      { label: 'Orders', icon: 'receipt', path: '/orders' },
      { label: 'Price list', icon: 'tag', path: '/catalogue' },
      { label: 'Customers', icon: 'users', path: '/customers' },
      { label: 'Pickup & delivery', icon: 'truck', path: '/delivery' },
      { label: 'Detergents & supplies', icon: 'cube', path: '/inventory' },
      { label: 'Reports', icon: 'chart', path: '/reports' },
      { label: 'Settings', icon: 'settings', path: '/settings' },
    ],
    dashboardWidgets: ['received', 'washing', 'drying', 'ironing', 'ready', 'uncollected', 'due_today'],
    features: ['order_management', 'tag_printing', 'delivery', 'customer_records', 'supplies'],
  },

  // ── 15. LABORATORY ────────────────────────────────────────────────────────
  LABORATORY: {
    code: 'LABORATORY', label: 'Medical Laboratory', icon: '🔬',
    description: 'Diagnostic centres, medical labs',
    dashboardTitle: 'Sample queue',
    primaryAction: { label: 'Register sample', path: '/samples/new' },
    nav: [
      { label: 'Dashboard', icon: 'grid', path: '/dashboard' },
      { label: 'Sample queue', icon: 'list', path: '/samples' },
      { label: 'Test menu & prices', icon: 'tag', path: '/catalogue' },
      { label: 'Reagents & kits', icon: 'cube', path: '/inventory' },
      { label: 'Equipment', icon: 'wrench', path: '/equipment' },
      { label: 'Referring clinics', icon: 'building', path: '/customers' },
      { label: 'Billing & insurers', icon: 'banknotes', path: '/billing' },
      { label: 'Reports', icon: 'chart', path: '/reports' },
      { label: 'Settings', icon: 'settings', path: '/settings' },
    ],
    dashboardWidgets: ['samples_registered', 'collected', 'on_analyser', 'needs_validation', 'released', 'reagents_low', 'billed_today'],
    features: ['sample_management', 'test_menu', 'reagent_inventory', 'billing', 'results_tracking'],
  },

  // ── 16. REAL_ESTATE ───────────────────────────────────────────────────────
  REAL_ESTATE: {
    code: 'REAL_ESTATE', label: 'Property / Real Estate', icon: '🏠',
    description: 'Property management, rentals, real estate',
    dashboardTitle: 'Units & rent',
    primaryAction: { label: 'Record payment', path: '/rent/payment' },
    nav: [
      { label: 'Dashboard', icon: 'grid', path: '/dashboard' },
      { label: 'Units', icon: 'home', path: '/units' },
      { label: 'Rent roll', icon: 'banknotes', path: '/rent' },
      { label: 'Tenants & leases', icon: 'users', path: '/tenants' },
      { label: 'Maintenance', icon: 'wrench', path: '/maintenance' },
      { label: 'Utilities', icon: 'lightning', path: '/utilities' },
      { label: 'Landlords & payouts', icon: 'building', path: '/landlords' },
      { label: 'Reports', icon: 'chart', path: '/reports' },
      { label: 'Settings', icon: 'settings', path: '/settings' },
    ],
    dashboardWidgets: ['occupancy', 'rent_due', 'collected', 'in_arrears', 'unit_map', 'longest_arrears', 'maintenance'],
    features: ['unit_management', 'lease_tracking', 'rent_collection', 'maintenance_requests', 'landlord_payouts'],
  },

  // ── 17. SERVICES (Generic professional services) ──────────────────────────
  // ── Electronics Repair ────────────────────────────────────────────────────
  ELECTRONICS_REPAIR: {
    code: 'ELECTRONICS_REPAIR', label: 'Electronics Repair', icon: '🔌',
    description: 'Phone, laptop, TV and appliance repair shops',
    dashboardTitle: 'Repair desk overview',
    primaryAction: { label: 'New sale', path: '/pos' },
    nav: [
      { label: 'Dashboard', icon: 'grid', path: '/dashboard' },
      { label: 'Point of sale', icon: 'monitor', path: '/pos' },
      { label: 'Sales', icon: 'receipt', path: '/sales' },
      { label: 'Inventory', icon: 'cube', path: '/inventory' },
      { label: 'Purchasing', icon: 'truck', path: '/purchasing' },
      { label: 'Catalogue', icon: 'tag', path: '/catalogue' },
      { label: 'Finance', icon: 'banknotes', path: '/finance' },
      { label: 'Reports', icon: 'chart', path: '/reports' },
      { label: 'Users', icon: 'users', path: '/users' },
      { label: 'Settings', icon: 'settings', path: '/settings' },
    ],
    dashboardWidgets: ['sales_today', 'transactions', 'low_stock', 'approvals', 'sales_chart', 'top_sellers', 'payment_methods'],
    features: ['pos', 'inventory', 'transfers', 'purchasing', 'reports', 'day_closure'],
  },

  SERVICES: {
    code: 'SERVICES', label: 'Services / Projects', icon: '🛠️',
    description: 'Agencies, IT, cleaning, security, couriers, labs',
    dashboardTitle: 'Work overview',
    primaryAction: { label: 'New job', path: '/jobs/new' },
    nav: [
      { label: 'Dashboard', icon: 'grid', path: '/dashboard' },
      { label: 'Jobs', icon: 'clipboard', path: '/jobs' },
      { label: 'Clients', icon: 'building', path: '/customers' },
      { label: 'Team', icon: 'users', path: '/team' },
      { label: 'Invoices', icon: 'receipt', path: '/invoices' },
      { label: 'Expenses', icon: 'banknotes', path: '/expenses' },
      { label: 'Supplies', icon: 'cube', path: '/inventory' },
      { label: 'Reports', icon: 'chart', path: '/reports' },
      { label: 'Settings', icon: 'settings', path: '/settings' },
    ],
    dashboardWidgets: ['active_jobs', 'revenue_this_month', 'outstanding_invoices', 'team_utilisation', 'upcoming_deadlines'],
    features: ['job_management', 'client_records', 'invoicing', 'expense_tracking', 'team_management'],
  },

  // ── 18. OTHER ─────────────────────────────────────────────────────────────
  OTHER: {
    code: 'OTHER', label: 'Other Business', icon: '🏢',
    description: 'Any other business type',
    dashboardTitle: 'Business overview',
    primaryAction: { label: 'New sale', path: '/pos' },
    nav: [
      { label: 'Dashboard', icon: 'grid', path: '/dashboard' },
      { label: 'Point of sale', icon: 'monitor', path: '/pos' },
      { label: 'Sales', icon: 'receipt', path: '/sales' },
      { label: 'Inventory', icon: 'cube', path: '/inventory' },
      { label: 'Purchasing', icon: 'truck', path: '/purchasing' },
      { label: 'Catalogue', icon: 'tag', path: '/catalogue' },
      { label: 'Finance', icon: 'banknotes', path: '/finance' },
      { label: 'Reports', icon: 'chart', path: '/reports' },
      { label: 'Users', icon: 'users', path: '/users' },
      { label: 'Settings', icon: 'settings', path: '/settings' },
    ],
    dashboardWidgets: ['sales_today', 'transactions', 'low_stock', 'approvals'],
    features: ['pos', 'inventory', 'purchasing', 'reports'],
  },
};

// Alias variants — 60+ named business subtypes mapped to base industries
export const BUSINESS_SUBTYPES: Record<string, { industry: string; label: string; icon: string }> = {
  // Retail variants
  supermarket:        { industry: 'RETAIL', label: 'Supermarket', icon: '🛒' },
  mini_supermarket:   { industry: 'RETAIL', label: 'Mini Supermarket', icon: '🛒' },
  grocery_shop:       { industry: 'RETAIL', label: 'Grocery Shop', icon: '🥬' },
  kiosk:              { industry: 'RETAIL', label: 'Kiosk', icon: '🏪' },
  convenience_store:  { industry: 'RETAIL', label: 'Convenience Store', icon: '🏪' },
  electronics_shop:   { industry: 'RETAIL', label: 'Electronics Shop', icon: '📱' },
  phone_shop:         { industry: 'RETAIL', label: 'Mobile Phone Shop', icon: '📱' },
  clothing_store:     { industry: 'RETAIL', label: 'Clothing Store', icon: '👗' },
  shoe_shop:          { industry: 'RETAIL', label: 'Shoe Shop', icon: '👟' },
  hardware_shop:      { industry: 'RETAIL', label: 'Hardware Shop', icon: '🔨' },
  furniture_shop:     { industry: 'RETAIL', label: 'Furniture Shop', icon: '🛋️' },
  cosmetics_shop:     { industry: 'RETAIL', label: 'Cosmetics Shop', icon: '💄' },
  stationery_shop:    { industry: 'RETAIL', label: 'Stationery Shop', icon: '📚' },
  spare_parts_shop:   { industry: 'RETAIL', label: 'Spare Parts Shop', icon: '🔩' },
  agro_input_shop:    { industry: 'RETAIL', label: 'Agricultural Input Shop', icon: '🌱' },
  // Food & beverage
  restaurant:         { industry: 'RESTAURANT', label: 'Restaurant', icon: '🍽️' },
  fast_food:          { industry: 'RESTAURANT', label: 'Fast Food', icon: '🍔' },
  bakery:             { industry: 'RESTAURANT', label: 'Bakery', icon: '🥐' },
  coffee_shop:        { industry: 'RESTAURANT', label: 'Coffee Shop', icon: '☕' },
  juice_bar:          { industry: 'RESTAURANT', label: 'Juice Bar', icon: '🥤' },
  butchery:           { industry: 'RETAIL', label: 'Butchery', icon: '🥩' },
  catering:           { industry: 'RESTAURANT', label: 'Catering Company', icon: '🍱' },
  food_delivery:      { industry: 'LOGISTICS', label: 'Food Delivery', icon: '🛵' },
  // Healthcare
  retail_pharmacy:    { industry: 'PHARMACY', label: 'Retail Pharmacy', icon: '💊' },
  wholesale_pharmacy: { industry: 'PHARMACY', label: 'Wholesale Pharmacy', icon: '💊' },
  drug_distributor:   { industry: 'WHOLESALE', label: 'Drug Distributor', icon: '💊' },
  medical_lab:        { industry: 'LABORATORY', label: 'Medical Laboratory', icon: '🔬' },
  diagnostic_centre:  { industry: 'LABORATORY', label: 'Diagnostic Centre', icon: '🔬' },
  dental_clinic:      { industry: 'SERVICES', label: 'Dental Clinic', icon: '🦷' },
  vet_clinic:         { industry: 'SERVICES', label: 'Veterinary Clinic', icon: '🐾' },
  optical_shop:       { industry: 'RETAIL', label: 'Optical Shop', icon: '👓' },
  // Wholesale & distribution
  fmcg_distributor:   { industry: 'WHOLESALE', label: 'FMCG Distributor', icon: '🏭' },
  wholesaler:         { industry: 'WHOLESALE', label: 'General Wholesaler', icon: '🏭' },
  importer_exporter:  { industry: 'WHOLESALE', label: 'Import/Export', icon: '🌍' },
  cash_and_carry:     { industry: 'WHOLESALE', label: 'Cash & Carry', icon: '🏭' },
  // Manufacturing
  soap_manufacturer:  { industry: 'MANUFACTURING', label: 'Soap Manufacturer', icon: '🧼' },
  food_processor:     { industry: 'MANUFACTURING', label: 'Food Processor', icon: '🏭' },
  furniture_maker:    { industry: 'MANUFACTURING', label: 'Furniture Maker', icon: '🛋️' },
  metal_fabrication:  { industry: 'MANUFACTURING', label: 'Metal Fabrication', icon: '⚙️' },
  // Agriculture
  crop_farm:          { industry: 'AGRICULTURE', label: 'Crop Farm', icon: '🌽' },
  poultry_farm:       { industry: 'AGRICULTURE', label: 'Poultry Farm', icon: '🐔' },
  dairy_farm:         { industry: 'AGRICULTURE', label: 'Dairy Farm', icon: '🐄' },
  coffee_processor:   { industry: 'AGRICULTURE', label: 'Coffee Processor', icon: '☕' },
  agri_cooperative:   { industry: 'AGRICULTURE', label: 'Agricultural Co-op', icon: '🤝' },
  // Hospitality
  hotel:              { industry: 'HOSPITALITY', label: 'Hotel', icon: '🏨' },
  lodge:              { industry: 'HOSPITALITY', label: 'Lodge', icon: '🏕️' },
  guest_house:        { industry: 'HOSPITALITY', label: 'Guest House', icon: '🏡' },
  // Automotive
  garage:             { industry: 'AUTOMOTIVE', label: 'Garage', icon: '🔧' },
  tyre_shop:          { industry: 'AUTOMOTIVE', label: 'Tyre Shop', icon: '🔄' },
  boda_repair:        { industry: 'AUTOMOTIVE', label: 'Boda Repair', icon: '🛵' },
  car_wash:           { industry: 'RETAIL', label: 'Car Wash', icon: '🚗' },
  // Construction
  building_contractor:{ industry: 'CONSTRUCTION', label: 'Building Contractor', icon: '🏗️' },
  plumber:            { industry: 'CONSTRUCTION', label: 'Plumbing Contractor', icon: '🔩' },
  electrician:        { industry: 'CONSTRUCTION', label: 'Electrical Contractor', icon: '⚡' },
  property_manager:   { industry: 'REAL_ESTATE', label: 'Property Manager', icon: '🏠' },
  // Beauty & personal care
  salon:              { industry: 'BEAUTY', label: 'Salon', icon: '💇' },
  barbershop:         { industry: 'BEAUTY', label: 'Barbershop', icon: '✂️' },
  spa:                { industry: 'BEAUTY', label: 'Spa', icon: '🧖' },
  nail_studio:        { industry: 'BEAUTY', label: 'Nail Studio', icon: '💅' },
  laundry:            { industry: 'LAUNDRY', label: 'Laundry', icon: '👕' },
  dry_cleaner:        { industry: 'LAUNDRY', label: 'Dry Cleaner', icon: '👔' },
  // Education
  private_school:     { industry: 'EDUCATION', label: 'Private School', icon: '🎓' },
  training_centre:    { industry: 'EDUCATION', label: 'Training Centre', icon: '📚' },
  // Professional services
  it_company:         { industry: 'SERVICES', label: 'IT Company', icon: '💻' },
  security_company:   { industry: 'SERVICES', label: 'Security Company', icon: '🛡️' },
  cleaning_company:   { industry: 'SERVICES', label: 'Cleaning Company', icon: '🧹' },
};

export function getIndustryConfig(businessType: string): IndustryConfig {
  return INDUSTRIES[businessType] ?? INDUSTRIES.OTHER;
}

export { INDUSTRIES };
