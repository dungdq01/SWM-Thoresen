/**
 * Module 4: Inbound Operations - Controller
 */

const { ReceiptService } = require('./application/receipt.service');
const { PurchaseOrderService } = require('./application/purchase-order.service');
const {
  createReceiptSchema,
  confirmReceiptSchema,
  cancelReceiptSchema,
  weighInSchema,
  weighOutSchema,
  manualWeightSchema,
  receiptQuerySchema,
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
  cancelPurchaseOrderSchema,
  purchaseOrderQuerySchema,
} = require('./inbound.schema');
const { InboundError } = require('./domain/inbound.errors');

class InboundController {
  constructor(prisma) {
    this.prisma = prisma;
    this.receiptService = new ReceiptService(prisma);
    this.poService = new PurchaseOrderService(prisma);
  }

  /**
   * POST /api/v1/inbound/receipts
   */
  async createReceipt(req, res) {
    try {
      const { error, value } = createReceiptSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: error.details[0].message,
        });
      }

      const context = this.buildContext(req);
      const result = await this.receiptService.createReceipt(value, context);

      const statusCode = result.idempotentReplay ? 200 : 201;
      return res.status(statusCode).json({
        success: true,
        data: this.mapReceiptResponse(result.receipt),
        idempotentReplay: result.idempotentReplay,
      });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  /**
   * GET /api/v1/inbound/receipts
   */
  async listReceipts(req, res) {
    try {
      const { error, value } = receiptQuerySchema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: error.details[0].message,
        });
      }

      const { page, limit, sortBy, sortOrder, ...filter } = value;
      const result = await this.receiptService.listReceipts(filter, { page, limit, sortBy, sortOrder });

      return res.status(200).json({
        success: true,
        data: result.data.map(r => this.mapReceiptResponse(r)),
        pagination: result.pagination,
      });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  /**
   * GET /api/v1/inbound/receipts/:id
   */
  async getReceipt(req, res) {
    try {
      const { id } = req.params;
      const receipt = await this.receiptService.getReceipt(id);

      return res.status(200).json({
        success: true,
        data: this.mapReceiptResponse(receipt),
      });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  /**
   * POST /api/v1/inbound/receipts/:id/confirm
   */
  async confirmReceipt(req, res) {
    try {
      const { id } = req.params;
      const { error, value } = confirmReceiptSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: error.details[0].message,
        });
      }

      const context = this.buildContext(req);
      const result = await this.receiptService.confirmReceipt(id, value, context);

      // MD-3 FIX: Confirm luôn trả 200 (không phân biệt idempotent replay)
      return res.status(200).json({
        success: true,
        data: this.mapReceiptResponse(result.receipt),
        idempotentReplay: result.idempotentReplay,
      });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  /**
   * POST /api/v1/inbound/receipts/:id/cancel
   */
  async cancelReceipt(req, res) {
    try {
      const { id } = req.params;
      const { error, value } = cancelReceiptSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: error.details[0].message,
        });
      }

      const context = this.buildContext(req);
      const result = await this.receiptService.cancelReceipt(id, value, context);

      return res.status(200).json({
        success: true,
        data: this.mapReceiptResponse(result.receipt),
      });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  /**
   * POST /api/v1/inbound/receipts/:id/reweigh
   */
  async reweighReceipt(req, res) {
    try {
      const { id } = req.params;
      const context = this.buildContext(req);
      const result = await this.receiptService.reweighReceipt(id, context);

      return res.status(200).json({
        success: true,
        data: this.mapReceiptResponse(result.receipt),
      });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  /**
   * POST /api/v1/inbound/receipts/:id/close
   */
  async closeReceipt(req, res) {
    try {
      const { id } = req.params;
      const context = this.buildContext(req);
      const result = await this.receiptService.closeReceipt(id, context);

      return res.status(200).json({
        success: true,
        data: this.mapReceiptResponse(result.receipt),
      });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  /**
   * POST /api/v1/inbound/receipts/:id/start-processing
   */
  async startProcessing(req, res) {
    try {
      const { id } = req.params;
      const context = this.buildContext(req);
      const result = await this.receiptService.startProcessing(id, context);

      return res.status(200).json({
        success: true,
        data: this.mapReceiptResponse(result.receipt),
      });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  /**
   * POST /api/v1/inbound/receipts/:id/report-error
   */
  async reportErrorReceipt(req, res) {
    try {
      const { id } = req.params;
      const context = this.buildContext(req);
      const result = await this.receiptService.reportErrorReceipt(id, req.body, context);

      return res.status(200).json({
        success: true,
        data: this.mapReceiptResponse(result.receipt),
      });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  /**
   * POST /api/v1/inbound/weigh-events/in
   */
  async receiveWeighIn(req, res) {
    try {
      const { error, value } = weighInSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: error.details[0].message,
        });
      }

      // MD-4 FIX: Dùng value đã validate thay vì req.body
      const { receiptId } = value;
      if (!receiptId) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'receiptId là bắt buộc',
        });
      }

      const context = this.buildContext(req);
      const result = await this.receiptService.receiveWeighIn(receiptId, value, context);

      return res.status(200).json({
        success: true,
        data: this.mapReceiptResponse(result.receipt),
        idempotentReplay: result.idempotentReplay,
      });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  /**
   * POST /api/v1/inbound/weigh-events/out
   */
  async receiveWeighOut(req, res) {
    try {
      const { error, value } = weighOutSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: error.details[0].message,
        });
      }

      // MD-4 FIX: Dùng value đã validate thay vì req.body
      const { receiptId } = value;
      if (!receiptId) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'receiptId là bắt buộc',
        });
      }

      const context = this.buildContext(req);
      const result = await this.receiptService.receiveWeighOut(receiptId, value, context);

      return res.status(200).json({
        success: true,
        data: this.mapReceiptResponse(result.receipt),
        toleranceResult: result.toleranceResult,
        idempotentReplay: result.idempotentReplay,
      });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  /**
   * GET /api/v1/inbound/receipts/:id/history
   */
  async getReceiptHistory(req, res) {
    try {
      const { id } = req.params;
      const history = await this.receiptService.getReceiptHistory(id);

      return res.status(200).json({
        success: true,
        data: history,
      });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  /**
   * GET /api/v1/inbound/dashboard/summary
   */
  async getDashboardSummary(req, res) {
    try {
      const { warehouseId } = req.query;
      const receiptRepo = this.receiptService.receiptRepo;
      const statusCounts = await receiptRepo.countByStatus(warehouseId);

      return res.status(200).json({
        success: true,
        data: {
          statusCounts,
          totalActive: Object.entries(statusCounts)
            .filter(([status]) => !['CLOSED', 'CANCELLED'].includes(status))
            .reduce((sum, [, count]) => sum + count, 0),
        },
      });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  // === Helper Methods ===

  buildContext(req) {
    return {
      userId: req.user?.id,
      userRole: req.user?.role,
      correlationId: req.headers['x-correlation-id'] || `corr-${Date.now()}`,
    };
  }

  mapReceiptResponse(receipt) {
    if (!receipt) return null;
    return {
      id: receipt.id,
      receiptNumber: receipt.receiptNumber,
      receiptType: receipt.receiptType,
      poId: receipt.poId,
      asnId: receipt.asnId,
      vehicleNumber: receipt.vehicleNumber,
      blNumber: receipt.blNumber,
      status: receipt.status,
      attemptNumber: receipt.attemptNumber,
      expectedQty: receipt.expectedQty,
      grossWeightKg: receipt.grossWeightKg,
      tareWeightKg: receipt.tareWeightKg,
      netWeightKg: receipt.netWeightKg,
      tolerancePctApplied: receipt.tolerancePctApplied,
      variancePct: receipt.variancePct,
      isManualEntry: receipt.isManualEntry,
      postedTransId: receipt.postedTransId,
      putawayWorkId: receipt.putawayWorkId,
      externalId: receipt.externalId,
      correlationId: receipt.correlationId,
      createdAt: receipt.createdAt,
      updatedAt: receipt.updatedAt,
      owner: receipt.owner,
      vendor: receipt.vendor,
      warehouse: receipt.warehouse,
      receivingLocation: receipt.receivingLocation,
      lines: receipt.lines?.map(line => ({
        id: line.id,
        lineNumber: line.lineNumber,
        itemId: line.itemId,
        uomId: line.uomId,
        expectedQty: line.expectedQty,
        receivedQty: line.receivedQty,
        bagCount: line.bagCount,
        cargoForm: line.cargoForm,
        status: line.status,
      })),
    };
  }

  /**
   * GET /api/v1/inbound/receipts/next-number
   * Generate next ASN number for receipt creation preview
   */
  async getNextReceiptNumber(req, res) {
    try {
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      const prefix = `ASN-${dateStr}`;

      const result = await this.prisma.$queryRaw`
        SELECT asn_id
        FROM receipt_header
        WHERE asn_id LIKE ${prefix + '%'}
        ORDER BY asn_id DESC
        LIMIT 1
      `;

      let nextSeq = 1;
      if (result.length > 0 && result[0].asn_id) {
        const lastSeq = parseInt(result[0].asn_id.split('-')[2], 10);
        if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
      }

      const code = `${prefix}-${String(nextSeq).padStart(6, '0')}`;
      return res.json({ success: true, data: { code } });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  // ── Purchase Order Handlers ──

  /**
   * GET /api/v1/inbound/purchase-orders/next-number
   */
  async getNextPoNumber(req, res) {
    try {
      const code = await this.poService.getNextPoNumber();
      return res.json({ success: true, data: { code, prefix: 'PO' } });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  /**
   * GET /api/v1/inbound/purchase-orders
   */
  async listPurchaseOrders(req, res) {
    try {
      const { error, value } = purchaseOrderQuerySchema.validate(req.query);
      if (error) {
        return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: error.details[0].message });
      }
      const result = await this.poService.listPurchaseOrders(value);
      return res.json({ success: true, data: result.data, pagination: { page: result.page, totalPages: result.totalPages, total: result.total } });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  /**
   * GET /api/v1/inbound/purchase-orders/:id
   */
  async getPurchaseOrder(req, res) {
    try {
      const po = await this.poService.getPurchaseOrder(req.params.id);
      return res.json({ success: true, data: po });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  /**
   * POST /api/v1/inbound/purchase-orders
   */
  async createPurchaseOrder(req, res) {
    try {
      const { error, value } = createPurchaseOrderSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: error.details[0].message });
      }
      const context = this.buildContext(req);
      const po = await this.poService.createPurchaseOrder(value, context);
      return res.status(201).json({ success: true, data: po });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  /**
   * PUT /api/v1/inbound/purchase-orders/:id
   */
  async updatePurchaseOrder(req, res) {
    try {
      const { error, value } = updatePurchaseOrderSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: error.details[0].message });
      }
      const context = this.buildContext(req);
      const po = await this.poService.updatePurchaseOrder(req.params.id, value, context);
      return res.json({ success: true, data: po });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  /**
   * POST /api/v1/inbound/purchase-orders/:id/confirm
   */
  async confirmPurchaseOrder(req, res) {
    try {
      const context = this.buildContext(req);
      const po = await this.poService.confirmPurchaseOrder(req.params.id, context);
      return res.json({ success: true, data: po });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  /**
   * POST /api/v1/inbound/purchase-orders/:id/close
   */
  async closePurchaseOrder(req, res) {
    try {
      const context = this.buildContext(req);
      const po = await this.poService.closePurchaseOrder(req.params.id, context);
      return res.json({ success: true, data: po });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  /**
   * POST /api/v1/inbound/purchase-orders/:id/cancel
   */
  async cancelPurchaseOrder(req, res) {
    try {
      const { error, value } = cancelPurchaseOrderSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: error.details[0].message });
      }
      const context = this.buildContext(req);
      const po = await this.poService.cancelPurchaseOrder(req.params.id, value, context);
      return res.json({ success: true, data: po });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  handleError(err, res) {
    console.error('[InboundController] Error:', err);

    if (err instanceof InboundError) {
      return res.status(err.httpStatus).json(err.toJSON());
    }

    // Prisma unique constraint error
    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'DUPLICATE_ERROR',
        message: 'Record đã tồn tại',
        details: err.meta,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Đã xảy ra lỗi hệ thống',
    });
  }
}

module.exports = { InboundController };
