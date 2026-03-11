import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class CycleCountService {
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
      this.prisma.icCycleCountHeader.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { lines: true },
      }),
      this.prisma.icCycleCountHeader.count({ where }),
    ]);

    const warehouseIds = [...new Set(data.map((d: any) => d.warehouseId).filter(Boolean))] as string[];
    const warehouses = warehouseIds.length
      ? await this.prisma.mdWarehouse.findMany({ where: { id: { in: warehouseIds } } })
      : [];
    const warehouseMap = new Map(warehouses.map((w: any) => [w.id, w]));

    const enrichedData = data.map((d: any) => ({
      ...d,
      warehouse: warehouseMap.get(d.warehouseId) || null,
    }));

    return {
      data: enrichedData,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const record = await this.prisma.icCycleCountHeader.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (!record) throw new NotFoundException('Cycle count not found');
    return record;
  }

  async create(dto: any, userId: string) {
    const { warehouseId, countType, blindCount, lines } = dto;

    const countNumber = await this.generateNumber();

    const record = await this.prisma.icCycleCountHeader.create({
      data: {
        countNumber,
        warehouseId,
        blindCount: blindCount ?? true,
        countScopeSnapshot: '{}',
        status: 'CREATED',
        externalId: `EXT-${Date.now()}`,
        correlationId: `COR-${Date.now()}`.slice(0, 50),
        sourceApp: 'WEB',
        createdBy: userId,
        lines: {
          create: lines.map((line: any, idx: number) => ({
            lineNo: idx + 1,
            warehouseId,
            locationId: line.locationId,
            itemId: line.itemId,
            ownerId: line.ownerId,
            inventoryStatus: 'AVAILABLE',
            systemQty: Number(line.snapshotQty) || 0,
            lineStatus: 'OPEN',
          })),
        },
      },
      include: { lines: true },
    });

    return record;
  }

  async release(id: string, userId: string) {
    const record = await this.prisma.icCycleCountHeader.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!record) throw new NotFoundException('Cycle count not found');

    if (record.status !== 'CREATED') {
      throw new Error(`Cannot release cycle count with status ${record.status}`);
    }

    const updated = await this.prisma.icCycleCountHeader.update({
      where: { id },
      data: {
        status: 'RELEASED',
        releasedAt: new Date(),
        updatedBy: userId,
      },
      include: { lines: true },
    });

    return updated;
  }

  private async generateNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `CC-${dateStr}`;

    const lastRecord = await this.prisma.icCycleCountHeader.findFirst({
      where: { countNumber: { startsWith: prefix } },
      orderBy: { countNumber: 'desc' },
    });

    let seq = 1;
    if (lastRecord) {
      const lastSeq = parseInt(lastRecord.countNumber.split('-').pop() || '0', 10);
      seq = lastSeq + 1;
    }

    return `${prefix}-${seq.toString().padStart(4, '0')}`;
  }
}
