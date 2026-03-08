/**
 * Module 3: Inventory Core Engine - Controller
 */

const { PostingEngineService } = require('./application/posting-engine.service');
const { ReversalEngineService } = require('./application/reversal-engine.service');
const { HoldService } = require('./application/hold.service');
const { OnHandService } = require('./application/onhand.service');
const { TransactionQueryService } = require('./application/transaction-query.service');
const {
  postingSchema,
  reversalSchema,
  holdCreateSchema,
  holdReleaseSchema,
  onhandQuerySchema,
  transactionQuerySchema,
  holdQuerySchema,
} = require('./inventory-core.schema');
const { InventoryError } = require('./domain/inventory.errors');

class InventoryCoreController {
  constructor(prisma) {
    this.prisma = prisma;
    this.postingEngine = new PostingEngineService(prisma);
    this.reversalEngine = new ReversalEngineService(prisma);
    this.holdService = new HoldService(prisma);
    this.onHandService = new OnHandService(prisma);
    this.transactionQueryService = new TransactionQueryService(prisma);
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
      const result = await this.postingEngine.postInventory({
        ...value,
        postedBy: value.postedBy || userId,
      });

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
      const result = await this.reversalEngine.reverseTransaction({
        ...value,
        reversedBy: userId,
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
      const result = await this.holdService.createHold({
        ...value,
        createdBy: userId,
      });

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
}

module.exports = { InventoryCoreController };
