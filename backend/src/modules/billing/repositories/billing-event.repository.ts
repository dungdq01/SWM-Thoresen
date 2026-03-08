import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { BilEventType, BilEventBillingStatus } from '../domain/billing.enums';
import { Prisma } from '@prisma/client';

@Injectable()
export class BillingEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.BilEventCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return client.bilEvent.create({
      data,
      include: { owner: true, warehouse: true, item: true },
    });
  }

  async findById(id: string) {
    return this.prisma.bilEvent.findUnique({
      where: { id },
      include: { owner: true, warehouse: true, item: true },
    });
  }

  async findByExternalId(externalId: string) {
    return this.prisma.bilEvent.findUnique({
      where: { externalId },
    });
  }

  async findMany(params: {
    ownerId?: string;
    eventType?: BilEventType;
    fromDate?: Date;
    toDate?: Date;
    billingStatus?: BilEventBillingStatus;
    sourceModule?: string;
    page?: number;
    limit?: number;
  }) {
    const { ownerId, eventType, fromDate, toDate, billingStatus, sourceModule, page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.BilEventWhereInput = {};
    if (ownerId) where.ownerId = ownerId;
    if (eventType) where.eventType = eventType;
    if (billingStatus) where.billingStatus = billingStatus;
    if (sourceModule) where.sourceModule = sourceModule;
    if (fromDate || toDate) {
      where.eventDate = {};
      if (fromDate) where.eventDate.gte = fromDate;
      if (toDate) where.eventDate.lte = toDate;
    }

    const [data, total] = await Promise.all([
      this.prisma.bilEvent.findMany({
        where,
        include: { owner: true, warehouse: true, item: true },
        skip,
        take: limit,
        orderBy: { capturedAt: 'desc' },
      }),
      this.prisma.bilEvent.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findUnbilledByOwnerAndPeriod(
    ownerId: string,
    periodStart: Date,
    periodEnd: Date,
  ) {
    return this.prisma.bilEvent.findMany({
      where: {
        ownerId,
        eventDate: { gte: periodStart, lte: periodEnd },
        billingStatus: BilEventBillingStatus.CAPTURED,
        debitNoteLineId: null,
      },
      orderBy: [{ eventDate: 'asc' }, { eventType: 'asc' }],
    });
  }

  async updateBillingStatus(
    ids: string[],
    status: BilEventBillingStatus,
    debitNoteLineId?: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    return client.bilEvent.updateMany({
      where: { id: { in: ids } },
      data: { billingStatus: status, debitNoteLineId },
    });
  }

  async update(
    id: string,
    data: Prisma.BilEventUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    return client.bilEvent.update({
      where: { id },
      data,
    });
  }
}
