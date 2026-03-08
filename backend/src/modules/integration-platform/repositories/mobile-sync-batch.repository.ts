import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class MobileSyncBatchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.m8MobileSyncBatch.findUnique({
      where: { id },
      include: { events: true },
    });
  }

  async findByBatchId(batchId: string) {
    return this.prisma.m8MobileSyncBatch.findUnique({
      where: { batchId },
      include: { events: true },
    });
  }

  async findMany(params: {
    deviceId?: string;
    keeperUserId?: string;
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
    skip?: number;
    take?: number;
  }) {
    const { deviceId, keeperUserId, status, dateFrom, dateTo, skip = 0, take = 20 } = params;
    const where: any = {};

    if (deviceId) where.deviceId = deviceId;
    if (keeperUserId) where.keeperUserId = keeperUserId;
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.receivedAt = {};
      if (dateFrom) where.receivedAt.gte = dateFrom;
      if (dateTo) where.receivedAt.lte = dateTo;
    }

    const [data, total] = await Promise.all([
      this.prisma.m8MobileSyncBatch.findMany({
        where,
        include: { events: { take: 10 } },
        skip,
        take,
        orderBy: { receivedAt: 'desc' },
      }),
      this.prisma.m8MobileSyncBatch.count({ where }),
    ]);

    return { data, total, skip, take };
  }

  async create(data: any) {
    return this.prisma.m8MobileSyncBatch.create({ data, include: { events: true } });
  }

  async update(id: string, data: any) {
    return this.prisma.m8MobileSyncBatch.update({ where: { id }, data });
  }

  async existsByBatchId(batchId: string): Promise<boolean> {
    const count = await this.prisma.m8MobileSyncBatch.count({ where: { batchId } });
    return count > 0;
  }

  async updateCounts(id: string, counts: {
    duplicateCount?: number;
    conflictCount?: number;
    acceptedCount?: number;
    rejectedCount?: number;
  }) {
    return this.prisma.m8MobileSyncBatch.update({
      where: { id },
      data: counts,
    });
  }

  async countByStatus(status: string) {
    return this.prisma.m8MobileSyncBatch.count({ where: { status: status as any } });
  }
}
