import { Injectable, BadRequestException } from '@nestjs/common';
import { ShipmentHeaderRepository } from '../repositories/shipment-header.repository';
import { ShipmentLineRepository } from '../repositories/shipment-line.repository';
import { WeighingAttemptRepository } from '../repositories/weighing-attempt.repository';
import { StatusHistoryRepository } from '../repositories/status-history.repository';
import { ToleranceService } from './tolerance.service';
import { v4 as uuidv4 } from 'uuid';

export interface RecordTareParams {
  shipmentId: string;
  rawWeightKg: number;
  sourceMode: 'SCALE_AGENT' | 'MANUAL';
  scaleTicketNo?: string;
  externalEventId?: string;
  reasonCode?: string;
  capturedBy?: string;
  correlationId?: string;
}

export interface RecordGrossParams {
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
export class WeighingService {
  constructor(
    private readonly headerRepo: ShipmentHeaderRepository,
    private readonly lineRepo: ShipmentLineRepository,
    private readonly weighingRepo: WeighingAttemptRepository,
    private readonly historyRepo: StatusHistoryRepository,
    private readonly toleranceService: ToleranceService,
  ) {}

  async recordTare(params: RecordTareParams) {
    const shipment = await this.headerRepo.findById(params.shipmentId);
    if (!shipment) {
      throw new BadRequestException(`Shipment ${params.shipmentId} not found`);
    }

    if (params.externalEventId) {
      const existing = await this.weighingRepo.findByExternalEventId(params.externalEventId);
      if (existing) {
        return existing;
      }
    }

    const corrId = params.correlationId || uuidv4();
    const sequenceNo = await this.weighingRepo.getNextSequenceNo(params.shipmentId);

    const attempt = await this.weighingRepo.create({
      header: { connect: { id: params.shipmentId } },
      weighType: 'TARE',
      sequenceNo,
      sourceMode: params.sourceMode as any,
      rawWeightKg: params.rawWeightKg,
      scaleTicketNo: params.scaleTicketNo,
      externalEventId: params.externalEventId,
      capturedAt: new Date(),
      capturedBy: params.capturedBy,
      reasonCode: params.reasonCode,
      correlationId: corrId,
    });

    await this.headerRepo.update(params.shipmentId, {
      tareWeightKg: params.rawWeightKg,
      status: 'WEIGHING_TARE',
      updatedBy: params.capturedBy,
    });

    await this.historyRepo.create({
      shipmentHeaderId: params.shipmentId,
      entityLevel: 'HEADER',
      fromStatus: shipment.status,
      toStatus: 'WEIGHING_TARE',
      triggerAction: 'RECORD_TARE',
      changedBy: params.capturedBy,
      correlationId: corrId,
    });

    return attempt;
  }

  async recordGross(params: RecordGrossParams) {
    const shipment = await this.headerRepo.findById(params.shipmentId);
    if (!shipment) {
      throw new BadRequestException(`Shipment ${params.shipmentId} not found`);
    }

    const tare = await this.weighingRepo.findValidTare(params.shipmentId);
    if (!tare) {
      throw new BadRequestException('Must record tare weight before gross');
    }

    const line = await this.lineRepo.findById(params.lineId);
    if (!line) {
      throw new BadRequestException(`Line ${params.lineId} not found`);
    }

    if (params.externalEventId) {
      const existing = await this.weighingRepo.findByExternalEventId(params.externalEventId);
      if (existing) {
        return { attempt: existing, toleranceResult: null };
      }
    }

    const corrId = params.correlationId || uuidv4();
    const sequenceNo = await this.weighingRepo.getNextSequenceNo(params.shipmentId);

    const previousGross = await this.weighingRepo.findPreviousValidGross(
      params.shipmentId,
      sequenceNo,
    );
    const previousCumulativeWeight = previousGross
      ? Number(previousGross.rawWeightKg)
      : Number(tare.rawWeightKg);

    const netLineKg = params.rawWeightKg - previousCumulativeWeight;

    const attempt = await this.weighingRepo.create({
      header: { connect: { id: params.shipmentId } },
      line: { connect: { id: params.lineId } },
      weighType: 'GROSS',
      sequenceNo,
      sourceMode: params.sourceMode as any,
      rawWeightKg: params.rawWeightKg,
      calculatedNetKg: netLineKg,
      scaleTicketNo: params.scaleTicketNo,
      externalEventId: params.externalEventId,
      capturedAt: new Date(),
      capturedBy: params.capturedBy,
      reasonCode: params.reasonCode,
      correlationId: corrId,
    });

    const toleranceResult = await this.toleranceService.checkTolerance({
      shipmentId: params.shipmentId,
      lineId: params.lineId,
      netWeightKg: netLineKg,
      expectedQtyKg: Number(line.expectedQtyKg),
      itemId: line.itemId,
      ownerId: shipment.ownerId,
      correlationId: corrId,
    });

    await this.lineRepo.updateWeighResult(params.lineId, {
      grossWeightKg: params.rawWeightKg,
      netWeightKg: netLineKg,
      variancePct: toleranceResult.variancePct,
      tolerancePctApplied: toleranceResult.tolerancePct,
      weighSequenceNo: sequenceNo,
      passed: toleranceResult.passed,
    });

    return { attempt, toleranceResult };
  }

  async getWeighingHistory(shipmentId: string) {
    return this.weighingRepo.findByShipmentId(shipmentId);
  }
}
