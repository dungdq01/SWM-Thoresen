/**
 * Module 3: Inventory Core Engine - OnHand Service
 */

const { OnHandRepository } = require('../infra/onhand.repository');
const { InventTransRepository } = require('../infra/invent-trans.repository');

class OnHandService {
  constructor(prisma) {
    this.prisma = prisma;
    this.onHandRepo = new OnHandRepository(prisma);
    this.inventTransRepo = new InventTransRepository(prisma);
  }

  /**
   * Query on-hand with filters
   */
  async queryOnHand(filters, pagination) {
    return this.onHandRepo.findMany(filters, pagination);
  }

  /**
   * Get on-hand by item and dimension
   */
  async getOnHandByItemDim(itemId, inventDimId) {
    return this.onHandRepo.findByItemAndDim(itemId, inventDimId);
  }

  /**
   * Check availability for allocation
   */
  async checkAvailability(itemId, inventDimId, requestedQty) {
    const onHand = await this.onHandRepo.findByItemAndDim(itemId, inventDimId);

    if (!onHand) {
      return {
        available: false,
        physicalQty: '0',
        reservedQty: '0',
        availableQty: '0',
        requestedQty: String(requestedQty),
        shortfall: String(requestedQty),
      };
    }

    const availableQty = parseFloat(onHand.availableQty);
    const requested = parseFloat(requestedQty);
    const shortfall = Math.max(0, requested - availableQty);

    return {
      available: availableQty >= requested,
      physicalQty: String(onHand.physicalQty),
      reservedQty: String(onHand.reservedQty),
      availableQty: String(onHand.availableQty),
      requestedQty: String(requestedQty),
      shortfall: String(shortfall),
    };
  }

  /**
   * Get transaction history for an on-hand position
   */
  async getTransactionHistory(filters, pagination) {
    return this.inventTransRepo.findMany(filters, pagination);
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(transId) {
    return this.inventTransRepo.findByTransId(transId);
  }

  /**
   * Get transaction detail with full info
   */
  async getTransactionDetail(id) {
    return this.inventTransRepo.findById(id);
  }

  /**
   * Aggregate on-hand by various dimensions
   */
  async aggregateOnHand(groupBy, filters = {}) {
    const onHandRecords = await this.onHandRepo.findMany(filters, { page: 1, pageSize: 10000 });

    const aggregation = new Map();

    for (const record of onHandRecords.items) {
      let key = '';
      const dim = record.inventDim;

      switch (groupBy) {
        case 'warehouse':
          key = dim.warehouse.warehouseCode;
          break;
        case 'owner':
          key = dim.owner.ownerCode;
          break;
        case 'item':
          key = record.item.itemCode;
          break;
        case 'location':
          key = `${dim.warehouse.warehouseCode}|${dim.location.locationCode}`;
          break;
        case 'status':
          key = dim.inventoryStatus.statusCode;
          break;
        default:
          key = 'all';
      }

      const current = aggregation.get(key) || {
        key,
        physicalQty: 0,
        reservedQty: 0,
        availableQty: 0,
        recordCount: 0,
      };

      current.physicalQty += parseFloat(record.physicalQty);
      current.reservedQty += parseFloat(record.reservedQty);
      current.availableQty += parseFloat(record.availableQty);
      current.recordCount += 1;

      aggregation.set(key, current);
    }

    return Array.from(aggregation.values());
  }
}

module.exports = { OnHandService };
