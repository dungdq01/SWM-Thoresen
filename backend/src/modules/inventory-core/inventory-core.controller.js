/**
 * Module 3: Inventory Core Engine - Controller
 */

const { PostingEngineService } = require('./application/posting-engine.service');
const { ReversalEngineService } = require('./application/reversal-engine.service');
const { HoldService } = require('./application/hold.service');
const { OnHandService } = require('./application/onhand.service');
const { TransactionQueryService } = require('./application/transaction-query.service');
const { ReconciliationService } = require('./application/reconciliation.service');
const { SnapshotService } = require('./application/snapshot.service');
const {
  postingSchema,
  reversalSchema,
  holdCreateSchema,
  holdReleaseSchema,
  onhandQuerySchema,
  transactionQuerySchema,
  holdQuerySchema,
  reconciliationRunSchema,
  snapshotRunSchema,
  snapshotBillingQuerySchema,
} = require('./inventory-core.schema');
const { InventoryError } = require('./domain/inventory.errors');

class InventoryCoreController {
  constructor(prisma, auditLogAdapter = null) {
    this.prisma = prisma;
    this.postingEngine = new PostingEngineService(prisma, auditLogAdapter);
    this.reversalEngine = new ReversalEngineService(prisma, auditLogAdapter);
    this.holdService = new HoldService(prisma, auditLogAdapter);
    this.onHandService = new OnHandService(prisma);
    this.transactionQueryService = new TransactionQueryService(prisma);
    this.reconciliationService = new ReconciliationService(prisma);
    this.snapshotService = new SnapshotService(prisma);
    const { MaterializationService } = require('./application/materialization.service');
    this.materializationService = new MaterializationService(prisma);
    this.auditLogAdapter = auditLogAdapter;
  }

  /**
   * POST /api/v1/inventory/postings
   */
  async postInventory(req, res) {
    try {
      const { error, value } = postingSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: error.details[0].message,
        });
      }

      const userId = req.user?.id;
      const command = { ...value, postedBy: value.postedBy || userId, requestId: req.requestId };
      const result = await this.postingEngine.postInventory(command);

      // Fire-and-forget audit log
      this.postingEngine.logPostingAudit(command, result);

      const statusCode = result.idempotentReplay ? 200 : 201;
      return res.status(statusCode).json({
        success: true,
        data: result,
      });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  /**
   * POST /api/v1/inventory/postings/reverse
   */
  async reversePosting(req, res) {
    try {
      const { error, value } = reversalSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: error.details[0].message,
        });
      }

      const userId = req.user?.id;
      const command = { ...value, reversedBy: userId, requestId: req.requestId };
      const result = await this.reversalEngine.reverseTransaction(command);

      // Fire-and-forget audit log
      this.reversalEngine.logReversalAudit(command, result);

      return res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  /**
   * GET /api/v1/inventory/onhand
   */
  async queryOnHand(req, res) {
    try {
      const { error, value } = onhandQuerySchema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: error.details[0].message,
        });
      }

      const { page, pageSize, ...filters } = value;
      const result = await this.onHandService.queryOnHand(filters, { page, pageSize });

      // Get warehouseId + ownerId from inventDim for each on-hand row
      const inventDimIds = result.items.map(r => r.inventDimId).filter(Boolean);
      const dimRows = inventDimIds.length > 0
        ? await this.prisma.inventDim.findMany({
            where: { id: { in: inventDimIds } },
            select: { id: true, warehouseId: true, ownerId: true },
          })
        : [];
      const dimLookup = {};
      for (const d of dimRows) dimLookup[d.id] = { warehouseId: d.warehouseId, ownerId: d.ownerId };

      // Enrich with outbound shipped qty per item+warehouse+owner
      const outboundMap = {};
      // Enrich with inbound received qty per item+warehouse+owner
      const inboundMap = {};
      if (result.items.length > 0) {
        const shipmentLines = await this.prisma.shipmentLine.findMany({
          where: { shippedQty: { gt: 0 }, lineStatus: { notIn: ['CANCELLED'] } },
          select: { itemId: true, shippedQty: true, header: { select: { warehouseId: true, ownerId: true } } },
        });
        for (const sl of shipmentLines) {
          const key = `${sl.itemId}|${sl.header?.warehouseId}|${sl.header?.ownerId}`;
          outboundMap[key] = (outboundMap[key] || 0) + Number(sl.shippedQty || 0);
        }

        const receiptLines = await this.prisma.receiptLine.findMany({
          where: { receivedQty: { gt: 0 }, status: { notIn: ['CANCELLED'] } },
          select: { itemId: true, receivedQty: true, header: { select: { warehouseId: true, ownerId: true } } },
        });
        for (const rl of receiptLines) {
          const key = `${rl.itemId}|${rl.header?.warehouseId}|${rl.header?.ownerId}`;
          inboundMap[key] = (inboundMap[key] || 0) + Number(rl.receivedQty || 0);
        }
      }

      // Group by SKU (item + owner + warehouse + location) to calculate total physical across all statuses
      // and allocatable qty (only status with isAllocatable = true)
      const skuTotals = {};
      for (const r of result.items) {
        const dim = r.inventDim || {};
        const skuKey = `${r.itemId}|${dim.owner?.ownerCode || ''}|${dim.warehouse?.warehouseCode || ''}|${dim.location?.locationCode || ''}`;
        
        if (!skuTotals[skuKey]) {
          skuTotals[skuKey] = { totalPhysical: 0, allocatablePhysical: 0 };
        }
        
        const physical = Number(r.physicalQty) || 0;
        skuTotals[skuKey].totalPhysical += physical;
        
        // Only count as allocatable if status.isAllocatable = true
        if (dim.inventoryStatus?.isAllocatable) {
          skuTotals[skuKey].allocatablePhysical += physical;
        }
      }

      const enrichedData = result.items.map(r => {
        const dimInfo = dimLookup[r.inventDimId] || {};
        const key = `${r.itemId}|${dimInfo.warehouseId}|${dimInfo.ownerId}`;
        const dim = r.inventDim || {};
        const skuKey = `${r.itemId}|${dim.owner?.ownerCode || ''}|${dim.warehouse?.warehouseCode || ''}|${dim.location?.locationCode || ''}`;
        const totals = skuTotals[skuKey] || { totalPhysical: 0, allocatablePhysical: 0 };
        
        return {
          ...r,
          outboundDemandQty: outboundMap[key] || 0,
          inboundReceivedQty: inboundMap[key] || 0,
          // Thực tế = tổng tất cả SKU cùng loại (bao gồm cả tốt và hỏng)
          totalPhysicalQty: totals.totalPhysical,
          // Khả dụng = chỉ SKU có trạng thái tốt (isAllocatable = true)
          allocatableQty: totals.allocatablePhysical,
        };
      });

      return res.status(200).json({
        success: true,
        data: enrichedData,
        pagination: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / result.pageSize),
        },
      });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  /**
   * GET /api/v1/inventory/onhand/availability
   */
  async checkAvailability(req, res) {
    try {
      const { itemId, inventDimId, qty } = req.query;

      if (!itemId || !inventDimId || !qty) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'itemId, inventDimId, and qty are required',
        });
      }

      const result = await this.onHandService.checkAvailability(itemId, inventDimId, qty);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  /**
   * GET /api/v1/inventory/transactions
   */
  async queryTransactions(req, res) {
    try {
      const { error, value } = transactionQuerySchema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: error.details[0].message,
        });
      }

      const { page, pageSize, ...filters } = value;
      const result = await this.transactionQueryService.queryTransactions(filters, { page, pageSize });

      return res.status(200).json({
        success: true,
        data: result.items,
        pagination: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / result.pageSize),
        },
      });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  /**
   * GET /api/v1/inventory/transactions/:transId
   */
  async getTransaction(req, res) {
    try {
      const { transId } = req.params;
      const result = await this.transactionQueryService.getTransactionWithReversalInfo(transId);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: `Transaction not found: ${transId}`,
        });
      }

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  /**
   * POST /api/v1/inventory/holds
   */
  async createHold(req, res) {
    try {
      const { error, value } = holdCreateSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: error.details[0].message,
        });
      }

      const userId = req.user?.id;
      const command = { ...value, createdBy: userId, requestId: req.requestId };
      const result = await this.holdService.createHold(command);

      // Fire-and-forget audit log
      this.holdService.logHoldCreateAudit(command, result);

      const statusCode = result.idempotentReplay ? 200 : 201;
      return res.status(statusCode).json({
        success: true,
        data: result,
      });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  /**
   * GET /api/v1/inventory/holds
   */
  async queryHolds(req, res) {
    try {
      const { error, value } = holdQuerySchema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: error.details[0].message,
        });
      }

      const { page, pageSize, ...filters } = value;
      const result = await this.holdService.listHolds(filters, { page, pageSize });

      return res.status(200).json({
        success: true,
        data: result.items,
        pagination: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / result.pageSize),
        },
      });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  /**
   * GET /api/v1/inventory/holds/:holdId
   */
  async getHold(req, res) {
    try {
      const { holdId } = req.params;
      const result = await this.holdService.getHoldById(holdId);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: `Hold not found: ${holdId}`,
        });
      }

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  /**
   * POST /api/v1/inventory/holds/:holdId/release
   */
  async releaseHold(req, res) {
    try {
      const { holdId } = req.params;
      const { error, value } = holdReleaseSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: error.details[0].message,
        });
      }

      const userId = req.user?.id;
      const result = await this.holdService.releaseHold(
        holdId,
        value.releaseQty,
        userId,
        value.correlationId
      );

      // Fire-and-forget audit log
      this.holdService.logHoldReleaseAudit(
        { releasedBy: userId, correlationId: value.correlationId, requestId: req.requestId },
        result
      );

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  /**
   * POST /api/v1/inventory/holds/:holdId/cancel
   */
  async cancelHold(req, res) {
    try {
      const { holdId } = req.params;
      const { correlationId } = req.body;

      const userId = req.user?.id;
      const result = await this.holdService.cancelHold(holdId, userId, correlationId);

      // Fire-and-forget audit log
      this.holdService.logHoldCancelAudit(
        { releasedBy: userId, correlationId, requestId: req.requestId },
        result
      );

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  /**
   * Handle errors consistently
   */
  handleError(err, res) {
    console.error('Inventory Core Error:', err);

    if (err instanceof InventoryError) {
      const statusCode = this.getStatusCodeForError(err.code);
      return res.status(statusCode).json({
        success: false,
        error: err.code,
        message: err.message,
        details: err.details,
      });
    }

    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'DUPLICATE_ERROR',
        message: 'Duplicate record',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    });
  }

  /**
   * Map error codes to HTTP status codes
   */
  getStatusCodeForError(code) {
    const mapping = {
      INV_DUPLICATE_EXTERNAL_ID: 409,
      INV_IDEMPOTENCY_CONFLICT: 409,
      INV_INVALID_EVENT_CODE: 422,
      INV_INVALID_DIMENSION: 422,
      INV_MASTER_INACTIVE: 422,
      INV_INSUFFICIENT_STOCK: 422,
      INV_NEGATIVE_STOCK_BLOCKED: 422,
      INV_REVERSAL_NOT_ALLOWED: 422,
      INV_ALREADY_REVERSED: 409,
      INV_HOLD_NOT_FOUND: 404,
      INV_HOLD_INSUFFICIENT_QTY: 422,
      INV_LOCK_TIMEOUT: 503,
      INV_TRANS_NOT_FOUND: 404,
      INV_REASON_CODE_REQUIRED: 400,
      INV_STATUS_NOT_ALLOCATABLE: 422,
    };

    return mapping[code] || 500;
  }

  // ========== Reconciliation Endpoints ==========

  /**
   * POST /api/v1/inventory/reconciliation/runs
   */
  async createReconciliationRun(req, res) {
    try {
      const { error, value } = reconciliationRunSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: error.details[0].message,
        });
      }

      const userId = req.user?.id;
      const result = await this.reconciliationService.createReconciliationRun({
        ...value,
        triggeredBy: userId,
      });

      return res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  /**
   * GET /api/v1/inventory/reconciliation/runs
   */
  async listReconciliationRuns(req, res) {
    try {
      const { page = 1, pageSize = 20, warehouseId, status, fromDate } = req.query;
      const result = await this.reconciliationService.listRuns(
        { warehouseId, status, fromDate },
        { page: Number(page), pageSize: Number(pageSize) }
      );

      return res.status(200).json({
        success: true,
        data: result.items,
        pagination: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / result.pageSize),
        },
      });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  /**
   * GET /api/v1/inventory/reconciliation/runs/:runId
   */
  async getReconciliationRun(req, res) {
    try {
      const { runId } = req.params;
      const result = await this.reconciliationService.getRunById(runId);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: `Reconciliation run not found: ${runId}`,
        });
      }

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  /**
   * POST /api/v1/inventory/reconciliation/results/:resultId/review
   */
  async reviewReconciliationResult(req, res) {
    try {
      const { resultId } = req.params;
      const { note } = req.body;
      const userId = req.user?.id;

      const result = await this.reconciliationService.reviewResult(resultId, userId, note);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  /**
   * POST /api/v1/inventory/reconciliation/results/:resultId/resolve
   */
  async resolveReconciliationResult(req, res) {
    try {
      const { resultId } = req.params;
      const { resolutionNote } = req.body;
      const userId = req.user?.id;

      const result = await this.reconciliationService.resolveResult(resultId, userId, resolutionNote);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  // ========== Snapshot Endpoints ==========

  /**
   * POST /api/v1/inventory/snapshots/runs
   */
  async createSnapshotRun(req, res) {
    try {
      const { error, value } = snapshotRunSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: error.details[0].message,
        });
      }

      const userId = req.user?.id;
      const result = await this.snapshotService.createSnapshotRun({
        ...value,
        triggeredBy: userId,
      });

      const statusCode = result.status === 'ALREADY_EXISTS' ? 200 : 201;
      return res.status(statusCode).json({
        success: true,
        data: result,
      });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  /**
   * GET /api/v1/inventory/snapshots/runs
   */
  async listSnapshotRuns(req, res) {
    try {
      const { page = 1, pageSize = 20, warehouseId, status, fromDate, toDate } = req.query;
      const result = await this.snapshotService.listRuns(
        { warehouseId, status, fromDate, toDate },
        { page: Number(page), pageSize: Number(pageSize) }
      );

      return res.status(200).json({
        success: true,
        data: result.items,
        pagination: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / result.pageSize),
        },
      });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  /**
   * GET /api/v1/inventory/snapshots/runs/:runId
   */
  async getSnapshotRun(req, res) {
    try {
      const { runId } = req.params;
      const result = await this.snapshotService.getRunById(runId);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: `Snapshot run not found: ${runId}`,
        });
      }

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  /**
   * GET /api/v1/inventory/snapshots/billing
   */
  async getSnapshotsForBilling(req, res) {
    try {
      const { error, value } = snapshotBillingQuerySchema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: error.details[0].message,
        });
      }

      const { page, pageSize, ...filters } = value;
      const result = await this.snapshotService.getSnapshotsForBilling(filters, { page, pageSize });

      return res.status(200).json({
        success: true,
        data: result.items,
        pagination: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / result.pageSize),
        },
      });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  /**
   * GET /api/v1/inventory/snapshots/billing/aggregate
   */
  async aggregateSnapshotsForBilling(req, res) {
    try {
      const { warehouseId, ownerId, fromDate, toDate } = req.query;

      if (!fromDate || !toDate) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'fromDate and toDate are required',
        });
      }

      const result = await this.snapshotService.aggregateForBillingPeriod({
        warehouseId,
        ownerId,
        fromDate,
        toDate,
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  /**
   * POST /api/v1/inventory/materialization/rebuild
   * Rebuild on_hand from ledger for all records
   */
  async rebuildOnHand(req, res) {
    try {
      const result = await this.materializationService.rebuildAll();
      return res.status(200).json({
        success: true,
        data: result,
        message: `Rebuilt ${result.rebuilt}/${result.total} on_hand records from ledger`,
      });
    } catch (err) {
      return this.handleError(err, res);
    }
  }
}

module.exports = { InventoryCoreController };
