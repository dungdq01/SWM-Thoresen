import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma, MdUom } from '@prisma/client';
import { PaginatedResult } from '../dto/common.dto';

@Injectable()
export class UomRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.MdUomCreateInput): Promise<MdUom> {
    return this.prisma.mdUom.create({ data });
  }

  async findById(id: string): Promise<MdUom | null> {
    return this.prisma.mdUom.findUnique({ where: { id } });
  }

  async findByCode(uomCode: string): Promise<MdUom | null> {
    return this.prisma.mdUom.findUnique({ where: { uomCode } });
  }

  async findMany(params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    isActive?: boolean;
    uomClass?: string;
  }): Promise<PaginatedResult<MdUom>> {
    const { page = 1, pageSize = 20, keyword, isActive, uomClass } = params;
    const skip = (page - 1) * pageSize;

    const where: Prisma.MdUomWhereInput = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (uomClass) where.uomClass = uomClass as any;
    if (keyword) {
      where.OR = [
        { uomCode: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.mdUom.findMany({ where, skip, take: pageSize, orderBy: { uomCode: 'asc' } }),
      this.prisma.mdUom.count({ where }),
    ]);

    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
  }

  async update(id: string, data: Prisma.MdUomUpdateInput, expectedVersion: bigint): Promise<MdUom> {
    return this.prisma.mdUom.update({
      where: { id, rowVersion: expectedVersion },
      data: { ...data, rowVersion: { increment: 1 } },
    });
  }

  async deactivate(id: string, userId: string, expectedVersion: bigint): Promise<MdUom> {
    return this.prisma.mdUom.update({
      where: { id, rowVersion: expectedVersion },
      data: { isActive: false, deactivatedAt: new Date(), deactivatedBy: userId, rowVersion: { increment: 1 } },
    });
  }

  async reactivate(id: string, userId: string, expectedVersion: bigint): Promise<MdUom> {
    return this.prisma.mdUom.update({
      where: { id, rowVersion: expectedVersion },
      data: { isActive: true, deactivatedAt: null, deactivatedBy: null, updatedBy: userId, rowVersion: { increment: 1 } },
    });
  }

  async findAllActive(): Promise<MdUom[]> {
    return this.prisma.mdUom.findMany({ where: { isActive: true }, orderBy: { uomCode: 'asc' } });
  }
}
