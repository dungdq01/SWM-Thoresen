import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class MoveOrderService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const { status, warehouseId } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (warehouseId) where.warehouseId = warehouseId;

    const [data, total] = await Promise.all([
      this.prisma.icMoveOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          lines: true,
        },
      }),
      this.prisma.icMoveOrder.count({ where }),
    ]);

    // Enrich with warehouse info
    const warehouseIds = [...new Set(data.map((d) => d.warehouseId))];
    const warehouses = await this.prisma.mdWarehouse.findMany({
      where: { id: { in: warehouseIds } },
    });
    const warehouseMap = new Map(warehouses.map((w) => [w.id, w]));

    const enrichedData = data.map((d) => ({
      ...d,
      warehouse: warehouseMap.get(d.warehouseId) || null,
    }));

    return {
      data: enrichedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const moveOrder = await this.prisma.icMoveOrder.findUnique({
      where: { id },
      include: {
        lines: true,
      },
    });

    if (!moveOrder) {
      throw new NotFoundException('Move order not found');
    }

    const warehouse = await this.prisma.mdWarehouse.findUnique({
      where: { id: moveOrder.warehouseId },
    });

    return { ...moveOrder, warehouse };
  }

  async create(dto: any, userId: string) {
    const { warehouseId, executionMode, reasonCode, lines } = dto;

    // Validate warehouse
    const warehouse = await this.prisma.mdWarehouse.findUnique({ where: { id: warehouseId } });
    if (!warehouse) throw new BadRequestException('Warehouse not found');

    // Generate move number and external ID
    const moveNumber = await this.generateMoveNumber();
    const externalId = `EXT-${randomUUID()}`;
    const correlationId = randomUUID().slice(0, 50);

    // Get first item for UOM
    const firstLine = lines[0];
    const item = await this.prisma.mdItem.findUnique({ where: { id: firstLine.itemId } });

    const moveOrder = await this.prisma.icMoveOrder.create({
      data: {
        moveNumber,
        warehouseId,
        executionMode: executionMode || 'DIRECT',
        reasonCode,
        status: 'DRAFT',
        requestedBy: userId,
        externalId,
        correlationId,
        sourceApp: 'WEB',
        createdBy: userId,
        lines: {
          create: lines.map((line: any, idx: number) => ({
            lineNo: idx + 1,
            itemId: line.itemId,
            ownerId: line.ownerId,
            fromLocationId: line.fromLocationId,
            toLocationId: line.toLocationId,
            inventoryStatus: 'AVAILABLE',
            requestedQty: Number(line.requestedQty),
            uom: 'KG',
            lineStatus: 'OPEN',
          })),
        },
      },
      include: {
        lines: true,
      },
    });

    return { ...moveOrder, warehouse };
  }

  async confirm(id: string, userId: string) {
    const moveOrder = await this.findOne(id);

    if (moveOrder.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT move orders can be confirmed');
    }

    const updated = await this.prisma.icMoveOrder.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        confirmedBy: userId,
      },
      include: { lines: true },
    });

    return { ...updated, warehouse: moveOrder.warehouse };
  }

  async execute(id: string, userId: string) {
    const moveOrder = await this.findOne(id);

    if (moveOrder.status !== 'CONFIRMED') {
      throw new BadRequestException('Only CONFIRMED move orders can be executed');
    }

    const updated = await this.prisma.icMoveOrder.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        completedBy: userId,
      },
      include: { lines: true },
    });

    // Update lines to EXECUTED
    await this.prisma.icMoveOrderLine.updateMany({
      where: { moveOrderId: id },
      data: { lineStatus: 'COMPLETED' },
    });

    return { ...updated, warehouse: moveOrder.warehouse };
  }

  async cancel(id: string, dto: any, userId: string) {
    const moveOrder = await this.findOne(id);

    if (!['DRAFT', 'CONFIRMED'].includes(moveOrder.status)) {
      throw new BadRequestException('Only DRAFT or CONFIRMED move orders can be cancelled');
    }

    const updated = await this.prisma.icMoveOrder.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        updatedBy: userId,
      },
      include: { lines: true },
    });

    return { ...updated, warehouse: moveOrder.warehouse };
  }

  private async generateMoveNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `MOV-${dateStr}`;

    const lastOrder = await this.prisma.icMoveOrder.findFirst({
      where: { moveNumber: { startsWith: prefix } },
      orderBy: { moveNumber: 'desc' },
    });

    let seq = 1;
    if (lastOrder) {
      const lastSeq = parseInt(lastOrder.moveNumber.split('-').pop() || '0', 10);
      seq = lastSeq + 1;
    }

    return `${prefix}-${seq.toString().padStart(4, '0')}`;
  }
}
