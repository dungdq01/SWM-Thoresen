import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { CreatePurchaseOrderDto, UpdatePurchaseOrderDto, CancelPurchaseOrderDto, PurchaseOrderQueryDto } from '../dto/purchase-order.dto';

enum PoStatus {
  NEW = 'NEW',
  CONFIRMED = 'CONFIRMED',
  RECEIVING = 'RECEIVING',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  NEW: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['NEW', 'RECEIVING', 'CLOSED', 'CANCELLED'],
  RECEIVING: ['CLOSED', 'CANCELLED'],
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
      warehouses: {
        include: {
          warehouse: { select: { id: true, warehouseCode: true, warehouseName: true } },
        },
      },
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

    // Support both warehouseIds (new) and warehouseId (legacy)
    const warehouseIds = dto.warehouseIds?.length ? dto.warehouseIds : (dto.warehouseId ? [dto.warehouseId] : []);
    if (warehouseIds.length === 0) throw new BadRequestException('At least one warehouse is required');

    // Validate all warehouses exist
    const warehouses = await this.prisma.mdWarehouse.findMany({
      where: { id: { in: warehouseIds } },
    });
    if (warehouses.length !== warehouseIds.length) {
      throw new BadRequestException('One or more warehouses not found');
    }

    const { code: poNumber } = await this.getNextPoNumber();

    // Get KG UOM for conversion target
    const kgUom = await this.prisma.mdUom.findUnique({ where: { uomCode: 'KG' } });

    const lineData = (dto.lines || []).map((line, idx) => ({
      lineNumber: idx + 1,
      itemId: line.itemId,
      uomId: line.uomId || null,
      expectedQty: line.expectedQty,
      notes: line.notes || null,
      status: 'OPEN',
    }));

    // Calculate totalExpectedQty in KG (convert from bag UOMs to KG)
    let totalExpectedQty = 0;
    for (const line of dto.lines || []) {
      const qty = Number(line.expectedQty) || 0;
      if (!line.uomId || !kgUom) {
        totalExpectedQty += qty;
        continue;
      }

      // Check if UOM is KG
      if (line.uomId === kgUom.id) {
        totalExpectedQty += qty;
        continue;
      }

      // Find conversion factor from line.uomId to KG
      const conversion = await this.prisma.mdUomConversion.findFirst({
        where: { fromUomId: line.uomId, toUomId: kgUom.id },
      });

      if (conversion) {
        totalExpectedQty += qty * Number(conversion.conversionFactor);
      } else {
        // No conversion found, use raw qty
        totalExpectedQty += qty;
      }
    }

    const createData = {
      poNumber,
      poType: dto.poType || 'SEA',
      status: PoStatus.NEW,
      ownerId: dto.ownerId,
      vendorId: dto.vendorId,
      warehouseId: warehouseIds[0] || null,
      vesselName: dto.vesselName || null,
      origin: dto.origin || null,
      blNumber: dto.blNumber || null,
      notes: dto.notes || null,
      totalExpectedQty,
      totalReceivedQty: 0,
      createdBy: userId || null,
      updatedBy: userId || null,
      lines: { create: lineData },
      warehouses: {
        create: warehouseIds.map((whId) => ({ warehouseId: whId })),
      },
    };

    const po = await this.prisma.purchaseOrder.create({
      data: createData as any,
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
    if (po.status !== 'NEW') {
      throw new BadRequestException('Only NEW purchase orders can be updated');
    }

    const updateData: any = {
      updatedBy: userId || null,
    };

    if (dto.poType !== undefined) updateData.poType = dto.poType;
    if (dto.ownerId !== undefined) updateData.ownerId = dto.ownerId;
    if (dto.vendorId !== undefined) updateData.vendorId = dto.vendorId;

    // Handle warehouseIds update
    const warehouseIds = dto.warehouseIds?.length ? dto.warehouseIds : (dto.warehouseId ? [dto.warehouseId] : null);
    if (warehouseIds) {
      // Validate all warehouses exist
      const warehouses = await this.prisma.mdWarehouse.findMany({
        where: { id: { in: warehouseIds } },
      });
      if (warehouses.length !== warehouseIds.length) {
        throw new BadRequestException('One or more warehouses not found');
      }
      updateData.warehouseId = warehouseIds[0] || null;

      // Delete existing warehouse relations and recreate
      await this.prisma.purchaseOrderWarehouse.deleteMany({ where: { poId: id } });
      await this.prisma.purchaseOrderWarehouse.createMany({
        data: warehouseIds.map((whId) => ({ poId: id, warehouseId: whId })),
      });
    }
    if (dto.vesselName !== undefined) updateData.vesselName = dto.vesselName || null;
    if (dto.origin !== undefined) updateData.origin = dto.origin || null;
    if (dto.blNumber !== undefined) updateData.blNumber = dto.blNumber || null;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    // Handle lines update if provided
    if (dto.lines && dto.lines.length > 0) {
      // Get KG UOM for conversion
      const kgUom = await this.prisma.mdUom.findUnique({ where: { uomCode: 'KG' } });

      // Delete existing lines and recreate
      await this.prisma.purchaseOrderLine.deleteMany({ where: { poId: id } });

      // Calculate totalExpectedQty in KG
      let totalExpectedQty = 0;
      for (const line of dto.lines) {
        const qty = Number(line.expectedQty) || 0;
        if (!line.uomId || !kgUom) {
          totalExpectedQty += qty;
          continue;
        }
        if (line.uomId === kgUom.id) {
          totalExpectedQty += qty;
          continue;
        }
        const conversion = await this.prisma.mdUomConversion.findFirst({
          where: { fromUomId: line.uomId, toUomId: kgUom.id },
        });
        if (conversion) {
          totalExpectedQty += qty * Number(conversion.conversionFactor);
        } else {
          totalExpectedQty += qty;
        }
      }

      const lineData = dto.lines.map((line, idx) => ({
        poId: id,
        lineNumber: idx + 1,
        itemId: line.itemId,
        uomId: line.uomId || null,
        expectedQty: line.expectedQty,
        notes: line.notes || null,
        status: 'OPEN',
      }));

      await this.prisma.purchaseOrderLine.createMany({ data: lineData as any });
      updateData.totalExpectedQty = totalExpectedQty;
    }

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

  async unconfirm(id: string, userId?: string) {
    const po = await this.findById(id);
    if (!VALID_TRANSITIONS[po.status]?.includes(PoStatus.NEW)) {
      throw new BadRequestException(`Cannot unconfirm PO in status ${po.status}`);
    }

    // Check if any receipt has been created from this PO
    const receiptsCount = await this.prisma.receiptHeader.count({
      where: { poId: po.poNumber },
    });
    if (receiptsCount > 0) {
      throw new BadRequestException('Cannot unconfirm PO that already has receipts');
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: PoStatus.NEW, rowVersion: { increment: 1 }, updatedBy: userId || null },
      include: this.includeDetail(),
    });
  }
}
