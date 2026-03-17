import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { ShipmentStatus, Prisma } from '@prisma/client';

export interface ShipmentFilterParams {
  shipmentNumber?: string;
  soId?: string;
  vehicleNumber?: string;
  ownerId?: string;
  warehouseId?: string;
  status?: ShipmentStatus;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  pageSize?: number;
  includeLines?: boolean;
}

@Injectable()
export class ShipmentHeaderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ShipmentHeaderCreateInput) {
    return this.prisma.shipmentHeader.create({
      data,
      include: {
        lines: true,
        owner: true,
        warehouse: true,
        vehicleType: true,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.shipmentHeader.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            item: true,
            uom: true,
          },
          orderBy: { lineNumber: 'asc' },
        },
        owner: true,
        warehouse: true,
        vehicleType: true,
        allocationRecords: true,
        weighingAttempts: {
          orderBy: { sequenceNo: 'asc' },
        },
        statusHistory: {
          orderBy: { changedAt: 'desc' },
          take: 10,
        },
        exceptionLogs: {
          where: { status: 'OPEN' },
        },
      },
    });
  }

  async findByExternalId(externalId: string) {
    return this.prisma.shipmentHeader.findUnique({
      where: { externalId },
      include: {
        lines: true,
        owner: true,
        warehouse: true,
      },
    });
  }

  async findByShipmentNumber(shipmentNumber: string) {
    return this.prisma.shipmentHeader.findUnique({
      where: { shipmentNumber },
      include: {
        lines: true,
        owner: true,
        warehouse: true,
      },
    });
  }

  async findMany(params: ShipmentFilterParams) {
    const {
      shipmentNumber,
      soId,
      vehicleNumber,
      ownerId,
      warehouseId,
      status,
      dateFrom,
      dateTo,
      page = 1,
      pageSize = 20,
    } = params;

    const where: Prisma.ShipmentHeaderWhereInput = {};

    if (shipmentNumber) {
      where.shipmentNumber = { contains: shipmentNumber, mode: 'insensitive' };
    }
    if (soId) {
      where.soId = { contains: soId, mode: 'insensitive' };
    }
    if (vehicleNumber) {
      where.vehicleNumber = { contains: vehicleNumber, mode: 'insensitive' };
    }
    if (ownerId) {
      where.ownerId = ownerId;
    }
    if (warehouseId) {
      where.warehouseId = warehouseId;
    }
    if (status) {
      where.status = status;
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = dateFrom;
      }
      if (dateTo) {
        where.createdAt.lte = dateTo;
      }
    }

    const includeLines = params.includeLines ?? false;

    const [items, total] = await Promise.all([
      this.prisma.shipmentHeader.findMany({
        where,
        include: {
          owner: { select: { id: true, ownerCode: true, ownerName: true } },
          warehouse: { select: { id: true, warehouseCode: true, warehouseName: true } },
          _count: { select: { lines: true } },
          ...(includeLines && {
            lines: {
              include: {
                item: { select: { itemCode: true, itemName: true } },
              },
              orderBy: { lineNumber: 'asc' as const },
            },
          }),
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.shipmentHeader.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async update(
    id: string,
    data: Prisma.ShipmentHeaderUpdateInput,
    expectedVersion?: bigint,
  ) {
    const where: Prisma.ShipmentHeaderWhereUniqueInput = { id };

    if (expectedVersion !== undefined) {
      return this.prisma.shipmentHeader.update({
        where: {
          ...where,
          rowVersion: expectedVersion,
        },
        data: {
          ...data,
          rowVersion: { increment: 1 },
        },
        include: {
          lines: true,
          owner: true,
          warehouse: true,
        },
      });
    }

    return this.prisma.shipmentHeader.update({
      where,
      data: {
        ...data,
        rowVersion: { increment: 1 },
      },
      include: {
        lines: true,
        owner: true,
        warehouse: true,
      },
    });
  }

  async updateStatus(
    id: string,
    status: ShipmentStatus,
    additionalData?: Partial<Prisma.ShipmentHeaderUpdateInput>,
  ) {
    return this.prisma.shipmentHeader.update({
      where: { id },
      data: {
        status,
        ...additionalData,
        rowVersion: { increment: 1 },
      },
    });
  }

  async lockForUpdate(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    const result = await client.$queryRaw<{ id: string }[]>`
      SELECT id FROM shipment_header 
      WHERE id = ${id}::uuid 
      FOR UPDATE
    `;
    if (!result.length) {
      return null;
    }
    return client.shipmentHeader.findUnique({
      where: { id },
      include: {
        lines: true,
        owner: true,
        warehouse: true,
      },
    });
  }

  async getDashboardSummary(warehouseId?: string) {
    const where: Prisma.ShipmentHeaderWhereInput = {};
    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalDraft,
      totalConfirmed,
      totalAllocated,
      totalPicking,
      totalPendingApproval,
      totalShippedToday,
    ] = await Promise.all([
      this.prisma.shipmentHeader.count({ where: { ...where, status: 'DRAFT' } }),
      this.prisma.shipmentHeader.count({ where: { ...where, status: 'CONFIRMED' } }),
      this.prisma.shipmentHeader.count({ where: { ...where, status: 'ALLOCATED' } }),
      this.prisma.shipmentHeader.count({ where: { ...where, status: 'PICKING' } }),
      this.prisma.shipmentHeader.count({ where: { ...where, status: 'PENDING_APPROVAL' } }),
      this.prisma.shipmentHeader.count({
        where: {
          ...where,
          status: 'SHIPPED',
          shippedAt: { gte: today },
        },
      }),
    ]);

    return {
      totalDraft,
      totalConfirmed,
      totalAllocated,
      totalPicking,
      totalPendingApproval,
      totalShippedToday,
    };
  }
}
