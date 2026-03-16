import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma, MdOwnerSkuMapping } from '@prisma/client';
import { PaginatedResult } from '../dto/common.dto';

@Injectable()
export class OwnerSkuMappingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<MdOwnerSkuMapping | null> {
    return this.prisma.mdOwnerSkuMapping.findUnique({ where: { id }, include: { owner: true, item: true } });
  }

  async findByCode(mappingCode: string): Promise<MdOwnerSkuMapping | null> {
    return this.prisma.mdOwnerSkuMapping.findUnique({ where: { mappingCode } });
  }

  async findMany(params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    isActive?: boolean;
    ownerId?: string;
    itemId?: string;
  }): Promise<PaginatedResult<MdOwnerSkuMapping>> {
    const { page = 1, pageSize = 20, keyword, isActive, ownerId, itemId } = params;
    const skip = (page - 1) * pageSize;

    const where: Prisma.MdOwnerSkuMappingWhereInput = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (ownerId) where.ownerId = ownerId;
    if (itemId) where.itemId = itemId;
    if (keyword) {
      where.OR = [
        { mappingCode: { contains: keyword, mode: 'insensitive' } },
        { ownerSkuCode: { contains: keyword, mode: 'insensitive' } },
        { ownerSkuName: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.mdOwnerSkuMapping.findMany({ where, skip, take: pageSize, orderBy: { mappingCode: 'asc' }, include: { owner: true, item: true } }),
      this.prisma.mdOwnerSkuMapping.count({ where }),
    ]);

    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
  }

  async create(data: Prisma.MdOwnerSkuMappingUncheckedCreateInput): Promise<MdOwnerSkuMapping> {
    return this.prisma.mdOwnerSkuMapping.create({ data, include: { owner: true, item: true } });
  }

  async update(id: string, data: Prisma.MdOwnerSkuMappingUpdateInput, expectedVersion: bigint): Promise<MdOwnerSkuMapping> {
    return this.prisma.mdOwnerSkuMapping.update({
      where: { id, rowVersion: expectedVersion },
      data: { ...data, rowVersion: { increment: 1 } },
      include: { owner: true, item: true },
    });
  }

  async delete(id: string): Promise<MdOwnerSkuMapping> {
    return this.prisma.mdOwnerSkuMapping.delete({ where: { id } });
  }

  async getNextCode(): Promise<string> {
    const prefix = 'OSM';
    const existing = await this.prisma.mdOwnerSkuMapping.findMany({
      where: { mappingCode: { startsWith: `${prefix}-` } },
      select: { mappingCode: true },
    });
    const numbers = existing
      .map((r: { mappingCode: string }) => parseInt(r.mappingCode.replace(`${prefix}-`, ''), 10))
      .filter((n: number) => !isNaN(n));
    const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    return `${prefix}-${String(nextNum).padStart(3, '0')}`;
  }
}
