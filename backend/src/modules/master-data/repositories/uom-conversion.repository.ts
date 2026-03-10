import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma, MdUomConversion } from '@prisma/client';
import { PaginatedResult } from '../dto/common.dto';

@Injectable()
export class UomConversionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.MdUomConversionCreateInput): Promise<MdUomConversion> {
    try {
      return await this.prisma.mdUomConversion.create({
        data,
        include: {
          fromUom: { select: { uomCode: true, description: true } },
          toUom: { select: { uomCode: true, description: true } },
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new ConflictException('Conversion for this fromUom → toUom (+ item) pair already exists');
      }
      throw err;
    }
  }

  async findById(id: string): Promise<MdUomConversion | null> {
    return this.prisma.mdUomConversion.findUnique({
      where: { id },
      include: {
        fromUom: { select: { uomCode: true, description: true } },
        toUom: { select: { uomCode: true, description: true } },
        item: { select: { itemCode: true, itemName: true } },
      },
    });
  }

  async findMany(params: {
    page?: number;
    pageSize?: number;
    fromUomId?: string;
    toUomId?: string;
    keyword?: string;
  }): Promise<PaginatedResult<any>> {
    const { page = 1, pageSize = 20, fromUomId, toUomId, keyword } = params;
    const skip = (page - 1) * pageSize;

    const where: Prisma.MdUomConversionWhereInput = {};
    if (fromUomId) where.fromUomId = fromUomId;
    if (toUomId) where.toUomId = toUomId;
    if (keyword) {
      where.OR = [
        { fromUom: { uomCode: { contains: keyword, mode: 'insensitive' } } },
        { toUom: { uomCode: { contains: keyword, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.mdUomConversion.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ fromUom: { uomCode: 'asc' } }, { toUom: { uomCode: 'asc' } }],
        include: {
          fromUom: { select: { uomCode: true, description: true } },
          toUom: { select: { uomCode: true, description: true } },
          item: { select: { itemCode: true, itemName: true } },
        },
      }),
      this.prisma.mdUomConversion.count({ where }),
    ]);

    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
  }

  async update(id: string, data: Prisma.MdUomConversionUpdateInput, expectedVersion: bigint): Promise<MdUomConversion> {
    return this.prisma.mdUomConversion.update({
      where: { id, rowVersion: expectedVersion },
      data: { ...data, rowVersion: { increment: 1 } },
      include: {
        fromUom: { select: { uomCode: true, description: true } },
        toUom: { select: { uomCode: true, description: true } },
      },
    });
  }

  async delete(id: string): Promise<MdUomConversion> {
    return this.prisma.mdUomConversion.delete({ where: { id } });
  }
}
