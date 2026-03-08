/**
 * Module 3: Inventory Core Engine - InventDim Repository
 */

const crypto = require('crypto');

class InventDimRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  /**
   * Generate dimension hash from normalized values
   */
  generateDimHash(siteId, warehouseCode, locationCode, ownerCode, statusCode) {
    const normalized = [
      siteId.trim().toUpperCase(),
      warehouseCode.trim().toUpperCase(),
      locationCode.trim().toUpperCase(),
      ownerCode.trim().toUpperCase(),
      statusCode.trim().toUpperCase(),
    ].join('|');

    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Generate unique dimId
   */
  generateDimId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `DIM-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Find dimension by hash
   */
  async findByHash(dimHash, tx = null) {
    const client = tx || this.prisma;
    return client.inventDim.findUnique({
      where: { dimHash },
    });
  }

  /**
   * Find dimension by ID
   */
  async findById(id, tx = null) {
    const client = tx || this.prisma;
    return client.inventDim.findUnique({
      where: { id },
      include: {
        warehouse: true,
        location: true,
        owner: true,
        inventoryStatus: true,
      },
    });
  }

  /**
   * Create new dimension
   */
  async create(data, tx = null) {
    const client = tx || this.prisma;
    return client.inventDim.create({
      data: {
        dimId: data.dimId || this.generateDimId(),
        dimHash: data.dimHash,
        siteId: data.siteId,
        warehouseId: data.warehouseId,
        locationId: data.locationId,
        ownerId: data.ownerId,
        inventoryStatusId: data.inventoryStatusId,
        isActive: true,
        createdBy: data.createdBy,
      },
    });
  }

  /**
   * Get or create dimension (thread-safe with unique constraint)
   */
  async getOrCreate(dimInput, tx = null) {
    const client = tx || this.prisma;
    const dimHash = this.generateDimHash(
      dimInput.siteId,
      dimInput.warehouseCode,
      dimInput.locationCode,
      dimInput.ownerCode,
      dimInput.statusCode
    );

    let dim = await this.findByHash(dimHash, client);
    if (dim) {
      return { dim, created: false };
    }

    try {
      dim = await this.create(
        {
          dimHash,
          siteId: dimInput.siteId,
          warehouseId: dimInput.warehouseId,
          locationId: dimInput.locationId,
          ownerId: dimInput.ownerId,
          inventoryStatusId: dimInput.inventoryStatusId,
          createdBy: dimInput.createdBy,
        },
        client
      );
      return { dim, created: true };
    } catch (error) {
      if (error.code === 'P2002') {
        dim = await this.findByHash(dimHash, client);
        if (dim) {
          return { dim, created: false };
        }
      }
      throw error;
    }
  }

  /**
   * Find dimensions with filters
   */
  async findMany(filters, pagination = {}, tx = null) {
    const client = tx || this.prisma;
    const { page = 1, pageSize = 50 } = pagination;

    const where = { isActive: true };

    if (filters.warehouseId) {
      where.warehouseId = filters.warehouseId;
    }
    if (filters.locationId) {
      where.locationId = filters.locationId;
    }
    if (filters.ownerId) {
      where.ownerId = filters.ownerId;
    }
    if (filters.inventoryStatusId) {
      where.inventoryStatusId = filters.inventoryStatusId;
    }

    const [items, total] = await Promise.all([
      client.inventDim.findMany({
        where,
        include: {
          warehouse: { select: { warehouseCode: true, warehouseName: true } },
          location: { select: { locationCode: true, locationType: true } },
          owner: { select: { ownerCode: true, ownerName: true } },
          inventoryStatus: { select: { statusCode: true, description: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      client.inventDim.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }
}

module.exports = { InventDimRepository };
