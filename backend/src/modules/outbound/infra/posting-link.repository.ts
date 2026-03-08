/**
 * Posting Link Repository - Infrastructure Layer
 * Handles persistence for posting links to M3 Inventory Core
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

export interface CreatePostingLinkInput {
  shipmentHeaderId: string;
  shipmentLineId?: string;
  inventTransId: string;
  eventCode: string;
  qtyPosted: number;
  createdBy?: string;
  correlationId?: string;
}

@Injectable()
export class PostingLinkRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePostingLinkInput) {
    return this.prisma.shipmentPostingLink.create({
      data: {
        shipmentHeaderId: data.shipmentHeaderId,
        shipmentLineId: data.shipmentLineId,
        inventTransId: data.inventTransId,
        eventCode: data.eventCode,
        qtyPosted: data.qtyPosted,
        createdBy: data.createdBy,
        correlationId: data.correlationId || '',
      },
    });
  }

  async findByShipmentId(shipmentId: string) {
    return this.prisma.shipmentPostingLink.findMany({
      where: { shipmentHeaderId: shipmentId },
    });
  }

  async findByLineId(lineId: string) {
    return this.prisma.shipmentPostingLink.findMany({
      where: { shipmentLineId: lineId },
    });
  }

  async hasPosted(shipmentId: string): Promise<boolean> {
    const count = await this.prisma.shipmentPostingLink.count({
      where: { shipmentHeaderId: shipmentId },
    });
    return count > 0;
  }
}
