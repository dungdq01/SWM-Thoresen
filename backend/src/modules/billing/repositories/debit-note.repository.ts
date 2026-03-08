import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { BilDebitNoteStatus } from '../domain/billing.enums';
import { Prisma } from '@prisma/client';

@Injectable()
export class DebitNoteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.BilDebitNoteCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return client.bilDebitNote.create({
      data,
      include: { owner: true, lines: true },
    });
  }

  async findById(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return client.bilDebitNote.findUnique({
      where: { id },
      include: {
        owner: true,
        contract: true,
        lines: { orderBy: { lineSeq: 'asc' } },
        history: { orderBy: { actionAt: 'desc' } },
      },
    });
  }

  async findByDnNumber(dnNumber: string) {
    return this.prisma.bilDebitNote.findUnique({
      where: { dnNumber },
      include: { owner: true, lines: true },
    });
  }

  async findByExternalId(externalId: string) {
    return this.prisma.bilDebitNote.findUnique({
      where: { externalId },
      include: { owner: true, lines: true },
    });
  }

  async findMany(params: {
    ownerId?: string;
    status?: BilDebitNoteStatus;
    fromDate?: Date;
    toDate?: Date;
    dnNumber?: string;
    page?: number;
    limit?: number;
  }) {
    const { ownerId, status, fromDate, toDate, dnNumber, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.BilDebitNoteWhereInput = {};
    if (ownerId) where.ownerId = ownerId;
    if (status) where.status = status;
    if (dnNumber) where.dnNumber = { contains: dnNumber, mode: 'insensitive' };
    if (fromDate || toDate) {
      where.billingPeriodStart = {};
      if (fromDate) where.billingPeriodStart.gte = fromDate;
      if (toDate) where.billingPeriodEnd = { lte: toDate };
    }

    const [data, total] = await Promise.all([
      this.prisma.bilDebitNote.findMany({
        where,
        include: { owner: true, lines: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.bilDebitNote.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findExistingDraft(ownerId: string, periodStart: Date, periodEnd: Date) {
    return this.prisma.bilDebitNote.findFirst({
      where: {
        ownerId,
        billingPeriodStart: periodStart,
        billingPeriodEnd: periodEnd,
        status: { in: [BilDebitNoteStatus.DRAFT, BilDebitNoteStatus.REVIEWED, BilDebitNoteStatus.APPROVED] },
      },
    });
  }

  async update(
    id: string,
    data: Prisma.BilDebitNoteUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    return client.bilDebitNote.update({
      where: { id },
      data,
      include: { owner: true, lines: true },
    });
  }

  async createLines(
    debitNoteId: string,
    lines: Omit<Prisma.BilDebitNoteLineCreateManyInput, 'debitNoteId'>[],
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    return client.bilDebitNoteLine.createMany({
      data: lines.map(line => ({ ...line, debitNoteId })),
    });
  }

  async deleteLines(debitNoteId: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return client.bilDebitNoteLine.deleteMany({
      where: { debitNoteId },
    });
  }

  async createHistory(
    data: Prisma.BilDebitNoteHistoryCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    return client.bilDebitNoteHistory.create({ data });
  }

  async getHistory(debitNoteId: string) {
    return this.prisma.bilDebitNoteHistory.findMany({
      where: { debitNoteId },
      orderBy: { actionAt: 'desc' },
    });
  }

  async lockForUpdate(id: string, tx: Prisma.TransactionClient) {
    return tx.$queryRaw`SELECT * FROM bil_debit_note WHERE id = ${id}::uuid FOR UPDATE`;
  }
}
