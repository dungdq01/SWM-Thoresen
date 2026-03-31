const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // 1. Get the inventTrans that was posted for SO-00010
  const trans = await p.inventTrans.findFirst({
    where: { transId: 'TRX-20260330-000001-ZGX3' },
    include: { dimFrom: { include: { warehouse: true, owner: true, inventoryStatus: true, location: true } } },
  });
  
  console.log('=== INVENT TRANS ===');
  console.log('transId:', trans.transId);
  console.log('qty:', String(trans.qty));
  console.log('dimFromId:', trans.dimFromId);
  console.log('dimToId:', trans.dimToId);
  console.log('dimFrom warehouse:', trans.dimFrom?.warehouse?.warehouseCode);
  console.log('dimFrom owner:', trans.dimFrom?.owner?.ownerCode);
  console.log('dimFrom status:', trans.dimFrom?.inventoryStatus?.statusCode);
  console.log('dimFrom location:', trans.dimFrom?.location?.locationCode);

  // 2. Get on_hand for STEEL-HR
  const itemId = trans.itemId;
  const onHands = await p.onHand.findMany({
    where: { itemId },
    include: { inventDim: { include: { warehouse: true, owner: true, inventoryStatus: true, location: true } } },
  });
  
  console.log('\n=== ON_HAND RECORDS ===');
  for (const oh of onHands) {
    const match = oh.inventDimId === trans.dimFromId ? ' <<<< MATCH' : '';
    console.log(`  inventDimId=${oh.inventDimId}, physical=${oh.physicalQty}, available=${oh.availableQty} | wh=${oh.inventDim?.warehouse?.warehouseCode} | owner=${oh.inventDim?.owner?.ownerCode} | status=${oh.inventDim?.inventoryStatus?.statusCode} | loc=${oh.inventDim?.location?.locationCode}${match}`);
  }

  // 3. Check if on_hand exists for the dimFromId
  const ohForDim = await p.onHand.findFirst({
    where: { itemId, inventDimId: trans.dimFromId },
  });
  console.log('\n=== ON_HAND for dimFromId ===');
  console.log(ohForDim ? `Found: physical=${ohForDim.physicalQty}, available=${ohForDim.availableQty}` : 'NOT FOUND — materialization created new record!');

  // 4. Find ALL on_hand for this item
  const allOh = await p.onHand.findMany({
    where: { itemId },
    select: { id: true, inventDimId: true, physicalQty: true, availableQty: true, allocatedQty: true },
  });
  console.log('\n=== ALL ON_HAND ===');
  for (const oh of allOh) {
    console.log(`  id=${oh.id}, dimId=${oh.inventDimId}, physical=${oh.physicalQty}, available=${oh.availableQty}, allocated=${oh.allocatedQty}`);
  }

  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
