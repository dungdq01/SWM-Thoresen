const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Find SO-00010
  const so = await p.salesOrder.findFirst({
    where: { soNumber: { contains: '00010' } },
    include: { lines: true },
  });
  
  if (!so) {
    console.log('SO-00010 not found');
    return;
  }

  console.log('=== SO ===');
  console.log('soNumber:', so.soNumber);
  console.log('status:', so.status);
  console.log('totalExpectedQtyKg:', String(so.totalExpectedQtyKg));
  console.log('totalShippedQtyKg:', String(so.totalShippedQtyKg));
  
  for (const l of so.lines) {
    console.log(`  Line: expectedQtyKg=${l.expectedQtyKg}, shippedQtyKg=${l.shippedQtyKg}, status=${l.status}`);
  }

  // Find shipments for this SO
  const shps = await p.shipmentHeader.findMany({
    where: { salesOrderId: so.id },
    include: {
      lines: { select: { id: true, lineStatus: true, shippedQty: true, netWeightKg: true, itemId: true } },
      warehouse: { select: { warehouseCode: true } },
      owner: { select: { ownerCode: true } },
    },
  });

  console.log('\n=== SHIPMENTS ===');
  for (const s of shps) {
    console.log(`Shipment: ${s.shipmentNumber}, status=${s.status}, wh=${s.warehouse?.warehouseCode}, owner=${s.owner?.ownerCode}`);
    for (const l of s.lines) {
      const trans = await p.inventTrans.findFirst({
        where: { refType: 'SHIPMENT', refId: s.id, refLineId: l.id, transType: 'ISSUE', isReversal: false },
        select: { transId: true, qty: true, stage: true, dimFromId: true },
      });
      console.log(`  Line: lineStatus=${l.lineStatus}, shippedQty=${l.shippedQty}, netWeightKg=${l.netWeightKg}`);
      if (trans) {
        console.log(`    inventTrans: ${trans.transId}, qty=${trans.qty}, stage=${trans.stage}, dimFromId=${trans.dimFromId}`);
      } else {
        console.log(`    inventTrans: MISSING!`);
      }
    }
  }

  // Check on_hand for this SO's item
  if (so.lines.length > 0) {
    const itemId = so.lines[0].itemId;
    const item = await p.mdItem.findUnique({ where: { id: itemId } });
    console.log(`\n=== ON_HAND for ${item?.itemCode} (itemId=${itemId}) ===`);
    const onHands = await p.onHand.findMany({
      where: { itemId },
      include: { inventDim: { include: { warehouse: true, owner: true, inventoryStatus: true, location: true } } },
    });
    for (const oh of onHands) {
      console.log(`  physical=${oh.physicalQty}, available=${oh.availableQty}, allocated=${oh.allocatedQty} | wh=${oh.inventDim?.warehouse?.warehouseCode} | owner=${oh.inventDim?.owner?.ownerCode} | status=${oh.inventDim?.inventoryStatus?.statusCode} | loc=${oh.inventDim?.location?.locationCode}`);
    }

    // Check ALL inventTrans for this item
    const allTrans = await p.inventTrans.findMany({
      where: { itemId, transType: 'ISSUE', isReversal: false },
      select: { transId: true, qty: true, stage: true, refType: true, refId: true },
      orderBy: { postedAt: 'desc' },
      take: 10,
    });
    console.log(`\n=== Recent ISSUE transactions for ${item?.itemCode} ===`);
    for (const t of allTrans) {
      console.log(`  ${t.transId}: qty=${t.qty}, stage=${t.stage}, refType=${t.refType}, refId=${t.refId}`);
    }
  }

  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
