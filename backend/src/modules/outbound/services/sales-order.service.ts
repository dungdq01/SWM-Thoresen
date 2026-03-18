import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { CreateSalesOrderDto, UpdateSalesOrderDto, SalesOrderQueryDto } from '../dto/sales-order.dto';
import { v4 as uuidv4 } from 'uuid';

// Map frontend soType to schema orderType
const SO_TYPE_MAP: Record<string, string> = {
  SEA: 'STANDARD',
  LAND: 'CONSIGNMENT',
};

// Map schema status to frontend status
const STATUS_MAP: Record<string, string> = {
  DRAFT: 'NEW',
  CONFIRMED: 'CONFIRMED',
  WEIGHING: 'WEIGHING',
  PARTIALLY_RELEASED: 'PARTIAL',
  FULLY_RELEASED: 'SHIPPED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
};

@Injectable()
export class SalesOrderService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSalesOrderDto, userId?: string) {
    const soNumber = await this.generateSoNumber();
    const externalId = `SO-WEB-${Date.now()}-${uuidv4().slice(0, 8)}`;
    const correlationId = uuidv4();

    // Get first warehouse for owner
    const warehouse = await this.prisma.mdWarehouse.findFirst({
      where: { isActive: true },
    });

    // Get or create a default customer
    const customer = await this.prisma.mdCustomer.findFirst({
      where: { isActive: true },
    });

    if (!warehouse || !customer) {
      throw new BadRequestException('No active warehouse or customer found');
    }

    // Convert UOM to KG for each line
    const kgUom = await this.prisma.mdUom.findFirst({ where: { uomCode: 'KG' } });
    const linesWithConversion = await Promise.all(
      dto.lines.map(async (line) => {
        const qty = Number(line.expectedQty || 0);
        let expectedQtyKg = qty;

        if (line.uomId && kgUom && line.uomId !== kgUom.id) {
          // Try item-specific conversion first
          let conversion = await this.prisma.mdUomConversion.findFirst({
            where: { fromUomId: line.uomId, toUomId: kgUom.id, itemId: line.itemId },
          });
          if (!conversion) {
            // Fall back to global conversion
            conversion = await this.prisma.mdUomConversion.findFirst({
              where: { fromUomId: line.uomId, toUomId: kgUom.id, itemId: null },
            });
          }
          if (conversion) {
            expectedQtyKg = qty * Number(conversion.conversionFactor);
          }
        }

        return { ...line, expectedQtyKg };
      }),
    );

    const totalExpectedQtyKg = linesWithConversion.reduce((sum, l) => sum + l.expectedQtyKg, 0);

    const salesOrder = await this.prisma.salesOrder.create({
      data: {
        soNumber,
        externalSoNumber: dto.blNumber, // Store B/L number in externalSoNumber
        orderType: SO_TYPE_MAP[dto.soType] as any || 'STANDARD',
        status: 'DRAFT',
        ownerId: dto.ownerId,
        customerId: customer.id,
        warehouseId: warehouse.id,
        vesselName: dto.vesselName || null,
        vehiclePlate: dto.vehiclePlate || null,
        notes: dto.notes,
        totalExpectedQtyKg,
        externalId,
        correlationId,
        sourceApp: 'WEB',
        createdBy: userId,
        lines: {
          create: linesWithConversion.map((line, idx) => ({
            lineNumber: idx + 1,
            itemId: line.itemId,
            cargoForm: 'BULK',
            uomId: line.uomId || (uuidv4()), // Will need valid UOM
            expectedQty: line.expectedQtyKg,
            expectedQtyKg: line.expectedQtyKg,
            notes: line.notes,
            status: 'OPEN',
          })),
        },
      },
      include: {
        lines: { include: { item: true, uom: true } },
        owner: true,
      },
    });

    return this.transformSalesOrder(salesOrder);
  }

  async findAll(query: SalesOrderQueryDto) {
    const { page = 1, pageSize = 20, keyword, status, ownerId } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (keyword) {
      where.OR = [
        { soNumber: { contains: keyword, mode: 'insensitive' } },
        { externalSoNumber: { contains: keyword, mode: 'insensitive' } },
      ];
    }
    if (status) {
      // Map frontend status to schema status
      const schemaStatus = Object.entries(STATUS_MAP).find(([_, v]) => v === status)?.[0];
      if (schemaStatus) where.status = schemaStatus;
    }
    if (ownerId) where.ownerId = ownerId;

    const [items, total] = await Promise.all([
      this.prisma.salesOrder.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: true,
          lines: { include: { item: true, uom: true } },
          _count: { select: { lines: true } },
        },
      }),
      this.prisma.salesOrder.count({ where }),
    ]);

    const data = items.map((so: any) => this.transformSalesOrder(so));

    return {
      data,
      items: data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findById(id: string) {
    const salesOrder = await this.prisma.salesOrder.findUnique({
      where: { id },
      include: {
        owner: true,
        lines: { include: { item: true, uom: true } },
      },
    });

    if (!salesOrder) {
      throw new NotFoundException(`Sales Order ${id} not found`);
    }

    return this.transformSalesOrder(salesOrder);
  }

  async update(id: string, dto: UpdateSalesOrderDto, userId?: string) {
    const existing = await this.prisma.salesOrder.findUnique({ where: { id } });

    if (!existing) throw new NotFoundException(`Sales Order ${id} not found`);
    if (existing.status !== 'DRAFT') {
      throw new BadRequestException('Can only update Sales Orders in DRAFT status');
    }

    if (dto.lines) {
      await this.prisma.salesOrderLine.deleteMany({ where: { soId: id } });
    }

    // Convert UOM to KG for each line
    let linesWithConversion: any[] = [];
    let totalExpectedQtyKg = 0;
    if (dto.lines) {
      const kgUom = await this.prisma.mdUom.findFirst({ where: { uomCode: 'KG' } });
      linesWithConversion = await Promise.all(
        dto.lines.map(async (line) => {
          const qty = Number(line.expectedQty || 0);
          let expectedQtyKg = qty;

          if (line.uomId && kgUom && line.uomId !== kgUom.id) {
            let conversion = await this.prisma.mdUomConversion.findFirst({
              where: { fromUomId: line.uomId, toUomId: kgUom.id, itemId: line.itemId },
            });
            if (!conversion) {
              conversion = await this.prisma.mdUomConversion.findFirst({
                where: { fromUomId: line.uomId, toUomId: kgUom.id, itemId: null },
              });
            }
            if (conversion) {
              expectedQtyKg = qty * Number(conversion.conversionFactor);
            }
          }

          return { ...line, expectedQtyKg };
        }),
      );
      totalExpectedQtyKg = linesWithConversion.reduce((sum, l) => sum + l.expectedQtyKg, 0);
    }

    const updated = await this.prisma.salesOrder.update({
      where: { id },
      data: {
        ...(dto.soType && { orderType: SO_TYPE_MAP[dto.soType] as any }),
        ...(dto.blNumber && { externalSoNumber: dto.blNumber }),
        ...(dto.vesselName !== undefined && { vesselName: dto.vesselName || null }),
        ...(dto.vehiclePlate !== undefined && { vehiclePlate: dto.vehiclePlate || null }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.lines && { totalExpectedQtyKg }),
        updatedBy: userId,
        ...(dto.lines && {
          lines: {
            create: linesWithConversion.map((line, idx) => ({
              lineNumber: idx + 1,
              itemId: line.itemId,
              cargoForm: 'BULK',
              uomId: line.uomId || existing.warehouseId, // Fallback
              expectedQty: line.expectedQtyKg,
              expectedQtyKg: line.expectedQtyKg,
              notes: line.notes,
              status: 'OPEN',
            })),
          },
        }),
      },
      include: {
        owner: true,
        lines: { include: { item: true, uom: true } },
      },
    });

    return this.transformSalesOrder(updated);
  }

  async confirm(id: string, userId?: string) {
    const existing = await this.prisma.salesOrder.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Sales Order ${id} not found`);
    if (existing.status !== 'DRAFT') {
      throw new BadRequestException('Can only confirm Sales Orders in DRAFT status');
    }

    const updated = await this.prisma.salesOrder.update({
      where: { id },
      data: { status: 'CONFIRMED', updatedBy: userId },
      include: { owner: true, lines: { include: { item: true, uom: true } } },
    });

    return this.transformSalesOrder(updated);
  }

  async cancel(id: string, userId?: string) {
    const existing = await this.prisma.salesOrder.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Sales Order ${id} not found`);
    if (!['DRAFT', 'CONFIRMED'].includes(existing.status)) {
      throw new BadRequestException('Can only cancel Sales Orders in DRAFT or CONFIRMED status');
    }

    const updated = await this.prisma.salesOrder.update({
      where: { id },
      data: { status: 'CANCELLED', updatedBy: userId },
      include: { owner: true, lines: { include: { item: true, uom: true } } },
    });

    return this.transformSalesOrder(updated);
  }

  async close(id: string, userId?: string) {
    const existing = await this.prisma.salesOrder.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Sales Order ${id} not found`);
    if (existing.status !== 'FULLY_RELEASED') {
      throw new BadRequestException('Can only close Sales Orders in FULLY_RELEASED status');
    }

    const updated = await this.prisma.salesOrder.update({
      where: { id },
      data: { status: 'CLOSED', updatedBy: userId },
      include: { owner: true, lines: { include: { item: true, uom: true } } },
    });

    return this.transformSalesOrder(updated);
  }

  async unconfirm(id: string, userId?: string) {
    const existing = await this.prisma.salesOrder.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Sales Order ${id} not found`);
    if (existing.status !== 'CONFIRMED') {
      throw new BadRequestException('Can only unconfirm Sales Orders in CONFIRMED status');
    }

    const updated = await this.prisma.salesOrder.update({
      where: { id },
      data: { status: 'DRAFT', updatedBy: userId },
      include: { owner: true, lines: { include: { item: true, uom: true } } },
    });

    return this.transformSalesOrder(updated);
  }

  async getNextSoNumber() {
    const code = await this.generateSoNumber();
    return { code };
  }

  private async generateSoNumber(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const prefix = `SO-${year}${month}`;

    const lastSo = await this.prisma.salesOrder.findFirst({
      where: { soNumber: { startsWith: prefix } },
      orderBy: { soNumber: 'desc' },
    });

    let sequence = 1;
    if (lastSo?.soNumber) {
      const lastSeq = parseInt(lastSo.soNumber.split('-').pop() || '0', 10);
      sequence = lastSeq + 1;
    }

    return `${prefix}-${String(sequence).padStart(5, '0')}`;
  }

  private transformSalesOrder(so: any) {
    // Map schema orderType back to frontend soType
    const soTypeMap: Record<string, string> = { STANDARD: 'SEA', CONSIGNMENT: 'LAND', INTERNAL: 'SEA' };

    return {
      ...so,
      soType: soTypeMap[so.orderType] || 'SEA',
      blNumber: so.externalSoNumber,
      vesselName: so.vesselName || '',
      vehiclePlate: so.vehiclePlate || '',
      status: STATUS_MAP[so.status] || so.status,
      totalExpectedQty: Number(so.totalExpectedQtyKg || 0),
      totalShippedQty: Number(so.totalShippedQtyKg || 0),
      lines: so.lines?.map((l: any) => ({
        ...l,
        expectedQty: Number(l.expectedQtyKg || l.expectedQty || 0),
        shippedQty: Number(l.shippedQtyKg || 0),
      })),
    };
  }
}
