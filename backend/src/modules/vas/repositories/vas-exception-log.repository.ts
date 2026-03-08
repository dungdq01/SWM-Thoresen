import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma, VasExceptionLog, VasExceptionSeverity } from '@prisma/client';

@Injectable()
export class VasExceptionLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: {
      woId: string;
      exceptionCode: string;
      severity: VasExceptionSeverity;
      payloadJson?: Prisma.InputJsonValue;
      reasonCode?: string;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<VasExceptionLog> {
    const client = tx || this.prisma;
    return client.vasExceptionLog.create({
      data: {
        woId: data.woId,
        exceptionCode: data.exceptionCode,
        severity: data.severity,
        payloadJson: data.payloadJson,
        reasonCode: data.reasonCode,
      },
    });
  }

  async findByWoId(
    woId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<VasExceptionLog[]> {
    const client = tx || this.prisma;
    return client.vasExceptionLog.findMany({
      where: { woId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolve(
    id: string,
    resolvedBy: string,
    tx?: Prisma.TransactionClient,
  ): Promise<VasExceptionLog> {
    const client = tx || this.prisma;
    return client.vasExceptionLog.update({
      where: { id },
      data: {
        resolvedAt: new Date(),
        resolvedBy,
      },
    });
  }
}
