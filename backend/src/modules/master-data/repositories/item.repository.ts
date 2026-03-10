import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma, MdItem } from '@prisma/client';
import { PaginatedResult } from '../dto/common.dto';

@Injectable()
export class ItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.MdItemCreateInput): Promise<MdItem> {
    return this.prisma.mdItem.create({ data, include: { baseUom: true, billingUom: true } });
  }

  async findById(id: string): Promise<MdItem | null> {
    return this.prisma.mdItem.findUnique({
      where: { id },
      include: { baseUom: true, billingUom: true, catchWeightUom: true, defaultZone: true },
    });
  }

  async findByCode(itemCode: string): Promise<MdItem | null> {
    return this.prisma.mdItem.findUnique({ where: { itemCode } });
  }

  async findMany(params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    isActive?: boolean;
    cargoForm?: string;
    productGroup?: string;
  }): Promise<PaginatedResult<MdItem>> {
    const { page = 1, pageSize = 20, keyword, isActive, cargoForm, productGroup } = params;
    const skip = (page - 1) * pageSize;

    const where: Prisma.MdItemWhereInput = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (cargoForm) where.cargoForm = cargoForm as any;
    if (productGroup) where.productGroup = productGroup;
    if (keyword) {
      where.OR = [
        { itemCode: { contains: keyword, mode: 'insensitive' } },
        { itemName: { contains: keyword, mode: 'insensitive' } },
        { altItemCode: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.mdItem.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { itemCode: 'asc' },
        include: { baseUom: true, billingUom: true },
      }),
      this.prisma.mdItem.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async update(id: string, data: Prisma.MdItemUpdateInput, expectedVersion: bigint): Promise<MdItem> {
    return this.prisma.mdItem.update({
      where: { id, rowVersion: expectedVersion },
      data: { ...data, rowVersion: { increment: 1 } },
      include: { baseUom: true, billingUom: true },
    });
  }

  async deactivate(id: string, userId: string, expectedVersion: bigint): Promise<MdItem> {
    return this.prisma.mdItem.update({
      where: { id, rowVersion: expectedVersion },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
        deactivatedBy: userId,
        rowVersion: { increment: 1 },
      },
    });
  }

  async reactivate(id: string, userId: string, expectedVersion: bigint): Promise<MdItem> {
    return this.prisma.mdItem.update({
      where: { id, rowVersion: expectedVersion },
      data: {
        isActive: true,
        deactivatedAt: null,
        deactivatedBy: null,
        rowVersion: { increment: 1 },
      },
    });
  }

  async findAllActive(): Promise<MdItem[]> {
    return this.prisma.mdItem.findMany({
      where: { isActive: true },
      orderBy: { itemCode: 'asc' },
      include: { baseUom: true, billingUom: true },
    });
  }

  async getNextCode(): Promise<string> {
    const prefix = 'ITM';
    const existing = await this.prisma.mdItem.findMany({
      where: { itemCode: { startsWith: `${prefix}-` } },
      select: { itemCode: true },
    });
    const numbers = existing
      .map((r) => parseInt(r.itemCode.replace(`${prefix}-`, ''), 10))
      .filter((n) => !isNaN(n));
    const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    return `${prefix}-${String(nextNum).padStart(3, '0')}`;
  }
}
