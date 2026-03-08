import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { WorkLinkType, WorkLinkStatus, Prisma } from '@prisma/client';

export interface CreatePickWorkLinkParams {
  shipmentHeaderId: string;
  shipmentLineId?: string;
  workType: WorkLinkType;
  workHeaderId: string;
  workLineId?: string;
  externalId: string;
  correlationId: string;
  payloadJson?: Record<string, unknown>;
}

@Injectable()
export class PickWorkLinkRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: CreatePickWorkLinkParams) {
    return this.prisma.shipmentPickWorkLink.create({
      data: {
        shipmentHeaderId: params.shipmentHeaderId,
        shipmentLineId: params.shipmentLineId,
        workType: params.workType,
        workHeaderId: params.workHeaderId,
        workLineId: params.workLineId,
        status: 'REQUESTED',
        externalId: params.externalId,
        correlationId: params.correlationId,
        payloadJson: params.payloadJson as Prisma.InputJsonValue,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.shipmentPickWorkLink.findUnique({
      where: { id },
      include: {
        header: true,
        line: true,
      },
    });
  }

  async findByExternalId(externalId: string) {
    return this.prisma.shipmentPickWorkLink.findUnique({
      where: { externalId },
      include: {
        header: true,
        line: true,
      },
    });
  }

  async findByShipmentId(shipmentHeaderId: string) {
    return this.prisma.shipmentPickWorkLink.findMany({
      where: { shipmentHeaderId },
      include: {
        line: true,
      },
      orderBy: { requestedAt: 'desc' },
    });
  }

  async findByWorkHeaderId(workHeaderId: string) {
    return this.prisma.shipmentPickWorkLink.findMany({
      where: { workHeaderId },
      include: {
        header: true,
        line: true,
      },
    });
  }

  async updateStatus(id: string, status: WorkLinkStatus) {
    return this.prisma.shipmentPickWorkLink.update({
      where: { id },
      data: {
        status,
        ...(status === 'COMPLETED' && { completedAt: new Date() }),
      },
    });
  }

  async markCompleted(id: string) {
    return this.prisma.shipmentPickWorkLink.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });
  }

  async markFailed(id: string) {
    return this.prisma.shipmentPickWorkLink.update({
      where: { id },
      data: {
        status: 'FAILED',
      },
    });
  }

  async findPendingByShipment(shipmentHeaderId: string) {
    return this.prisma.shipmentPickWorkLink.findMany({
      where: {
        shipmentHeaderId,
        status: { in: ['REQUESTED', 'CREATED', 'IN_PROGRESS'] },
      },
    });
  }

  async countCompletedByShipment(shipmentHeaderId: string) {
    return this.prisma.shipmentPickWorkLink.count({
      where: {
        shipmentHeaderId,
        status: 'COMPLETED',
      },
    });
  }
}
