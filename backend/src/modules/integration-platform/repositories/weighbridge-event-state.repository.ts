import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class WeighbridgeEventStateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByLogId(weighbridgeLogId: string) {
    return this.prisma.m8WeighbridgeEventState.findUnique({
      where: { weighbridgeLogId },
    });
  }

  async create(data: Prisma.M8WeighbridgeEventStateCreateInput) {
    return this.prisma.m8WeighbridgeEventState.create({ data });
  }

  async update(id: string, data: Prisma.M8WeighbridgeEventStateUpdateInput) {
    return this.prisma.m8WeighbridgeEventState.update({
      where: { id },
      data,
    });
  }

  async updateByLogId(weighbridgeLogId: string, data: Prisma.M8WeighbridgeEventStateUpdateInput) {
    return this.prisma.m8WeighbridgeEventState.update({
      where: { weighbridgeLogId },
      data,
    });
  }

  async findPendingCallbacks(limit: number = 100) {
    return this.prisma.m8WeighbridgeEventState.findMany({
      where: {
        callbackStatus: 'PENDING',
      },
      include: { weighLog: true },
      take: limit,
      orderBy: { updatedAt: 'asc' },
    });
  }

  async findFailedCallbacks(limit: number = 100) {
    return this.prisma.m8WeighbridgeEventState.findMany({
      where: {
        callbackStatus: 'FAILED',
        retryCount: { lt: 3 },
      },
      include: { weighLog: true },
      take: limit,
      orderBy: { lastRetryAt: 'asc' },
    });
  }

  async incrementRetryCount(id: string) {
    return this.prisma.m8WeighbridgeEventState.update({
      where: { id },
      data: {
        retryCount: { increment: 1 },
        lastRetryAt: new Date(),
      },
    });
  }

  async countByStatus(status: string) {
    return this.prisma.m8WeighbridgeEventState.count({
      where: { processingStatus: status as any },
    });
  }
}
