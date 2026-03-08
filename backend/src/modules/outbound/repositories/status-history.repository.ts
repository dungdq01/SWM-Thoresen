import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface StatusHistoryEntry {
  shipmentHeaderId: string;
  shipmentLineId?: string;
  entityLevel: 'HEADER' | 'LINE';
  fromStatus?: string;
  toStatus: string;
  triggerAction: string;
  changedBy?: string;
  reasonCode?: string;
  note?: string;
  correlationId: string;
}

@Injectable()
export class StatusHistoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(entry: StatusHistoryEntry) {
    return this.prisma.shipmentStatusHistory.create({
      data: {
        shipmentHeaderId: entry.shipmentHeaderId,
        shipmentLineId: entry.shipmentLineId,
        entityLevel: entry.entityLevel,
        fromStatus: entry.fromStatus,
        toStatus: entry.toStatus,
        triggerAction: entry.triggerAction,
        changedBy: entry.changedBy,
        reasonCode: entry.reasonCode,
        note: entry.note,
        correlationId: entry.correlationId,
      },
    });
  }

  async findByShipmentId(shipmentHeaderId: string, limit = 50) {
    return this.prisma.shipmentStatusHistory.findMany({
      where: { shipmentHeaderId },
      orderBy: { changedAt: 'desc' },
      take: limit,
    });
  }

  async findByLineId(shipmentLineId: string, limit = 20) {
    return this.prisma.shipmentStatusHistory.findMany({
      where: { shipmentLineId },
      orderBy: { changedAt: 'desc' },
      take: limit,
    });
  }

  async findHeaderHistory(shipmentHeaderId: string, limit = 50) {
    return this.prisma.shipmentStatusHistory.findMany({
      where: {
        shipmentHeaderId,
        entityLevel: 'HEADER',
      },
      orderBy: { changedAt: 'desc' },
      take: limit,
    });
  }

  async findLatestEntry(shipmentHeaderId: string) {
    return this.prisma.shipmentStatusHistory.findFirst({
      where: {
        shipmentHeaderId,
        entityLevel: 'HEADER',
      },
      orderBy: { changedAt: 'desc' },
    });
  }
}
