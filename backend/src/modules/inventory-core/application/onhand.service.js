/**
 * Module 3: Inventory Core Engine - OnHand Service
 */

const { Decimal } = require('decimal.js');
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
   * HI-3 Fix: Use Decimal.js for precision
   */
  async checkAvailability(itemId, inventDimId, requestedQty) {
    const onHand = await this.onHandRepo.findByItemAndDim(itemId, inventDimId);

    if (!onHand) {
      return {
        available: false,
        physicalQty: '0',
        allocatedQty: '0',
        availableQty: '0',
        requestedQty: String(requestedQty),
        shortfall: String(requestedQty),
      };
    }

    const availableQty = new Decimal(onHand.availableQty);
    const requested = new Decimal(requestedQty);
    const shortfall = Decimal.max(0, requested.minus(availableQty));

    return {
      available: availableQty.gte(requested),
      physicalQty: String(onHand.physicalQty),
      allocatedQty: String(onHand.allocatedQty),
      availableQty: String(onHand.availableQty),
      requestedQty: requested.toString(),
      shortfall: shortfall.toString(),
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
   * HI-3 Fix: Use database-level GROUP BY aggregation with Decimal.js
   */
  async aggregateOnHand(groupBy, filters = {}) {
    const groupByColumn = this.getGroupByColumn(groupBy);
    
    const results = await this.prisma.$queryRaw`
      SELECT 
        ${groupByColumn} as group_key,
        SUM(oh.physical_qty) as physical_qty,
        SUM(oh.allocated_qty) as allocated_qty,
        SUM(oh.available_qty) as available_qty,
        COUNT(*) as record_count
      FROM on_hand oh
      LEFT JOIN invent_dim dim ON oh.invent_dim_id = dim.id
      LEFT JOIN md_warehouse wh ON dim.warehouse_id = wh.id
      LEFT JOIN md_location loc ON dim.location_id = loc.id
      LEFT JOIN md_owner ow ON dim.owner_id = ow.id
      LEFT JOIN md_inventory_status st ON dim.inventory_status_id = st.id
      LEFT JOIN md_item item ON oh.item_id = item.id
      ${filters.warehouseId ? this.prisma.$queryRaw`WHERE dim.warehouse_id = ${filters.warehouseId}::uuid` : this.prisma.$queryRaw``}
      GROUP BY ${groupByColumn}
    `;

    return results.map(row => ({
      key: row.group_key,
      physicalQty: new Decimal(row.physical_qty || 0).toString(),
      allocatedQty: new Decimal(row.allocated_qty || 0).toString(),
      availableQty: new Decimal(row.available_qty || 0).toString(),
      recordCount: Number(row.record_count),
    }));
  }

  /**
   * Get GROUP BY column based on groupBy parameter
   */
  getGroupByColumn(groupBy) {
    switch (groupBy) {
      case 'warehouse':
        return this.prisma.$queryRaw`wh.warehouse_code`;
      case 'owner':
        return this.prisma.$queryRaw`ow.owner_code`;
      case 'item':
        return this.prisma.$queryRaw`item.item_code`;
      case 'location':
        return this.prisma.$queryRaw`CONCAT(wh.warehouse_code, '|', loc.location_code)`;
      case 'status':
        return this.prisma.$queryRaw`st.status_code`;
      default:
        return this.prisma.$queryRaw`'all'`;
    }
  }
}

module.exports = { OnHandService };
