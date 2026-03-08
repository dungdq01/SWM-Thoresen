/**
 * Module 3: Inventory Core Engine - InventDim Service
 */

const { InventDimRepository } = require('../infra/invent-dim.repository');
const { masterInactiveError } = require('../domain/inventory.errors');

class InventDimService {
  constructor(prisma) {
    this.prisma = prisma;
    this.inventDimRepo = new InventDimRepository(prisma);
  }

  /**
   * Resolve dimension from input codes
   * Validates master data and creates/gets dimension record
   */
  async resolveDimension(dimInput, tx = null) {
    const client = tx || this.prisma;

    const warehouse = await client.mdWarehouse.findFirst({
      where: {
        warehouseCode: dimInput.warehouseCode,
        isActive: true,
      },
    });
    if (!warehouse) {
      throw masterInactiveError('Warehouse', dimInput.warehouseCode);
    }

    const location = await client.mdLocation.findFirst({
      where: {
        warehouseId: warehouse.id,
        locationCode: dimInput.locationCode,
        isActive: true,
      },
    });
    if (!location) {
      throw masterInactiveError('Location', dimInput.locationCode);
    }

    const owner = await client.mdOwner.findFirst({
      where: {
        ownerCode: dimInput.ownerCode,
        isActive: true,
      },
    });
    if (!owner) {
      throw masterInactiveError('Owner', dimInput.ownerCode);
    }

    const inventoryStatus = await client.mdInventoryStatus.findFirst({
      where: {
        statusCode: dimInput.statusCode,
        isActive: true,
      },
    });
    if (!inventoryStatus) {
      throw masterInactiveError('InventoryStatus', dimInput.statusCode);
    }

    const siteId = dimInput.siteCode || warehouse.siteId || 'TVL-SITE';

    const { dim, created } = await this.inventDimRepo.getOrCreate(
      {
        siteId,
        warehouseCode: warehouse.warehouseCode,
        locationCode: location.locationCode,
        ownerCode: owner.ownerCode,
        statusCode: inventoryStatus.statusCode,
        warehouseId: warehouse.id,
        locationId: location.id,
        ownerId: owner.id,
        inventoryStatusId: inventoryStatus.id,
        createdBy: dimInput.createdBy,
      },
      client
    );

    return {
      dim,
      created,
      warehouse,
      location,
      owner,
      inventoryStatus,
    };
  }

  /**
   * Get dimension by ID with full details
   */
  async getDimensionById(dimId, tx = null) {
    return this.inventDimRepo.findById(dimId, tx);
  }

  /**
   * List dimensions with filters
   */
  async listDimensions(filters, pagination, tx = null) {
    return this.inventDimRepo.findMany(filters, pagination, tx);
  }
}

module.exports = { InventDimService };
