/**
 * Module 3: Inventory Core Engine - Lot Service
 * Implements get_or_create_lot pattern per spec v5.1
 *
 * Lot Hash = SHA256(itemId + ownerId + warehouseId + attributes)
 * Uses MdLot model (md_lot table)
 */

const crypto = require('crypto');

class LotService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  /**
   * get_or_create_lot — Core pattern
   *
   * @param {Object} input
   * @param {string} input.itemId - Required: Item UUID
   * @param {string} input.ownerId - Required: Owner UUID
   * @param {string} input.warehouseId - Required: Warehouse UUID
   * @param {string} [input.firstReceivedDate] - Optional: ISO date string
   * @param {string} [input.sourceLotId] - Optional: Source lot UUID
   * @param {Object} [input.attributes] - Optional: Extra lot attributes as JSON
   * @param {string} [input.notes] - Optional: Notes
   * @param {string} [createdBy] - User ID
   * @param {Object} [tx] - Prisma transaction client (optional)
   * @returns {Promise<{lot: Object, isNew: boolean}>}
   */
  async getOrCreateLot(input, createdBy = null, tx = null) {
    const client = tx || this.prisma;

    // Step 1: Compute lot_hash
    const lotHash = this.computeLotHash(input);

    // Step 2: Check if lot with this hash already exists
    const existingLot = await client.mdLot.findUnique({
      where: { lotHash },
    });

    if (existingLot) {
      return { lot: existingLot, isNew: false };
    }

    // Step 3: Generate lot code
    const lotCode = await this.generateLotCode(input.itemId, client);

    // Step 4: Create new lot
    const newLot = await client.mdLot.create({
      data: {
        lotCode,
        lotHash,
        itemId: input.itemId,
        ownerId: input.ownerId,
        warehouseId: input.warehouseId,
        firstReceivedDate: input.firstReceivedDate ? new Date(input.firstReceivedDate) : new Date(),
        sourceLotId: input.sourceLotId || null,
        attributes: input.attributes || null,
        notes: input.notes || null,
        createdBy,
      },
    });

    return { lot: newLot, isNew: true };
  }

  /**
   * Compute lot_hash — deterministic hash from lot identity fields
   */
  computeLotHash(input) {
    const parts = [
      input.itemId || '',
      input.ownerId || '',
      input.warehouseId || '',
      input.attributes ? JSON.stringify(input.attributes) : '',
    ];

    return crypto
      .createHash('sha256')
      .update(parts.join('|'))
      .digest('hex');
  }

  /**
   * Generate unique lot code: LOT-{YYYYMMDD}-{SEQ}
   */
  async generateLotCode(_itemId, client) {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    // Count existing lots created today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const count = await client.mdLot.count({
      where: {
        createdAt: { gte: todayStart },
      },
    });

    const seq = String(count + 1).padStart(4, '0');
    return `LOT-${dateStr}-${seq}`;
  }

  /**
   * Find lot by ID
   */
  async findById(lotId, tx = null) {
    const client = tx || this.prisma;
    return client.mdLot.findUnique({
      where: { id: lotId },
      include: {
        item: { select: { id: true, itemCode: true, itemName: true } },
        owner: { select: { id: true, ownerCode: true, ownerName: true } },
        warehouse: { select: { id: true, warehouseCode: true, warehouseName: true } },
      },
    });
  }

  /**
   * Find lot by lotCode
   */
  async findByLotCode(lotCode, tx = null) {
    const client = tx || this.prisma;
    return client.mdLot.findUnique({
      where: { lotCode },
      include: {
        item: { select: { id: true, itemCode: true, itemName: true } },
        owner: { select: { id: true, ownerCode: true, ownerName: true } },
        warehouse: { select: { id: true, warehouseCode: true, warehouseName: true } },
      },
    });
  }

  /**
   * Find lot by hash (for dedup check)
   */
  async findByHash(lotHash, tx = null) {
    const client = tx || this.prisma;
    return client.mdLot.findUnique({ where: { lotHash } });
  }

  /**
   * List lots with filters
   */
  async findMany(params = {}) {
    const {
      itemId,
      ownerId,
      warehouseId,
      search,
      status,
      isActive = true,
      skip = 0,
      take = 20,
    } = params;

    const where = {};
    if (itemId) where.itemId = itemId;
    if (ownerId) where.ownerId = ownerId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (status) where.status = status;
    if (isActive !== undefined) where.isActive = isActive;
    if (search) {
      where.OR = [
        { lotCode: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.mdLot.findMany({
        where,
        include: {
          item: { select: { id: true, itemCode: true, itemName: true } },
          owner: { select: { id: true, ownerCode: true, ownerName: true } },
          warehouse: { select: { id: true, warehouseCode: true, warehouseName: true } },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.mdLot.count({ where }),
    ]);

    return { data, total, skip, take };
  }

  /**
   * Resolve lot from inbound receipt context
   * Used by inbound flow to auto-assign lots during receiving
   */
  async resolveFromReceipt(receiptHeader, receiptLine, createdBy = null, tx = null) {
    const lotInput = {
      itemId: receiptLine.itemId,
      ownerId: receiptHeader.ownerId,
      warehouseId: receiptHeader.warehouseId,
    };

    return this.getOrCreateLot(lotInput, createdBy, tx);
  }
}

module.exports = { LotService };
