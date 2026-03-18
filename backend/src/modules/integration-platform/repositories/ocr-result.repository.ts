import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class OcrResultRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.m8OcrResult.findUnique({
      where: { id },
      include: { confirmedSnapshot: true },
    });
  }

  async findByRequestId(ocrRequestId: string) {
    return this.prisma.m8OcrResult.findUnique({
      where: { ocrRequestId },
      include: { confirmedSnapshot: true },
    });
  }

  async findMany(params: {
    status?: string;
    direction?: string;
    warehouseId?: string;
    linkedReceiptId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    skip?: number;
    take?: number;
  }) {
    const { status, direction, warehouseId, linkedReceiptId, dateFrom, dateTo, skip = 0, take = 20 } = params;
    const where: any = {};

    if (status) where.status = status;
    if (direction) where.direction = direction;
    if (warehouseId) where.warehouseId = warehouseId;
    if (linkedReceiptId) where.linkedReceiptId = linkedReceiptId;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const [data, total] = await Promise.all([
      this.prisma.m8OcrResult.findMany({
        where,
        include: { confirmedSnapshot: true },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.m8OcrResult.count({ where }),
    ]);

    return { data, total, skip, take };
  }

  async create(data: any) {
    return this.prisma.m8OcrResult.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.m8OcrResult.update({ where: { id }, data });
  }

  async countByStatus(status: string) {
    return this.prisma.m8OcrResult.count({ where: { status: status as any } });
  }

  async existsByRequestId(ocrRequestId: string): Promise<boolean> {
    const count = await this.prisma.m8OcrResult.count({ where: { ocrRequestId } });
    return count > 0;
  }
}
