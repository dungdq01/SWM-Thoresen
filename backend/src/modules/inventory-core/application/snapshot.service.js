/**
 * Module 3: Inventory Core Engine - Snapshot Service
 * HI-1 Fix: Implement daily storage snapshot for M10 Billing
 */

const { Decimal } = require('decimal.js');
const {
  SnapshotRunMode,
  SnapshotRunStatus,
} = require('../domain/inventory.types');

class SnapshotService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  /**
   * Create a daily storage snapshot run
   */
  async createSnapshotRun(command) {
    const {
      snapshotDate,
      warehouseId,
      mode = SnapshotRunMode.MANUAL,
      triggeredBy,
      correlationId,
    } = command;

    const targetDate = snapshotDate ? new Date(snapshotDate) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const existingRun = await this.prisma.inventorySnapshotRun.findFirst({
      where: {
        snapshotDate: targetDate,
        warehouseId,
        status: SnapshotRunStatus.COMPLETED,
      },
    });

    if (existingRun && mode !== SnapshotRunMode.RERUN) {
      return {
        runId: existingRun.id,
        status: 'ALREADY_EXISTS',
        snapshotDate: targetDate,
        message: 'Snapshot đã tồn tại cho ngày này. Dùng mode=RERUN để chạy lại.',
      };
    }

    // Get next version number for this date/warehouse combination
    const latestRun = await this.prisma.inventorySnapshotRun.findFirst({
      where: {
        snapshotDate: targetDate,
        warehouseId: warehouseId || null,
      },
      orderBy: { versionNo: 'desc' },
    });
    const nextVersionNo = (latestRun?.versionNo || 0) + 1;

    const runNo = await this.generateRunNo(targetDate);
    const run = await this.prisma.inventorySnapshotRun.create({
      data: {
        runNo,
        snapshotDate: targetDate,
        warehouseId: warehouseId || null,
        cutOffTime: new Date(),
        runMode: mode,
        versionNo: nextVersionNo,
        status: SnapshotRunStatus.RUNNING,
        startedAt: new Date(),
        requestedBy: triggeredBy || null,
        correlationId,
      },
    });

    try {
      const results = await this.executeSnapshot(run, targetDate);

      await this.prisma.inventorySnapshotRun.update({
        where: { id: run.id },
        data: {
          status: SnapshotRunStatus.COMPLETED,
          completedAt: new Date(),
          recordCount: results.recordCount,
          totalQtyKg: results.totalQtyKg,
        },
      });

      return {
        runId: run.id,
        status: 'COMPLETED',
        snapshotDate: targetDate,
        recordCount: results.recordCount,
        totalQtyKg: results.totalQtyKg,
      };
    } catch (error) {
      await this.prisma.inventorySnapshotRun.update({
        where: { id: run.id },
        data: {
          status: SnapshotRunStatus.FAILED,
          completedAt: new Date(),
        },
      });
      console.error('Snapshot error:', error.message);
      throw error;
    }
  }

  /**
   * Execute snapshot capture
   */
  async executeSnapshot(run, snapshotDate) {
    const whereClause = run.warehouseId
      ? { inventDim: { warehouseId: run.warehouseId } }
      : {};

    const onHandRecords = await this.prisma.onHand.findMany({
      where: whereClause,
      include: {
        item: { select: { id: true, itemCode: true, cargoForm: true } },
        inventDim: {
          include: {
            warehouse: { select: { id: true, warehouseCode: true } },
            location: { select: { id: true, locationCode: true, zoneId: true } },
            owner: { select: { id: true, ownerCode: true } },
            inventoryStatus: { select: { id: true, statusCode: true } },
          },
        },
      },
    });

    let totalQtyKg = new Decimal(0);
    const snapshots = [];

    for (const onHand of onHandRecords) {
      const qtyKg = new Decimal(onHand.physicalQty);
      totalQtyKg = totalQtyKg.plus(qtyKg);

      snapshots.push({
        snapshotRunId: run.id,
        snapshotDate,
        warehouseId: onHand.inventDim.warehouseId,
        locationId: onHand.inventDim.locationId,
        ownerId: onHand.inventDim.ownerId,
        itemId: onHand.itemId,
        inventDimId: onHand.inventDimId,
        openingQty: qtyKg.toFixed(3),
        inboundTodayQty: '0.000',
        outboundTodayQty: '0.000',
        closingQty: qtyKg.toFixed(3),
        cutOffTime: new Date(),
        snapshotSource: 'MANUAL',
      });
    }

    if (snapshots.length > 0) {
      if (run.runMode === SnapshotRunMode.RERUN) {
        await this.prisma.dailyStorageSnapshot.deleteMany({
          where: {
            snapshotDate,
            warehouseId: run.warehouseId || undefined,
          },
        });
      }

      await this.prisma.dailyStorageSnapshot.createMany({
        data: snapshots,
        skipDuplicates: true,
      });
    }

    return {
      recordCount: snapshots.length,
      totalQtyKg: totalQtyKg.toFixed(3),
    };
  }

  /**
   * Get snapshot run by ID
   */
  async getRunById(runId) {
    return this.prisma.inventorySnapshotRun.findUnique({
      where: { id: runId },
      include: {
        warehouse: { select: { warehouseCode: true } },
      },
    });
  }

  /**
   * List snapshot runs
   */
  async listRuns(filters = {}, pagination = {}) {
    const { page = 1, pageSize = 20 } = pagination;
    const where = {};

    if (filters.warehouseId) where.warehouseId = filters.warehouseId;
    if (filters.status) where.status = filters.status;
    if (filters.fromDate) where.snapshotDate = { gte: new Date(filters.fromDate) };
    if (filters.toDate) {
      where.snapshotDate = { ...where.snapshotDate, lte: new Date(filters.toDate) };
    }

    const [items, total] = await Promise.all([
      this.prisma.inventorySnapshotRun.findMany({
        where,
        include: {
          warehouse: { select: { warehouseCode: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { snapshotDate: 'desc' },
      }),
      this.prisma.inventorySnapshotRun.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  /**
   * Get daily snapshots for billing
   */
  async getSnapshotsForBilling(filters, pagination = {}) {
    const { page = 1, pageSize = 100 } = pagination;
    const where = {};

    if (filters.warehouseId) where.warehouseId = filters.warehouseId;
    if (filters.ownerId) where.ownerId = filters.ownerId;
    if (filters.fromDate) where.snapshotDate = { gte: new Date(filters.fromDate) };
    if (filters.toDate) {
      where.snapshotDate = { ...where.snapshotDate, lte: new Date(filters.toDate) };
    }

    const [items, total] = await Promise.all([
      this.prisma.dailyStorageSnapshot.findMany({
        where,
        include: {
          warehouse: { select: { warehouseCode: true } },
          location: { select: { locationCode: true } },
          owner: { select: { ownerCode: true } },
          item: { select: { itemCode: true, itemName: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ snapshotDate: 'desc' }, { ownerId: 'asc' }],
      }),
      this.prisma.dailyStorageSnapshot.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  /**
   * Aggregate snapshots by owner for billing period
   */
  async aggregateForBillingPeriod(filters) {
    const { warehouseId, ownerId, fromDate, toDate } = filters;

    const results = await this.prisma.$queryRaw`
      SELECT 
        owner_id,
        item_id,
        cargo_form,
        COUNT(DISTINCT snapshot_date) as days_stored,
        AVG(qty_mt) as avg_qty_mt,
        SUM(qty_mt) as total_mt_days
      FROM daily_storage_snapshot
      WHERE snapshot_date >= ${new Date(fromDate)}::date
        AND snapshot_date <= ${new Date(toDate)}::date
        ${warehouseId ? this.prisma.$queryRaw`AND warehouse_id = ${warehouseId}::uuid` : this.prisma.$queryRaw``}
        ${ownerId ? this.prisma.$queryRaw`AND owner_id = ${ownerId}::uuid` : this.prisma.$queryRaw``}
      GROUP BY owner_id, item_id, cargo_form
      ORDER BY owner_id, item_id
    `;

    return results.map(row => ({
      ownerId: row.owner_id,
      itemId: row.item_id,
      cargoForm: row.cargo_form,
      daysStored: Number(row.days_stored),
      avgQtyMt: new Decimal(row.avg_qty_mt || 0).toFixed(6),
      totalMtDays: new Decimal(row.total_mt_days || 0).toFixed(6),
    }));
  }

  /**
   * Generate unique run number
   */
  async generateRunNo(snapshotDate) {
    const dateStr = snapshotDate.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.prisma.inventorySnapshotRun.count({
      where: {
        runNo: { startsWith: `SNAP-${dateStr}` },
      },
    });
    const seq = String(count + 1).padStart(4, '0');
    return `SNAP-${dateStr}-${seq}`;
  }
}

module.exports = { SnapshotService };
