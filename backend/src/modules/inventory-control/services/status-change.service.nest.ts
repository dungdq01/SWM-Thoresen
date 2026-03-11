import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class StatusChangeService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const { warehouseId } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId;

    const [data, total] = await Promise.all([
      this.prisma.icInventoryStatusChange.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.icInventoryStatusChange.count({ where }),
    ]);

    // Enrich with related data
    const warehouseIds = [...new Set(data.map((d: any) => d.warehouseId).filter(Boolean))] as string[];
    const itemIds = [...new Set(data.map((d: any) => d.itemId).filter(Boolean))] as string[];
    const ownerIds = [...new Set(data.map((d: any) => d.ownerId).filter(Boolean))] as string[];

    const [warehouses, items, owners] = await Promise.all([
      warehouseIds.length ? this.prisma.mdWarehouse.findMany({ where: { id: { in: warehouseIds } } }) : [],
      itemIds.length ? this.prisma.mdItem.findMany({ where: { id: { in: itemIds } } }) : [],
      ownerIds.length ? this.prisma.mdOwner.findMany({ where: { id: { in: ownerIds } } }) : [],
    ]);

    const warehouseMap = new Map(warehouses.map((w: any) => [w.id, w]));
    const itemMap = new Map(items.map((i: any) => [i.id, i]));
    const ownerMap = new Map(owners.map((o: any) => [o.id, o]));

    const enrichedData = data.map((d: any) => ({
      ...d,
      warehouse: warehouseMap.get(d.warehouseId) || null,
      item: itemMap.get(d.itemId) || null,
      owner: ownerMap.get(d.ownerId) || null,
    }));

    return {
      data: enrichedData,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const record = await this.prisma.icInventoryStatusChange.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Status change not found');
    return record;
  }

  async create(dto: any, userId: string) {
    const { warehouseId, locationId, itemId, ownerId, fromStatus, toStatus, qty, reasonCode, reasonText } = dto;

    const statusChangeNumber = await this.generateNumber();

    const record = await this.prisma.icInventoryStatusChange.create({
      data: {
        statusChangeNumber,
        warehouseId,
        locationId,
        itemId,
        ownerId,
        fromStatus,
        toStatus,
        qty: Number(qty),
        uom: 'KG',
        reasonCode,
        reasonText,
        status: 'CREATED',
        requestedBy: userId,
        externalId: `EXT-${Date.now()}`,
        correlationId: `COR-${Date.now()}`.slice(0, 50),
        sourceApp: 'WEB',
        createdBy: userId,
      },
    });

    return record;
  }

  async execute(id: string, userId: string) {
    const record = await this.prisma.icInventoryStatusChange.findUnique({ where: { id } });

    if (!record) throw new NotFoundException('Status change not found');

    if (record.status !== 'CREATED') {
      throw new Error(`Cannot execute status change with status ${record.status}`);
    }

    const updated = await this.prisma.icInventoryStatusChange.update({
      where: { id },
      data: {
        status: 'POSTED',
        approvedBy: userId,
        postedAt: new Date(),
        updatedBy: userId,
      },
    });

    return updated;
  }

  async cancel(id: string, userId: string) {
    const record = await this.prisma.icInventoryStatusChange.findUnique({ where: { id } });

    if (!record) throw new NotFoundException('Status change not found');

    if (record.status !== 'CREATED') {
      throw new Error(`Cannot cancel status change with status ${record.status}`);
    }

    const updated = await this.prisma.icInventoryStatusChange.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        updatedBy: userId,
      },
    });

    return updated;
  }

  private async generateNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `STC-${dateStr}`;

    const lastRecord = await this.prisma.icInventoryStatusChange.findFirst({
      where: { statusChangeNumber: { startsWith: prefix } },
      orderBy: { statusChangeNumber: 'desc' },
    });

    let seq = 1;
    if (lastRecord) {
      const lastSeq = parseInt(lastRecord.statusChangeNumber.split('-').pop() || '0', 10);
      seq = lastSeq + 1;
    }

    return `${prefix}-${seq.toString().padStart(4, '0')}`;
  }
}
