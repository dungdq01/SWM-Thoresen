/**
 * Fix on_hand: seed baseline + ledger delta
 * 
 * Problem: on_hand was seeded directly (no inventTrans RECEIPT), 
 * but SHIP_CONFIRMED transactions ARE in ledger → materialization didn't deduct.
 * 
 * Solution: on_hand = seed_qty + SUM(all ledger deltas)
 */
const { PrismaClient } = require('@prisma/client');
const { Decimal } = require('decimal.js');
const { getInventoryDelta } = require('../src/modules/inventory-core/domain/inventory.rules');

const p = new PrismaClient();

// Seed baselines (from master-data-sample.seed.ts)
const SEED_BASELINES = {
  'RICE-5T|OWN-001|WH-02|WH02-A-01|AVAILABLE': 18500,
  'RICE-15T|OWN-002|WH-02|WH02-A-02|AVAILABLE': 11000,
  'RICE-JB|OWN-001|WH-02|WH02-A-01|AVAILABLE': 25000,
  'CLINKER|OWN-001|WH-01|WH01-D-01|AVAILABLE': 120000,
  'UREA-BLK|OWN-004|WH-03|WH03-STG-01|AVAILABLE': 82000,
  'UREA-50|OWN-004|WH-03|WH03-STG-02|AVAILABLE': 35000,
  'DAP-50|OWN-005|WH-03|WH03-STG-01|AVAILABLE': 22000,
  'STEEL-HR|OWN-006|OY-01|OY01-STG-01|AVAILABLE': 150000,
  'STEEL-RB|OWN-006|OY-01|OY01-STG-02|AVAILABLE': 95000,
  'CHEM-NaOH|OWN-007|WH-01|WH01-A-07|AVAILABLE': 8000,
  'STEEL-HR|OWN-005|OY-02|OY02-STG-01|AVAILABLE': 55000,
  'UREA-BLK|OWN-004|WH-03|WH03-STG-01|DAMAGED': 2000,
};

async function main() {
  // Get all on_hand records
  const onHands = await p.onHand.findMany({
    include: {
      item: { select: { itemCode: true } },
      inventDim: {
        include: {
          warehouse: { select: { warehouseCode: true } },
          owner: { select: { ownerCode: true } },
          location: { select: { locationCode: true } },
          inventoryStatus: { select: { statusCode: true } },
        },
      },
    },
  });

  console.log(`Processing ${onHands.length} on_hand records...`);
  let fixed = 0;

  for (const oh of onHands) {
    const dim = oh.inventDim;
    const itemCode = oh.item?.itemCode || '';
    const ownerCode = dim?.owner?.ownerCode || '';
    const whCode = dim?.warehouse?.warehouseCode || '';
    const locCode = dim?.location?.locationCode || '';
    const statusCode = dim?.inventoryStatus?.statusCode || '';

    // Find seed baseline
    const seedKey = `${itemCode}|${ownerCode}|${whCode}|${locCode}|${statusCode}`;
    const seedQty = SEED_BASELINES[seedKey] || 0;

    // Calculate ledger delta for this item+dim
    const transactions = await p.inventTrans.findMany({
      where: {
        itemId: oh.itemId,
        isReversal: false,
        OR: [
          { dimToId: oh.inventDimId },
          { dimFromId: oh.inventDimId },
        ],
      },
      select: { transType: true, stage: true, qty: true, dimFromId: true, dimToId: true },
    });

    let physicalDelta = new Decimal(0);
    let allocatedDelta = new Decimal(0);

    for (const t of transactions) {
      const isMoveLike = t.transType === 'MOVE' || t.transType === 'STATUS_CHANGE';
      if (isMoveLike) {
        const q = new Decimal(t.qty || 0).abs();
        if (t.dimToId === oh.inventDimId) physicalDelta = physicalDelta.plus(q);
        if (t.dimFromId === oh.inventDimId) physicalDelta = physicalDelta.minus(q);
      } else {
        const delta = getInventoryDelta(t.transType, t.stage, Math.abs(Number(t.qty)));
        const isTarget = (t.dimToId === oh.inventDimId) || (t.dimFromId === oh.inventDimId);
        if (isTarget) {
          physicalDelta = physicalDelta.plus(delta.physicalDelta);
          allocatedDelta = allocatedDelta.plus(delta.allocatedDelta);
        }
      }
    }

    // Also process reversals
    const reversals = await p.inventTrans.findMany({
      where: {
        itemId: oh.itemId,
        isReversal: true,
        OR: [
          { dimToId: oh.inventDimId },
          { dimFromId: oh.inventDimId },
        ],
      },
      select: { transType: true, stage: true, qty: true, dimFromId: true, dimToId: true },
    });

    for (const t of reversals) {
      const isMoveLike = t.transType === 'MOVE' || t.transType === 'STATUS_CHANGE';
      if (isMoveLike) {
        const q = new Decimal(t.qty || 0).abs();
        if (t.dimToId === oh.inventDimId) physicalDelta = physicalDelta.plus(q);
        if (t.dimFromId === oh.inventDimId) physicalDelta = physicalDelta.minus(q);
      } else {
        const delta = getInventoryDelta(t.transType, t.stage, Math.abs(Number(t.qty)));
        const isTarget = (t.dimToId === oh.inventDimId) || (t.dimFromId === oh.inventDimId);
        if (isTarget) {
          physicalDelta = physicalDelta.minus(delta.physicalDelta);
          allocatedDelta = allocatedDelta.minus(delta.allocatedDelta);
        }
      }
    }

    // Final = seed + ledger delta
    const finalPhysical = new Decimal(seedQty).plus(physicalDelta);
    const finalAllocated = Decimal.max(0, new Decimal(0).plus(allocatedDelta));
    const finalAvailable = finalPhysical.minus(finalAllocated);

    const currentPhysical = new Decimal(String(oh.physicalQty));
    
    if (!currentPhysical.equals(finalPhysical)) {
      await p.onHand.update({
        where: { id: oh.id },
        data: {
          physicalQty: finalPhysical.toFixed(3),
          allocatedQty: finalAllocated.toFixed(3),
          availableQty: finalAvailable.toFixed(3),
          rowVersion: { increment: 1 },
        },
      });
      console.log(`  ${seedKey}: ${currentPhysical} → ${finalPhysical} (seed=${seedQty}, delta=${physicalDelta})`);
      fixed++;
    }
  }

  console.log(`\nFixed ${fixed}/${onHands.length} on_hand records.`);

  // Verify
  const steelItem = await p.mdItem.findFirst({ where: { itemCode: 'STEEL-HR' } });
  if (steelItem) {
    const ohs = await p.onHand.findMany({
      where: { itemId: steelItem.id },
      include: { inventDim: { include: { warehouse: true, owner: true } } },
    });
    console.log('\nVerify STEEL-HR:');
    for (const oh of ohs) {
      console.log(`  physical=${oh.physicalQty}, available=${oh.availableQty} | ${oh.inventDim?.warehouse?.warehouseCode} | ${oh.inventDim?.owner?.ownerCode}`);
    }
  }

  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
