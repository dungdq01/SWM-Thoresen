import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma, DropdownConfig } from '@prisma/client';
import { PaginatedResult } from '../dto/common.dto';

@Injectable()
export class DropdownConfigRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.DropdownConfigCreateInput): Promise<DropdownConfig> {
    try {
      return await this.prisma.dropdownConfig.create({ data });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new ConflictException(`Dropdown value "${data.value}" already exists for ${data.entity}.${data.fieldName}`);
      }
      throw err;
    }
  }

  async findById(id: string): Promise<DropdownConfig | null> {
    return this.prisma.dropdownConfig.findUnique({ where: { id } });
  }

  async findMany(params: {
    page?: number;
    pageSize?: number;
    entity?: string;
    fieldName?: string;
    keyword?: string;
    isActive?: boolean;
  }): Promise<PaginatedResult<DropdownConfig>> {
    const { page = 1, pageSize = 20, entity, fieldName, keyword, isActive } = params;
    const skip = (page - 1) * pageSize;

    const where: Prisma.DropdownConfigWhereInput = {};
    if (entity) where.entity = entity;
    if (fieldName) where.fieldName = fieldName;
    if (isActive !== undefined) where.isActive = isActive;
    if (keyword) {
      where.OR = [
        { value: { contains: keyword, mode: 'insensitive' } },
        { label: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.dropdownConfig.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ entity: 'asc' }, { fieldName: 'asc' }, { sortOrder: 'asc' }],
      }),
      this.prisma.dropdownConfig.count({ where }),
    ]);

    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
  }

  async update(id: string, data: Prisma.DropdownConfigUpdateInput): Promise<DropdownConfig> {
    return this.prisma.dropdownConfig.update({ where: { id }, data });
  }

  async delete(id: string): Promise<DropdownConfig> {
    return this.prisma.dropdownConfig.delete({ where: { id } });
  }

  async setDefault(id: string): Promise<DropdownConfig> {
    const record = await this.prisma.dropdownConfig.findUnique({ where: { id } });
    if (!record) throw new Error(`DropdownConfig ${id} not found`);

    return this.prisma.$transaction(async (tx) => {
      await tx.dropdownConfig.updateMany({
        where: { entity: record.entity, fieldName: record.fieldName },
        data: { isDefault: false },
      });
      return tx.dropdownConfig.update({
        where: { id },
        data: { isDefault: true },
      });
    });
  }

  async findActiveOptions(entity: string, fieldName: string): Promise<DropdownConfig[]> {
    return this.prisma.dropdownConfig.findMany({
      where: { entity, fieldName, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getNextSortOrder(entity: string, fieldName: string): Promise<number> {
    const result = await this.prisma.dropdownConfig.aggregate({
      where: { entity, fieldName },
      _max: { sortOrder: true },
    });
    return (result._max.sortOrder ?? 0) + 1;
  }
}
