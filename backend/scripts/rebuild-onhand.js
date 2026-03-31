const { PrismaClient } = require('@prisma/client');
const { MaterializationService } = require('../src/modules/inventory-core/application/materialization.service');

const p = new PrismaClient();
const mat = new MaterializationService(p);

async function main() {
  console.log('Starting on_hand rebuild from ledger...');
  const result = await mat.rebuildAll();
  console.log(`Done: ${result.rebuilt}/${result.total} on_hand records rebuilt.`);

  // Verify STEEL-HR
  const steelItem = await p.mdItem.findFirst({ where: { itemCode: 'STEEL-HR' } });
  if (steelItem) {
    const ohs = await p.onHand.findMany({
      where: { itemId: steelItem.id },
      include: { inventDim: { include: { warehouse: true, owner: true } } },
    });
    console.log('\nSTEEL-HR after rebuild:');
    for (const oh of ohs) {
      console.log(`  physical=${oh.physicalQty}, available=${oh.availableQty} | ${oh.inventDim?.warehouse?.warehouseCode} | ${oh.inventDim?.owner?.ownerCode}`);
    }
  }

  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
