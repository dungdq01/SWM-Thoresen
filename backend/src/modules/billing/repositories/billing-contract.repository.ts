import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { BilContractStatus } from '../domain/billing.enums';
import { Prisma } from '@prisma/client';

@Injectable()
export class BillingContractRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.BilContractCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return client.bilContract.create({
      data,
      include: { feeLines: true, owner: true },
    });
  }

  async findById(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return client.bilContract.findUnique({
      where: { id },
      include: { feeLines: true, owner: true },
    });
  }

  async findByContractNumber(contractNumber: string) {
    return this.prisma.bilContract.findUnique({
      where: { contractNumber },
      include: { feeLines: true, owner: true },
    });
  }

  async findByExternalId(externalId: string) {
    return this.prisma.bilContract.findUnique({
      where: { externalId },
      include: { feeLines: true, owner: true },
    });
  }

  async findActiveByOwner(ownerId: string, effectiveDate: Date) {
    return this.prisma.bilContract.findFirst({
      where: {
        ownerId,
        status: BilContractStatus.ACTIVE,
        effectiveFrom: { lte: effectiveDate },
        effectiveTo: { gte: effectiveDate },
      },
      include: { feeLines: true },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  async findOverlapping(
    ownerId: string,
    effectiveFrom: Date,
    effectiveTo: Date,
    excludeId?: string,
  ) {
    return this.prisma.bilContract.findMany({
      where: {
        ownerId,
        status: { in: [BilContractStatus.ACTIVE, BilContractStatus.DRAFT] },
        id: excludeId ? { not: excludeId } : undefined,
        OR: [
          { effectiveFrom: { lte: effectiveTo }, effectiveTo: { gte: effectiveFrom } },
        ],
      },
    });
  }

  async findMany(params: {
    ownerId?: string;
    status?: BilContractStatus;
    effectiveDate?: Date;
    isDefault?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { ownerId, status, effectiveDate, isDefault, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.BilContractWhereInput = {};
    if (ownerId) where.ownerId = ownerId;
    if (status) where.status = status;
    if (isDefault !== undefined) where.isDefault = isDefault;
    if (effectiveDate) {
      where.effectiveFrom = { lte: effectiveDate };
      where.effectiveTo = { gte: effectiveDate };
    }

    const [data, total] = await Promise.all([
      this.prisma.bilContract.findMany({
        where,
        include: { owner: true, feeLines: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.bilContract.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async update(
    id: string,
    data: Prisma.BilContractUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    return client.bilContract.update({
      where: { id },
      data,
      include: { feeLines: true, owner: true },
    });
  }

  async createFeeLines(
    contractId: string,
    feeLines: Prisma.BilContractFeeLineCreateManyInput[],
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    return client.bilContractFeeLine.createMany({
      data: feeLines.map(line => ({ ...line, contractId })),
    });
  }

  async deleteFeeLines(contractId: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return client.bilContractFeeLine.deleteMany({
      where: { contractId },
    });
  }

  async findFeeLines(contractId: string) {
    return this.prisma.bilContractFeeLine.findMany({
      where: { contractId, isActive: true },
      orderBy: [{ feeType: 'asc' }, { priorityRank: 'asc' }],
    });
  }
}
