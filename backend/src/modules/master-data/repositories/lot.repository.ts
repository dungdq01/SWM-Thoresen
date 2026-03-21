import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma, MdLot, LotStatus } from '@prisma/client';
import { PaginatedResult } from '../dto/common.dto';
import * as crypto from 'crypto';

@Injectable()
export class LotRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.MdLotCreateInput): Promise<MdLot> {
    return this.prisma.mdLot.create({ 
      data,
      include: {
        item: true,
        owner: true,
        warehouse: true,
        sourceLot: true,
      },
    });
  }

  async findById(id: string): Promise<MdLot | null> {
    return this.prisma.mdLot.findUnique({
      where: { id },
      include: {
        item: true,
        owner: true,
        warehouse: true,
        sourceLot: true,
        derivedLots: true,
      },
    });
  }

  async findByCode(lotCode: string): Promise<MdLot | null> {
    return this.prisma.mdLot.findUnique({ 
      where: { lotCode },
      include: {
        item: true,
        owner: true,
        warehouse: true,
      },
    });
  }

  async findByHash(lotHash: string): Promise<MdLot | null> {
    return this.prisma.mdLot.findUnique({ 
      where: { lotHash },
      include: {
        item: true,
        owner: true,
        warehouse: true,
      },
    });
  }

  async findMany(params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    isActive?: boolean;
    itemId?: string;
    ownerId?: string;
    warehouseId?: string;
    status?: LotStatus;
    sourceLotId?: string;
  }): Promise<PaginatedResult<MdLot>> {
    const { 
      page = 1, 
      pageSize = 20, 
      keyword, 
      isActive, 
      itemId, 
      ownerId, 
      warehouseId, 
      status,
      sourceLotId,
    } = params;
    const skip = (page - 1) * pageSize;

    const where: Prisma.MdLotWhereInput = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (itemId) where.itemId = itemId;
    if (ownerId) where.ownerId = ownerId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (status) where.status = status;
    if (sourceLotId) where.sourceLotId = sourceLotId;
    if (keyword) {
      where.OR = [
        { lotCode: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.mdLot.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { firstReceivedDate: 'asc' },
        include: {
          item: true,
          owner: true,
          warehouse: true,
          sourceLot: true,
        },
      }),
      this.prisma.mdLot.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async update(id: string, data: Prisma.MdLotUpdateInput, expectedVersion: bigint): Promise<MdLot> {
    return this.prisma.mdLot.update({
      where: { id, rowVersion: expectedVersion },
      data: { ...data, rowVersion: { increment: 1 } },
      include: {
        item: true,
        owner: true,
        warehouse: true,
        sourceLot: true,
      },
    });
  }

  async deactivate(id: string, userId: string, expectedVersion: bigint): Promise<MdLot> {
    return this.prisma.mdLot.update({
      where: { id, rowVersion: expectedVersion },
      data: {
        isActive: false,
        status: LotStatus.INACTIVE,
        deactivatedAt: new Date(),
        deactivatedBy: userId,
        rowVersion: { increment: 1 },
      },
      include: {
        item: true,
        owner: true,
        warehouse: true,
      },
    });
  }

  async reactivate(id: string, userId: string, expectedVersion: bigint): Promise<MdLot> {
    return this.prisma.mdLot.update({
      where: { id, rowVersion: expectedVersion },
      data: {
        isActive: true,
        status: LotStatus.ACTIVE,
        deactivatedAt: null,
        deactivatedBy: null,
        rowVersion: { increment: 1 },
      },
      include: {
        item: true,
        owner: true,
        warehouse: true,
      },
    });
  }

  async findAllActive(): Promise<MdLot[]> {
    return this.prisma.mdLot.findMany({
      where: { isActive: true, status: LotStatus.ACTIVE },
      orderBy: { firstReceivedDate: 'asc' },
      include: {
        item: true,
        owner: true,
        warehouse: true,
      },
    });
  }

  async findActiveByFIFO(params: {
    itemId: string;
    ownerId: string;
    warehouseId: string;
  }): Promise<MdLot[]> {
    return this.prisma.mdLot.findMany({
      where: {
        itemId: params.itemId,
        ownerId: params.ownerId,
        warehouseId: params.warehouseId,
        isActive: true,
        status: LotStatus.ACTIVE,
      },
      orderBy: { firstReceivedDate: 'asc' },
      include: {
        item: true,
        owner: true,
        warehouse: true,
      },
    });
  }

  async getNextCode(): Promise<string> {
    const prefix = 'LOT';
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const searchPrefix = `${prefix}-${dateStr}-`;
    
    const existing = await this.prisma.mdLot.findMany({
      where: { lotCode: { startsWith: searchPrefix } },
      select: { lotCode: true },
    });
    
    const numbers = existing
      .map((r) => parseInt(r.lotCode.replace(searchPrefix, ''), 10))
      .filter((n) => !isNaN(n));
    const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    return `${searchPrefix}${String(nextNum).padStart(4, '0')}`;
  }

  generateLotHash(itemId: string, ownerId: string, warehouseId: string, attributes?: Record<string, any>): string {
    const hashInput = JSON.stringify({
      itemId,
      ownerId,
      warehouseId,
      attributes: attributes || {},
    });
    return crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 64);
  }
}
