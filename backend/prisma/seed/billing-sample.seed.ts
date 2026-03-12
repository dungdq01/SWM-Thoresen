import { PrismaClient, BilDebitNoteStatus } from '@prisma/client';
import crypto from 'crypto';

export async function seedBillingSample(prisma: PrismaClient) {
  console.log('🌱 Seeding Billing Sample Data...');

  // Get admin user for createdBy/updatedBy
  const admin = await prisma.appUser.findUnique({ where: { userCode: 'admin' } });
  if (!admin) {
    console.warn('⚠️ Admin user not found. Skipping billing seed.');
    return;
  }
  const by = admin.id;

  // Get owners
  const owners = await prisma.mdOwner.findMany({
    where: { isActive: true },
    take: 5,
  });

  if (owners.length === 0) {
    console.warn('⚠️ No owners found. Skipping billing seed.');
    return;
  }

  const today = new Date();
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  // Sample debit notes data
  const debitNoteSeeds = [
    // Last month - APPROVED
    {
      dnNumber: 'DN-2026-001',
      owner: owners[0],
      status: BilDebitNoteStatus.APPROVED,
      totalBeforeVat: 45000000,
      periodStart: lastMonth,
      periodEnd: lastMonthEnd,
    },
    {
      dnNumber: 'DN-2026-002',
      owner: owners[1] || owners[0],
      status: BilDebitNoteStatus.APPROVED,
      totalBeforeVat: 32000000,
      periodStart: lastMonth,
      periodEnd: lastMonthEnd,
    },
    {
      dnNumber: 'DN-2026-003',
      owner: owners[2] || owners[0],
      status: BilDebitNoteStatus.LOCKED,
      totalBeforeVat: 28500000,
      periodStart: lastMonth,
      periodEnd: lastMonthEnd,
    },
    // This month - DRAFT/REVIEWED
    {
      dnNumber: 'DN-2026-004',
      owner: owners[0],
      status: BilDebitNoteStatus.DRAFT,
      totalBeforeVat: 52000000,
      periodStart: thisMonthStart,
      periodEnd: today,
    },
    {
      dnNumber: 'DN-2026-005',
      owner: owners[1] || owners[0],
      status: BilDebitNoteStatus.REVIEWED,
      totalBeforeVat: 18500000,
      periodStart: thisMonthStart,
      periodEnd: today,
    },
    {
      dnNumber: 'DN-2026-006',
      owner: owners[3] || owners[0],
      status: BilDebitNoteStatus.DRAFT,
      totalBeforeVat: 41000000,
      periodStart: thisMonthStart,
      periodEnd: today,
    },
    {
      dnNumber: 'DN-2026-007',
      owner: owners[4] || owners[0],
      status: BilDebitNoteStatus.APPROVED,
      totalBeforeVat: 15000000,
      periodStart: thisMonthStart,
      periodEnd: today,
    },
  ];

  let created = 0;
  for (const dn of debitNoteSeeds) {
    const existing = await prisma.bilDebitNote.findUnique({
      where: { dnNumber: dn.dnNumber },
    });

    if (!existing) {
      const vatRate = 0.1;
      const vatAmount = dn.totalBeforeVat * vatRate;
      const grandTotal = dn.totalBeforeVat + vatAmount;

      await prisma.bilDebitNote.create({
        data: {
          dnNumber: dn.dnNumber,
          ownerId: dn.owner.id,
          billingPeriodStart: dn.periodStart,
          billingPeriodEnd: dn.periodEnd,
          generationBasis: 'PERIOD',
          status: dn.status,
          totalBeforeVat: dn.totalBeforeVat,
          vatRate,
          vatAmount,
          grandTotal,
          currencyCode: 'VND',
          externalId: `EXT-${dn.dnNumber}-${Date.now()}`,
          correlationId: crypto.randomUUID(),
          createdBy: by,
          updatedBy: by,
          ...(dn.status === BilDebitNoteStatus.APPROVED || dn.status === BilDebitNoteStatus.LOCKED
            ? { approvedBy: by, approvedAt: new Date() }
            : {}),
          ...(dn.status === BilDebitNoteStatus.REVIEWED
            ? { reviewedBy: by, reviewedAt: new Date() }
            : {}),
          ...(dn.status === BilDebitNoteStatus.LOCKED
            ? { lockedBy: by, lockedAt: new Date() }
            : {}),
        },
      });
      created++;
    }
  }

  console.log(`  ✅ Debit Notes: ${created} new records`);
  console.log('🎉 Billing Sample Data seeded successfully!');
}
