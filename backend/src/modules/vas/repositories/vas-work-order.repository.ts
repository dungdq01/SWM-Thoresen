import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma, VasWorkOrder, VasWoStatus } from '@prisma/client';

export interface VasWoWithRelations extends VasWorkOrder {
  owner?: { ownerCode: string; ownerName: string };
  warehouse?: { warehouseCode: string; warehouseName: string };
  bulkSourceItem?: { itemCode: string; itemName: string };
  baggedOutputItem?: { itemCode: string; itemName: string };
  packagingItem?: { itemCode: string; itemName: string };
  packagingOwner?: { ownerCode: string; ownerName: string };
  _count?: { sessions: number };
}

@Injectable()
export class VasWorkOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.VasWorkOrderCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<VasWorkOrder> {
    const client = tx || this.prisma;
    return client.vasWorkOrder.create({ data });
  }

  async findById(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<VasWoWithRelations | null> {
    const client = tx || this.prisma;
    return client.vasWorkOrder.findUnique({
      where: { id },
      include: {
        owner: { select: { ownerCode: true, ownerName: true } },
        warehouse: { select: { warehouseCode: true, warehouseName: true } },
        bulkSourceItem: { select: { itemCode: true, itemName: true } },
        baggedOutputItem: { select: { itemCode: true, itemName: true } },
        packagingItem: { select: { itemCode: true, itemName: true } },
        packagingOwner: { select: { ownerCode: true, ownerName: true } },
        _count: { select: { sessions: true } },
      },
    });
  }

  async findByExternalId(
    externalId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<VasWorkOrder | null> {
    const client = tx || this.prisma;
    return client.vasWorkOrder.findUnique({
      where: { externalId },
    });
  }

  async findByIdForUpdate(
    id: string,
    tx: Prisma.TransactionClient,
  ): Promise<VasWorkOrder | null> {
    // Use Prisma's findFirst with raw lock instead of raw query to get proper field mapping
    const wo = await tx.vasWorkOrder.findFirst({
      where: { id },
    });
    
    if (!wo) return null;
    
    // Apply row-level lock
    await tx.$executeRaw`SELECT 1 FROM vas_work_order WHERE id = ${id}::uuid FOR UPDATE`;
    
    return wo;
  }

  async update(
    id: string,
    data: Prisma.VasWorkOrderUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<VasWorkOrder> {
    const client = tx || this.prisma;
    return client.vasWorkOrder.update({
      where: { id },
      data,
    });
  }

  async updateWithOptimisticLock(
    id: string,
    expectedRowVersion: bigint,
    data: Prisma.VasWorkOrderUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<VasWorkOrder> {
    const client = tx || this.prisma;
    const result = await client.vasWorkOrder.updateMany({
      where: { id, rowVersion: expectedRowVersion },
      data: { ...data, rowVersion: { increment: 1 } },
    });
    if (result.count === 0) {
      throw new Error('OPTIMISTIC_LOCK_FAILED');
    }
    return client.vasWorkOrder.findUniqueOrThrow({ where: { id } });
  }

  async markConfirmed(
    id: string,
    confirmedBy: string,
    tx: Prisma.TransactionClient,
  ): Promise<VasWorkOrder> {
    return tx.vasWorkOrder.update({
      where: { id },
      data: {
        status: VasWoStatus.CONFIRMED,
        confirmedAt: new Date(),
        confirmedBy,
        rowVersion: { increment: 1 },
      },
    });
  }

  async markInProgress(
    id: string,
    tx: Prisma.TransactionClient,
  ): Promise<VasWorkOrder> {
    return tx.vasWorkOrder.update({
      where: { id },
      data: {
        status: VasWoStatus.IN_PROGRESS,
        startedAt: new Date(),
        rowVersion: { increment: 1 },
      },
    });
  }

  async markCompleted(
    id: string,
    data: {
      actualConsumedQtyKg: Prisma.Decimal;
      actualOutputQtyKg: Prisma.Decimal;
      processLossQtyKg: Prisma.Decimal;
      actualBagCount: number;
      packagingQtyActual: number;
      yieldVarianceReasonCode?: string;
      completedBy: string;
    },
    tx: Prisma.TransactionClient,
  ): Promise<VasWorkOrder> {
    return tx.vasWorkOrder.update({
      where: { id },
      data: {
        status: VasWoStatus.COMPLETED,
        actualConsumedQtyKg: data.actualConsumedQtyKg,
        actualOutputQtyKg: data.actualOutputQtyKg,
        processLossQtyKg: data.processLossQtyKg,
        actualBagCount: data.actualBagCount,
        packagingQtyActual: data.packagingQtyActual,
        yieldVarianceReasonCode: data.yieldVarianceReasonCode,
        completedAt: new Date(),
        completedBy: data.completedBy,
        rowVersion: { increment: 1 },
      },
    });
  }

  async markCancelled(
    id: string,
    cancelledBy: string,
    reasonCode: string,
    tx: Prisma.TransactionClient,
  ): Promise<VasWorkOrder> {
    return tx.vasWorkOrder.update({
      where: { id },
      data: {
        status: VasWoStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledBy,
        cancelReasonCode: reasonCode,
        rowVersion: { increment: 1 },
      },
    });
  }

  async findMany(
    params: {
      warehouseId?: string;
      ownerId?: string;
      status?: VasWoStatus;
      bulkSourceItemId?: string;
      baggedOutputItemId?: string;
      createdFrom?: Date;
      createdTo?: Date;
      completedFrom?: Date;
      completedTo?: Date;
      keyword?: string;
      skip?: number;
      take?: number;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<{ data: VasWoWithRelations[]; total: number }> {
    const client = tx || this.prisma;
    const where: Prisma.VasWorkOrderWhereInput = {};

    if (params.warehouseId) where.warehouseId = params.warehouseId;
    if (params.ownerId) where.ownerId = params.ownerId;
    if (params.status) where.status = params.status;
    if (params.bulkSourceItemId) where.bulkSourceItemId = params.bulkSourceItemId;
    if (params.baggedOutputItemId) where.baggedOutputItemId = params.baggedOutputItemId;
    if (params.keyword) {
      where.woNumber = { contains: params.keyword, mode: 'insensitive' };
    }
    if (params.createdFrom || params.createdTo) {
      where.createdAt = {};
      if (params.createdFrom) where.createdAt.gte = params.createdFrom;
      if (params.createdTo) where.createdAt.lte = params.createdTo;
    }
    if (params.completedFrom || params.completedTo) {
      where.completedAt = {};
      if (params.completedFrom) where.completedAt.gte = params.completedFrom;
      if (params.completedTo) where.completedAt.lte = params.completedTo;
    }

    const [data, total] = await Promise.all([
      client.vasWorkOrder.findMany({
        where,
        include: {
          owner: { select: { ownerCode: true, ownerName: true } },
          warehouse: { select: { warehouseCode: true, warehouseName: true } },
          bulkSourceItem: { select: { itemCode: true, itemName: true } },
          baggedOutputItem: { select: { itemCode: true, itemName: true } },
          packagingItem: { select: { itemCode: true, itemName: true } },
          packagingOwner: { select: { ownerCode: true, ownerName: true } },
          _count: { select: { sessions: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: params.skip || 0,
        take: params.take || 20,
      }),
      client.vasWorkOrder.count({ where }),
    ]);

    return { data, total };
  }
}
