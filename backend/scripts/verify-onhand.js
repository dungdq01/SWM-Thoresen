const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const ohs = await p.onHand.findMany({
    where: { physicalQty: { gt: 0 } },
    include: {
      item: { select: { itemCode: true, itemName: true } },
      inventDim: {
        include: {
          warehouse: { select: { warehouseCode: true } },
          owner: { select: { ownerCode: true } },
          inventoryStatus: { select: { statusCode: true } },
          location: { select: { locationCode: true } },
        },
      },
    },
    orderBy: { physicalQty: 'desc' },
  });

  console.log('=== ON_HAND (physical > 0) ===');
  for (const oh of ohs) {
    const d = oh.inventDim;
    console.log(
      `${d?.owner?.ownerCode} | ${oh.item?.itemCode} | ${d?.warehouse?.warehouseCode}/${d?.location?.locationCode} | ${d?.inventoryStatus?.statusCode} | phys=${oh.physicalQty} avail=${oh.availableQty}`
    );
  }

  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
