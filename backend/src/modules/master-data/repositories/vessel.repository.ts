import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma, MdVessel } from '@prisma/client';
import { PaginatedResult } from '../dto/common.dto';

@Injectable()
export class VesselRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<MdVessel | null> {
    return this.prisma.mdVessel.findUnique({ where: { id } });
  }

  async findByCode(vesselCode: string): Promise<MdVessel | null> {
    return this.prisma.mdVessel.findUnique({ where: { vesselCode } });
  }

  async findMany(params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    isActive?: boolean;
    vesselType?: string;
  }): Promise<PaginatedResult<MdVessel>> {
    const { page = 1, pageSize = 20, keyword, isActive, vesselType } = params;
    const skip = (page - 1) * pageSize;

    const where: Prisma.MdVesselWhereInput = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (vesselType) where.vesselType = vesselType as any;
    if (keyword) {
      where.OR = [
        { vesselCode: { contains: keyword, mode: 'insensitive' } },
        { vesselName: { contains: keyword, mode: 'insensitive' } },
        { imoNumber: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.mdVessel.findMany({ where, skip, take: pageSize, orderBy: { vesselCode: 'asc' } }),
      this.prisma.mdVessel.count({ where }),
    ]);

    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
  }

  async create(data: Prisma.MdVesselCreateInput): Promise<MdVessel> {
    return this.prisma.mdVessel.create({ data });
  }

  async update(id: string, data: Prisma.MdVesselUpdateInput, expectedVersion: bigint): Promise<MdVessel> {
    return this.prisma.mdVessel.update({
      where: { id, rowVersion: expectedVersion },
      data: { ...data, rowVersion: { increment: 1 } },
    });
  }

  async deactivate(id: string, userId: string, currentVersion: bigint): Promise<MdVessel> {
    return this.prisma.mdVessel.update({
      where: { id, rowVersion: currentVersion },
      data: { isActive: false, updatedBy: userId, rowVersion: { increment: 1 } },
    });
  }

  async reactivate(id: string, userId: string, currentVersion: bigint): Promise<MdVessel> {
    return this.prisma.mdVessel.update({
      where: { id, rowVersion: currentVersion },
      data: { isActive: true, updatedBy: userId, rowVersion: { increment: 1 } },
    });
  }

  async findAllActive(): Promise<MdVessel[]> {
    return this.prisma.mdVessel.findMany({ where: { isActive: true }, orderBy: { vesselName: 'asc' } });
  }

  async getNextCode(): Promise<string> {
    const prefix = 'VSL';
    const existing = await this.prisma.mdVessel.findMany({
      where: { vesselCode: { startsWith: `${prefix}-` } },
      select: { vesselCode: true },
    });
    const numbers = existing
      .map((r: { vesselCode: string }) => parseInt(r.vesselCode.replace(`${prefix}-`, ''), 10))
      .filter((n: number) => !isNaN(n));
    const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    return `${prefix}-${String(nextNum).padStart(3, '0')}`;
  }
}
