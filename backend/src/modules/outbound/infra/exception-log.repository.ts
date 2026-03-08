/**
 * Exception Log Repository - Infrastructure Layer
 * Handles persistence for exception logs
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { ShipmentExceptionType, ExceptionSeverity, Prisma } from '@prisma/client';

export interface CreateExceptionInput {
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

  async create(data: CreateExceptionInput) {
    return this.prisma.shipmentExceptionLog.create({
      data: {
        shipmentHeaderId: data.shipmentHeaderId,
        shipmentLineId: data.shipmentLineId,
        exceptionType: data.exceptionType,
        exceptionCode: data.exceptionCode,
        severity: data.severity,
        status: 'OPEN',
        reasonCode: data.reasonCode,
        detailJson: data.detailJson as Prisma.InputJsonValue,
        createdBy: data.createdBy,
        correlationId: data.correlationId,
      },
    });
  }

  async findOpenByShipmentId(shipmentId: string) {
    return this.prisma.shipmentExceptionLog.findMany({
      where: {
        shipmentHeaderId: shipmentId,
        status: 'OPEN',
      },
    });
  }

  async findOpenByLineId(lineId: string) {
    return this.prisma.shipmentExceptionLog.findMany({
      where: {
        shipmentLineId: lineId,
        status: 'OPEN',
      },
    });
  }

  async resolve(id: string, resolvedBy: string) {
    return this.prisma.shipmentExceptionLog.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedBy,
        resolvedAt: new Date(),
      },
    });
  }

  async resolveAllByLine(lineId: string, resolvedBy: string) {
    return this.prisma.shipmentExceptionLog.updateMany({
      where: {
        shipmentLineId: lineId,
        status: 'OPEN',
      },
      data: {
        status: 'RESOLVED',
        resolvedBy,
        resolvedAt: new Date(),
      },
    });
  }

  async countOpenByShipment(shipmentId: string) {
    return this.prisma.shipmentExceptionLog.count({
      where: {
        shipmentHeaderId: shipmentId,
        status: 'OPEN',
      },
    });
  }
}
