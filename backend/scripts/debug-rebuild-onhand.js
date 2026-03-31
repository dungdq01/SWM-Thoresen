const { PrismaClient } = require('@prisma/client');
const { Decimal } = require('decimal.js');
const p = new PrismaClient();

async function main() {
  // STEEL-HR item
  const itemId = '7c8a91da-0b9f-4435-af2d-75f14c1ea7ed';
  const dimId = 'a0941714-8ee7-4509-aabd-e292d49d4f4b'; // OY-01, OWN-006, AVAILABLE

  // 1. Get current on_hand
  const oh = await p.onHand.findFirst({ where: { itemId, inventDimId: dimId } });
  console.log('=== CURRENT ON_HAND ===');
  console.log('physical:', String(oh?.physicalQty), 'available:', String(oh?.availableQty), 'rowVersion:', oh?.rowVersion);

  // 2. Get ALL transactions for this item+dim
  const allTrans = await p.inventTrans.findMany({
    where: {
      itemId,
      OR: [{ dimFromId: dimId }, { dimToId: dimId }],
    },
    select: { transId: true, transType: true, stage: true, qty: true, dimFromId: true, dimToId: true, isReversal: true, postedAt: true },
    orderBy: { postedAt: 'asc' },
  });

  console.log(`\n=== ALL TRANS for STEEL-HR @ dimId ${dimId} (${allTrans.length} records) ===`);
  
  let calcPhysical = new Decimal(0);
  let calcAllocated = new Decimal(0);
  
  for (const t of allTrans) {
    const q = new Decimal(t.qty || 0).abs();
    let physDelta = new Decimal(0);
    let allocDelta = new Decimal(0);
    
    // RECEIPT + PHYSICAL → +physical
    if (t.transType === 'RECEIPT' && t.stage === 'PHYSICAL') {
      if (t.dimToId === dimId) physDelta = q;
    }
    // ISSUE + DEDUCTED → -physical, -allocated
    if (t.transType === 'ISSUE' && t.stage === 'DEDUCTED') {
      if (t.dimFromId === dimId) {
        physDelta = q.negated();
        allocDelta = q.negated();
      }
    }
    // ISSUE + ALLOCATED → +allocated
    if (t.transType === 'ISSUE' && t.stage === 'ALLOCATED') {
      if (t.dimFromId === dimId) allocDelta = q;
    }
    // ADJUSTMENT + PHYSICAL
    if (t.transType === 'ADJUSTMENT' && t.stage === 'PHYSICAL') {
      const targetId = t.dimToId || t.dimFromId;
      if (targetId === dimId) physDelta = q;
    }
    
    if (t.isReversal) {
      physDelta = physDelta.negated();
      allocDelta = allocDelta.negated();
    }
    
    calcPhysical = calcPhysical.plus(physDelta);
    calcAllocated = calcAllocated.plus(allocDelta);
    
    if (!physDelta.equals(0) || !allocDelta.equals(0)) {
      console.log(`  ${t.transId}: type=${t.transType}, stage=${t.stage}, qty=${t.qty}, reversal=${t.isReversal} → physDelta=${physDelta}, allocDelta=${allocDelta} | running: phys=${calcPhysical}`);
    }
  }
  
  const calcAvailable = calcPhysical.minus(Decimal.max(0, calcAllocated));
  
  console.log(`\n=== CALCULATED vs ACTUAL ===`);
  console.log(`Calculated: physical=${calcPhysical}, allocated=${Decimal.max(0, calcAllocated)}, available=${calcAvailable}`);
  console.log(`Actual:     physical=${oh?.physicalQty}, allocated=${oh?.allocatedQty}, available=${oh?.availableQty}`);
  console.log(`MATCH physical: ${calcPhysical.equals(new Decimal(String(oh?.physicalQty || 0)))}`);

  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
