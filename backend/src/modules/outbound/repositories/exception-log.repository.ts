import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { ShipmentExceptionType, ShipmentExceptionStatus, ExceptionSeverity, Prisma } from '@prisma/client';

export interface CreateExceptionParams {
  shipmentHeaderId: string;
  shipmentLineId?: string;
  exceptionType: ShipmentExceptionType;
  exceptionCode: string;
  severity: ExceptionSeverity;
  reasonCode?: string;
  detailJson?: Record<string, unknown>;
  createdBy?: string;
  correlationId: string;
}

@Injectable()
export class ExceptionLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: CreateExceptionParams) {
    return this.prisma.shipmentExceptionLog.create({
      data: {
        shipmentHeaderId: params.shipmentHeaderId,
        shipmentLineId: params.shipmentLineId,
        exceptionType: params.exceptionType,
        exceptionCode: params.exceptionCode,
        severity: params.severity,
        status: 'OPEN',
        reasonCode: params.reasonCode,
        detailJson: params.detailJson as Prisma.InputJsonValue,
        createdBy: params.createdBy,
        correlationId: params.correlationId,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.shipmentExceptionLog.findUnique({
      where: { id },
      include: {
        header: true,
      },
    });
  }

  async findByShipmentId(shipmentHeaderId: string) {
    return this.prisma.shipmentExceptionLog.findMany({
      where: { shipmentHeaderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOpenByShipmentId(shipmentHeaderId: string) {
    return this.prisma.shipmentExceptionLog.findMany({
      where: {
        shipmentHeaderId,
        status: 'OPEN',
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOpenByLineId(shipmentLineId: string) {
    return this.prisma.shipmentExceptionLog.findMany({
      where: {
        shipmentLineId,
        status: 'OPEN',
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByType(
    shipmentHeaderId: string,
    exceptionType: ShipmentExceptionType,
    status?: ShipmentExceptionStatus,
  ) {
    return this.prisma.shipmentExceptionLog.findMany({
      where: {
        shipmentHeaderId,
        exceptionType,
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolve(id: string, resolvedBy: string) {
    return this.prisma.shipmentExceptionLog.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedBy,
      },
    });
  }

  async reject(id: string, resolvedBy: string) {
    return this.prisma.shipmentExceptionLog.update({
      where: { id },
      data: {
        status: 'REJECTED',
        resolvedAt: new Date(),
        resolvedBy,
      },
    });
  }

  async resolveAllByLine(shipmentLineId: string, resolvedBy: string) {
    return this.prisma.shipmentExceptionLog.updateMany({
      where: {
        shipmentLineId,
        status: 'OPEN',
      },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedBy,
      },
    });
  }

  async countOpenByShipment(shipmentHeaderId: string) {
    return this.prisma.shipmentExceptionLog.count({
      where: {
        shipmentHeaderId,
        status: 'OPEN',
      },
    });
  }

  async countToleranceFailByShipment(shipmentHeaderId: string) {
    return this.prisma.shipmentExceptionLog.count({
      where: {
        shipmentHeaderId,
        exceptionType: 'TOLERANCE_FAIL',
        status: 'OPEN',
      },
    });
  }
}
