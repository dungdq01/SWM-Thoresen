import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma, MdCarrier } from '@prisma/client';
import { PaginatedResult } from '../dto/common.dto';

@Injectable()
export class CarrierRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<MdCarrier | null> {
    return this.prisma.mdCarrier.findUnique({ where: { id } });
  }

  async findByCode(carrierCode: string): Promise<MdCarrier | null> {
    return this.prisma.mdCarrier.findUnique({ where: { carrierCode } });
  }

  async findMany(params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    isActive?: boolean;
    carrierGroup?: string;
    transportMode?: string;
  }): Promise<PaginatedResult<MdCarrier>> {
    const { page = 1, pageSize = 20, keyword, isActive, carrierGroup, transportMode } = params;
    const skip = (page - 1) * pageSize;

    const where: Prisma.MdCarrierWhereInput = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (carrierGroup) where.carrierGroup = carrierGroup as any;
    if (transportMode) where.transportMode = transportMode as any;
    if (keyword) {
      where.OR = [
        { carrierCode: { contains: keyword, mode: 'insensitive' } },
        { carrierName: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.mdCarrier.findMany({ where, skip, take: pageSize, orderBy: { carrierCode: 'asc' } }),
      this.prisma.mdCarrier.count({ where }),
    ]);

    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
  }

  async create(data: Prisma.MdCarrierCreateInput): Promise<MdCarrier> {
    return this.prisma.mdCarrier.create({ data });
  }

  async update(id: string, data: Prisma.MdCarrierUpdateInput, expectedVersion: bigint): Promise<MdCarrier> {
    return this.prisma.mdCarrier.update({
      where: { id, rowVersion: expectedVersion },
      data: { ...data, rowVersion: { increment: 1 } },
    });
  }

  async deactivate(id: string, userId: string, currentVersion: bigint): Promise<MdCarrier> {
    return this.prisma.mdCarrier.update({
      where: { id, rowVersion: currentVersion },
      data: { isActive: false, updatedBy: userId, rowVersion: { increment: 1 } },
    });
  }

  async reactivate(id: string, userId: string, currentVersion: bigint): Promise<MdCarrier> {
    return this.prisma.mdCarrier.update({
      where: { id, rowVersion: currentVersion },
      data: { isActive: true, updatedBy: userId, rowVersion: { increment: 1 } },
    });
  }

  async findAllActive(): Promise<MdCarrier[]> {
    return this.prisma.mdCarrier.findMany({ where: { isActive: true }, orderBy: { carrierName: 'asc' } });
  }

  async getNextCode(): Promise<string> {
    const prefix = 'CAR';
    const existing = await this.prisma.mdCarrier.findMany({
      where: { carrierCode: { startsWith: `${prefix}-` } },
      select: { carrierCode: true },
    });
    const numbers = existing
      .map((r: { carrierCode: string }) => parseInt(r.carrierCode.replace(`${prefix}-`, ''), 10))
      .filter((n: number) => !isNaN(n));
    const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    return `${prefix}-${String(nextNum).padStart(3, '0')}`;
  }
}
