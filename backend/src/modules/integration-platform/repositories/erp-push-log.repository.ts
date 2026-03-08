import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class ErpPushLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.m8ErpPushLog.findUnique({ where: { id } });
  }

  async findByJobId(pushJobId: string) {
    return this.prisma.m8ErpPushLog.findUnique({ where: { pushJobId } });
  }

  async findByReference(pushType: string, referenceId: string) {
    return this.prisma.m8ErpPushLog.findUnique({
      where: { pushType_referenceId: { pushType, referenceId } },
    });
  }

  async findMany(params: {
    pushType?: string;
    status?: string;
    referenceId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    skip?: number;
    take?: number;
  }) {
    const { pushType, status, referenceId, dateFrom, dateTo, skip = 0, take = 20 } = params;
    const where: any = {};

    if (pushType) where.pushType = pushType;
    if (status) where.status = status;
    if (referenceId) where.referenceId = { contains: referenceId };
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const [data, total] = await Promise.all([
      this.prisma.m8ErpPushLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.m8ErpPushLog.count({ where }),
    ]);

    return { data, total, skip, take };
  }

  async create(data: any) {
    return this.prisma.m8ErpPushLog.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.m8ErpPushLog.update({ where: { id }, data });
  }

  async updateStatus(id: string, status: string, extra?: {
    responseCode?: number;
    responseBody?: any;
    errorMessage?: string;
    nextRetryAt?: Date;
  }) {
    const data: any = {
      status,
      lastAttemptAt: new Date(),
      attemptCount: { increment: 1 },
      ...extra,
    };
    return this.prisma.m8ErpPushLog.update({ where: { id }, data });
  }

  async findPendingJobs(limit: number = 50) {
    return this.prisma.m8ErpPushLog.findMany({
      where: { status: 'PENDING' },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });
  }

  async findRetryableJobs(limit: number = 50) {
    return this.prisma.m8ErpPushLog.findMany({
      where: {
        status: 'RETRY_SCHEDULED',
        nextRetryAt: { lte: new Date() },
      },
      take: limit,
      orderBy: { nextRetryAt: 'asc' },
    });
  }

  async findDeadLetterJobs(limit: number = 100) {
    return this.prisma.m8ErpPushLog.findMany({
      where: { status: 'DEAD_LETTER' },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async countByStatus(status: string) {
    return this.prisma.m8ErpPushLog.count({ where: { status: status as any } });
  }

  async existsByReference(pushType: string, referenceId: string): Promise<boolean> {
    const count = await this.prisma.m8ErpPushLog.count({
      where: { pushType, referenceId },
    });
    return count > 0;
  }
}
