// Demo data for the demo owner accounts (owner01..owner10@sokoos.test).
// For each business it creates categories, products, opening stock and ~30 days
// of backdated sales shaped by the business type (catalogue, trading hours,
// busy days, basket size, payment mix).
//
//   node prisma/seed-demo.mjs                       # owner01 (Kampala Mini Mart)
//   node prisma/seed-demo.mjs --email owner02@sokoos.test
//   node prisma/seed-demo.mjs --all                 # owner01..owner10
//   add --force to seed a business again on top of existing demo data
//   add --reset to delete a business's demo rows (seeded sales + demo products) and seed afresh
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const prisma = new PrismaClient();
const DAYS = 30;
const EAT = 3; // Africa/Kampala is UTC+3, no DST
const FORCE = process.argv.includes('--force');
const RESET = process.argv.includes('--reset');

// ── Business-type profiles ──────────────────────────────────────────────────
// catalogue rows: [category, name, cost, price, popularity, reorderLevel, service?]
// hours: [hourEAT, weight]; days: weekday multipliers Sun..Sat
const PROFILES = {
  RETAIL: {
    perDay: 20,
    days: [0.8, 1, 1, 1, 1, 1.15, 1.35],
    hours: [[7, 3], [8, 8], [9, 9], [10, 7], [11, 6], [12, 10], [13, 11], [14, 7], [15, 6], [16, 8], [17, 12], [18, 14], [19, 9], [20, 4]],
    lines: [[1, 28], [2, 30], [3, 22], [4, 12], [5, 8]],
    qty: [[1, 60], [2, 25], [3, 10], [6, 5]],
    pay: { CASH: 58, MTN_MOMO: 30, AIRTEL_MONEY: 12 },
    catalogue: [
      ['Beverages', 'Coca-Cola 500ml', 1500, 2000, 10, 24],
      ['Beverages', 'Pepsi 500ml', 1500, 2000, 6, 24],
      ['Beverages', 'Fanta Orange 500ml', 1500, 2000, 6, 24],
      ['Beverages', 'Mineral Water 1.5L', 1700, 2500, 9, 24],
      ['Beverages', 'Riham Juice 1L', 4200, 5500, 4, 12],
      ['Beverages', 'Minute Maid 400ml', 1800, 2500, 5, 18],
      ['Groceries', 'Sugar 1kg', 4100, 4800, 9, 30],
      ['Groceries', 'Rice 1kg', 4600, 5500, 7, 30],
      ['Groceries', 'Posho Maize Flour 2kg', 5400, 6500, 7, 20],
      ['Groceries', 'Cooking Oil 1L', 7200, 8500, 7, 20],
      ['Groceries', 'Salt 500g', 1000, 1500, 5, 20],
      ['Groceries', 'Tea Leaves 250g', 3000, 4000, 4, 15],
      ['Groceries', 'Spaghetti 500g', 2700, 3500, 4, 20],
      ['Groceries', 'Wheat Flour 2kg', 6300, 7500, 4, 15],
      ['Groceries', 'Beans 1kg', 4000, 5000, 6, 25],
      ['Dairy & Eggs', 'Fresh Milk 500ml', 1400, 1800, 9, 30],
      ['Dairy & Eggs', 'Eggs Tray (30)', 11500, 14000, 6, 10],
      ['Dairy & Eggs', 'Yoghurt 250ml', 1800, 2500, 4, 20],
      ['Dairy & Eggs', 'Blueband 250g', 3600, 4500, 4, 15],
      ['Household', 'Bar Soap 1kg', 3500, 4500, 5, 20],
      ['Household', 'Washing Powder 1kg', 5500, 7000, 4, 15],
      ['Household', 'Toilet Paper 4-pack', 4500, 6000, 4, 15],
      ['Household', 'Matchbox', 300, 500, 3, 40],
      ['Household', 'Candles (6)', 2800, 4000, 2, 10],
      ['Personal Care', 'Toothpaste 100ml', 3300, 4500, 4, 15],
      ['Personal Care', 'Vaseline 250ml', 4500, 6000, 3, 10],
      ['Personal Care', 'Sanitary Pads 8-pack', 2500, 3500, 3, 15],
      ['Snacks', 'Biscuits Pack', 1000, 1500, 7, 30],
      ['Snacks', 'Crisps 50g', 650, 1000, 6, 40],
      ['Snacks', 'Chocolate Bar', 1400, 2000, 4, 24],
      ['Snacks', 'Bread Loaf', 2900, 3500, 10, 20],
    ],
    // Mini Mart keeps its original hand-picked shortages
    lowStock: { 'Cooking Oil 1L': 6, 'Eggs Tray (30)': 3, 'Tea Leaves 250g': 0, 'Toilet Paper 4-pack': 7, 'Matchbox': 12, 'Sanitary Pads 8-pack': 5 },
  },

  PHARMACY: {
    perDay: 18,
    days: [0.85, 1, 1, 1, 1, 1.05, 1.1],
    hours: [[8, 6], [9, 8], [10, 8], [11, 7], [12, 7], [13, 7], [14, 6], [15, 6], [16, 7], [17, 9], [18, 10], [19, 9], [20, 6], [21, 3]],
    lines: [[1, 40], [2, 32], [3, 18], [4, 10]],
    qty: [[1, 75], [2, 20], [3, 5]],
    pay: { CASH: 50, MTN_MOMO: 35, AIRTEL_MONEY: 15 },
    catalogue: [
      ['Pain & Fever', 'Panadol Extra (10 tabs)', 1800, 2500, 10, 30],
      ['Pain & Fever', 'Paracetamol 500mg (10 tabs)', 300, 500, 9, 50],
      ['Pain & Fever', 'Ibuprofen 400mg (10 tabs)', 700, 1000, 6, 40],
      ['Antimalarials', 'Coartem 20/120 (24 tabs)', 9500, 13000, 8, 20],
      ['Antimalarials', 'Lonart DS (6 tabs)', 6500, 9000, 5, 15],
      ['Antimalarials', 'Malaria RDT Kit', 2500, 5000, 5, 20],
      ['Antibiotics', 'Amoxicillin 500mg (21 caps)', 3500, 6000, 7, 25],
      ['Antibiotics', 'Ciprofloxacin 500mg (10 tabs)', 2800, 5000, 4, 15],
      ['Antibiotics', 'Metronidazole 400mg (21 tabs)', 1500, 3000, 5, 20],
      ['Cough & Cold', 'Cough Syrup 100ml', 4500, 7000, 6, 15],
      ['Cough & Cold', 'Strepsils (8 lozenges)', 3000, 4500, 5, 15],
      ['Cough & Cold', 'Cetirizine 10mg (10 tabs)', 800, 1500, 4, 20],
      ['Stomach', 'ORS Sachet', 400, 800, 6, 40],
      ['Stomach', 'Antacid Tablets (20)', 2000, 3500, 4, 15],
      ['Vitamins', 'Multivitamin (30 tabs)', 9000, 14000, 3, 10],
      ['Vitamins', 'Vitamin C 1000mg (20)', 6000, 9000, 3, 10],
      ['First Aid', 'Plasters (20 pack)', 1500, 2500, 4, 20],
      ['First Aid', 'Gauze Bandage', 1200, 2000, 3, 15],
      ['Personal Care', 'Hand Sanitizer 250ml', 4000, 6000, 3, 12],
      ['Personal Care', 'Condoms (3 pack)', 1000, 2000, 5, 30],
    ],
  },

  RESTAURANT: {
    perDay: 42,
    days: [1.2, 0.85, 0.9, 0.95, 1, 1.25, 1.4],
    hours: [[7, 4], [8, 6], [9, 4], [10, 3], [11, 6], [12, 14], [13, 16], [14, 9], [15, 4], [16, 4], [17, 6], [18, 10], [19, 13], [20, 11], [21, 6]],
    lines: [[1, 30], [2, 35], [3, 22], [4, 13]],
    qty: [[1, 80], [2, 17], [3, 3]],
    pay: { CASH: 62, MTN_MOMO: 28, AIRTEL_MONEY: 10 },
    catalogue: [
      ['Main Dishes', 'Chicken & Chips', 9000, 15000, 10, 0, true],
      ['Main Dishes', 'Beef Stew & Rice', 7000, 12000, 9, 0, true],
      ['Main Dishes', 'Fish (Tilapia) & Matooke', 12000, 20000, 6, 0, true],
      ['Main Dishes', 'Rolex (Chapati & Egg)', 1800, 3500, 10, 0, true],
      ['Main Dishes', 'Luwombo Chicken', 14000, 22000, 4, 0, true],
      ['Main Dishes', 'Vegetable Pilau', 5000, 9000, 5, 0, true],
      ['Breakfast', 'Katogo (Matooke & Offals)', 3500, 7000, 5, 0, true],
      ['Breakfast', 'Chapati', 400, 1000, 8, 0, true],
      ['Breakfast', 'African Tea', 600, 2000, 8, 0, true],
      ['Breakfast', 'Mandazi', 200, 500, 6, 0, true],
      ['Drinks', 'Soda 300ml', 1100, 2000, 9, 48],
      ['Drinks', 'Fresh Passion Juice', 1500, 4000, 6, 0, true],
      ['Drinks', 'Mineral Water 500ml', 700, 1500, 7, 48],
      ['Drinks', 'Coffee (Cappuccino)', 2000, 6000, 4, 0, true],
      ['Drinks', 'Nile Special 500ml', 3200, 5000, 6, 36],
      ['Sides', 'Extra Chips', 1500, 4000, 4, 0, true],
      ['Sides', 'Kachumbari Salad', 800, 2000, 4, 0, true],
    ],
  },

  WHOLESALE: {
    perDay: 9,
    days: [0.3, 1.15, 1.05, 1, 1, 1.1, 1.2],
    hours: [[7, 7], [8, 12], [9, 12], [10, 10], [11, 8], [12, 6], [13, 5], [14, 6], [15, 6], [16, 4], [17, 2]],
    lines: [[2, 15], [3, 25], [4, 25], [5, 20], [6, 15]],
    qty: [[2, 25], [5, 35], [10, 25], [20, 15]],
    pay: { CASH: 40, MTN_MOMO: 45, AIRTEL_MONEY: 15 },
    catalogue: [
      ['Sugar & Salt', 'Sugar 50kg Bag', 205000, 222000, 9, 10],
      ['Sugar & Salt', 'Salt 25kg Bag', 30000, 36000, 5, 8],
      ['Flour & Grains', 'Maize Flour 25kg Bag', 62000, 70000, 9, 10],
      ['Flour & Grains', 'Rice 25kg Bag', 105000, 118000, 7, 8],
      ['Flour & Grains', 'Wheat Flour 50kg Bag', 150000, 165000, 5, 6],
      ['Cooking Oil', 'Cooking Oil 20L Jerrycan', 135000, 148000, 8, 8],
      ['Cooking Oil', 'Cooking Oil 5L', 35000, 39000, 6, 15],
      ['Beverages', 'Soda Crate (24 x 300ml)', 22000, 25000, 9, 20],
      ['Beverages', 'Water Carton (24 x 500ml)', 13000, 15500, 7, 20],
      ['Beverages', 'Juice Carton (12 x 1L)', 48000, 54000, 4, 10],
      ['Household', 'Bar Soap Carton (25 x 1kg)', 82000, 92000, 5, 8],
      ['Household', 'Washing Powder Carton (12 x 1kg)', 62000, 70000, 4, 8],
      ['Household', 'Toilet Paper Bale (48 rolls)', 50000, 58000, 4, 8],
      ['Snacks', 'Biscuits Carton (48 packs)', 40000, 46000, 5, 10],
    ],
  },

  MANUFACTURING: {
    perDay: 7,
    days: [0.2, 1, 1, 1.05, 1.05, 1.1, 0.6],
    hours: [[8, 8], [9, 10], [10, 10], [11, 9], [12, 6], [13, 6], [14, 8], [15, 8], [16, 7], [17, 4]],
    lines: [[1, 30], [2, 35], [3, 25], [4, 10]],
    qty: [[5, 30], [10, 35], [20, 25], [50, 10]],
    pay: { CASH: 25, MTN_MOMO: 55, AIRTEL_MONEY: 20 },
    catalogue: [
      ['Bottled Water', 'Nile Spring Water 500ml (Carton 24)', 9000, 13000, 10, 40],
      ['Bottled Water', 'Nile Spring Water 1.5L (Carton 12)', 10000, 14500, 8, 30],
      ['Bottled Water', 'Nile Spring Water 20L Refill', 3500, 6000, 7, 50],
      ['Juices', 'Mango Juice 300ml (Carton 24)', 18000, 26000, 6, 25],
      ['Juices', 'Passion Juice 1L (Carton 12)', 24000, 33000, 5, 20],
      ['Snacks', 'Cassava Crisps 50g (Carton 48)', 14000, 21000, 5, 20],
      ['Snacks', 'Roasted Groundnuts 100g (Carton 40)', 22000, 31000, 4, 15],
      ['Packaging', 'Empty Jerrycan 20L', 6000, 9000, 3, 30],
      ['Packaging', 'PET Preforms (Bag of 1000)', 95000, 120000, 2, 5],
    ],
  },

  AGRICULTURE: {
    perDay: 11,
    days: [0.5, 1, 0.9, 1, 0.95, 1.1, 1.35],
    hours: [[6, 6], [7, 12], [8, 12], [9, 10], [10, 8], [11, 6], [12, 4], [13, 4], [14, 5], [15, 4], [16, 3]],
    lines: [[1, 35], [2, 35], [3, 20], [4, 10]],
    qty: [[1, 40], [2, 25], [5, 20], [10, 15]],
    pay: { CASH: 55, MTN_MOMO: 35, AIRTEL_MONEY: 10 },
    catalogue: [
      ['Produce', 'Matooke Bunch', 15000, 25000, 9, 15],
      ['Produce', 'Tomatoes (Basket)', 25000, 40000, 6, 8],
      ['Produce', 'Irish Potatoes 10kg', 18000, 28000, 6, 10],
      ['Produce', 'Cabbage (Head)', 800, 1500, 7, 30],
      ['Produce', 'Avocado (Each)', 400, 1000, 7, 40],
      ['Dairy & Eggs', 'Fresh Milk (Litre)', 1000, 1800, 10, 40],
      ['Dairy & Eggs', 'Eggs Tray (30) - Farm', 9500, 13000, 8, 15],
      ['Poultry', 'Live Broiler Chicken', 14000, 22000, 6, 20],
      ['Poultry', 'Day-old Chicks (10)', 22000, 32000, 3, 10],
      ['Inputs', 'Layers Mash 70kg', 120000, 145000, 4, 6],
      ['Inputs', 'Hybrid Maize Seed 2kg', 14000, 20000, 4, 15],
      ['Inputs', 'NPK Fertiliser 50kg', 160000, 190000, 3, 5],
      ['Inputs', 'Knapsack Sprayer 16L', 70000, 95000, 2, 4],
    ],
  },

  AUTOMOTIVE: {
    perDay: 10,
    days: [0.4, 1, 1, 1, 1, 1.1, 1.3],
    hours: [[8, 7], [9, 10], [10, 11], [11, 10], [12, 7], [13, 7], [14, 9], [15, 9], [16, 8], [17, 6], [18, 3]],
    lines: [[1, 35], [2, 35], [3, 20], [4, 10]],
    qty: [[1, 75], [2, 15], [4, 10]],
    pay: { CASH: 45, MTN_MOMO: 40, AIRTEL_MONEY: 15 },
    catalogue: [
      ['Service', 'Oil Change (Labour)', 5000, 20000, 9, 0, true],
      ['Service', 'Wheel Alignment', 10000, 35000, 6, 0, true],
      ['Service', 'Brake Service (Labour)', 15000, 50000, 5, 0, true],
      ['Service', 'Car Wash - Full', 3000, 15000, 8, 0, true],
      ['Service', 'Diagnostics Scan', 5000, 40000, 4, 0, true],
      ['Lubricants', 'Engine Oil 5W-30 4L', 85000, 110000, 8, 10],
      ['Lubricants', 'Brake Fluid 500ml', 12000, 18000, 4, 10],
      ['Lubricants', 'Coolant 1L', 9000, 14000, 4, 10],
      ['Spare Parts', 'Oil Filter (Toyota)', 12000, 20000, 8, 12],
      ['Spare Parts', 'Air Filter (Toyota)', 18000, 30000, 5, 10],
      ['Spare Parts', 'Brake Pads (Front Set)', 65000, 95000, 5, 8],
      ['Spare Parts', 'Spark Plugs (Set of 4)', 28000, 45000, 4, 8],
      ['Spare Parts', 'Car Battery N70', 280000, 350000, 2, 3],
      ['Tyres', 'Tyre 195/65 R15', 210000, 260000, 3, 6],
      ['Accessories', 'Wiper Blades (Pair)', 15000, 25000, 4, 10],
    ],
  },

  CONSTRUCTION: {
    perDay: 14,
    days: [0.3, 1.1, 1.05, 1, 1, 1.1, 1.3],
    hours: [[7, 10], [8, 12], [9, 11], [10, 9], [11, 7], [12, 5], [13, 5], [14, 7], [15, 7], [16, 6], [17, 3]],
    lines: [[1, 35], [2, 30], [3, 20], [4, 15]],
    qty: [[1, 30], [5, 30], [10, 25], [20, 15]],
    pay: { CASH: 50, MTN_MOMO: 40, AIRTEL_MONEY: 10 },
    catalogue: [
      ['Cement & Sand', 'Cement 50kg (Tororo)', 32000, 36000, 10, 60],
      ['Cement & Sand', 'Cement 50kg (Hima)', 33000, 37500, 8, 60],
      ['Steel', 'Iron Bar Y12 (12m)', 38000, 44000, 7, 40],
      ['Steel', 'Iron Bar Y10 (12m)', 27000, 32000, 6, 40],
      ['Steel', 'Binding Wire 25kg', 120000, 140000, 3, 5],
      ['Roofing', 'Iron Sheet 28G (3m)', 32000, 38000, 7, 50],
      ['Roofing', 'Roofing Nails 1kg', 6000, 8000, 6, 30],
      ['Paint', 'Emulsion Paint 20L', 165000, 195000, 4, 8],
      ['Paint', 'Gloss Paint 4L', 62000, 75000, 3, 8],
      ['Plumbing', 'PVC Pipe 4" (6m)', 32000, 40000, 4, 20],
      ['Plumbing', 'Water Tank 1000L', 260000, 320000, 2, 3],
      ['Tools & Fixings', 'Wire Nails 3" 1kg', 5500, 7500, 7, 40],
      ['Tools & Fixings', 'Wheelbarrow', 95000, 125000, 2, 4],
      ['Tools & Fixings', 'Padlock (Solex)', 18000, 25000, 4, 10],
    ],
  },

  BEAUTY: {
    perDay: 14,
    days: [1.1, 0.7, 0.75, 0.85, 0.95, 1.3, 1.7],
    hours: [[9, 4], [10, 7], [11, 8], [12, 8], [13, 8], [14, 9], [15, 10], [16, 11], [17, 11], [18, 10], [19, 7], [20, 3]],
    lines: [[1, 50], [2, 35], [3, 15]],
    qty: [[1, 90], [2, 10]],
    pay: { CASH: 40, MTN_MOMO: 45, AIRTEL_MONEY: 15 },
    catalogue: [
      ['Hair Services', 'Braids (Knotless)', 30000, 120000, 6, 0, true],
      ['Hair Services', 'Wash & Blow-dry', 4000, 20000, 9, 0, true],
      ['Hair Services', 'Relaxer Treatment', 10000, 35000, 5, 0, true],
      ['Hair Services', 'Men\'s Haircut', 1500, 10000, 10, 0, true],
      ['Nails', 'Manicure', 4000, 20000, 7, 0, true],
      ['Nails', 'Pedicure', 5000, 25000, 6, 0, true],
      ['Nails', 'Gel Polish', 8000, 35000, 5, 0, true],
      ['Skin', 'Facial Treatment', 15000, 60000, 3, 0, true],
      ['Products', 'Hair Food 250g', 6500, 12000, 5, 10],
      ['Products', 'Braiding Hair (Pack)', 12000, 20000, 6, 20],
      ['Products', 'Leave-in Conditioner', 15000, 25000, 3, 8],
      ['Products', 'Body Lotion 400ml', 14000, 22000, 3, 8],
    ],
  },

  EDUCATION: {
    perDay: 9,
    days: [0, 1.2, 1.1, 1, 1, 1.05, 0.25],
    hours: [[7, 8], [8, 12], [9, 10], [10, 7], [11, 6], [12, 5], [13, 5], [14, 6], [15, 7], [16, 8], [17, 4]],
    lines: [[1, 55], [2, 30], [3, 15]],
    qty: [[1, 85], [2, 12], [3, 3]],
    pay: { CASH: 30, MTN_MOMO: 50, AIRTEL_MONEY: 20 },
    catalogue: [
      ['Fees', 'Term Fees Instalment - Primary', 200000, 350000, 9, 0, true],
      ['Fees', 'Term Fees Instalment - Secondary', 300000, 500000, 6, 0, true],
      ['Fees', 'Registration Fee', 10000, 50000, 3, 0, true],
      ['Fees', 'Exam Fee', 10000, 30000, 4, 0, true],
      ['Fees', 'School Trip Contribution', 30000, 60000, 2, 0, true],
      ['Uniforms', 'School Shirt', 14000, 25000, 6, 20],
      ['Uniforms', 'School Shorts / Skirt', 15000, 25000, 5, 20],
      ['Uniforms', 'School Sweater', 25000, 40000, 4, 15],
      ['Stationery', 'Exercise Books (Dozen)', 9000, 14000, 8, 30],
      ['Stationery', 'Mathematical Set', 4500, 8000, 5, 20],
      ['Stationery', 'Pens (Box of 10)', 3500, 6000, 6, 20],
      ['Meals', 'Lunch Card (Weekly)', 20000, 35000, 7, 0, true],
    ],
  },

  // Phone / electronics workshop: most revenue is repair labour (service rows), parts and
  // accessories are the stocked items. Prices are Kampala street rates.
  ELECTRONICS_REPAIR: {
    perDay: 9,
    days: [0.6, 1, 1.05, 1, 1.05, 1.15, 1.1],
    hours: [[8, 5], [9, 8], [10, 9], [11, 9], [12, 7], [13, 6], [14, 8], [15, 9], [16, 10], [17, 8], [18, 5], [19, 2]],
    lines: [[1, 62], [2, 28], [3, 10]],
    qty: [[1, 90], [2, 8], [3, 2]],
    pay: { CASH: 45, MTN_MOMO: 40, AIRTEL_MONEY: 15 },
    catalogue: [
      ['Screen Repair', 'Screen Replacement - Smartphone', 45000, 90000, 10, 0, true],
      ['Screen Repair', 'Screen Replacement - Tecno/Itel', 30000, 65000, 8, 0, true],
      ['Screen Repair', 'Screen Replacement - Laptop', 120000, 220000, 3, 0, true],
      ['Battery & Power', 'Battery Replacement', 22000, 45000, 8, 0, true],
      ['Battery & Power', 'Charging Port Repair', 12000, 30000, 9, 0, true],
      ['Battery & Power', 'Water Damage Cleanup', 15000, 40000, 3, 0, true],
      ['Software', 'Software Flash / Unlock', 3000, 15000, 7, 0, true],
      ['Software', 'Data Recovery', 20000, 50000, 2, 0, true],
      ['Audio & Camera', 'Speaker / Mic Repair', 8000, 20000, 5, 0, true],
      ['Audio & Camera', 'Camera Replacement', 18000, 40000, 3, 0, true],
      ['Accessories', 'Phone Charger', 7000, 15000, 9, 25],
      ['Accessories', 'USB Cable', 2500, 6000, 8, 40],
      ['Accessories', 'Earphones', 5000, 12000, 7, 30],
      ['Accessories', 'Tempered Glass', 1500, 5000, 9, 50],
      ['Accessories', 'Phone Case', 2500, 8000, 6, 40],
      ['Accessories', 'Power Bank 10000mAh', 32000, 60000, 4, 10],
      ['Devices', 'Tecno Spark 8C (128GB)', 380000, 450000, 3, 5],
      ['Devices', 'Itel A60 (64GB)', 250000, 310000, 3, 5],
    ],
  },

  HOSPITALITY: {
    perDay: 12,
    days: [1.1, 0.9, 0.9, 0.95, 1, 1.25, 1.35],
    hours: [[7, 4], [8, 6], [9, 7], [10, 6], [11, 5], [12, 10], [13, 9], [14, 6], [15, 5], [16, 6], [17, 8], [18, 11], [19, 13], [20, 10], [21, 5]],
    lines: [[1, 55], [2, 30], [3, 15]],
    qty: [[1, 85], [2, 12], [3, 3]],
    pay: { CASH: 35, MTN_MOMO: 40, AIRTEL_MONEY: 25 },
    catalogue: [
      ['Rooms', 'Single Room - Night', 45000, 90000, 8, 0, true],
      ['Rooms', 'Double Room - Night', 70000, 140000, 7, 0, true],
      ['Rooms', 'Executive Suite - Night', 120000, 250000, 3, 0, true],
      ['Rooms', 'Conference Hall - Half Day', 150000, 300000, 2, 0, true],
      ['Food & Drink', 'Breakfast Buffet', 6000, 15000, 8, 0, true],
      ['Food & Drink', 'Lunch Buffet', 9000, 25000, 6, 0, true],
      ['Food & Drink', 'Soda 300ml', 1100, 2000, 7, 48],
      ['Food & Drink', 'Beer 500ml', 3000, 6000, 6, 72],
      ['Housekeeping', 'Laundry - Per Piece', 2000, 5000, 4, 0, true],
      ['Housekeeping', 'Airport Transfer', 40000, 80000, 2, 0, true],
    ],
  },

  FUEL_STATION: {
    perDay: 32,
    days: [0.9, 1, 1, 1.05, 1.1, 1.2, 1.15],
    hours: [[6, 6], [7, 10], [8, 12], [9, 10], [10, 8], [11, 7], [12, 8], [13, 7], [14, 6], [15, 7], [16, 9], [17, 12], [18, 13], [19, 9], [20, 5], [21, 2]],
    lines: [[1, 70], [2, 22], [3, 8]],
    qty: [[5, 25], [10, 30], [20, 25], [30, 15], [40, 5]],
    pay: { CASH: 70, MTN_MOMO: 20, AIRTEL_MONEY: 10 },
    catalogue: [
      ['Fuel', 'Petrol - Per Litre', 4700, 5300, 10, 200],
      ['Fuel', 'Diesel - Per Litre', 4400, 5000, 8, 200],
      ['Fuel', 'Kerosene - Per Litre', 3800, 4500, 3, 80],
      ['Lubricants', 'Engine Oil 4L', 45000, 65000, 4, 12],
      ['Lubricants', 'Gear Oil 1L', 12000, 18000, 3, 12],
      ['Lubricants', 'Brake Fluid 500ml', 7000, 12000, 3, 10],
      ['Shop', 'Mineral Water 500ml', 700, 1500, 7, 60],
      ['Shop', 'Soda 300ml', 1100, 2000, 6, 48],
      ['Shop', 'Crisps 50g', 650, 1500, 4, 40],
      ['Services', 'Car Wash', 5000, 15000, 4, 0, true],
      ['Services', 'Tyre Pressure & Check', 0, 3000, 3, 0, true],
    ],
  },

  LOGISTICS: {
    perDay: 16,
    days: [0.5, 1.15, 1.2, 1.15, 1.1, 1.05, 0.7],
    hours: [[7, 6], [8, 9], [9, 10], [10, 9], [11, 8], [12, 6], [13, 6], [14, 8], [15, 9], [16, 8], [17, 7], [18, 4]],
    lines: [[1, 75], [2, 20], [3, 5]],
    qty: [[1, 92], [2, 7], [3, 1]],
    pay: { CASH: 40, MTN_MOMO: 45, AIRTEL_MONEY: 15 },
    catalogue: [
      ['Delivery', 'Boda Delivery - Within Kampala', 2000, 6000, 10, 0, true],
      ['Delivery', 'Boda Delivery - Greater Kampala', 4000, 12000, 7, 0, true],
      ['Delivery', 'Van Delivery - Within Kampala', 15000, 35000, 5, 0, true],
      ['Delivery', 'Same-Day Express', 5000, 15000, 6, 0, true],
      ['Delivery', 'Scheduled Pickup', 3000, 10000, 4, 0, true],
      ['Packing', 'Small Box', 1000, 3000, 4, 40],
      ['Packing', 'Medium Box', 2000, 5000, 3, 30],
      ['Packing', 'Bubble Wrap Roll', 8000, 15000, 2, 10],
    ],
  },

  LAUNDRY: {
    perDay: 18,
    days: [0.8, 1, 1, 1, 1.05, 1.2, 1.15],
    hours: [[8, 6], [9, 9], [10, 10], [11, 9], [12, 7], [13, 6], [14, 8], [15, 9], [16, 9], [17, 7], [18, 4]],
    lines: [[1, 55], [2, 33], [3, 12]],
    qty: [[1, 70], [2, 20], [5, 10]],
    pay: { CASH: 55, MTN_MOMO: 35, AIRTEL_MONEY: 10 },
    catalogue: [
      ['Wash', 'Shirt / Blouse - Wash & Iron', 1500, 4000, 9, 0, true],
      ['Wash', 'Trousers / Skirt - Wash & Iron', 1500, 4000, 8, 0, true],
      ['Wash', 'Duvet - Wash & Dry', 6000, 15000, 5, 0, true],
      ['Wash', 'Bedsheet Set', 4000, 10000, 5, 0, true],
      ['Wash', 'Curtains - Per Panel', 3000, 8000, 3, 0, true],
      ['Dry Cleaning', 'Suit - Dry Clean', 8000, 20000, 4, 0, true],
      ['Dry Cleaning', 'Wedding Dress - Dry Clean', 30000, 70000, 2, 0, true],
      ['Ironing', 'Iron Only - Per Piece', 800, 2000, 7, 0, true],
      ['Products', 'Detergent 1kg', 5500, 8000, 3, 20],
      ['Products', 'Fabric Softener 1L', 7000, 11000, 2, 15],
    ],
  },

  LABORATORY: {
    perDay: 14,
    days: [0.7, 1.15, 1.1, 1.05, 1, 1.1, 0.9],
    hours: [[7, 8], [8, 12], [9, 12], [10, 10], [11, 9], [12, 7], [13, 6], [14, 7], [15, 8], [16, 8], [17, 5]],
    lines: [[1, 70], [2, 22], [3, 8]],
    qty: [[1, 95], [2, 4], [3, 1]],
    pay: { CASH: 42, MTN_MOMO: 43, AIRTEL_MONEY: 15 },
    catalogue: [
      ['Tests', 'Malaria Test (RDT)', 1000, 5000, 10, 0, true],
      ['Tests', 'Complete Blood Count', 6000, 20000, 8, 0, true],
      ['Tests', 'Urinalysis', 2000, 10000, 7, 0, true],
      ['Tests', 'Pregnancy Test', 1500, 8000, 6, 0, true],
      ['Tests', 'Blood Sugar', 1000, 5000, 8, 0, true],
      ['Tests', 'Liver Function Test', 15000, 45000, 3, 0, true],
      ['Tests', 'HIV Test', 1000, 10000, 5, 0, true],
      ['Tests', 'Typhoid Test', 1500, 10000, 5, 0, true],
      ['Consumables', 'Sample Collection Kit', 2000, 5000, 3, 30],
    ],
  },

  REAL_ESTATE: {
    perDay: 5,
    days: [0.4, 1.2, 1.15, 1.1, 1.05, 1.1, 0.8],
    hours: [[8, 8], [9, 10], [10, 10], [11, 9], [12, 7], [13, 6], [14, 7], [15, 8], [16, 8], [17, 5]],
    lines: [[1, 88], [2, 12]],
    qty: [[1, 98], [2, 2]],
    pay: { CASH: 30, MTN_MOMO: 50, AIRTEL_MONEY: 20 },
    catalogue: [
      ['Rent', 'Monthly Rent - Single Room', 120000, 250000, 8, 0, true],
      ['Rent', 'Monthly Rent - One Bedroom', 250000, 500000, 7, 0, true],
      ['Rent', 'Monthly Rent - Two Bedroom', 400000, 800000, 5, 0, true],
      ['Rent', 'Commercial Shop - Monthly', 600000, 1200000, 4, 0, true],
      ['Services', 'Agency Commission (10%)', 0, 100000, 5, 0, true],
      ['Services', 'Property Valuation', 50000, 200000, 3, 0, true],
      ['Services', 'Tenancy Agreement Draft', 10000, 50000, 4, 0, true],
    ],
  },

  SERVICES: {
    perDay: 10,
    days: [0.6, 1.15, 1.1, 1.05, 1, 1.15, 0.85],
    hours: [[8, 8], [9, 11], [10, 11], [11, 10], [12, 7], [13, 6], [14, 8], [15, 9], [16, 9], [17, 6]],
    lines: [[1, 78], [2, 18], [3, 4]],
    qty: [[1, 95], [2, 4], [3, 1]],
    pay: { CASH: 40, MTN_MOMO: 45, AIRTEL_MONEY: 15 },
    catalogue: [
      ['Consulting', 'Consultation - 1 Hour', 20000, 60000, 9, 0, true],
      ['Consulting', 'Business Plan Preparation', 100000, 350000, 4, 0, true],
      ['Consulting', 'Tax & Compliance Review', 60000, 180000, 4, 0, true],
      ['Technical', 'Site Visit', 15000, 50000, 6, 0, true],
      ['Technical', 'Installation - Standard', 40000, 120000, 5, 0, true],
      ['Technical', 'Repair Call-Out', 25000, 80000, 6, 0, true],
      ['Materials', 'Cable Roll 100m', 60000, 95000, 3, 8],
      ['Materials', 'Fixings Pack', 8000, 15000, 4, 20],
    ],
  },
};
PROFILES.DISTRIBUTION = PROFILES.WHOLESALE;
PROFILES.OTHER = PROFILES.RETAIL;

// ── Helpers ─────────────────────────────────────────────────────────────────
function makeRng(seedValue) {
  let seed = seedValue >>> 0;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const between = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const weighted = (items) => {
    const total = items.reduce((s, i) => s + i.w, 0);
    let r = rnd() * total;
    for (const i of items) { if ((r -= i.w) <= 0) return i; }
    return items[items.length - 1];
  };
  return { rnd, between, weighted };
}
const hashString = (s) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);

// Removes only rows this script created: sales keyed "demo-*" and the profile's catalogue products.
async function resetDemo(businessId, profile) {
  const names = profile.catalogue.map((c) => c[1]);
  const variants = await prisma.productVariant.findMany({
    where: { businessId, product: { name: { in: names } } }, select: { id: true, productId: true },
  });
  const variantIds = variants.map((v) => v.id);
  const productIds = [...new Set(variants.map((v) => v.productId))];
  const demoSales = await prisma.sale.findMany({ where: { businessId, idempotencyKey: { startsWith: 'demo-' } }, select: { id: true } });
  const saleIds = demoSales.map((x) => x.id);
  await prisma.$transaction(async (tx) => {
    await tx.payment.deleteMany({ where: { saleId: { in: saleIds } } });
    await tx.receipt.deleteMany({ where: { saleId: { in: saleIds } } });
    await tx.saleItem.deleteMany({ where: { saleId: { in: saleIds } } });
    await tx.sale.deleteMany({ where: { id: { in: saleIds } } });
    await tx.stockMovement.deleteMany({ where: { businessId, productVariantId: { in: variantIds } } });
    await tx.inventoryBalance.deleteMany({ where: { businessId, productVariantId: { in: variantIds } } });
    await tx.productVariant.deleteMany({ where: { id: { in: variantIds } } });
    await tx.product.deleteMany({ where: { id: { in: productIds } } });
  }, { timeout: 120_000 });
  console.log(`  reset: removed ${saleIds.length} demo sales and ${productIds.length} demo products`);
}

async function seedBusiness(email, opts = {}) {
  let user, business, role;
  if (opts.businessId) {
    // The in-app dev button knows exactly which business the caller is in.
    business = await prisma.business.findUnique({ where: { id: opts.businessId } });
    if (!business) { console.log(`- business ${opts.businessId}: not found`); return { ok: false, reason: 'Business not found' }; }
    user = await prisma.user.findUnique({ where: { id: business.ownerUserId } });
    role = { userId: user.id, businessId: business.id };
  } else {
    user = await prisma.user.findFirst({ where: { email } });
    if (!user) { console.log(`- ${email}: user not found, skipped`); return { ok: false, reason: `No user with email ${email}` }; }
    role = await prisma.userRole.findFirst({ where: { userId: user.id, deletedAt: null }, orderBy: { createdAt: 'asc' } });
    if (!role) { console.log(`- ${email}: no business, skipped`); return { ok: false, reason: 'That user has no business yet' }; }
    business = await prisma.business.findUniqueOrThrow({ where: { id: role.businessId } });
  }
  const branch = await prisma.branch.findFirstOrThrow({ where: { businessId: business.id }, orderBy: { createdAt: 'asc' } });
  const businessId = business.id;
  const profile = PROFILES[business.businessType] ?? PROFILES.RETAIL;
  // Mini Mart keeps its original seed so its numbers stay the same
  const { rnd, between, weighted } = makeRng(business.businessType === 'RETAIL' ? 20261112 : hashString(businessId));

  if (opts.reset ?? RESET) await resetDemo(businessId, profile);

  const marker = profile.catalogue[0][1];
  if (!(opts.force ?? FORCE) && await prisma.product.findFirst({ where: { businessId, name: marker, deletedAt: null } })) {
    console.log(`- ${business.legalName}: already has demo data (use --force to add again)`);
    return { ok: false, alreadySeeded: true, reason: `${business.legalName} already has demo data`, businessName: business.legalName };
  }

  // Hide earlier smoke-test products so the demo looks clean
  await prisma.product.updateMany({
    where: { businessId, deletedAt: null, OR: [{ name: { startsWith: 'Test Item' } }, { name: { startsWith: 'E2E Receipt Item' } }] },
    data: { deletedAt: new Date() },
  });

  // ── Catalogue ─────────────────────────────────────────────────────────────
  const categoryIds = {};
  for (const name of [...new Set(profile.catalogue.map((c) => c[0]))]) {
    const existing = await prisma.category.findFirst({ where: { businessId, name, deletedAt: null } });
    categoryIds[name] = existing?.id ?? (await prisma.category.create({ data: { businessId, name } })).id;
  }

  const products = [];
  for (const [category, name, cost, price, w, reorder, service] of profile.catalogue) {
    const product = await prisma.product.create({
      data: {
        businessId, name, categoryId: categoryIds[category], unitOfMeasure: service ? 'service' : 'each',
        costPriceMinor: BigInt(cost), sellingPriceMinor: BigInt(price), taxRateBp: 0,
        reorderLevel: reorder, isActive: true,
      },
    });
    const variant = await prisma.productVariant.create({
      data: {
        businessId, productId: product.id, variantName: 'Default',
        sku: `${name.toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 20)}-${product.id.slice(0, 6).toUpperCase()}`,
      },
    });
    products.push({ id: product.id, variantId: variant.id, name, cost, price, w, reorder, service: !!service, stock: 0 });
  }

  // Which stocked items end up short: the profile's own list, or every 4th stocked item
  const lowStock = profile.lowStock ?? Object.fromEntries(
    products.filter((p) => !p.service).filter((_, i) => i % 4 === 1)
      .map((p, i) => [p.name, i % 3 === 0 ? 0 : Math.max(1, Math.floor(p.reorder * (0.3 + rnd() * 0.4)))]),
  );

  // ── Timeline helpers ──────────────────────────────────────────────────────
  const now = new Date();
  const startOfTodayEAT = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), -EAT, 0, 0));
  if (now.getTime() < startOfTodayEAT.getTime()) startOfTodayEAT.setUTCDate(startOfTodayEAT.getUTCDate() - 1);
  const dayStart = (offset) => new Date(startOfTodayEAT.getTime() - offset * 86400000);
  const at = (offset, hourEAT, minute) => new Date(dayStart(offset).getTime() + (hourEAT * 60 + minute) * 60000);

  const HOURS = profile.hours.map(([h, w]) => ({ h, w }));
  const LINES = profile.lines.map(([n, w]) => ({ n, w }));
  const QTY = profile.qty.map(([q, w]) => ({ q, w }));
  const PAY = Object.entries(profile.pay).map(([m, w]) => ({ m, w }));

  const movements = [], sales = [], saleItems = [], receipts = [], payments = [];
  const mv = (p, movementType, quantityDelta, occurredAt, reason, referenceId = null) => movements.push({
    id: randomUUID(), businessId, branchId: branch.id, productVariantId: p.variantId,
    movementType, quantityDelta, unitCostMinor: BigInt(p.cost),
    referenceType: referenceId ? 'SALE' : null, referenceId, reason, actorUserId: user.id, occurredAt,
  });

  let saleSeq = await prisma.sale.count({ where: { businessId, branchId: branch.id } });
  let receiptSeq = await prisma.receipt.count({ where: { businessId } });

  // Opening stock, 31 days ago. SokoOS has no non-stock product type yet, so services get a
  // notional balance (unit 'service') that comfortably covers a month of bookings.
  for (const p of products) {
    p.stock = p.service ? 500 : Math.max(between(90, 220), p.reorder * 6);
    mv(p, 'OPENING_STOCK', p.stock, at(DAYS + 1, 8, 0), 'Opening stock');
  }

  const adjusted = new Set();
  for (let offset = DAYS - 1; offset >= 0; offset--) {
    const date = dayStart(offset);
    const dow = new Date(date.getTime() + EAT * 3600000).getUTCDay(); // 0=Sun
    const trend = 1 + (DAYS - offset) * 0.012;
    const noise = 0.85 + rnd() * 0.3;
    let count = Math.round(profile.perDay * trend * profile.days[dow] * noise);

    // Stock-count shrinkage 3 days ago leaves a handful of items low / out
    if (offset === 3) {
      for (const [name, left] of Object.entries(lowStock)) {
        const p = products.find((x) => x.name === name);
        if (!p) continue;
        if (left - p.stock < 0) { mv(p, 'STOCK_COUNT', left - p.stock, at(offset, 7, 30), 'Stock count correction'); p.stock = left; }
        adjusted.add(name);
      }
    }

    // Morning delivery: top up anything under its reorder level
    for (const p of products) {
      if (p.service || (adjusted.has(p.name) && offset <= 3)) continue;
      if (p.stock <= p.reorder * 2) {
        const qty = Math.max(between(80, 160), p.reorder * 8);
        p.stock += qty;
        mv(p, 'GOODS_RECEIPT', qty, at(offset, 7, between(0, 25)), 'Supplier delivery');
      }
    }

    // Today: only trade up to the current hour
    const hourNowEAT = ((now.getUTCHours() + EAT) % 24) + now.getUTCMinutes() / 60;
    const hours = offset === 0 ? HOURS.filter((x) => x.h < hourNowEAT) : HOURS;
    if (offset === 0) {
      const share = hours.reduce((s, x) => s + x.w, 0) / HOURS.reduce((s, x) => s + x.w, 0);
      count = Math.round(count * Math.min(1, Math.max(0.15, share)));
    }
    if (!hours.length || count <= 0) continue;

    const times = Array.from({ length: count }, () => at(offset, weighted(hours).h, between(0, 59))).sort((a, b) => a - b);

    for (const completedAt of times) {
      const lines = new Map();
      const n = weighted(LINES).n;
      for (let i = 0; i < n; i++) {
        const p = weighted(products.map((x) => ({ p: x, w: x.w }))).p;
        const qty = p.service || p.price > 100000 ? 1 : weighted(QTY).q;
        const have = p.stock - (lines.get(p.id)?.qty ?? 0);
        if (have < qty) continue;
        lines.set(p.id, { p, qty: (lines.get(p.id)?.qty ?? 0) + qty });
      }
      if (!lines.size) continue;

      saleSeq++; receiptSeq++;
      const saleId = randomUUID();
      let total = 0n;
      for (const { p, qty } of lines.values()) {
        const lineTotal = BigInt(p.price * qty);
        total += lineTotal;
        p.stock -= qty;
        saleItems.push({
          id: randomUUID(), saleId, productVariantId: p.variantId, quantity: qty,
          unitPriceMinor: BigInt(p.price), discountMinor: 0n, taxMinor: 0n,
          lineTotalMinor: lineTotal, unitCostMinor: BigInt(p.cost),
        });
        mv(p, 'SALE', -qty, completedAt, null, saleId);
      }
      const method = weighted(PAY).m;
      sales.push({
        id: saleId, businessId, branchId: branch.id, saleNumber: `${branch.code}-${String(saleSeq).padStart(6, '0')}`,
        idempotencyKey: `demo-${saleId}`, cashierId: user.id, status: 'COMPLETED',
        subtotalMinor: total, discountMinor: 0n, taxMinor: 0n, totalMinor: total, currency: 'UGX',
        completedAt, createdAt: completedAt, updatedAt: completedAt,
      });
      receipts.push({
        id: randomUUID(), businessId, saleId,
        receiptNumber: `RCP-${completedAt.getUTCFullYear()}-${String(receiptSeq).padStart(4, '0')}`,
        printCount: rnd() < 0.7 ? 1 : 0, createdAt: completedAt, updatedAt: completedAt,
      });
      const tendered = method === 'CASH' ? BigInt(Math.ceil(Number(total) / 1000) * 1000 + (rnd() < 0.4 ? 5000 : 0)) : null;
      payments.push({
        id: randomUUID(), businessId, saleId, method, status: 'SUCCEEDED', idempotencyKey: `demo-${saleId}-pay-0`,
        amountMinor: total, amountTenderedMinor: tendered, changeMinor: tendered && tendered > total ? tendered - total : null,
        currency: 'UGX', succeededAt: completedAt, createdAt: completedAt, updatedAt: completedAt,
      });
    }
  }

  // ── Write everything in one transaction ───────────────────────────────────
  const chunk = (arr, n = 1000) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
  await prisma.$transaction(async (tx) => {
    for (const c of chunk(sales)) await tx.sale.createMany({ data: c });
    for (const c of chunk(saleItems)) await tx.saleItem.createMany({ data: c });
    for (const c of chunk(receipts)) await tx.receipt.createMany({ data: c });
    for (const c of chunk(payments)) await tx.payment.createMany({ data: c });
    for (const c of chunk(movements)) await tx.stockMovement.createMany({ data: c });
    await tx.inventoryBalance.createMany({
      data: products.map((p) => ({
        businessId, branchId: branch.id, productVariantId: p.variantId, batchId: null,
        quantityOnHand: p.stock, lastMovementAt: now,
      })),
    });
  }, { timeout: 120_000, maxWait: 20_000 });

  const revenue = sales.reduce((s, x) => s + Number(x.totalMinor), 0);
  const low = products.filter((p) => !p.service && p.stock <= p.reorder);
  console.log(`- ${business.legalName} (${business.businessType}): ${products.length} products, ${sales.length} sales, UGX ${revenue.toLocaleString('en-UG')}; low/out: ${low.length}`);
  return {
    ok: true, businessName: business.legalName, businessType: business.businessType,
    products: products.length, sales: sales.length, revenueMinor: revenue, lowStock: low.length,
  };
}

// Programmatic callers (the in-app dev button) import this module; only the CLI below should run
// the seed as a side effect of loading it.
export { seedBusiness, prisma };

// ── Entry point ─────────────────────────────────────────────────────────────
const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  const emailArg = process.argv.indexOf('--email');
  const emails = process.argv.includes('--all')
    ? Array.from({ length: 10 }, (_, i) => `owner${String(i + 1).padStart(2, '0')}@sokoos.test`)
    : [emailArg > -1 ? process.argv[emailArg + 1] : (process.env.DEMO_EMAIL ?? 'owner01@sokoos.test')];

  try {
    for (const email of emails) await seedBusiness(email);
  } finally {
    await prisma.$disconnect();
  }
}
