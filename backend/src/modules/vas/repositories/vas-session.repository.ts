import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma, VasSession } from '@prisma/client';

@Injectable()
export class VasSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.VasSessionCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<VasSession> {
    const client = tx || this.prisma;
    return client.vasSession.create({ data });
  }

  async findByExternalId(
    externalId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<VasSession | null> {
    const client = tx || this.prisma;
    return client.vasSession.findUnique({
      where: { externalId },
    });
  }

  async findByWoId(
    woId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<VasSession[]> {
    const client = tx || this.prisma;
    return client.vasSession.findMany({
      where: { woId },
      orderBy: { sessionNum: 'asc' },
    });
  }

  async getNextSessionNum(
    woId: string,
    tx: Prisma.TransactionClient,
  ): Promise<number> {
    const result = await tx.vasSession.aggregate({
      where: { woId },
      _max: { sessionNum: true },
    });
    return (result._max.sessionNum || 0) + 1;
  }

  async getSessionSummary(
    woId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{
    totalQtyKg: Prisma.Decimal;
    totalBagCount: number;
    totalWorkHours: Prisma.Decimal | null;
    sessionCount: number;
    overtimeSessionCount: number;
  }> {
    const client = tx || this.prisma;
    const result = await client.vasSession.aggregate({
      where: { woId },
      _sum: {
        sessionQtyKg: true,
        sessionBagCount: true,
        workHours: true,
      },
      _count: true,
    });

    const overtimeCount = await client.vasSession.count({
      where: { woId, isOvertime: true },
    });

    return {
      totalQtyKg: result._sum.sessionQtyKg || new Prisma.Decimal(0),
      totalBagCount: result._sum.sessionBagCount || 0,
      totalWorkHours: result._sum.workHours,
      sessionCount: result._count,
      overtimeSessionCount: overtimeCount,
    };
  }
}
