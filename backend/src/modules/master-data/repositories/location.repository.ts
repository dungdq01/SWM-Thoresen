import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma, MdLocation } from '@prisma/client';
import { PaginatedResult } from '../dto/common.dto';

@Injectable()
export class LocationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.MdLocationCreateInput): Promise<MdLocation> {
    return this.prisma.mdLocation.create({ data, include: { warehouse: true, zone: true } });
  }

  async findById(id: string): Promise<MdLocation | null> {
    return this.prisma.mdLocation.findUnique({ where: { id }, include: { warehouse: true, zone: true } });
  }

  async findByWarehouseAndCode(warehouseId: string, locationCode: string): Promise<MdLocation | null> {
    return this.prisma.mdLocation.findUnique({
      where: { warehouseId_locationCode: { warehouseId, locationCode } },
    });
  }

  async findMany(params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    isActive?: boolean;
    warehouseId?: string;
    zoneId?: string;
    locationType?: string;
  }): Promise<PaginatedResult<MdLocation>> {
    const { page = 1, pageSize = 20, keyword, isActive, warehouseId, zoneId, locationType } = params;
    const skip = (page - 1) * pageSize;

    const where: Prisma.MdLocationWhereInput = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (warehouseId) where.warehouseId = warehouseId;
    if (zoneId) where.zoneId = zoneId;
    if (locationType) where.locationType = locationType as any;
    if (keyword) {
      where.OR = [{ locationCode: { contains: keyword, mode: 'insensitive' } }];
    }

    const [data, total] = await Promise.all([
      this.prisma.mdLocation.findMany({ where, skip, take: pageSize, orderBy: { locationCode: 'asc' }, include: { warehouse: true, zone: true } }),
      this.prisma.mdLocation.count({ where }),
    ]);

    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
  }

  async update(id: string, data: Prisma.MdLocationUpdateInput, expectedVersion: bigint): Promise<MdLocation> {
    return this.prisma.mdLocation.update({
      where: { id, rowVersion: expectedVersion },
      data: { ...data, rowVersion: { increment: 1 } },
      include: { warehouse: true, zone: true },
    });
  }

  async deactivate(id: string, userId: string, expectedVersion: bigint): Promise<MdLocation> {
    return this.prisma.mdLocation.update({
      where: { id, rowVersion: expectedVersion },
      data: { isActive: false, deactivatedAt: new Date(), deactivatedBy: userId, rowVersion: { increment: 1 } },
    });
  }

  async reactivate(id: string, userId: string, expectedVersion: bigint): Promise<MdLocation> {
    return this.prisma.mdLocation.update({
      where: { id, rowVersion: expectedVersion },
      data: { isActive: true, deactivatedAt: null, deactivatedBy: null, rowVersion: { increment: 1 } },
    });
  }

  async findByWarehouse(warehouseId: string): Promise<MdLocation[]> {
    return this.prisma.mdLocation.findMany({ where: { warehouseId, isActive: true }, orderBy: { locationCode: 'asc' } });
  }

  async findByZone(zoneId: string): Promise<MdLocation[]> {
    return this.prisma.mdLocation.findMany({ where: { zoneId, isActive: true }, orderBy: { locationCode: 'asc' } });
  }
}
