import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { ApprovalDecisionType, ApprovalScope, Prisma } from '@prisma/client';

export interface CreateApprovalDecisionParams {
  shipmentHeaderId: string;
  shipmentLineId?: string;
  decisionType: ApprovalDecisionType;
  approvalScope: ApprovalScope;
  reasonCode: string;
  note?: string;
  decidedBy: string;
  beforeSnapshot?: Record<string, unknown>;
  afterSnapshot?: Record<string, unknown>;
  correlationId: string;
}

@Injectable()
export class ApprovalDecisionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: CreateApprovalDecisionParams) {
    return this.prisma.shipmentApprovalDecision.create({
      data: {
        shipmentHeaderId: params.shipmentHeaderId,
        shipmentLineId: params.shipmentLineId,
        decisionType: params.decisionType,
        approvalScope: params.approvalScope,
        reasonCode: params.reasonCode,
        note: params.note,
        decidedBy: params.decidedBy,
        beforeSnapshot: params.beforeSnapshot as Prisma.InputJsonValue,
        afterSnapshot: params.afterSnapshot as Prisma.InputJsonValue,
        correlationId: params.correlationId,
      },
      include: {
        header: true,
        line: true,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.shipmentApprovalDecision.findUnique({
      where: { id },
      include: {
        header: true,
        line: true,
      },
    });
  }

  async findByShipmentId(shipmentHeaderId: string) {
    return this.prisma.shipmentApprovalDecision.findMany({
      where: { shipmentHeaderId },
      include: {
        line: true,
      },
      orderBy: { decidedAt: 'desc' },
    });
  }

  async findByLineId(shipmentLineId: string) {
    return this.prisma.shipmentApprovalDecision.findMany({
      where: { shipmentLineId },
      orderBy: { decidedAt: 'desc' },
    });
  }

  async findLatestByLine(shipmentLineId: string) {
    return this.prisma.shipmentApprovalDecision.findFirst({
      where: { shipmentLineId },
      orderBy: { decidedAt: 'desc' },
    });
  }

  async countApprovals(shipmentHeaderId: string) {
    return this.prisma.shipmentApprovalDecision.count({
      where: {
        shipmentHeaderId,
        decisionType: 'APPROVE',
      },
    });
  }

  async countRejections(shipmentHeaderId: string) {
    return this.prisma.shipmentApprovalDecision.count({
      where: {
        shipmentHeaderId,
        decisionType: 'REJECT',
      },
    });
  }
}
