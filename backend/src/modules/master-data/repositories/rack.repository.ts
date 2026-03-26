import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma, MdRack } from '@prisma/client';
import { PaginatedResult } from '../dto/common.dto';

@Injectable()
export class RackRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.MdRackCreateInput): Promise<MdRack> {
    return this.prisma.mdRack.create({ data });
  }

  async findById(id: string): Promise<MdRack | null> {
    return this.prisma.mdRack.findUnique({ where: { id } });
  }

  async findMany(params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    isActive?: boolean;
    warehouseId?: string;
    zoneId?: string;
    rackType?: string;
  }): Promise<PaginatedResult<MdRack>> {
    const { page = 1, pageSize = 20, keyword, isActive, warehouseId, zoneId, rackType } = params;
    const skip = (page - 1) * pageSize;

    const where: Prisma.MdRackWhereInput = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (warehouseId) where.warehouseId = warehouseId;
    if (zoneId) where.zoneId = zoneId;
    if (rackType) where.rackType = rackType as any;
    if (keyword) {
      where.OR = [
        { rackCode: { contains: keyword, mode: 'insensitive' } },
        { rackName: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.mdRack.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { rackCode: 'asc' },
        include: {
          zone: { select: { id: true, zoneCode: true, zoneName: true } },
        },
      }),
      this.prisma.mdRack.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async update(id: string, data: Prisma.MdRackUpdateInput, expectedVersion: bigint): Promise<MdRack> {
    return this.prisma.mdRack.update({
      where: { id, rowVersion: expectedVersion },
      data: { ...data, rowVersion: { increment: 1 } },
    });
  }

  async deactivate(id: string, userId: string, expectedVersion: bigint): Promise<MdRack> {
    return this.prisma.mdRack.update({
      where: { id, rowVersion: expectedVersion },
      data: {
        isActive: false,
        rowVersion: { increment: 1 },
      },
    });
  }

  async findByWarehouseId(warehouseId: string): Promise<MdRack[]> {
    return this.prisma.mdRack.findMany({
      where: { warehouseId, isActive: true },
      orderBy: { rackCode: 'asc' },
    });
  }
}
