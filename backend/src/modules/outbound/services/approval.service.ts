import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { ShipmentHeaderRepository } from '../repositories/shipment-header.repository';
import { ShipmentLineRepository } from '../repositories/shipment-line.repository';
import { ApprovalDecisionRepository } from '../repositories/approval-decision.repository';
import { ExceptionLogRepository } from '../repositories/exception-log.repository';
import { StatusHistoryRepository } from '../repositories/status-history.repository';
import { v4 as uuidv4 } from 'uuid';

export interface ApprovalParams {
  shipmentId: string;
  lineId?: string;
  decision: 'APPROVE' | 'REJECT' | 'REWEIGH';
  reasonCode: string;
  note?: string;
  decidedBy: string;
  correlationId?: string;
}

@Injectable()
export class ApprovalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly headerRepo: ShipmentHeaderRepository,
    private readonly lineRepo: ShipmentLineRepository,
    private readonly approvalRepo: ApprovalDecisionRepository,
    private readonly exceptionRepo: ExceptionLogRepository,
    private readonly historyRepo: StatusHistoryRepository,
  ) {}

  async processApproval(params: ApprovalParams) {
    return this.prisma.$transaction(async (tx) => {
      // HI-6 FIX: lockForUpdate to prevent concurrent approval race condition
      const shipment = await this.headerRepo.lockForUpdate(params.shipmentId, tx);
      if (!shipment) {
        throw new NotFoundException(`Shipment ${params.shipmentId} not found`);
      }

      if (shipment.status !== 'PENDING_APPROVAL') {
        throw new BadRequestException('Shipment is not pending approval');
      }

      const corrId = params.correlationId || uuidv4();

      if (params.lineId) {
        return this.processLineApproval(params, corrId);
      } else {
        return this.processShipmentApproval(params, corrId);
      }
    });
  }

  private async processLineApproval(params: ApprovalParams, correlationId: string) {
    const line = await this.lineRepo.findById(params.lineId!);
    if (!line) {
      throw new NotFoundException(`Line ${params.lineId} not found`);
    }

    if (line.lineStatus !== 'WEIGHED_FAIL') {
      throw new BadRequestException('Line is not in failed weigh status');
    }

    const beforeSnapshot = {
      lineStatus: line.lineStatus,
      netWeightKg: line.netWeightKg,
      variancePct: line.variancePct,
    };

    const decision = await this.approvalRepo.create({
      shipmentHeaderId: params.shipmentId,
      shipmentLineId: params.lineId,
      decisionType: params.decision === 'APPROVE' ? 'APPROVE' : 
                    params.decision === 'REJECT' ? 'REJECT' : 'REWEIGH_REQUEST',
      approvalScope: 'LINE',
      reasonCode: params.reasonCode,
      note: params.note,
      decidedBy: params.decidedBy,
      beforeSnapshot,
      correlationId,
    });

    await this.exceptionRepo.resolveAllByLine(params.lineId!, params.decidedBy);

    if (params.decision === 'APPROVE') {
      await this.lineRepo.updateStatus(params.lineId!, 'WEIGHED_PASS');
    } else if (params.decision === 'REJECT') {
      await this.lineRepo.updateStatus(params.lineId!, 'CANCELLED');
    } else {
      await this.lineRepo.updateStatus(params.lineId!, 'LOADING');
    }

    await this.checkAndUpdateShipmentStatus(params.shipmentId, params.decidedBy, correlationId);

    return decision;
  }

  private async processShipmentApproval(params: ApprovalParams, correlationId: string) {
    const shipment = await this.headerRepo.findById(params.shipmentId);

    const decision = await this.approvalRepo.create({
      shipmentHeaderId: params.shipmentId,
      decisionType: params.decision === 'APPROVE' ? 'APPROVE' : 
                    params.decision === 'REJECT' ? 'REJECT' : 'REWEIGH_REQUEST',
      approvalScope: 'SHIPMENT',
      reasonCode: params.reasonCode,
      note: params.note,
      decidedBy: params.decidedBy,
      beforeSnapshot: {
        status: shipment?.status,
        pendingApprovalCount: shipment?.pendingApprovalCount,
      },
      correlationId,
    });

    const failedLines = await this.lineRepo.findFailedLines(params.shipmentId);

    for (const line of failedLines) {
      await this.exceptionRepo.resolveAllByLine(line.id, params.decidedBy);

      if (params.decision === 'APPROVE') {
        await this.lineRepo.updateStatus(line.id, 'WEIGHED_PASS');
      } else if (params.decision === 'REJECT') {
        await this.lineRepo.updateStatus(line.id, 'CANCELLED');
      } else {
        await this.lineRepo.updateStatus(line.id, 'LOADING');
      }
    }

    if (params.decision === 'APPROVE') {
      await this.headerRepo.updateStatus(params.shipmentId, 'ALL_WEIGHED', {
        pendingApprovalCount: 0,
        allLinesPassed: true,
        updatedBy: params.decidedBy,
      });

      await this.historyRepo.create({
        shipmentHeaderId: params.shipmentId,
        entityLevel: 'HEADER',
        fromStatus: 'PENDING_APPROVAL',
        toStatus: 'ALL_WEIGHED',
        triggerAction: 'APPROVE',
        reasonCode: params.reasonCode,
        note: params.note,
        changedBy: params.decidedBy,
        correlationId,
      });
    } else if (params.decision === 'REJECT') {
      await this.headerRepo.updateStatus(params.shipmentId, 'CANCELLED', {
        cancelReasonCode: params.reasonCode,
        updatedBy: params.decidedBy,
      });

      await this.historyRepo.create({
        shipmentHeaderId: params.shipmentId,
        entityLevel: 'HEADER',
        fromStatus: 'PENDING_APPROVAL',
        toStatus: 'CANCELLED',
        triggerAction: 'REJECT',
        reasonCode: params.reasonCode,
        note: params.note,
        changedBy: params.decidedBy,
        correlationId,
      });
    } else {
      await this.headerRepo.updateStatus(params.shipmentId, 'LOADING', {
        updatedBy: params.decidedBy,
      });

      await this.historyRepo.create({
        shipmentHeaderId: params.shipmentId,
        entityLevel: 'HEADER',
        fromStatus: 'PENDING_APPROVAL',
        toStatus: 'LOADING',
        triggerAction: 'REWEIGH',
        reasonCode: params.reasonCode,
        changedBy: params.decidedBy,
        correlationId,
      });
    }

    return decision;
  }

  private async checkAndUpdateShipmentStatus(
    shipmentId: string,
    userId: string,
    correlationId: string,
  ) {
    const failedCount = await this.lineRepo.countByStatus(shipmentId, 'WEIGHED_FAIL' as any);

    if (failedCount === 0) {
      await this.headerRepo.updateStatus(shipmentId, 'ALL_WEIGHED', {
        pendingApprovalCount: 0,
        allLinesPassed: true,
        updatedBy: userId,
      });

      await this.historyRepo.create({
        shipmentHeaderId: shipmentId,
        entityLevel: 'HEADER',
        fromStatus: 'PENDING_APPROVAL',
        toStatus: 'ALL_WEIGHED',
        triggerAction: 'ALL_LINES_RESOLVED',
        changedBy: userId,
        correlationId,
      });
    }
  }

  async getPendingApprovals(warehouseId?: string) {
    return this.headerRepo.findMany({
      status: 'PENDING_APPROVAL' as any,
      warehouseId,
    });
  }
}
