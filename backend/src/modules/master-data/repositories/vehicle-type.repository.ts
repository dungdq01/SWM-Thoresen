import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma, MdVehicleType } from '@prisma/client';
import { PaginatedResult } from '../dto/common.dto';

@Injectable()
export class VehicleTypeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.MdVehicleTypeCreateInput): Promise<MdVehicleType> {
    return this.prisma.mdVehicleType.create({ data });
  }

  async findById(id: string): Promise<MdVehicleType | null> {
    return this.prisma.mdVehicleType.findUnique({ where: { id } });
  }

  async findByCode(vehicleTypeCode: string): Promise<MdVehicleType | null> {
    return this.prisma.mdVehicleType.findUnique({ where: { vehicleTypeCode } });
  }

  async findMany(params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    isActive?: boolean;
    category?: string;
  }): Promise<PaginatedResult<MdVehicleType>> {
    const { page = 1, pageSize = 20, keyword, isActive, category } = params;
    const skip = (page - 1) * pageSize;

    const where: Prisma.MdVehicleTypeWhereInput = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (category) where.category = category as any;
    if (keyword) {
      where.OR = [
        { vehicleTypeCode: { contains: keyword, mode: 'insensitive' } },
        { vehicleTypeName: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.mdVehicleType.findMany({ where, skip, take: pageSize, orderBy: { vehicleTypeCode: 'asc' } }),
      this.prisma.mdVehicleType.count({ where }),
    ]);

    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
  }

  async update(id: string, data: Prisma.MdVehicleTypeUpdateInput, expectedVersion: bigint): Promise<MdVehicleType> {
    return this.prisma.mdVehicleType.update({
      where: { id, rowVersion: expectedVersion },
      data: { ...data, rowVersion: { increment: 1 } },
    });
  }

  async deactivate(id: string, userId: string, expectedVersion: bigint): Promise<MdVehicleType> {
    return this.prisma.mdVehicleType.update({
      where: { id, rowVersion: expectedVersion },
      data: { isActive: false, deactivatedAt: new Date(), deactivatedBy: userId, rowVersion: { increment: 1 } },
    });
  }

  async findAllActive(): Promise<MdVehicleType[]> {
    return this.prisma.mdVehicleType.findMany({ where: { isActive: true }, orderBy: { vehicleTypeCode: 'asc' } });
  }
}
