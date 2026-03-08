/**
 * Receive Outbound Weight Use Case - Application Layer
 * Handles tare and gross weight recording with tolerance checking
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import { ShipmentHeaderRepository } from '../repositories/shipment-header.repository';
import { ShipmentLineRepository } from '../repositories/shipment-line.repository';
import { WeighingAttemptRepository } from '../repositories/weighing-attempt.repository';
import { StatusHistoryRepository } from '../repositories/status-history.repository';
import { ExceptionLogRepository } from '../repositories/exception-log.repository';
import { ToleranceService } from '../services/tolerance.service';
import { v4 as uuidv4 } from 'uuid';

export interface RecordTareInput {
  shipmentId: string;
  rawWeightKg: number;
  sourceMode: 'SCALE_AGENT' | 'MANUAL';
  scaleTicketNo?: string;
  externalEventId?: string;
  reasonCode?: string;
  capturedBy?: string;
  correlationId?: string;
}

export interface RecordGrossInput {
  shipmentId: string;
  lineId: string;
  rawWeightKg: number;
  sourceMode: 'SCALE_AGENT' | 'MANUAL';
  scaleTicketNo?: string;
  externalEventId?: string;
  reasonCode?: string;
  capturedBy?: string;
  correlationId?: string;
}

@Injectable()
export class ReceiveOutboundWeightUseCase {
  constructor(
    private readonly headerRepo: ShipmentHeaderRepository,
    private readonly lineRepo: ShipmentLineRepository,
    private readonly weighingRepo: WeighingAttemptRepository,
    private readonly historyRepo: StatusHistoryRepository,
    private readonly exceptionRepo: ExceptionLogRepository,
    private readonly toleranceService: ToleranceService,
  ) {}

  async recordTare(input: RecordTareInput) {
    const shipment = await this.headerRepo.findById(input.shipmentId);
    if (!shipment) {
      throw new BadRequestException(`Shipment ${input.shipmentId} not found`);
    }

    if (input.externalEventId) {
      const existing = await this.weighingRepo.findByExternalEventId(input.externalEventId);
      if (existing) {
        return existing;
      }
    }

    const corrId = input.correlationId || uuidv4();
    const sequenceNo = await this.weighingRepo.getNextSequenceNo(input.shipmentId);

    const attempt = await this.weighingRepo.create({
      header: { connect: { id: input.shipmentId } },
      weighType: 'TARE',
      sequenceNo,
      sourceMode: input.sourceMode as any,
      rawWeightKg: input.rawWeightKg,
      scaleTicketNo: input.scaleTicketNo,
      externalEventId: input.externalEventId,
      capturedAt: new Date(),
      capturedBy: input.capturedBy,
      reasonCode: input.reasonCode,
      correlationId: corrId,
    });

    await this.headerRepo.update(input.shipmentId, {
      tareWeightKg: input.rawWeightKg,
      status: 'WEIGHING_TARE',
      updatedBy: input.capturedBy,
    });

    await this.historyRepo.create({
      shipmentHeaderId: input.shipmentId,
      entityLevel: 'HEADER',
      fromStatus: shipment.status,
      toStatus: 'WEIGHING_TARE',
      triggerAction: 'RECORD_TARE',
      changedBy: input.capturedBy,
      correlationId: corrId,
    });

    return attempt;
  }

  async recordGross(input: RecordGrossInput) {
    const shipment = await this.headerRepo.findById(input.shipmentId);
    if (!shipment) {
      throw new BadRequestException(`Shipment ${input.shipmentId} not found`);
    }

    const tare = await this.weighingRepo.findValidTare(input.shipmentId);
    if (!tare) {
      throw new BadRequestException('Must record tare weight before gross');
    }

    const line = await this.lineRepo.findById(input.lineId);
    if (!line) {
      throw new BadRequestException(`Line ${input.lineId} not found`);
    }

    if (input.externalEventId) {
      const existing = await this.weighingRepo.findByExternalEventId(input.externalEventId);
      if (existing) {
        return { attempt: existing, toleranceResult: null };
      }
    }

    const corrId = input.correlationId || uuidv4();
    const sequenceNo = await this.weighingRepo.getNextSequenceNo(input.shipmentId);

    const previousGross = await this.weighingRepo.findPreviousValidGross(
      input.shipmentId,
      sequenceNo,
    );
    const previousCumulativeWeight = previousGross
      ? Number(previousGross.rawWeightKg)
      : Number(tare.rawWeightKg);

    const netLineKg = input.rawWeightKg - previousCumulativeWeight;

    const attempt = await this.weighingRepo.create({
      header: { connect: { id: input.shipmentId } },
      line: { connect: { id: input.lineId } },
      weighType: 'GROSS',
      sequenceNo,
      sourceMode: input.sourceMode as any,
      rawWeightKg: input.rawWeightKg,
      calculatedNetKg: netLineKg,
      scaleTicketNo: input.scaleTicketNo,
      externalEventId: input.externalEventId,
      capturedAt: new Date(),
      capturedBy: input.capturedBy,
      reasonCode: input.reasonCode,
      correlationId: corrId,
    });

    const toleranceResult = await this.toleranceService.checkTolerance({
      shipmentId: input.shipmentId,
      lineId: input.lineId,
      netWeightKg: netLineKg,
      expectedQtyKg: Number(line.expectedQtyKg),
      itemId: line.itemId,
      ownerId: shipment.ownerId,
      correlationId: corrId,
    });

    await this.lineRepo.updateWeighResult(input.lineId, {
      grossWeightKg: input.rawWeightKg,
      netWeightKg: netLineKg,
      variancePct: toleranceResult.variancePct,
      tolerancePctApplied: toleranceResult.tolerancePct,
      weighSequenceNo: sequenceNo,
      passed: toleranceResult.passed,
    });

    // HI-5: Record line-level status history
    await this.historyRepo.create({
      shipmentHeaderId: input.shipmentId,
      shipmentLineId: input.lineId,
      entityLevel: 'LINE',
      fromStatus: line.lineStatus,
      toStatus: toleranceResult.passed ? 'WEIGHED_PASS' : 'WEIGHED_FAIL',
      triggerAction: 'RECORD_GROSS',
      changedBy: input.capturedBy,
      correlationId: corrId,
    });

    if (!toleranceResult.passed) {
      await this.exceptionRepo.create({
        shipmentHeaderId: input.shipmentId,
        shipmentLineId: input.lineId,
        exceptionType: 'TOLERANCE_FAIL',
        exceptionCode: 'TOL_EXCEEDED',
        severity: 'MEDIUM',
        detailJson: {
          netWeightKg: netLineKg,
          expectedQtyKg: Number(line.expectedQtyKg),
          variancePct: toleranceResult.variancePct,
          tolerancePct: toleranceResult.tolerancePct,
        },
        createdBy: input.capturedBy,
        correlationId: corrId,
      });
    }

    // HI-1: Check if all lines are weighed and update header status
    await this.checkAllLinesWeighed(input.shipmentId, input.capturedBy, corrId);

    return { attempt, toleranceResult };
  }

  private async checkAllLinesWeighed(
    shipmentId: string,
    userId?: string,
    correlationId?: string,
  ) {
    const lines = await this.lineRepo.findByShipmentId(shipmentId);
    const totalLines = lines.length;
    const passedCount = await this.lineRepo.countByStatus(shipmentId, 'WEIGHED_PASS');
    const failedCount = await this.lineRepo.countByStatus(shipmentId, 'WEIGHED_FAIL');

    if (passedCount + failedCount === totalLines) {
      if (failedCount > 0) {
        await this.headerRepo.updateStatus(shipmentId, 'PENDING_APPROVAL', {
          pendingApprovalCount: failedCount,
          updatedBy: userId,
        });

        await this.historyRepo.create({
          shipmentHeaderId: shipmentId,
          entityLevel: 'HEADER',
          fromStatus: 'LOADING',
          toStatus: 'PENDING_APPROVAL',
          triggerAction: 'TOLERANCE_FAIL',
          changedBy: userId,
          correlationId: correlationId || '',
        });
      } else {
        await this.headerRepo.updateStatus(shipmentId, 'ALL_WEIGHED', {
          allLinesPassed: true,
          updatedBy: userId,
        });

        await this.historyRepo.create({
          shipmentHeaderId: shipmentId,
          entityLevel: 'HEADER',
          fromStatus: 'LOADING',
          toStatus: 'ALL_WEIGHED',
          triggerAction: 'ALL_WEIGHED',
          changedBy: userId,
          correlationId: correlationId || '',
        });
      }
    }
  }
}
