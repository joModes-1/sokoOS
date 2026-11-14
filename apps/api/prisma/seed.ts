/**
 * SokoOS seed — creates a demo tenant with branches, users, catalogue and stock
 * Run: pnpm --filter api tsx prisma/seed.ts
 */
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding SokoOS demo data...');

  // ── Permissions catalogue ──────────────────────────────────────────────────
  const permissions = [
    { code: 'admin.*', category: 'admin', description: 'Full access' },
    { code: 'sales.create', category: 'sales', description: 'Create sales' },
    { code: 'sales.refund', category: 'sales', description: 'Process refunds' },
    { code: 'sales.discount', category: 'sales', description: 'Apply discounts' },
    { code: 'sales.view', category: 'sales', description: 'View sales' },
    { code: 'inventory.view', category: 'inventory', description: 'View inventory' },
    { code: 'inventory.adjust', category: 'inventory', description: 'Adjust stock' },
    { code: 'inventory.count', category: 'inventory', description: 'Stock counts' },
    { code: 'transfer.request', category: 'transfer', description: 'Request transfers' },
    { code: 'transfer.approve', category: 'transfer', description: 'Approve transfers' },
    { code: 'transfer.dispatch', category: 'transfer', description: 'Dispatch transfers' },
    { code: 'transfer.receive', category: 'transfer', description: 'Receive transfers' },
    { code: 'po.create', category: 'purchasing', description: 'Create POs' },
    { code: 'po.submit', category: 'purchasing', description: 'Submit POs' },
    { code: 'po.confirm', category: 'purchasing', description: 'Confirm POs' },
    { code: 'po.receive', category: 'purchasing', description: 'Receive goods' },
    { code: 'catalogue.manage', category: 'catalogue', description: 'Manage catalogue' },
    { code: 'finance.view', category: 'finance', description: 'View finance' },
    { code: 'finance.close', category: 'finance', description: 'Close the day' },
    { code: 'reports.view', category: 'reports', description: 'View reports' },
    { code: 'users.manage', category: 'users', description: 'Manage users' },
    { code: 'users.invite', category: 'users', description: 'Invite users' },
  ];

  for (const p of permissions) {
    await prisma.permission.upsert({ where: { code: p.code }, create: p, update: {} });
  }
  console.log(`  ✓ ${permissions.length} permissions`);

  // ── Demo user ──────────────────────────────────────────────────────────────
  const passwordHash = await argon2.hash('Password123!');
  const user = await prisma.user.upsert({
    where: { email: 'grace@nakatotraders.ug' },
    create: {
      email: 'grace@nakatotraders.ug',
      phone: '+256772100201',
      fullName: 'Grace Nakato',
      passwordHash,
      status: 'ACTIVE',
      phoneVerifiedAt: new Date(),
    },
    update: {},
  });
  console.log(`  ✓ User: grace@nakatotraders.ug / Password123!`);

  // ── Business ───────────────────────────────────────────────────────────────
  const business = await prisma.business.upsert({
    where: { slug: 'nakato-traders' },
    create: {
      legalName: 'Nakato Traders',
      slug: 'nakato-traders',
      businessType: 'RETAIL',
      currency: 'UGX',
      ownerUserId: user.id,
      status: 'ACTIVE',
    },
    update: {},
  });

  await prisma.businessSettings.upsert({
    where: { businessId: business.id },
    create: { businessId: business.id, defaultTaxRateBp: 1800 },
    update: {},
  });

  await prisma.subscription.upsert({
    where: { businessId: business.id },
    create: { businessId: business.id, planCode: 'GROWING_TRIAL', status: 'ACTIVE', periodStart: new Date(), periodEnd: new Date(Date.now() + 120 * 86_400_000) },
    update: {},
  });
  console.log(`  ✓ Business: Nakato Traders`);

  // ── Branches ───────────────────────────────────────────────────────────────
  const branchNames = [
    { name: 'Kampala Road', code: 'KLA-01' },
    { name: 'Ntinda', code: 'NTD-01' },
    { name: 'Jinja', code: 'JIN-01' },
    { name: 'Mbarara Store', code: 'MBR-01', isWarehouse: true },
  ];

  const branches: { id: string; code: string }[] = [];
  for (const b of branchNames) {
    const branch = await prisma.branch.upsert({
      where: { businessId_code: { businessId: business.id, code: b.code } },
      create: { businessId: business.id, ...b, status: 'ACTIVE' },
      update: {},
    });
    branches.push(branch);
  }
  console.log(`  ✓ ${branches.length} branches`);

  // ── Roles ──────────────────────────────────────────────────────────────────
  const roleDefs = [
    { code: 'BUSINESS_ADMIN', name: 'Business Admin' },
    { code: 'BRANCH_MANAGER', name: 'Branch Manager' },
    { code: 'CASHIER', name: 'Cashier' },
    { code: 'INVENTORY_CLERK', name: 'Inventory Clerk' },
  ] as const;

  const ROLE_PERMS: Record<string, string[]> = {
    BUSINESS_ADMIN: permissions.map(p => p.code),
    BRANCH_MANAGER: ['sales.create', 'sales.refund', 'sales.view', 'inventory.view', 'inventory.adjust', 'transfer.request', 'transfer.approve', 'transfer.dispatch', 'transfer.receive', 'po.create', 'po.submit', 'finance.view', 'finance.close', 'reports.view', 'users.invite'],
    CASHIER: ['sales.create', 'sales.view', 'inventory.view'],
    INVENTORY_CLERK: ['inventory.view', 'inventory.adjust', 'inventory.count', 'transfer.request', 'transfer.receive', 'po.receive'],
  };

  const roleMap: Record<string, string> = {};
  for (const r of roleDefs) {
    const role = await prisma.role.upsert({
      where: { businessId_code: { businessId: business.id, code: r.code } },
      create: { businessId: business.id, code: r.code, name: r.name, isSystem: true },
      update: {},
    });
    roleMap[r.code] = role.id;

    for (const permCode of ROLE_PERMS[r.code] ?? []) {
      const perm = await prisma.permission.findFirst({ where: { code: permCode } });
      if (perm) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
          create: { roleId: role.id, permissionId: perm.id },
          update: {},
        });
      }
    }
  }

  // Assign admin role to owner
  await prisma.userRole.upsert({
    where: { id: user.id },
    create: { userId: user.id, businessId: business.id, roleId: roleMap['BUSINESS_ADMIN']!, grantedBy: user.id },
    update: {},
  }).catch(async () => {
    const existing = await prisma.userRole.findFirst({ where: { userId: user.id, businessId: business.id } });
    if (!existing) {
      await prisma.userRole.create({ data: { userId: user.id, businessId: business.id, roleId: roleMap['BUSINESS_ADMIN']!, grantedBy: user.id } });
    }
  });

  // Assign to all branches
  for (const branch of branches) {
    await prisma.userBranch.upsert({
      where: { userId_branchId: { userId: user.id, branchId: branch.id } },
      create: { userId: user.id, businessId: business.id, branchId: branch.id, assignedBy: user.id },
      update: {},
    });
  }
  console.log(`  ✓ Roles and assignments`);

  // ── Catalogue ──────────────────────────────────────────────────────────────
  const categories = ['Groceries', 'Beverages', 'Household', 'Personal care', 'Baby'];
  const catMap: Record<string, string> = {};
  for (const name of categories) {
    const cat = await prisma.category.upsert({
      where: { id: `cat-${name.toLowerCase().replace(/\s+/g, '-')}` },
      create: { id: `cat-${name.toLowerCase().replace(/\s+/g, '-')}`, businessId: business.id, name },
      update: {},
    }).catch(async () => {
      const c = await prisma.category.findFirst({ where: { businessId: business.id, name } }) ??
        await prisma.category.create({ data: { businessId: business.id, name } });
      return c;
    });
    catMap[name] = cat.id;
  }

  const products = [
    { name: 'Sugar', sku: 'SUG', categoryName: 'Groceries', cost: 3900n, sell: 4500n, variants: [{ name: '1 kg', sku: 'SUG-1KG', barcode: '0000000011011', cost: 3900n, sell: 4500n, stock: 212 }, { name: '2 kg', sku: 'SUG-2KG', barcode: '0000000011012', cost: 7600n, sell: 8800n, stock: 88 }] },
    { name: 'Rice Super', sku: 'RICE', categoryName: 'Groceries', cost: 17500n, sell: 20000n, variants: [{ name: '5 kg', sku: 'RICE-5KG', barcode: '6009800512345', cost: 17500n, sell: 20000n, stock: 18 }, { name: '10 kg', sku: 'RICE-10KG', barcode: '6009800512352', cost: 34000n, sell: 39000n, stock: 42 }] },
    { name: 'Maize flour', sku: 'POSHO', categoryName: 'Groceries', cost: 4800n, sell: 6000n, variants: [{ name: '2 kg', sku: 'POSHO-2KG', barcode: '6001070100012', cost: 4800n, sell: 6000n, stock: 1460 }] },
    { name: 'Cooking oil', sku: 'OIL', categoryName: 'Groceries', cost: 18500n, sell: 23000n, variants: [{ name: '3 L', sku: 'OIL-3L', barcode: '6009801703003', cost: 18500n, sell: 23000n, stock: 0 }, { name: '5 L', sku: 'OIL-5L', barcode: '6009801705005', cost: 30000n, sell: 37500n, stock: 28 }] },
    { name: 'Bar soap', sku: 'SOAP', categoryName: 'Household', cost: 4000n, sell: 5000n, variants: [{ name: '800 g', sku: 'SOAP-800', barcode: '6009801710800', cost: 4000n, sell: 5000n, stock: 96 }] },
  ];

  const mainBranch = branches[0]!;

  for (const p of products) {
    const product = await prisma.product.create({
      data: {
        businessId: business.id,
        name: p.name,
        categoryId: catMap[p.categoryName],
        costPriceMinor: p.cost,
        sellingPriceMinor: p.sell,
        currency: 'UGX',
        taxRateBp: 1800,
        reorderLevel: 20,
        isActive: true,
      },
    });

    for (const v of p.variants) {
      const variant = await prisma.productVariant.create({
        data: {
          businessId: business.id,
          productId: product.id,
          sku: v.sku,
          barcode: v.barcode,
          variantName: v.name,
          costPriceMinor: v.cost,
          sellingPriceMinor: v.sell,
          isActive: true,
        },
      });

      if (v.stock > 0) {
        // Create opening stock movement
        await prisma.stockMovement.create({
          data: {
            businessId: business.id,
            branchId: mainBranch.id,
            productVariantId: variant.id,
            movementType: 'OPENING_STOCK',
            quantityDelta: v.stock,
            unitCostMinor: v.cost,
            referenceType: 'OPENING_STOCK',
            referenceId: variant.id,
            reason: 'Opening stock',
            actorUserId: user.id,
            occurredAt: new Date(),
          },
        });

        // Create balance
        await prisma.inventoryBalance.upsert({
          where: { businessId_branchId_productVariantId_batchId: { businessId: business.id, branchId: mainBranch.id, productVariantId: variant.id, batchId: '' } as never },
          create: {
            businessId: business.id,
            branchId: mainBranch.id,
            productVariantId: variant.id,
            quantityOnHand: v.stock,
            lastMovementAt: new Date(),
          },
          update: { quantityOnHand: v.stock },
        }).catch(async () => {
          await prisma.inventoryBalance.create({
            data: {
              businessId: business.id,
              branchId: mainBranch.id,
              productVariantId: variant.id,
              quantityOnHand: v.stock,
              lastMovementAt: new Date(),
            },
          });
        });
      }
    }
  }
  console.log(`  ✓ ${products.length} products with variants`);

  console.log('\n✅ Seed complete!');
  console.log('   Login: grace@nakatotraders.ug / Password123!');
  console.log('   Business: Nakato Traders');
  console.log('   API docs: http://localhost:3001/docs');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
