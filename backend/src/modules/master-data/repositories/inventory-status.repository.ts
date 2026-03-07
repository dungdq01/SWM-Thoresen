import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma, MdInventoryStatus } from '@prisma/client';
import { PaginatedResult } from '../dto/common.dto';

@Injectable()
export class InventoryStatusRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<MdInventoryStatus | null> {
    return this.prisma.mdInventoryStatus.findUnique({ where: { id } });
  }

  async findByCode(statusCode: string): Promise<MdInventoryStatus | null> {
    return this.prisma.mdInventoryStatus.findUnique({ where: { statusCode } });
  }

  async findMany(params: {
    page?: number;
    pageSize?: number;
    isActive?: boolean;
  }): Promise<PaginatedResult<MdInventoryStatus>> {
    const { page = 1, pageSize = 20, isActive } = params;
    const skip = (page - 1) * pageSize;

    const where: Prisma.MdInventoryStatusWhereInput = {};
    if (isActive !== undefined) where.isActive = isActive;

    const [data, total] = await Promise.all([
      this.prisma.mdInventoryStatus.findMany({ where, skip, take: pageSize, orderBy: { displayOrder: 'asc' } }),
      this.prisma.mdInventoryStatus.count({ where }),
    ]);

    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
  }

  async update(id: string, data: Prisma.MdInventoryStatusUpdateInput, expectedVersion: bigint): Promise<MdInventoryStatus> {
    return this.prisma.mdInventoryStatus.update({
      where: { id, rowVersion: expectedVersion },
      data: { ...data, rowVersion: { increment: 1 } },
    });
  }

  async findAllActive(): Promise<MdInventoryStatus[]> {
    return this.prisma.mdInventoryStatus.findMany({ where: { isActive: true }, orderBy: { displayOrder: 'asc' } });
  }

  async findAllocatable(): Promise<MdInventoryStatus[]> {
    return this.prisma.mdInventoryStatus.findMany({ where: { isActive: true, isAllocatable: true }, orderBy: { displayOrder: 'asc' } });
  }
}
