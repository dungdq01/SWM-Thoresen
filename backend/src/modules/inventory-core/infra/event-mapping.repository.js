/**
 * Module 3: Inventory Core Engine - EventMapping Repository
 */

class EventMappingRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  /**
   * Find event mapping by event code
   */
  async findByEventCode(eventCode, tx = null) {
    const client = tx || this.prisma;
    return client.inventoryEventMapping.findUnique({
      where: { eventCode },
    });
  }

  /**
   * Find active event mapping by event code
   */
  async findActiveByEventCode(eventCode, tx = null) {
    const client = tx || this.prisma;
    return client.inventoryEventMapping.findFirst({
      where: {
        eventCode,
        activeFlag: true,
      },
    });
  }

  /**
   * Find all active event mappings
   */
  async findAllActive(tx = null) {
    const client = tx || this.prisma;
    return client.inventoryEventMapping.findMany({
      where: { activeFlag: true },
      orderBy: { eventCode: 'asc' },
    });
  }

  /**
   * Find event mappings by source module
   */
  async findBySourceModule(sourceModule, tx = null) {
    const client = tx || this.prisma;
    return client.inventoryEventMapping.findMany({
      where: {
        sourceModule,
        activeFlag: true,
      },
    });
  }
}

module.exports = { EventMappingRepository };
