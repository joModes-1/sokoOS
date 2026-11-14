// Seeds ONE business from the in-app "Load demo data" dev button.
//
//   node prisma/seed-demo-business.mjs --business-id <uuid> [--reset] [--force]
//   node prisma/seed-demo-business.mjs --email you@example.com [--reset] [--force]
//
// Reuses the same per-type catalogue and 30-day trading history as `seed-demo.mjs`, so a pharmacy
// gets medicines and an electronics workshop gets repairs — not a supermarket shelf. Finally it
// adds a few customers on credit so the Debts screen has something real to show.
import { seedBusiness, prisma } from './seed-demo.mjs';

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : undefined;
};

const businessId = arg('--business-id');
const email = arg('--email');

/** A handful of people who took something and are paying it off slowly. */
async function seedDebts(businessId, userId) {
  const existing = await prisma.customerDebt.count({ where: { businessId } });
  // Demo debts are marked in `note` so a re-seed can replace them without touching real ones.
  await prisma.customerDebt.deleteMany({ where: { businessId, note: { startsWith: 'demo:' } } });
  if (existing > 0) {
    const real = await prisma.customerDebt.count({ where: { businessId, NOT: { note: { startsWith: 'demo:' } } } });
    if (real > 0) return 0;
  }

  const people = [
    { name: 'Mama Aisha', phone: '+256700111201' },
    { name: 'Ssemakula John', phone: '+256772130044' },
    { name: 'Nabirye Grace', phone: '+256781209933' },
    { name: 'Katende Peter', phone: '+256758441002' },
    { name: 'Nakato Sarah', phone: '+256703882117' },
  ];
  const specs = [
    { person: 0, item: 'Groceries on account', amount: 45000, paid: 20000, dueOffset: 5 },
    { person: 0, item: 'Cooking oil and soap', amount: 23000, paid: 0, dueOffset: 2 },
    { person: 1, item: 'Repair balance — screen', amount: 90000, paid: 45000, dueOffset: -3 },
    { person: 2, item: 'Monthly supplies', amount: 120000, paid: 120000, dueOffset: -10 },
    { person: 3, item: 'Two bags of rice', amount: 65000, paid: 15000, dueOffset: -1 },
    { person: 4, item: 'Medicine for the children', amount: 38000, paid: 0, dueOffset: 7 },
  ];

  const customers = new Map();
  let made = 0;
  for (const [index, spec] of specs.entries()) {
    const p = people[spec.person];
    let customerId = customers.get(spec.person);
    if (!customerId) {
      const customer = await prisma.customer.create({ data: { businessId, name: p.name, phone: p.phone } });
      customerId = customer.id;
      customers.set(spec.person, customerId);
    }

    const createdAt = new Date(Date.now() - (8 + index * 3) * 86_400_000);
    const dueAt = new Date(Date.now() + spec.dueOffset * 86_400_000);
    const status = spec.paid >= spec.amount ? 'SETTLED' : spec.paid > 0 ? 'PARTIALLY_PAID' : 'OPEN';

    const debt = await prisma.customerDebt.create({
      data: {
        businessId, customerId, customerName: p.name, customerPhone: p.phone,
        itemSummary: spec.item, amountMinor: BigInt(spec.amount), paidMinor: BigInt(spec.paid),
        status, dueAt, settledAt: status === 'SETTLED' ? new Date() : null,
        createdBy: userId, note: 'demo: sample credit record', createdAt,
      },
    });
    if (spec.paid > 0) {
      // Two small instalments read more like real slow repayment than one lump sum.
      const first = Math.round(spec.paid * 0.6);
      const rows = spec.paid === spec.amount
        ? [{ amount: first, day: -6 }, { amount: spec.paid - first, day: -1 }]
        : [{ amount: spec.paid, day: -2 }];
      for (const row of rows) {
        await prisma.debtPayment.create({
          data: {
            debtId: debt.id, businessId,
            amountMinor: BigInt(row.amount), method: index % 2 ? 'MTN_MOMO' : 'CASH',
            paidAt: new Date(Date.now() + row.day * 86_400_000), recordedBy: userId,
          },
        });
      }
    }
    made++;
  }
  return made;
}

if (!businessId && !email) {
  console.error('usage: node prisma/seed-demo-business.mjs --business-id <uuid> | --email <address> [--reset] [--force]');
  process.exit(1);
}

try {
  const result = await seedBusiness(email, {
    businessId,
    reset: process.argv.includes('--reset'),
    force: process.argv.includes('--force'),
  });

  if (result?.ok) {
    // Prefer the resolved business so the debt rows land in the same tenant as the catalogue.
    const target = businessId
      ? await prisma.business.findUnique({ where: { id: businessId }, select: { id: true, ownerUserId: true } })
      : await prisma.userRole.findFirst({
          where: { user: { email }, deletedAt: null }, orderBy: { createdAt: 'asc' },
          select: { businessId: true, userId: true },
        }).then((r) => r && { id: r.businessId, ownerUserId: r.userId });
    const debts = target ? await seedDebts(target.id, target.ownerUserId) : 0;
    result.debts = debts;
  }
  console.log(JSON.stringify(result ?? { ok: false }));
} finally {
  await prisma.$disconnect();
}