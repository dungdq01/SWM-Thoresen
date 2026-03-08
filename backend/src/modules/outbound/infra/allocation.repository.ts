/**
 * Allocation Repository - Infrastructure Layer
 * Handles persistence for allocation records
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AllocationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ShipmentAllocationRecordCreateInput) {
    return this.prisma.shipmentAllocationRecord.create({ data });
  }

  async createMany(records: any[]) {
    return this.prisma.shipmentAllocationRecord.createMany({ data: records });
  }

  async findById(id: string) {
    return this.prisma.shipmentAllocationRecord.findUnique({ where: { id } });
  }

  async findByShipmentId(shipmentId: string) {
    return this.prisma.shipmentAllocationRecord.findMany({
      where: { shipmentHeaderId: shipmentId },
      orderBy: { fifoRank: 'asc' },
    });
  }

  async findByLineId(lineId: string) {
    return this.prisma.shipmentAllocationRecord.findMany({
      where: { shipmentLineId: lineId },
    });
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.shipmentAllocationRecord.update({
      where: { id },
      data: { status: status as any, updatedAt: new Date() },
    });
  }

  async releaseAllByShipment(shipmentId: string) {
    return this.prisma.shipmentAllocationRecord.updateMany({
      where: { shipmentHeaderId: shipmentId, status: 'ALLOCATED' },
      data: { status: 'RELEASED', updatedAt: new Date() },
    });
  }

  async releaseByLineId(lineId: string) {
    return this.prisma.shipmentAllocationRecord.updateMany({
      where: { shipmentLineId: lineId, status: 'ALLOCATED' },
      data: { status: 'RELEASED', updatedAt: new Date() },
    });
  }

  async markAsPosted(shipmentId: string) {
    return this.prisma.shipmentAllocationRecord.updateMany({
      where: { shipmentHeaderId: shipmentId, status: 'PICKED' },
      data: { status: 'POSTED', updatedAt: new Date() },
    });
  }

  async sumAllocatedQty(lineId: string) {
    const result = await this.prisma.shipmentAllocationRecord.aggregate({
      where: { shipmentLineId: lineId, status: { in: ['ALLOCATED', 'PICKED'] } },
      _sum: { allocatedQty: true },
    });
    return Number(result._sum.allocatedQty || 0);
  }
}
