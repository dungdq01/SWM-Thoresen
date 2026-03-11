import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { AllocationStatus, Prisma } from '@prisma/client';

@Injectable()
export class AllocationRecordRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ShipmentAllocationRecordUncheckedCreateInput) {
    return this.prisma.shipmentAllocationRecord.create({
      data,
      include: {
        location: true,
        inventDim: true,
        item: true,
      },
    });
  }

  async createMany(records: Prisma.ShipmentAllocationRecordCreateManyInput[]) {
    return this.prisma.shipmentAllocationRecord.createMany({
      data: records,
    });
  }

  async findById(id: string) {
    return this.prisma.shipmentAllocationRecord.findUnique({
      where: { id },
      include: {
        header: true,
        line: true,
        location: true,
        inventDim: true,
        item: true,
      },
    });
  }

  async findByShipmentId(shipmentHeaderId: string) {
    return this.prisma.shipmentAllocationRecord.findMany({
      where: { shipmentHeaderId },
      include: {
        line: true,
        location: true,
        inventDim: true,
        item: true,
      },
      orderBy: [{ lotDate: 'asc' }, { fifoRank: 'asc' }],
    });
  }

  async findByLineId(shipmentLineId: string) {
    return this.prisma.shipmentAllocationRecord.findMany({
      where: { shipmentLineId },
      include: {
        location: true,
        inventDim: true,
        item: true,
      },
      orderBy: [{ lotDate: 'asc' }, { fifoRank: 'asc' }],
    });
  }

  async findActiveByLineId(shipmentLineId: string) {
    return this.prisma.shipmentAllocationRecord.findMany({
      where: {
        shipmentLineId,
        status: { in: ['ALLOCATED', 'PICKED'] },
      },
      include: {
        location: true,
        inventDim: true,
        item: true,
      },
      orderBy: [{ lotDate: 'asc' }, { fifoRank: 'asc' }],
    });
  }

  async update(id: string, data: Prisma.ShipmentAllocationRecordUpdateInput) {
    return this.prisma.shipmentAllocationRecord.update({
      where: { id },
      data,
    });
  }

  async updateStatus(id: string, status: AllocationStatus) {
    return this.prisma.shipmentAllocationRecord.update({
      where: { id },
      data: { status },
    });
  }

  async updatePickedQty(id: string, pickedQty: number) {
    return this.prisma.shipmentAllocationRecord.update({
      where: { id },
      data: {
        pickedQty,
        status: 'PICKED',
      },
    });
  }

  async releaseAllocation(id: string, releasedQty: number) {
    return this.prisma.shipmentAllocationRecord.update({
      where: { id },
      data: {
        releasedQty,
        status: 'RELEASED',
      },
    });
  }

  async markPosted(id: string, postedQty: number) {
    return this.prisma.shipmentAllocationRecord.update({
      where: { id },
      data: {
        postedQty,
        status: 'POSTED',
      },
    });
  }

  async releaseAllByShipment(shipmentHeaderId: string) {
    return this.prisma.shipmentAllocationRecord.updateMany({
      where: {
        shipmentHeaderId,
        status: { in: ['ALLOCATED', 'PICKED'] },
      },
      data: {
        status: 'RELEASED',
      },
    });
  }

  async sumAllocatedByLine(shipmentLineId: string) {
    const result = await this.prisma.shipmentAllocationRecord.aggregate({
      where: {
        shipmentLineId,
        status: { in: ['ALLOCATED', 'PICKED', 'POSTED'] },
      },
      _sum: {
        allocatedQty: true,
      },
    });
    return result._sum.allocatedQty || 0;
  }
}
