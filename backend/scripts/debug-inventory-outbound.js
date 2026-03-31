const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // 1. Check SHIP_CONFIRMED event mapping
  const em = await p.inventoryEventMapping.findFirst({
    where: { eventCode: 'SHIP_CONFIRMED', activeFlag: true },
  });
  console.log('=== SHIP_CONFIRMED EVENT MAPPING ===');
  console.log(em ? JSON.stringify(em, null, 2) : 'NOT FOUND - THIS IS THE PROBLEM!');

  // 2. Count existing SHIPMENT ISSUE transactions
  const transCount = await p.inventTrans.count({
    where: { refType: 'SHIPMENT', transType: 'ISSUE' },
  });
  console.log('\n=== SHIPMENT ISSUE TRANS COUNT ===');
  console.log('Count:', transCount);

  // 3. Sample shipped lines
  const shippedLines = await p.shipmentLine.findMany({
    where: { lineStatus: 'LINE_SHIPPED', shippedQty: { gt: 0 } },
    select: { id: true, shipmentHeaderId: true, itemId: true, shippedQty: true, netWeightKg: true },
    take: 5,
  });
  console.log('\n=== SHIPPED LINES (sample) ===');
  console.log(JSON.stringify(shippedLines, null, 2));

  // 4. For each shipped line, check if inventTrans exists
  for (const sl of shippedLines) {
    const trans = await p.inventTrans.findFirst({
      where: { refType: 'SHIPMENT', refId: sl.shipmentHeaderId, refLineId: sl.id, transType: 'ISSUE', isReversal: false },
    });
    console.log(`Line ${sl.id}: inventTrans = ${trans ? trans.transId : 'MISSING'}`);
  }

  // 5. Check on_hand for STEEL-HR (from screenshot)
  const steelItem = await p.mdItem.findFirst({ where: { itemCode: 'STEEL-HR' } });
  if (steelItem) {
    const onHands = await p.onHand.findMany({
      where: { itemId: steelItem.id },
      include: { inventDim: { include: { warehouse: true, owner: true, inventoryStatus: true } } },
    });
    console.log('\n=== ON_HAND for STEEL-HR ===');
    for (const oh of onHands) {
      console.log(`  physicalQty=${oh.physicalQty}, availableQty=${oh.availableQty}, allocatedQty=${oh.allocatedQty} | ${oh.inventDim?.warehouse?.warehouseCode} | ${oh.inventDim?.owner?.ownerCode} | ${oh.inventDim?.inventoryStatus?.statusCode}`);
    }
  }

  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
