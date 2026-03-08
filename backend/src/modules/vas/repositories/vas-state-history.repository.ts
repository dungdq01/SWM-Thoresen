import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma, VasStateHistory, VasWoStatus, VasStateAction } from '@prisma/client';

@Injectable()
export class VasStateHistoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async append(
    data: {
      woId: string;
      fromStatus: VasWoStatus | null;
      toStatus: VasWoStatus;
      action: VasStateAction;
      actorId: string;
      actorRole: string;
      correlationId: string;
      reasonCode?: string;
      remarks?: string;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<VasStateHistory> {
    const client = tx || this.prisma;
    return client.vasStateHistory.create({
      data: {
        woId: data.woId,
        fromStatus: data.fromStatus,
        toStatus: data.toStatus,
        action: data.action,
        actorId: data.actorId,
        actorRole: data.actorRole,
        correlationId: data.correlationId,
        reasonCode: data.reasonCode,
        remarks: data.remarks,
      },
    });
  }

  async findByWoId(
    woId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<VasStateHistory[]> {
    const client = tx || this.prisma;
    return client.vasStateHistory.findMany({
      where: { woId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
