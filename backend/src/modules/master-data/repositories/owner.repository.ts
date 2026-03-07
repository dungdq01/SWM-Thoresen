import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma, MdOwner } from '@prisma/client';
import { PaginatedResult } from '../dto/common.dto';

@Injectable()
export class OwnerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.MdOwnerCreateInput): Promise<MdOwner> {
    return this.prisma.mdOwner.create({ data });
  }

  async findById(id: string): Promise<MdOwner | null> {
    return this.prisma.mdOwner.findUnique({
      where: { id },
      include: { defaultWarehouse: true },
    });
  }

  async findByCode(ownerCode: string): Promise<MdOwner | null> {
    return this.prisma.mdOwner.findUnique({ where: { ownerCode } });
  }

  async findMany(params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    isActive?: boolean;
    ownerGroup?: string;
    ownerType?: string;
  }): Promise<PaginatedResult<MdOwner>> {
    const { page = 1, pageSize = 20, keyword, isActive, ownerGroup, ownerType } = params;
    const skip = (page - 1) * pageSize;

    const where: Prisma.MdOwnerWhereInput = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (ownerGroup) where.ownerGroup = ownerGroup;
    if (ownerType) where.ownerType = ownerType as any;
    if (keyword) {
      where.OR = [
        { ownerCode: { contains: keyword, mode: 'insensitive' } },
        { ownerName: { contains: keyword, mode: 'insensitive' } },
        { shortName: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.mdOwner.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { ownerCode: 'asc' },
        include: { defaultWarehouse: true },
      }),
      this.prisma.mdOwner.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async update(id: string, data: Prisma.MdOwnerUpdateInput, expectedVersion: bigint): Promise<MdOwner> {
    return this.prisma.mdOwner.update({
      where: { id, rowVersion: expectedVersion },
      data: { ...data, rowVersion: { increment: 1 } },
    });
  }

  async deactivate(id: string, userId: string, expectedVersion: bigint): Promise<MdOwner> {
    return this.prisma.mdOwner.update({
      where: { id, rowVersion: expectedVersion },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
        deactivatedBy: userId,
        rowVersion: { increment: 1 },
      },
    });
  }

  async reactivate(id: string, userId: string, expectedVersion: bigint): Promise<MdOwner> {
    return this.prisma.mdOwner.update({
      where: { id, rowVersion: expectedVersion },
      data: {
        isActive: true,
        deactivatedAt: null,
        deactivatedBy: null,
        rowVersion: { increment: 1 },
      },
    });
  }

  async findAllActive(): Promise<MdOwner[]> {
    return this.prisma.mdOwner.findMany({
      where: { isActive: true },
      orderBy: { ownerCode: 'asc' },
    });
  }
}
