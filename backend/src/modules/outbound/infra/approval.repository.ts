/**
 * Approval Repository - Infrastructure Layer
 * Handles persistence for approval decisions
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface CreateApprovalInput {
  shipmentHeaderId: string;
  shipmentLineId?: string;
  decisionType: 'APPROVE' | 'REJECT' | 'REWEIGH_REQUEST';
  approvalScope: 'LINE' | 'SHIPMENT';
  reasonCode: string;
  note?: string;
  decidedBy: string;
  beforeSnapshot?: Record<string, unknown>;
  correlationId?: string;
}

@Injectable()
export class ApprovalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateApprovalInput) {
    return this.prisma.shipmentApprovalDecision.create({
      data: {
        shipmentHeaderId: data.shipmentHeaderId,
        shipmentLineId: data.shipmentLineId,
        decisionType: data.decisionType as any,
        approvalScope: data.approvalScope as any,
        reasonCode: data.reasonCode,
        note: data.note,
        decidedBy: data.decidedBy,
        decidedAt: new Date(),
        beforeSnapshot: (data.beforeSnapshot || {}) as Prisma.InputJsonValue,
        correlationId: data.correlationId || '',
      },
    });
  }

  async findByShipmentId(shipmentId: string) {
    return this.prisma.shipmentApprovalDecision.findMany({
      where: { shipmentHeaderId: shipmentId },
      orderBy: { decidedAt: 'desc' },
    });
  }

  async findByLineId(lineId: string) {
    return this.prisma.shipmentApprovalDecision.findMany({
      where: { shipmentLineId: lineId },
      orderBy: { decidedAt: 'desc' },
    });
  }

  async getLatestDecision(shipmentId: string, lineId?: string) {
    const where: any = { shipmentHeaderId: shipmentId };
    if (lineId) where.shipmentLineId = lineId;

    return this.prisma.shipmentApprovalDecision.findFirst({
      where,
      orderBy: { decidedAt: 'desc' },
    });
  }
}
