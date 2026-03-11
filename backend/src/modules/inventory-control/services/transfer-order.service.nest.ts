import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class TransferOrderService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const { status } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.icTransferOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { lines: true },
      }),
      this.prisma.icTransferOrder.count({ where }),
    ]);

    // Enrich with warehouse info
    const warehouseIds = [...new Set([...data.map(d => d.fromWarehouseId), ...data.map(d => d.toWarehouseId)])];
    const warehouses = await this.prisma.mdWarehouse.findMany({ where: { id: { in: warehouseIds } } });
    const warehouseMap = new Map(warehouses.map(w => [w.id, w]));

    const enrichedData = data.map(d => ({
      ...d,
      fromWarehouse: warehouseMap.get(d.fromWarehouseId) || null,
      toWarehouse: warehouseMap.get(d.toWarehouseId) || null,
    }));

    return {
      data: enrichedData,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const order = await this.prisma.icTransferOrder.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (!order) throw new NotFoundException('Transfer order not found');
    return order;
  }

  async create(dto: any, userId: string) {
    const { fromWarehouseId, toWarehouseId, vehicleNumber, lines } = dto;

    const transferNumber = await this.generateTransferNumber();
    const externalId = `EXT-${randomUUID()}`;
    const correlationId = randomUUID().slice(0, 50);

    const order = await this.prisma.icTransferOrder.create({
      data: {
        transferNumber,
        fromWarehouseId,
        toWarehouseId,
        executionMode: 'DIRECT',
        status: 'CREATED',
        vehicleNumber,
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
            inventoryStatus: 'AVAILABLE',
            requestedQty: Number(line.requestedQty),
            uom: 'KG',
            lineStatus: 'OPEN',
          })),
        },
      },
      include: { lines: true },
    });

    return order;
  }

  async release(id: string, userId: string) {
    const order = await this.findOne(id);
    if (order.status !== 'CREATED') throw new BadRequestException('Only CREATED orders can be released');

    return this.prisma.icTransferOrder.update({
      where: { id },
      data: { status: 'RELEASED', updatedBy: userId },
      include: { lines: true },
    });
  }

  async ship(id: string, userId: string) {
    const order = await this.findOne(id);
    if (order.status !== 'RELEASED') throw new BadRequestException('Only RELEASED orders can be shipped');

    return this.prisma.icTransferOrder.update({
      where: { id },
      data: { status: 'SHIPPED', shippedBy: userId, actualShipAt: new Date(), updatedBy: userId },
      include: { lines: true },
    });
  }

  async receive(id: string, userId: string) {
    const order = await this.findOne(id);
    if (order.status !== 'SHIPPED') throw new BadRequestException('Only SHIPPED orders can be received');

    return this.prisma.icTransferOrder.update({
      where: { id },
      data: { status: 'RECEIVED', receivedBy: userId, actualReceiveAt: new Date(), updatedBy: userId },
      include: { lines: true },
    });
  }

  async close(id: string, userId: string) {
    const order = await this.findOne(id);
    if (order.status !== 'RECEIVED') throw new BadRequestException('Only RECEIVED orders can be closed');

    return this.prisma.icTransferOrder.update({
      where: { id },
      data: { status: 'CLOSED', updatedBy: userId },
      include: { lines: true },
    });
  }

  async cancel(id: string, dto: any, userId: string) {
    const order = await this.findOne(id);
    if (['CLOSED', 'CANCELLED'].includes(order.status)) throw new BadRequestException('Cannot cancel this order');

    return this.prisma.icTransferOrder.update({
      where: { id },
      data: { status: 'CANCELLED', cancelReasonCode: dto?.reasonCode, updatedBy: userId },
      include: { lines: true },
    });
  }

  private async generateTransferNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `TRF-${dateStr}`;

    const lastOrder = await this.prisma.icTransferOrder.findFirst({
      where: { transferNumber: { startsWith: prefix } },
      orderBy: { transferNumber: 'desc' },
    });

    let seq = 1;
    if (lastOrder) {
      const lastSeq = parseInt(lastOrder.transferNumber.split('-').pop() || '0', 10);
      seq = lastSeq + 1;
    }

    return `${prefix}-${seq.toString().padStart(4, '0')}`;
  }
}
