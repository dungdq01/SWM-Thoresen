/**
 * Module 3: Inventory Core Engine - Lot Service
 * Implements get_or_create_lot pattern per spec v5.1
 *
 * Lot Hash = SHA256(itemId + ownerId + vesselName + blNumber + countryOfOrigin + productionDate)
 * Note: warehouse_id is EXCLUDED from hash to preserve lot identity across warehouses (inter-WH transfer)
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
   * @param {string} [input.vesselId] - Optional: Vessel UUID
   * @param {string} [input.vesselName] - Optional: Vessel name (denormalized for search)
   * @param {string} [input.blNumber] - Optional: Bill of Lading number
   * @param {string} [input.countryOfOrigin] - Optional
   * @param {string} [input.productionDate] - Optional: ISO date string
   * @param {string} [input.expiryDate] - Optional: ISO date string
   * @param {string} [input.supplierLotRef] - Optional: Supplier's lot reference
   * @param {string} [input.certificateRef] - Optional: Quality certificate ref
   * @param {Object} [input.attributes] - Optional: Extra lot attributes as JSON
   * @param {string} [createdBy] - User ID
   * @param {Object} [tx] - Prisma transaction client (optional)
   * @returns {Promise<{lot: Object, isNew: boolean}>}
   */
  async getOrCreateLot(input, createdBy = null, tx = null) {
    const client = tx || this.prisma;

    // Step 1: Compute lot_hash (excluding warehouse for cross-WH preservation)
    const lotHash = this.computeLotHash(input);

    // Step 2: Check if lot with this hash already exists
    const existingLot = await client.lot.findUnique({
      where: { lotHash },
    });

    if (existingLot) {
      return { lot: existingLot, isNew: false };
    }

    // Step 3: Generate lot_number
    const lotNumber = await this.generateLotNumber(input.itemId, client);

    // Step 4: Create new lot
    const newLot = await client.lot.create({
      data: {
        lotNumber,
        lotHash,
        itemId: input.itemId,
        ownerId: input.ownerId,
        vesselId: input.vesselId || null,
        vesselName: input.vesselName || null,
        blNumber: input.blNumber || null,
        countryOfOrigin: input.countryOfOrigin || null,
        productionDate: input.productionDate ? new Date(input.productionDate) : null,
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
        firstReceivedDate: new Date(),
        supplierLotRef: input.supplierLotRef || null,
        certificateRef: input.certificateRef || null,
        attributes: input.attributes || null,
        createdBy,
      },
    });

    return { lot: newLot, isNew: true };
  }

  /**
   * Compute lot_hash — deterministic hash from lot identity fields
   * EXCLUDES warehouse_id so lots are preserved across inter-warehouse transfers
   */
  computeLotHash(input) {
    const parts = [
      input.itemId || '',
      input.ownerId || '',
      (input.vesselName || '').trim().toLowerCase(),
      (input.blNumber || '').trim().toUpperCase(),
      (input.countryOfOrigin || '').trim().toLowerCase(),
      input.productionDate || '',
    ];

    return crypto
      .createHash('sha256')
      .update(parts.join('|'))
      .digest('hex');
  }

  /**
   * Generate unique lot number: LOT-{ITEM_CODE_PREFIX}-{YYYYMMDD}-{SEQ}
   */
  async generateLotNumber(itemId, client) {
    const item = await client.mdItem.findUnique({
      where: { id: itemId },
      select: { itemCode: true },
    });

    const prefix = item ? item.itemCode.substring(0, 6).toUpperCase() : 'UNKNWN';
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    // Count existing lots for this item today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const count = await client.lot.count({
      where: {
        itemId,
        createdAt: { gte: todayStart },
      },
    });

    const seq = String(count + 1).padStart(3, '0');
    return `LOT-${prefix}-${dateStr}-${seq}`;
  }

  /**
   * Find lot by ID
   */
  async findById(lotId, tx = null) {
    const client = tx || this.prisma;
    return client.lot.findUnique({
      where: { id: lotId },
      include: {
        item: { select: { id: true, itemCode: true, itemName: true } },
        owner: { select: { id: true, ownerCode: true, ownerName: true } },
        vessel: { select: { id: true, vesselCode: true, vesselName: true } },
      },
    });
  }

  /**
   * Find lot by lotNumber
   */
  async findByLotNumber(lotNumber, tx = null) {
    const client = tx || this.prisma;
    return client.lot.findUnique({
      where: { lotNumber },
      include: {
        item: { select: { id: true, itemCode: true, itemName: true } },
        owner: { select: { id: true, ownerCode: true, ownerName: true } },
        vessel: { select: { id: true, vesselCode: true, vesselName: true } },
      },
    });
  }

  /**
   * Find lot by hash (for dedup check)
   */
  async findByHash(lotHash, tx = null) {
    const client = tx || this.prisma;
    return client.lot.findUnique({ where: { lotHash } });
  }

  /**
   * List lots with filters
   */
  async findMany(params = {}) {
    const {
      itemId,
      ownerId,
      vesselId,
      blNumber,
      search,
      isActive = true,
      skip = 0,
      take = 20,
    } = params;

    const where = {};
    if (itemId) where.itemId = itemId;
    if (ownerId) where.ownerId = ownerId;
    if (vesselId) where.vesselId = vesselId;
    if (blNumber) where.blNumber = { contains: blNumber, mode: 'insensitive' };
    if (isActive !== undefined) where.isActive = isActive;
    if (search) {
      where.OR = [
        { lotNumber: { contains: search, mode: 'insensitive' } },
        { blNumber: { contains: search, mode: 'insensitive' } },
        { vesselName: { contains: search, mode: 'insensitive' } },
        { supplierLotRef: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.lot.findMany({
        where,
        include: {
          item: { select: { id: true, itemCode: true, itemName: true } },
          owner: { select: { id: true, ownerCode: true, ownerName: true } },
          vessel: { select: { id: true, vesselCode: true, vesselName: true } },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.lot.count({ where }),
    ]);

    return { data, total, skip, take };
  }

  /**
   * Resolve lot from inbound receipt context
   * Used by inbound flow to auto-assign lots during receiving
   */
  async resolveFromReceipt(receiptHeader, receiptLine, createdBy = null, tx = null) {
    // Build lot input from receipt context
    const lotInput = {
      itemId: receiptLine.itemId,
      ownerId: receiptHeader.ownerId,
      vesselName: receiptHeader.vesselName || null,
      blNumber: receiptHeader.blNumber || null,
    };

    // Try to resolve vesselId from vesselName
    if (receiptHeader.vesselName) {
      const client = tx || this.prisma;
      const vessel = await client.mdVessel.findFirst({
        where: {
          vesselName: { contains: receiptHeader.vesselName, mode: 'insensitive' },
          isActive: true,
        },
      });
      if (vessel) {
        lotInput.vesselId = vessel.id;
      }
    }

    return this.getOrCreateLot(lotInput, createdBy, tx);
  }
}

module.exports = { LotService };
