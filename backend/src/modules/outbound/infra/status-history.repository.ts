/**
 * Status History Repository - Infrastructure Layer
 * Handles persistence for status history (audit trail)
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface CreateStatusHistoryInput {
  shipmentHeaderId: string;
  shipmentLineId?: string;
  entityLevel: 'HEADER' | 'LINE';
  fromStatus?: string;
  toStatus: string;
  triggerAction: string;
  reasonCode?: string;
  note?: string;
  changedBy?: string;
  correlationId?: string;
}

@Injectable()
export class StatusHistoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateStatusHistoryInput) {
    return this.prisma.shipmentStatusHistory.create({
      data: {
        shipmentHeaderId: data.shipmentHeaderId,
        shipmentLineId: data.shipmentLineId,
        entityLevel: data.entityLevel as any,
        fromStatus: data.fromStatus,
        toStatus: data.toStatus,
        triggerAction: data.triggerAction,
        reasonCode: data.reasonCode,
        note: data.note,
        changedBy: data.changedBy,
        correlationId: data.correlationId || '',
        changedAt: new Date(),
      },
    });
  }

  async findByShipmentId(shipmentId: string) {
    return this.prisma.shipmentStatusHistory.findMany({
      where: { shipmentHeaderId: shipmentId },
      orderBy: { changedAt: 'desc' },
    });
  }

  async findByLineId(lineId: string) {
    return this.prisma.shipmentStatusHistory.findMany({
      where: { shipmentLineId: lineId },
      orderBy: { changedAt: 'desc' },
    });
  }
}
