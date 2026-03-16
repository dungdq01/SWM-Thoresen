import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma, MdLocationType } from '@prisma/client';
import { PaginatedResult } from '../dto/common.dto';

@Injectable()
export class LocationTypeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<MdLocationType | null> {
    return this.prisma.mdLocationType.findUnique({ where: { id } });
  }

  async findByCode(locationTypeCode: string): Promise<MdLocationType | null> {
    return this.prisma.mdLocationType.findUnique({ where: { locationTypeCode } });
  }

  async findMany(params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    isActive?: boolean;
  }): Promise<PaginatedResult<MdLocationType>> {
    const { page = 1, pageSize = 20, keyword, isActive } = params;
    const skip = (page - 1) * pageSize;

    const where: Prisma.MdLocationTypeWhereInput = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (keyword) {
      where.OR = [
        { locationTypeCode: { contains: keyword, mode: 'insensitive' } },
        { locationTypeName: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.mdLocationType.findMany({ where, skip, take: pageSize, orderBy: { locationTypeCode: 'asc' } }),
      this.prisma.mdLocationType.count({ where }),
    ]);

    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
  }

  async create(data: Prisma.MdLocationTypeCreateInput): Promise<MdLocationType> {
    return this.prisma.mdLocationType.create({ data });
  }

  async update(id: string, data: Prisma.MdLocationTypeUpdateInput, expectedVersion: bigint): Promise<MdLocationType> {
    return this.prisma.mdLocationType.update({
      where: { id, rowVersion: expectedVersion },
      data: { ...data, rowVersion: { increment: 1 } },
    });
  }

  async delete(id: string): Promise<MdLocationType> {
    return this.prisma.mdLocationType.delete({ where: { id } });
  }

  async findAllActive(): Promise<MdLocationType[]> {
    return this.prisma.mdLocationType.findMany({ where: { isActive: true }, orderBy: { locationTypeCode: 'asc' } });
  }

  async getNextCode(): Promise<string> {
    const prefix = 'LT';
    const existing = await this.prisma.mdLocationType.findMany({
      where: { locationTypeCode: { startsWith: `${prefix}-` } },
      select: { locationTypeCode: true },
    });
    const numbers = existing
      .map((r: { locationTypeCode: string }) => parseInt(r.locationTypeCode.replace(`${prefix}-`, ''), 10))
      .filter((n: number) => !isNaN(n));
    const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    return `${prefix}-${String(nextNum).padStart(3, '0')}`;
  }
}
