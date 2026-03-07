import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma, MdVendor } from '@prisma/client';
import { PaginatedResult } from '../dto/common.dto';

@Injectable()
export class VendorRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.MdVendorCreateInput): Promise<MdVendor> {
    return this.prisma.mdVendor.create({ data });
  }

  async findById(id: string): Promise<MdVendor | null> {
    return this.prisma.mdVendor.findUnique({ where: { id } });
  }

  async findByCode(vendorCode: string): Promise<MdVendor | null> {
    return this.prisma.mdVendor.findUnique({ where: { vendorCode } });
  }

  async findMany(params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    isActive?: boolean;
    supplierGroup?: string;
  }): Promise<PaginatedResult<MdVendor>> {
    const { page = 1, pageSize = 20, keyword, isActive, supplierGroup } = params;
    const skip = (page - 1) * pageSize;

    const where: Prisma.MdVendorWhereInput = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (supplierGroup) where.supplierGroup = supplierGroup as any;
    if (keyword) {
      where.OR = [
        { vendorCode: { contains: keyword, mode: 'insensitive' } },
        { vendorName: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.mdVendor.findMany({ where, skip, take: pageSize, orderBy: { vendorCode: 'asc' } }),
      this.prisma.mdVendor.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async update(id: string, data: Prisma.MdVendorUpdateInput, expectedVersion: bigint): Promise<MdVendor> {
    return this.prisma.mdVendor.update({
      where: { id, rowVersion: expectedVersion },
      data: { ...data, rowVersion: { increment: 1 } },
    });
  }

  async deactivate(id: string, userId: string, expectedVersion: bigint): Promise<MdVendor> {
    return this.prisma.mdVendor.update({
      where: { id, rowVersion: expectedVersion },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
        deactivatedBy: userId,
        rowVersion: { increment: 1 },
      },
    });
  }

  async reactivate(id: string, userId: string, expectedVersion: bigint): Promise<MdVendor> {
    return this.prisma.mdVendor.update({
      where: { id, rowVersion: expectedVersion },
      data: {
        isActive: true,
        deactivatedAt: null,
        deactivatedBy: null,
        rowVersion: { increment: 1 },
      },
    });
  }

  async findAllActive(): Promise<MdVendor[]> {
    return this.prisma.mdVendor.findMany({ where: { isActive: true }, orderBy: { vendorCode: 'asc' } });
  }
}
