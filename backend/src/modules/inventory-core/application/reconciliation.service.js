/**
 * Module 3: Inventory Core Engine - Reconciliation Service
 * HI-1 Fix: Implement reconciliation logic to compare ledger vs on-hand
 */

const { Decimal } = require('decimal.js');
const {
  ReconciliationRunType,
  ReconciliationScopeType,
  ReconciliationSeverity,
  ReconciliationResultStatus,
} = require('../domain/inventory.types');

class ReconciliationService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  /**
   * Create a new reconciliation run
   */
  async createReconciliationRun(command) {
    const {
      runType = ReconciliationRunType.ON_DEMAND,
      scopeType = ReconciliationScopeType.FULL,
      warehouseId,
      ownerId,
      itemId,
      triggeredBy,
      correlationId,
    } = command;

    const runNo = await this.generateRunNo();

    const run = await this.prisma.inventoryReconciliationRun.create({
      data: {
        runNo,
        runType,
        scopeType,
        warehouseId,
        ownerId,
        itemId,
        status: 'RUNNING',
        startedAt: new Date(),
        triggeredBy,
        correlationId,
      },
    });

    try {
      const results = await this.executeReconciliation(run);
      
      await this.prisma.inventoryReconciliationRun.update({
        where: { id: run.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          totalChecked: results.totalChecked,
          mismatchCount: results.mismatchCount,
        },
      });

      return {
        runId: run.id,
        runNo: run.runNo,
        status: 'COMPLETED',
        totalChecked: results.totalChecked,
        mismatchCount: results.mismatchCount,
        results: results.items,
      };
    } catch (error) {
      await this.prisma.inventoryReconciliationRun.update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: error.message,
        },
      });
      throw error;
    }
  }

  /**
   * Execute reconciliation logic
   */
  async executeReconciliation(run) {
    const whereClause = this.buildWhereClause(run);

    const onHandRecords = await this.prisma.onHand.findMany({
      where: whereClause,
      include: {
        item: { select: { itemCode: true, itemName: true } },
        inventDim: {
          include: {
            warehouse: { select: { warehouseCode: true } },
            location: { select: { locationCode: true } },
            owner: { select: { ownerCode: true } },
            inventoryStatus: { select: { statusCode: true } },
          },
        },
      },
    });

    const ledgerAggregates = await this.calculateLedgerAggregates(whereClause);
    const results = [];
    let mismatchCount = 0;

    for (const onHand of onHandRecords) {
      const key = `${onHand.itemId}|${onHand.inventDimId}`;
      const ledgerQty = ledgerAggregates.get(key) || new Decimal(0);
      const onHandQty = new Decimal(onHand.physicalQty);
      const variance = ledgerQty.minus(onHandQty);

      if (!variance.isZero()) {
        mismatchCount++;
        const severity = this.calculateSeverity(variance, onHandQty);

        const result = await this.prisma.inventoryReconciliationResult.create({
          data: {
            runId: run.id,
            itemId: onHand.itemId,
            inventDimId: onHand.inventDimId,
            onHandQty: onHandQty.toFixed(3),
            ledgerQty: ledgerQty.toFixed(3),
            varianceQty: variance.toFixed(3),
            severity,
            status: ReconciliationResultStatus.MISMATCH,
          },
        });

        results.push({
          id: result.id,
          itemCode: onHand.item.itemCode,
          warehouseCode: onHand.inventDim.warehouse.warehouseCode,
          locationCode: onHand.inventDim.location?.locationCode,
          ownerCode: onHand.inventDim.owner?.ownerCode,
          onHandQty: onHandQty.toString(),
          ledgerQty: ledgerQty.toString(),
          varianceQty: variance.toString(),
          severity,
        });
      }
    }

    return {
      totalChecked: onHandRecords.length,
      mismatchCount,
      items: results,
    };
  }

  /**
   * Calculate ledger aggregates from invent_trans
   */
  async calculateLedgerAggregates(whereClause) {
    const transactions = await this.prisma.inventTrans.findMany({
      where: { stage: 'PHYSICAL' },
      select: {
        itemId: true,
        dimFromId: true,
        dimToId: true,
        qty: true,
        transType: true,
      },
    });

    const ledgerMap = new Map();

    for (const trans of transactions) {
      const qty = new Decimal(trans.qty);

      if (trans.dimToId) {
        const key = `${trans.itemId}|${trans.dimToId}`;
        const current = ledgerMap.get(key) || new Decimal(0);
        ledgerMap.set(key, current.plus(qty.abs()));
      }

      if (trans.dimFromId) {
        const key = `${trans.itemId}|${trans.dimFromId}`;
        const current = ledgerMap.get(key) || new Decimal(0);
        ledgerMap.set(key, current.minus(qty.abs()));
      }
    }

    return ledgerMap;
  }

  /**
   * Calculate severity based on variance
   */
  calculateSeverity(variance, baseQty) {
    if (baseQty.isZero()) {
      return variance.abs().gte(100) ? ReconciliationSeverity.CRITICAL : ReconciliationSeverity.HIGH;
    }

    const variancePct = variance.abs().div(baseQty.abs()).times(100);

    if (variancePct.gte(10)) return ReconciliationSeverity.CRITICAL;
    if (variancePct.gte(5)) return ReconciliationSeverity.HIGH;
    if (variancePct.gte(1)) return ReconciliationSeverity.MEDIUM;
    return ReconciliationSeverity.INFO;
  }

  /**
   * Build WHERE clause based on scope
   */
  buildWhereClause(run) {
    const where = {};

    if (run.warehouseId) {
      where.inventDim = { warehouseId: run.warehouseId };
    }
    if (run.ownerId) {
      where.inventDim = { ...where.inventDim, ownerId: run.ownerId };
    }
    if (run.itemId) {
      where.itemId = run.itemId;
    }

    return where;
  }

  /**
   * Generate run number
   */
  async generateRunNo() {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `RECON-${dateStr}-${random}`;
  }

  /**
   * Get reconciliation run by ID
   */
  async getRunById(runId) {
    return this.prisma.inventoryReconciliationRun.findUnique({
      where: { id: runId },
      include: {
        results: {
          include: {
            item: { select: { itemCode: true, itemName: true } },
          },
        },
      },
    });
  }

  /**
   * List reconciliation runs
   */
  async listRuns(filters = {}, pagination = {}) {
    const { page = 1, pageSize = 20 } = pagination;
    const where = {};

    if (filters.warehouseId) where.warehouseId = filters.warehouseId;
    if (filters.status) where.status = filters.status;
    if (filters.fromDate) where.startedAt = { gte: new Date(filters.fromDate) };

    const [items, total] = await Promise.all([
      this.prisma.inventoryReconciliationRun.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { startedAt: 'desc' },
      }),
      this.prisma.inventoryReconciliationRun.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  /**
   * Mark result as reviewed
   */
  async reviewResult(resultId, reviewedBy, note) {
    return this.prisma.inventoryReconciliationResult.update({
      where: { id: resultId },
      data: {
        status: ReconciliationResultStatus.REVIEWED,
        reviewedBy,
        reviewedAt: new Date(),
        note,
      },
    });
  }

  /**
   * Mark result as resolved
   */
  async resolveResult(resultId, resolvedBy, resolutionNote) {
    return this.prisma.inventoryReconciliationResult.update({
      where: { id: resultId },
      data: {
        status: ReconciliationResultStatus.RESOLVED,
        resolvedBy,
        resolvedAt: new Date(),
        resolutionNote,
      },
    });
  }
}

module.exports = { ReconciliationService };
