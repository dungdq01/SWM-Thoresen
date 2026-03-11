/**
 * Debug: trace why allocation can't find OnHand for CONFIRMED shipments
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Get CONFIRMED shipments with their lines
  const shipments = await prisma.shipmentHeader.findMany({
    where: { status: 'CONFIRMED' },
    include: {
      lines: { include: { item: true } },
      owner: true,
      warehouse: true,
    },
    take: 3,
  });

  for (const sh of shipments) {
    console.log(`\n=== Shipment: ${sh.shipmentNumber || sh.id} ===`);
    console.log(`  Owner: ${sh.owner?.ownerCode} (${sh.ownerId})`);
    console.log(`  Warehouse: ${sh.warehouse?.warehouseCode} (${sh.warehouseId})`);

    for (const line of sh.lines) {
      console.log(`  Line ${line.lineNumber}: item=${line.item?.itemCode} (${line.itemId})`);

      // 2. Check mdInventoryStatus for 'AVAILABLE'
      const status = await prisma.mdInventoryStatus.findFirst({
        where: { statusCode: 'AVAILABLE', isActive: true },
      });
      console.log(`  Status AVAILABLE: ${status ? status.id : 'NOT FOUND'}`);

      // 3. Check inventDim for this owner+warehouse
      const dims = await prisma.inventDim.findMany({
        where: {
          ownerId: sh.ownerId,
          warehouseId: sh.warehouseId,
        },
        take: 3,
      });
      console.log(`  InventDim matches (owner+warehouse): ${dims.length}`);

      // 4. Check OnHand for this item with ANY inventDim
      const onHandAny = await prisma.onHand.findMany({
        where: { itemId: line.itemId, availableQty: { gt: 0 } },
        include: { inventDim: { include: { owner: true, warehouse: true, inventoryStatus: true } } },
        take: 3,
      });
      console.log(`  OnHand for item (any owner/wh): ${onHandAny.length}`);
      for (const oh of onHandAny) {
        console.log(`    → owner=${oh.inventDim.owner?.ownerCode}(${oh.inventDim.ownerId}), wh=${oh.inventDim.warehouse?.warehouseCode}(${oh.inventDim.warehouseId}), status=${oh.inventDim.inventoryStatus?.statusCode}(${oh.inventDim.inventoryStatusId}), avail=${oh.availableQty}`);
      }

      // 5. Full match query (same as allocateShipment)
      if (status) {
        const fullMatch = await prisma.onHand.findMany({
          where: {
            itemId: line.itemId,
            availableQty: { gt: 0 },
            inventDim: {
              ownerId: sh.ownerId,
              warehouseId: sh.warehouseId,
              inventoryStatusId: status.id,
            },
          },
          take: 3,
        });
        console.log(`  Full match (item+owner+wh+status): ${fullMatch.length}`);
      }
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
