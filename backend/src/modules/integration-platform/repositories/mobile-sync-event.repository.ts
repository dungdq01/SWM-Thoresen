import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class MobileSyncEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.m8MobileSyncEvent.findUnique({
      where: { id },
      include: { batch: true },
    });
  }

  async findByExternalId(eventExternalId: string) {
    return this.prisma.m8MobileSyncEvent.findUnique({
      where: { eventExternalId },
      include: { batch: true },
    });
  }

  async findByBatchId(batchId: string) {
    return this.prisma.m8MobileSyncEvent.findMany({
      where: { batchId },
      orderBy: { sequenceNo: 'asc' },
    });
  }

  async create(data: any) {
    return this.prisma.m8MobileSyncEvent.create({ data });
  }

  async createMany(data: any[]) {
    return this.prisma.m8MobileSyncEvent.createMany({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.m8MobileSyncEvent.update({ where: { id }, data });
  }

  async updateStatus(id: string, processStatus: string, processError?: string) {
    const data: any = { processStatus };
    if (processStatus === 'DISPATCHED') data.dispatchedAt = new Date();
    if (processStatus === 'APPLIED') data.appliedAt = new Date();
    if (processError) data.processError = processError;

    return this.prisma.m8MobileSyncEvent.update({ where: { id }, data });
  }

  async existsByExternalId(eventExternalId: string): Promise<boolean> {
    const count = await this.prisma.m8MobileSyncEvent.count({ where: { eventExternalId } });
    return count > 0;
  }

  async countByStatus(processStatus: string) {
    return this.prisma.m8MobileSyncEvent.count({ where: { processStatus: processStatus as any } });
  }

  async findFailedEvents(limit: number = 100) {
    return this.prisma.m8MobileSyncEvent.findMany({
      where: { processStatus: 'FAILED' },
      include: { batch: true },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findConflictedEvents(limit: number = 100) {
    return this.prisma.m8MobileSyncEvent.findMany({
      where: { processStatus: 'CONFLICTED' },
      include: { batch: true },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }
}
