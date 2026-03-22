/**
 * Module 4: Inbound Operations - Purchase Order Service
 */

const { PurchaseOrderRepository } = require('../infra/purchase-order.repository');
const { PostingEngineService } = require('../../inventory-core/application/posting-engine.service');

const PO_STATUS = {
  DRAFT: 'DRAFT',
  CONFIRMED: 'CONFIRMED',
  RECEIVING: 'RECEIVING',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
};

const VALID_TRANSITIONS = {
  DRAFT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['RECEIVING', 'CLOSED', 'CANCELLED'],
  RECEIVING: ['CLOSED', 'CANCELLED'],
  CLOSED: [],
  CANCELLED: [],
};

class PurchaseOrderService {
  constructor(prisma) {
    this.prisma = prisma;
    this.poRepo = new PurchaseOrderRepository(prisma);
    this.postingEngine = new PostingEngineService(prisma);
  }

  async getNextPoNumber() {
    return this.poRepo.getNextPoNumber();
  }

  async createPurchaseOrder(data, context = {}) {
    // Validate FK references
    const owner = await this.prisma.mdOwner.findUnique({ where: { id: data.ownerId } });
    if (!owner) throw Object.assign(new Error('Owner not found'), { statusCode: 400 });

    const vendor = await this.prisma.mdVendor.findUnique({ where: { id: data.vendorId } });
    if (!vendor) throw Object.assign(new Error('Vendor not found'), { statusCode: 400 });

    const warehouse = await this.prisma.mdWarehouse.findUnique({ where: { id: data.warehouseId } });
    if (!warehouse) throw Object.assign(new Error('Warehouse not found'), { statusCode: 400 });

    // Auto-generate PO number
    const poNumber = await this.poRepo.getNextPoNumber();

    // Build lines
    const lines = (data.lines || []).map((line, idx) => ({
      lineNumber: idx + 1,
      itemId: line.itemId,
      uomId: line.uomId,
      expectedQty: line.expectedQty,
      unitPrice: line.unitPrice || null,
      notes: line.notes || null,
      status: 'OPEN',
    }));

    const totalExpectedQty = lines.reduce((sum, l) => sum + Number(l.expectedQty), 0);

    const po = await this.poRepo.create({
      poNumber,
      externalPoNumber: data.externalPoNumber || null,
      status: PO_STATUS.DRAFT,
      ownerId: data.ownerId,
      vendorId: data.vendorId,
      warehouseId: data.warehouseId,
      expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null,
      notes: data.notes || null,
      currency: data.currency || 'VND',
      totalExpectedQty,
      totalReceivedQty: 0,
      createdBy: context.userId || null,
      updatedBy: context.userId || null,
      lines: { create: lines },
    });

    return po;
  }

  async getPurchaseOrder(id) {
    const po = await this.poRepo.findById(id);
    if (!po) throw Object.assign(new Error(`PurchaseOrder ${id} not found`), { statusCode: 404 });
    return po;
  }

  async listPurchaseOrders(params) {
    return this.poRepo.findMany(params);
  }

  async updatePurchaseOrder(id, data, context = {}) {
    const po = await this.getPurchaseOrder(id);
    if (po.status !== PO_STATUS.DRAFT) {
      throw Object.assign(new Error('Only DRAFT purchase orders can be updated'), { statusCode: 400 });
    }

    const updateData = {
      externalPoNumber: data.externalPoNumber !== undefined ? data.externalPoNumber : po.externalPoNumber,
      expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : po.expectedDeliveryDate,
      notes: data.notes !== undefined ? data.notes : po.notes,
      currency: data.currency || po.currency,
      updatedBy: context.userId || null,
    };

    return this.poRepo.update(id, updateData, BigInt(data.rowVersion));
  }

  async confirmPurchaseOrder(id, context = {}) {
    const po = await this.getPurchaseOrder(id);
    if (!VALID_TRANSITIONS[po.status]?.includes(PO_STATUS.CONFIRMED)) {
      throw Object.assign(new Error(`Cannot confirm PO in status ${po.status}`), { statusCode: 400 });
    }

    const result = await this.poRepo.updateStatus(id, PO_STATUS.CONFIRMED, { updatedBy: context.userId || null });

    // Post PO_CONFIRMED to M3 for each line → increases inboundOrderedQty
    try {
      const warehouse = po.warehouse || await this.prisma.mdWarehouse.findUnique({ where: { id: po.warehouseId } });
      const owner = po.owner || await this.prisma.mdOwner.findUnique({ where: { id: po.ownerId } });
      const firstLocation = await this.prisma.mdLocation.findFirst({
        where: { warehouseId: po.warehouseId, isActive: true },
        orderBy: { locationCode: 'asc' },
      });
      const lines = po.lines || [];

      for (const line of lines) {
        const item = line.item || await this.prisma.mdItem.findUnique({ where: { id: line.itemId } });
        const uom = line.uom || await this.prisma.mdUom.findUnique({ where: { id: line.uomId } });

        await this.postingEngine.postInventory({
          externalId: `PO-CONFIRM-${po.id}-${line.id}`,
          correlationId: `corr-po-confirm-${po.id}`,
          eventCode: 'PO_CONFIRMED',
          refType: 'PURCHASE_ORDER',
          refId: po.id,
          refLineId: line.id,
          itemId: line.itemId,
          qty: String(line.expectedQty),
          uomCode: uom?.uomCode || 'KG',
          dimTo: {
            warehouseCode: warehouse?.warehouseCode,
            locationCode: firstLocation?.locationCode || 'RECEIVING',
            ownerCode: owner?.ownerCode,
            statusCode: 'AVAILABLE',
          },
          sourceApp: 'SYSTEM',
          postedBy: context.userId,
        });
      }
    } catch (err) {
      console.error(`[M4→M3] PO_CONFIRMED posting failed for PO ${id}:`, err.message, err.code, err.details, err.stack?.split('\n').slice(0, 3).join('\n'));
    }

    return result;
  }

  async closePurchaseOrder(id, context = {}) {
    const po = await this.getPurchaseOrder(id);
    if (!VALID_TRANSITIONS[po.status]?.includes(PO_STATUS.CLOSED)) {
      throw Object.assign(new Error(`Cannot close PO in status ${po.status}`), { statusCode: 400 });
    }
    return this.poRepo.updateStatus(id, PO_STATUS.CLOSED, { updatedBy: context.userId || null });
  }

  async cancelPurchaseOrder(id, data = {}, context = {}) {
    const po = await this.getPurchaseOrder(id);
    if (!VALID_TRANSITIONS[po.status]?.includes(PO_STATUS.CANCELLED)) {
      throw Object.assign(new Error(`Cannot cancel PO in status ${po.status}`), { statusCode: 400 });
    }
    return this.poRepo.updateStatus(id, PO_STATUS.CANCELLED, {
      cancelReasonCode: data.reasonCode || null,
      updatedBy: context.userId || null,
    });
  }
}

module.exports = { PurchaseOrderService };
