import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { CreatePurchaseOrderDto, UpdatePurchaseOrderDto, CancelPurchaseOrderDto, PurchaseOrderQueryDto } from '../dto/purchase-order.dto';

enum PoStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['CLOSED', 'CANCELLED'],
  CLOSED: [],
  CANCELLED: [],
};

@Injectable()
export class PurchaseOrderService {
  constructor(private readonly prisma: PrismaService) {}

  private includeDetail() {
    return {
      owner: { select: { ownerCode: true, ownerName: true } },
      vendor: { select: { vendorCode: true, vendorName: true } },
      warehouse: { select: { warehouseCode: true, warehouseName: true } },
      lines: {
        include: {
          item: { select: { itemCode: true, itemName: true, cargoForm: true } },
          uom: { select: { uomCode: true, description: true, decimalPrecision: true } },
        },
        orderBy: { lineNumber: 'asc' as const },
      },
    };
  }

  async getNextPoNumber(): Promise<{ code: string; prefix: string }> {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `PO-${today}-`;

    const existing = await this.prisma.purchaseOrder.findMany({
      where: { poNumber: { startsWith: prefix } },
      select: { poNumber: true },
    });

    const numbers = existing
      .map((r) => parseInt(r.poNumber.replace(prefix, ''), 10))
      .filter((n) => !isNaN(n));

    const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    return { code: `${prefix}${String(nextNum).padStart(3, '0')}`, prefix: 'PO' };
  }

  async create(dto: CreatePurchaseOrderDto, userId?: string) {
    const owner = await this.prisma.mdOwner.findUnique({ where: { id: dto.ownerId } });
    if (!owner) throw new BadRequestException('Owner not found');

    const vendor = await this.prisma.mdVendor.findUnique({ where: { id: dto.vendorId } });
    if (!vendor) throw new BadRequestException('Vendor not found');

    const warehouse = await this.prisma.mdWarehouse.findUnique({ where: { id: dto.warehouseId } });
    if (!warehouse) throw new BadRequestException('Warehouse not found');

    const { code: poNumber } = await this.getNextPoNumber();

    const lines = (dto.lines || []).map((line, idx) => ({
      lineNumber: idx + 1,
      item: { connect: { id: line.itemId } },
      uom: { connect: { id: line.uomId } },
      expectedQty: line.expectedQty,
      unitPrice: line.unitPrice || null,
      notes: line.notes || null,
      status: 'OPEN' as const,
    }));

    const totalExpectedQty = lines.reduce((sum, l) => sum + Number(l.expectedQty), 0);

    const po = await this.prisma.purchaseOrder.create({
      data: {
        poNumber,
        externalPoNumber: dto.externalPoNumber || null,
        status: PoStatus.DRAFT,
        ownerId: dto.ownerId,
        vendorId: dto.vendorId,
        warehouseId: dto.warehouseId,
        expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : null,
        notes: dto.notes || null,
        currency: dto.currency || 'VND',
        totalExpectedQty,
        totalReceivedQty: 0,
        createdBy: userId || null,
        updatedBy: userId || null,
        lines: { create: lines },
      },
      include: this.includeDetail(),
    });

    return po;
  }

  async findById(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: this.includeDetail(),
    });
    if (!po) throw new NotFoundException(`PurchaseOrder ${id} not found`);
    return po;
  }

  async findMany(query: PurchaseOrderQueryDto) {
    const { page = 1, limit: limitParam, pageSize, keyword, status, ownerId, vendorId, warehouseId, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const limit = pageSize || limitParam || 20;

    const where: any = {};
    if (status) {
      const statuses = status.split(',').map((s) => s.trim());
      where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
    }
    if (ownerId) where.ownerId = ownerId;
    if (vendorId) where.vendorId = vendorId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (keyword) {
      where.OR = [
        { poNumber: { contains: keyword, mode: 'insensitive' } },
        { externalPoNumber: { contains: keyword, mode: 'insensitive' } },
        { notes: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const validSortFields: Record<string, string> = { createdAt: 'createdAt', poNumber: 'poNumber', status: 'status', expectedDeliveryDate: 'expectedDeliveryDate' };
    const orderField = validSortFields[sortBy] || 'createdAt';

    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        include: this.includeDetail(),
        orderBy: { [orderField]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async update(id: string, dto: UpdatePurchaseOrderDto, userId?: string) {
    const po = await this.findById(id);
    if (po.status !== PoStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT purchase orders can be updated');
    }

    const updateData: any = {
      updatedBy: userId || null,
    };

    if (dto.externalPoNumber !== undefined) updateData.externalPoNumber = dto.externalPoNumber;
    if (dto.expectedDeliveryDate !== undefined) updateData.expectedDeliveryDate = dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : null;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.currency !== undefined) updateData.currency = dto.currency;

    return this.prisma.purchaseOrder.update({
      where: { id, rowVersion: BigInt(dto.rowVersion) },
      data: { ...updateData, rowVersion: { increment: 1 } },
      include: this.includeDetail(),
    });
  }

  async confirm(id: string, userId?: string) {
    const po = await this.findById(id);
    if (!VALID_TRANSITIONS[po.status]?.includes(PoStatus.CONFIRMED)) {
      throw new BadRequestException(`Cannot confirm PO in status ${po.status}`);
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: PoStatus.CONFIRMED, rowVersion: { increment: 1 }, updatedBy: userId || null },
      include: this.includeDetail(),
    });
  }

  async close(id: string, userId?: string) {
    const po = await this.findById(id);
    if (!VALID_TRANSITIONS[po.status]?.includes(PoStatus.CLOSED)) {
      throw new BadRequestException(`Cannot close PO in status ${po.status}`);
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: PoStatus.CLOSED, rowVersion: { increment: 1 }, updatedBy: userId || null },
      include: this.includeDetail(),
    });
  }

  async cancel(id: string, dto: CancelPurchaseOrderDto, userId?: string) {
    const po = await this.findById(id);
    if (!VALID_TRANSITIONS[po.status]?.includes(PoStatus.CANCELLED)) {
      throw new BadRequestException(`Cannot cancel PO in status ${po.status}`);
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: PoStatus.CANCELLED,
        cancelReasonCode: dto.reasonCode || null,
        rowVersion: { increment: 1 },
        updatedBy: userId || null,
      },
      include: this.includeDetail(),
    });
  }
}
