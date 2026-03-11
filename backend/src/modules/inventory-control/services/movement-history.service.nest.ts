import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class MovementHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 30;
    const { warehouseId, itemId, transType } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId;
    if (itemId) where.itemId = itemId;
    if (transType) where.transType = transType;

    const [data, total] = await Promise.all([
      this.prisma.inventTrans.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.inventTrans.count({ where }),
    ]);

    // Enrich with related data
    const itemIds = [...new Set(data.map((d: any) => d.itemId).filter(Boolean))] as string[];
    const ownerIds = [...new Set(data.map((d: any) => d.ownerId).filter(Boolean))] as string[];

    const [items, owners] = await Promise.all([
      itemIds.length ? this.prisma.mdItem.findMany({ where: { id: { in: itemIds } } }) : [],
      ownerIds.length ? this.prisma.mdOwner.findMany({ where: { id: { in: ownerIds } } }) : [],
    ]);

    const itemMap = new Map(items.map((i: any) => [i.id, i]));
    const ownerMap = new Map(owners.map((o: any) => [o.id, o]));

    const enrichedData = data.map((d: any) => ({
      ...d,
      item: itemMap.get(d.itemId) || null,
      owner: ownerMap.get(d.ownerId) || null,
    }));

    return {
      data: enrichedData,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
