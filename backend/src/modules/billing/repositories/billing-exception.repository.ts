import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { BilExceptionType, BilExceptionStatus, BilExceptionSeverity } from '../domain/billing.enums';
import { Prisma } from '@prisma/client';

@Injectable()
export class BillingExceptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.BilExceptionCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return client.bilException.create({
      data,
      include: { owner: true, debitNote: true },
    });
  }

  async findById(id: string) {
    return this.prisma.bilException.findUnique({
      where: { id },
      include: { owner: true, billingEvent: true, snapshotRun: true, debitNote: true },
    });
  }

  async findMany(params: {
    exceptionType?: BilExceptionType;
    severity?: BilExceptionSeverity;
    status?: BilExceptionStatus;
    ownerId?: string;
    debitNoteId?: string;
    page?: number;
    limit?: number;
  }) {
    const { exceptionType, severity, status, ownerId, debitNoteId, page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.BilExceptionWhereInput = {};
    if (exceptionType) where.exceptionType = exceptionType;
    if (severity) where.severity = severity;
    if (status) where.status = status;
    if (ownerId) where.ownerId = ownerId;
    if (debitNoteId) where.debitNoteId = debitNoteId;

    const [data, total] = await Promise.all([
      this.prisma.bilException.findMany({
        where,
        include: { owner: true, debitNote: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.bilException.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findBlockersByDebitNote(debitNoteId: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return client.bilException.findMany({
      where: {
        debitNoteId,
        severity: BilExceptionSeverity.BLOCKER,
        status: BilExceptionStatus.OPEN,
      },
    });
  }

  async findOpenByOwner(ownerId: string) {
    return this.prisma.bilException.findMany({
      where: {
        ownerId,
        status: BilExceptionStatus.OPEN,
      },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async update(
    id: string,
    data: Prisma.BilExceptionUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    return client.bilException.update({
      where: { id },
      data,
    });
  }

  async resolve(
    id: string,
    resolvedBy: string,
    resolutionCode: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    return client.bilException.update({
      where: { id },
      data: {
        status: BilExceptionStatus.RESOLVED,
        resolvedBy,
        resolvedAt: new Date(),
        resolutionCode,
      },
    });
  }
}
