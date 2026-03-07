import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma, MdZone } from '@prisma/client';
import { PaginatedResult } from '../dto/common.dto';

@Injectable()
export class ZoneRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.MdZoneCreateInput): Promise<MdZone> {
    return this.prisma.mdZone.create({ data, include: { warehouse: true } });
  }

  async findById(id: string): Promise<MdZone | null> {
    return this.prisma.mdZone.findUnique({ where: { id }, include: { warehouse: true } });
  }

  async findByWarehouseAndCode(warehouseId: string, zoneCode: string): Promise<MdZone | null> {
    return this.prisma.mdZone.findUnique({
      where: { warehouseId_zoneCode: { warehouseId, zoneCode } },
    });
  }

  async findMany(params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    isActive?: boolean;
    warehouseId?: string;
    zoneType?: string;
  }): Promise<PaginatedResult<MdZone>> {
    const { page = 1, pageSize = 20, keyword, isActive, warehouseId, zoneType } = params;
    const skip = (page - 1) * pageSize;

    const where: Prisma.MdZoneWhereInput = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (warehouseId) where.warehouseId = warehouseId;
    if (zoneType) where.zoneType = zoneType as any;
    if (keyword) {
      where.OR = [
        { zoneCode: { contains: keyword, mode: 'insensitive' } },
        { zoneName: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.mdZone.findMany({ where, skip, take: pageSize, orderBy: { zoneCode: 'asc' }, include: { warehouse: true } }),
      this.prisma.mdZone.count({ where }),
    ]);

    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
  }

  async update(id: string, data: Prisma.MdZoneUpdateInput, expectedVersion: bigint): Promise<MdZone> {
    return this.prisma.mdZone.update({
      where: { id, rowVersion: expectedVersion },
      data: { ...data, rowVersion: { increment: 1 } },
      include: { warehouse: true },
    });
  }

  async deactivate(id: string, userId: string, expectedVersion: bigint): Promise<MdZone> {
    return this.prisma.mdZone.update({
      where: { id, rowVersion: expectedVersion },
      data: { isActive: false, deactivatedAt: new Date(), deactivatedBy: userId, rowVersion: { increment: 1 } },
    });
  }

  async reactivate(id: string, userId: string, expectedVersion: bigint): Promise<MdZone> {
    return this.prisma.mdZone.update({
      where: { id, rowVersion: expectedVersion },
      data: { isActive: true, deactivatedAt: null, deactivatedBy: null, rowVersion: { increment: 1 } },
    });
  }

  async findByWarehouse(warehouseId: string): Promise<MdZone[]> {
    return this.prisma.mdZone.findMany({ where: { warehouseId, isActive: true }, orderBy: { zoneCode: 'asc' } });
  }

  async hasActiveLocations(zoneId: string): Promise<boolean> {
    const count = await this.prisma.mdLocation.count({ where: { zoneId, isActive: true } });
    return count > 0;
  }
}
