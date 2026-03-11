/**
 * Sales Orders Module - Controller (HTTP Layer)
 */

const { SalesOrderService } = require('./application/sales-order.service');
const { SalesOrderError } = require('./domain/sales-order.errors');
const {
  createSalesOrderSchema,
  updateSalesOrderSchema,
  cancelSalesOrderSchema,
  closeSalesOrderSchema,
  releaseShipmentSchema,
  listQuerySchema,
  dashboardQuerySchema,
} = require('./sales-order.schema');

class SalesOrderController {
  constructor(prisma) {
    this.prisma = prisma;
    this.service = new SalesOrderService(prisma);
  }

  /**
   * POST /api/v1/sales-orders
   */
  async create(req, res) {
    try {
      const { error, value } = createSalesOrderSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: error.details[0].message,
        });
      }

      const context = this._buildContext(req);
      const result = await this.service.createSalesOrder(value, context);

      const statusCode = result.idempotentReplay ? 200 : 201;
      return res.status(statusCode).json({
        success: true,
        data: result.salesOrder,
        idempotentReplay: result.idempotentReplay,
      });
    } catch (err) {
      return this._handleError(err, res);
    }
  }

  /**
   * GET /api/v1/sales-orders
   */
  async list(req, res) {
    try {
      const { error, value } = listQuerySchema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: error.details[0].message,
        });
      }

      const { page, pageSize, ...filters } = value;
      const result = await this.service.listSalesOrders({ page, pageSize, filters });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      return this._handleError(err, res);
    }
  }

  /**
   * GET /api/v1/sales-orders/:id
   */
  async getById(req, res) {
    try {
      const so = await this.service.getSalesOrder(req.params.id);
      return res.status(200).json({ success: true, data: so });
    } catch (err) {
      return this._handleError(err, res);
    }
  }

  /**
   * PUT /api/v1/sales-orders/:id
   */
  async update(req, res) {
    try {
      const { error, value } = updateSalesOrderSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: error.details[0].message,
        });
      }

      const context = this._buildContext(req);
      const result = await this.service.updateSalesOrder(req.params.id, value, context);

      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return this._handleError(err, res);
    }
  }

  /**
   * POST /api/v1/sales-orders/:id/confirm
   */
  async confirm(req, res) {
    try {
      const context = this._buildContext(req);
      const result = await this.service.confirmSalesOrder(req.params.id, context);
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return this._handleError(err, res);
    }
  }

  /**
   * POST /api/v1/sales-orders/:id/cancel
   */
  async cancel(req, res) {
    try {
      const { error, value } = cancelSalesOrderSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: error.details[0].message,
        });
      }

      const context = this._buildContext(req);
      const result = await this.service.cancelSalesOrder(req.params.id, value, context);
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return this._handleError(err, res);
    }
  }

  /**
   * POST /api/v1/sales-orders/:id/close
   */
  async close(req, res) {
    try {
      const { error, value } = closeSalesOrderSchema.validate(req.body || {});
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: error.details[0].message,
        });
      }

      const context = this._buildContext(req);
      const result = await this.service.closeSalesOrder(req.params.id, value, context);
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return this._handleError(err, res);
    }
  }

  /**
   * POST /api/v1/sales-orders/:id/release-shipment
   */
  async releaseShipment(req, res) {
    try {
      const { error, value } = releaseShipmentSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: error.details[0].message,
        });
      }

      const context = this._buildContext(req);
      const result = await this.service.releaseShipment(req.params.id, value, context);
      return res.status(201).json({ success: true, data: result });
    } catch (err) {
      return this._handleError(err, res);
    }
  }

  /**
   * GET /api/v1/sales-orders/:id/fulfillment
   */
  async getFulfillment(req, res) {
    try {
      const result = await this.service.getFulfillment(req.params.id);
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return this._handleError(err, res);
    }
  }

  /**
   * GET /api/v1/sales-orders/:id/shipments
   */
  async getShipments(req, res) {
    try {
      const result = await this.service.getLinkedShipments(req.params.id);
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return this._handleError(err, res);
    }
  }

  /**
   * GET /api/v1/sales-orders/:id/history
   */
  async getHistory(req, res) {
    try {
      const result = await this.service.getStatusHistory(req.params.id);
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return this._handleError(err, res);
    }
  }

  /**
   * GET /api/v1/sales-orders/dashboard/summary
   */
  async getDashboardSummary(req, res) {
    try {
      const { error, value } = dashboardQuerySchema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: error.details[0].message,
        });
      }

      const result = await this.service.getDashboardSummary(value);
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return this._handleError(err, res);
    }
  }

  // ── Helpers ──

  _buildContext(req) {
    return {
      userId: req.headers['x-user-id'] || req.user?.id || null,
      correlationId: req.headers['x-correlation-id'] || null,
    };
  }

  _handleError(err, res) {
    if (err instanceof SalesOrderError) {
      return res.status(err.httpStatus).json(err.toJSON());
    }

    console.error('[SalesOrderController] Unexpected error:', err);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Lỗi hệ thống. Vui lòng thử lại sau.',
    });
  }
}

module.exports = { SalesOrderController };
