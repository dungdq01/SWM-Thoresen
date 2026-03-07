import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma, MdWarehouse } from '@prisma/client';
import { PaginatedResult } from '../dto/common.dto';

@Injectable()
export class WarehouseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.MdWarehouseCreateInput): Promise<MdWarehouse> {
    return this.prisma.mdWarehouse.create({ data });
  }

  async findById(id: string): Promise<MdWarehouse | null> {
    return this.prisma.mdWarehouse.findUnique({ where: { id } });
  }

  async findByCode(warehouseCode: string): Promise<MdWarehouse | null> {
    return this.prisma.mdWarehouse.findUnique({ where: { warehouseCode } });
  }

  async findMany(params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    isActive?: boolean;
    warehouseType?: string;
  }): Promise<PaginatedResult<MdWarehouse>> {
    const { page = 1, pageSize = 20, keyword, isActive, warehouseType } = params;
    const skip = (page - 1) * pageSize;

    const where: Prisma.MdWarehouseWhereInput = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (warehouseType) where.warehouseType = warehouseType as any;
    if (keyword) {
      where.OR = [
        { warehouseCode: { contains: keyword, mode: 'insensitive' } },
        { warehouseName: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.mdWarehouse.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { warehouseCode: 'asc' },
      }),
      this.prisma.mdWarehouse.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async update(id: string, data: Prisma.MdWarehouseUpdateInput, expectedVersion: bigint): Promise<MdWarehouse> {
    return this.prisma.mdWarehouse.update({
      where: { id, rowVersion: expectedVersion },
      data: { ...data, rowVersion: { increment: 1 } },
    });
  }

  async deactivate(id: string, userId: string, expectedVersion: bigint): Promise<MdWarehouse> {
    return this.prisma.mdWarehouse.update({
      where: { id, rowVersion: expectedVersion },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
        deactivatedBy: userId,
        rowVersion: { increment: 1 },
      },
    });
  }

  async reactivate(id: string, userId: string, expectedVersion: bigint): Promise<MdWarehouse> {
    return this.prisma.mdWarehouse.update({
      where: { id, rowVersion: expectedVersion },
      data: {
        isActive: true,
        deactivatedAt: null,
        deactivatedBy: null,
        rowVersion: { increment: 1 },
      },
    });
  }

  async findAllActive(): Promise<MdWarehouse[]> {
    return this.prisma.mdWarehouse.findMany({
      where: { isActive: true },
      orderBy: { warehouseCode: 'asc' },
    });
  }

  async hasActiveZones(warehouseId: string): Promise<boolean> {
    const count = await this.prisma.mdZone.count({
      where: { warehouseId, isActive: true },
    });
    return count > 0;
  }
}
