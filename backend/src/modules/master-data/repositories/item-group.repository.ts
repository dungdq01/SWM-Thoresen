import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma, MdItemGroup } from '@prisma/client';
import { PaginatedResult } from '../dto/common.dto';

@Injectable()
export class ItemGroupRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<MdItemGroup | null> {
    return this.prisma.mdItemGroup.findUnique({ where: { id } });
  }

  async findByCode(itemGroupCode: string): Promise<MdItemGroup | null> {
    return this.prisma.mdItemGroup.findUnique({ where: { itemGroupCode } });
  }

  async findMany(params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    isActive?: boolean;
    cargoForm?: string;
  }): Promise<PaginatedResult<MdItemGroup>> {
    const { page = 1, pageSize = 20, keyword, isActive, cargoForm } = params;
    const skip = (page - 1) * pageSize;

    const where: Prisma.MdItemGroupWhereInput = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (cargoForm) where.cargoForm = cargoForm as any;
    if (keyword) {
      where.OR = [
        { itemGroupCode: { contains: keyword, mode: 'insensitive' } },
        { itemGroupName: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const include = {
      weighbridgeQtyUom: { select: { uomCode: true, description: true } },
      warehouses: { include: { warehouse: { select: { id: true, warehouseCode: true, warehouseName: true } } } },
    };
    const [data, total] = await Promise.all([
      this.prisma.mdItemGroup.findMany({ where, skip, take: pageSize, orderBy: { itemGroupCode: 'asc' }, include }),
      this.prisma.mdItemGroup.count({ where }),
    ]);

    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
  }

  async create(data: Prisma.MdItemGroupCreateInput): Promise<MdItemGroup> {
    return this.prisma.mdItemGroup.create({ data });
  }

  async update(id: string, data: Prisma.MdItemGroupUpdateInput, expectedVersion: bigint): Promise<MdItemGroup> {
    return this.prisma.mdItemGroup.update({
      where: { id, rowVersion: expectedVersion },
      data: { ...data, rowVersion: { increment: 1 } },
    });
  }

  async deactivate(id: string, userId: string, currentVersion: bigint): Promise<MdItemGroup> {
    return this.prisma.mdItemGroup.update({
      where: { id, rowVersion: currentVersion },
      data: { isActive: false, updatedBy: userId, rowVersion: { increment: 1 } },
    });
  }

  async reactivate(id: string, userId: string, currentVersion: bigint): Promise<MdItemGroup> {
    return this.prisma.mdItemGroup.update({
      where: { id, rowVersion: currentVersion },
      data: { isActive: true, updatedBy: userId, rowVersion: { increment: 1 } },
    });
  }

  async findAllActive(): Promise<MdItemGroup[]> {
    return this.prisma.mdItemGroup.findMany({ where: { isActive: true }, orderBy: { itemGroupCode: 'asc' } });
  }

  async getNextCode(): Promise<string> {
    const prefix = 'IG';
    const existing = await this.prisma.mdItemGroup.findMany({
      where: { itemGroupCode: { startsWith: `${prefix}-` } },
      select: { itemGroupCode: true },
    });
    const numbers = existing
      .map((r: { itemGroupCode: string }) => parseInt(r.itemGroupCode.replace(`${prefix}-`, ''), 10))
      .filter((n: number) => !isNaN(n));
    const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    return `${prefix}-${String(nextNum).padStart(3, '0')}`;
  }
}
