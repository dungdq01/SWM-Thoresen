import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { ShipmentLineStatus, Prisma } from '@prisma/client';

@Injectable()
export class ShipmentLineRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(
    shipmentHeaderId: string,
    lines: Prisma.ShipmentLineCreateManyInput[],
  ) {
    return this.prisma.shipmentLine.createMany({
      data: lines.map((line, index) => ({
        ...line,
        shipmentHeaderId,
        lineNumber: index + 1,
      })),
    });
  }

  async findById(id: string) {
    return this.prisma.shipmentLine.findUnique({
      where: { id },
      include: {
        header: true,
        item: true,
        uom: true,
      },
    });
  }

  async findByShipmentId(shipmentHeaderId: string) {
    return this.prisma.shipmentLine.findMany({
      where: { shipmentHeaderId },
      include: {
        item: true,
        uom: true,
      },
      orderBy: { lineNumber: 'asc' },
    });
  }

  async update(id: string, data: Prisma.ShipmentLineUpdateInput) {
    return this.prisma.shipmentLine.update({
      where: { id },
      data,
      include: {
        item: true,
        uom: true,
      },
    });
  }

  async updateStatus(id: string, lineStatus: ShipmentLineStatus) {
    return this.prisma.shipmentLine.update({
      where: { id },
      data: { lineStatus },
    });
  }

  async updateLoadedWeight(
    id: string,
    data: {
      grossWeightKg: number;
      netWeightKg: number;
      weighSequenceNo: number;
    },
  ) {
    return this.prisma.shipmentLine.update({
      where: { id },
      data: {
        grossWeightKg: data.grossWeightKg,
        netWeightKg: data.netWeightKg,
        loadedQty: data.netWeightKg,
        weighedQtyKg: data.netWeightKg,
        weighSequenceNo: data.weighSequenceNo,
        lineStatus: 'LOADING',
      },
    });
  }

  async updateShipped(id: string, shippedQty: number, postedTransId: string) {
    return this.prisma.shipmentLine.update({
      where: { id },
      data: {
        shippedQty,
        postedTransId,
        lineStatus: 'LINE_SHIPPED',
      },
    });
  }

  async countByStatus(shipmentHeaderId: string, lineStatus: ShipmentLineStatus) {
    return this.prisma.shipmentLine.count({
      where: { shipmentHeaderId, lineStatus },
    });
  }

  async findPendingLines(shipmentHeaderId: string) {
    return this.prisma.shipmentLine.findMany({
      where: {
        shipmentHeaderId,
        lineStatus: 'PENDING',
      },
      include: {
        item: true,
        uom: true,
      },
      orderBy: { lineNumber: 'asc' },
    });
  }

  async findLoadedLines(shipmentHeaderId: string) {
    return this.prisma.shipmentLine.findMany({
      where: {
        shipmentHeaderId,
        lineStatus: { in: ['LOADING', 'WEIGHED_PASS'] },
      },
      include: {
        item: true,
        uom: true,
      },
      orderBy: { lineNumber: 'asc' },
    });
  }

  async findReadyForShipLines(shipmentHeaderId: string) {
    return this.prisma.shipmentLine.findMany({
      where: {
        shipmentHeaderId,
        lineStatus: 'WEIGHED_PASS',
      },
      include: {
        item: true,
        uom: true,
      },
      orderBy: { lineNumber: 'asc' },
    });
  }
}
