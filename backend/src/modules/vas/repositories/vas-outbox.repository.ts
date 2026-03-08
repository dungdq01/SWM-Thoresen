import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma, VasOutbox, VasOutboxStatus } from '@prisma/client';

@Injectable()
export class VasOutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: {
      eventType: string;
      aggregateId: string;
      aggregateNumber: string;
      eventKey: string;
      payloadJson: Prisma.InputJsonValue;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<VasOutbox> {
    const client = tx || this.prisma;
    return client.vasOutbox.create({
      data: {
        eventType: data.eventType,
        aggregateId: data.aggregateId,
        aggregateNumber: data.aggregateNumber,
        eventKey: data.eventKey,
        payloadJson: data.payloadJson,
        status: VasOutboxStatus.PENDING,
      },
    });
  }

  async findByEventKey(
    eventKey: string,
    tx?: Prisma.TransactionClient,
  ): Promise<VasOutbox | null> {
    const client = tx || this.prisma;
    return client.vasOutbox.findUnique({
      where: { eventKey },
    });
  }

  async findPending(
    limit: number = 50,
    tx?: Prisma.TransactionClient,
  ): Promise<VasOutbox[]> {
    const client = tx || this.prisma;
    return client.vasOutbox.findMany({
      where: {
        status: { in: [VasOutboxStatus.PENDING, VasOutboxStatus.FAILED] },
        OR: [
          { nextRetryAt: null },
          { nextRetryAt: { lte: new Date() } },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async markSent(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<VasOutbox> {
    const client = tx || this.prisma;
    return client.vasOutbox.update({
      where: { id },
      data: {
        status: VasOutboxStatus.SENT,
        sentAt: new Date(),
      },
    });
  }

  async markFailed(
    id: string,
    error: string,
    tx?: Prisma.TransactionClient,
  ): Promise<VasOutbox> {
    const client = tx || this.prisma;
    const outbox = await client.vasOutbox.findUniqueOrThrow({ where: { id } });
    const newRetryCount = outbox.retryCount + 1;
    const nextRetryDelay = Math.min(Math.pow(2, newRetryCount) * 1000, 3600000);
    const nextRetryAt = new Date(Date.now() + nextRetryDelay);

    return client.vasOutbox.update({
      where: { id },
      data: {
        status: newRetryCount >= 10 ? VasOutboxStatus.DEAD : VasOutboxStatus.FAILED,
        retryCount: newRetryCount,
        nextRetryAt,
        lastError: error,
      },
    });
  }

  async findByAggregateId(
    aggregateId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<VasOutbox[]> {
    const client = tx || this.prisma;
    return client.vasOutbox.findMany({
      where: { aggregateId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
