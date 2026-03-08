/**
 * Shipment Repository - Infrastructure Layer
 * Handles persistence for shipment header and lines
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ShipmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ShipmentHeaderCreateInput) {
    return this.prisma.shipmentHeader.create({
      data,
      include: { lines: true, owner: true, warehouse: true },
    });
  }

  async findById(id: string) {
    return this.prisma.shipmentHeader.findUnique({
      where: { id },
      include: {
        lines: { orderBy: { lineNumber: 'asc' } },
        owner: true,
        warehouse: true,
        vehicleType: true,
      },
    });
  }

  async findByExternalId(externalId: string) {
    return this.prisma.shipmentHeader.findUnique({
      where: { externalId },
      include: { lines: true },
    });
  }

  async findMany(filter: {
    warehouseId?: string;
    ownerId?: string;
    status?: string;
    skip?: number;
    take?: number;
  }) {
    const where: Prisma.ShipmentHeaderWhereInput = {};
    if (filter.warehouseId) where.warehouseId = filter.warehouseId;
    if (filter.ownerId) where.ownerId = filter.ownerId;
    if (filter.status) where.status = filter.status as any;

    return this.prisma.shipmentHeader.findMany({
      where,
      skip: filter.skip || 0,
      take: filter.take || 50,
      orderBy: { createdAt: 'desc' },
      include: { lines: true, owner: true, warehouse: true },
    });
  }

  async update(id: string, data: Prisma.ShipmentHeaderUpdateInput) {
    return this.prisma.shipmentHeader.update({
      where: { id },
      data,
      include: { lines: true },
    });
  }

  async updateStatus(
    id: string,
    status: string,
    additionalData?: Record<string, unknown>,
  ) {
    return this.prisma.shipmentHeader.update({
      where: { id },
      data: {
        status: status as any,
        ...additionalData,
        updatedAt: new Date(),
      },
    });
  }

  async lockForUpdate(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    const result = await client.$queryRaw<any[]>`
      SELECT * FROM "shipment_header" 
      WHERE id = ${id}::uuid 
      FOR UPDATE
    `;
    return result[0] || null;
  }

  async count(filter: { warehouseId?: string; status?: string }) {
    const where: Prisma.ShipmentHeaderWhereInput = {};
    if (filter.warehouseId) where.warehouseId = filter.warehouseId;
    if (filter.status) where.status = filter.status as any;
    return this.prisma.shipmentHeader.count({ where });
  }
}

@Injectable()
export class ShipmentLineRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(shipmentId: string, lines: any[]) {
    return this.prisma.shipmentLine.createMany({ data: lines });
  }

  async findById(id: string) {
    return this.prisma.shipmentLine.findUnique({ where: { id } });
  }

  async findByShipmentId(shipmentId: string) {
    return this.prisma.shipmentLine.findMany({
      where: { shipmentHeaderId: shipmentId },
      orderBy: { lineNumber: 'asc' },
    });
  }

  async findPendingLines(shipmentId: string) {
    return this.prisma.shipmentLine.findMany({
      where: {
        shipmentHeaderId: shipmentId,
        lineStatus: 'PENDING',
      },
    });
  }

  async findAllocatedLines(shipmentId: string) {
    return this.prisma.shipmentLine.findMany({
      where: {
        shipmentHeaderId: shipmentId,
        lineStatus: 'ALLOCATED',
      },
    });
  }

  async findFailedLines(shipmentId: string) {
    return this.prisma.shipmentLine.findMany({
      where: {
        shipmentHeaderId: shipmentId,
        lineStatus: 'WEIGHED_FAIL',
      },
    });
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.shipmentLine.update({
      where: { id },
      data: { lineStatus: status as any, updatedAt: new Date() },
    });
  }

  async updateAllocatedQty(id: string, qty: number) {
    return this.prisma.shipmentLine.update({
      where: { id },
      data: {
        allocatedQty: qty,
        lineStatus: 'ALLOCATED',
        updatedAt: new Date(),
      },
    });
  }

  async updateWeighResult(
    id: string,
    data: {
      grossWeightKg: number;
      netWeightKg: number;
      variancePct: number;
      tolerancePctApplied: number;
      weighSequenceNo: number;
      passed: boolean;
    },
  ) {
    return this.prisma.shipmentLine.update({
      where: { id },
      data: {
        grossWeightKg: data.grossWeightKg,
        netWeightKg: data.netWeightKg,
        variancePct: data.variancePct,
        tolerancePctApplied: data.tolerancePctApplied,
        weighSequenceNo: data.weighSequenceNo,
        lineStatus: data.passed ? 'WEIGHED_PASS' : 'WEIGHED_FAIL',
        updatedAt: new Date(),
      },
    });
  }

  async countByStatus(shipmentId: string, status: string) {
    return this.prisma.shipmentLine.count({
      where: {
        shipmentHeaderId: shipmentId,
        lineStatus: status as any,
      },
    });
  }

  async countTotal(shipmentId: string) {
    return this.prisma.shipmentLine.count({
      where: { shipmentHeaderId: shipmentId },
    });
  }
}
