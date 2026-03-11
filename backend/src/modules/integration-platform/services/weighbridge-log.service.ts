import { Injectable, Logger } from '@nestjs/common';
import { WeighbridgeLogRepository, WeighLogQueryParams } from '../repositories/weighbridge-log.repository';
import { WeighbridgeError, IntegrationErrorCodes } from '../domain/integration.errors';

@Injectable()
export class WeighbridgeLogService {
  private readonly logger = new Logger(WeighbridgeLogService.name);

  constructor(private readonly logRepo: WeighbridgeLogRepository) {}

  async getLogs(params: {
    scaleDeviceId?: string;
    vehicleNumber?: string;
    referenceType?: string;
    referenceId?: string;
    weighingType?: string;
    dateFrom?: string;
    dateTo?: string;
    isManualEntry?: boolean;
    sourceChannel?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams: WeighLogQueryParams = {
      scaleDeviceId: params.scaleDeviceId,
      vehicleNumber: params.vehicleNumber,
      weighingType: params.weighingType,
      isManualEntry: params.isManualEntry,
      sourceChannel: params.sourceChannel,
      skip: ((params.page || 1) - 1) * (params.limit || 20),
      take: params.limit || 20,
    };

    if (params.referenceType === 'RECEIPT' && params.referenceId) {
      queryParams.receiptId = params.referenceId;
    } else if (params.referenceType === 'SHIPMENT' && params.referenceId) {
      queryParams.shipmentId = params.referenceId;
    }

    if (params.dateFrom) queryParams.dateFrom = new Date(params.dateFrom);
    if (params.dateTo) queryParams.dateTo = new Date(params.dateTo);

    const result = await this.logRepo.findMany(queryParams);

    return {
      data: result.data.map(this.mapLogToResponse),
      pagination: {
        total: result.total,
        page: params.page || 1,
        limit: params.limit || 20,
        totalPages: Math.ceil(result.total / (params.limit || 20)),
      },
    };
  }

  async getLogById(id: string) {
    const log = await this.logRepo.findById(id);
    if (!log) {
      throw new WeighbridgeError(
        IntegrationErrorCodes.WEIGH_EVENT_NOT_FOUND,
        `Weigh log with ID ${id} not found`,
      );
    }
    return this.mapLogToDetailResponse(log);
  }

  async getLogsByReference(referenceType: 'RECEIPT' | 'SHIPMENT', referenceId: string) {
    const logs = await this.logRepo.findByReference(referenceType, referenceId);
    return logs.map(this.mapLogToResponse);
  }

  async getLogsByCorrelationId(correlationId: string) {
    const logs = await this.logRepo.findByCorrelationId(correlationId);
    return logs.map(this.mapLogToResponse);
  }

  async getDeviceStats(scaleDeviceId: string, dateFrom: Date, dateTo: Date) {
    const count = await this.logRepo.countByDevice(scaleDeviceId, dateFrom, dateTo);
    const latencyStats = await this.logRepo.getLatencyStats(dateFrom, dateTo);

    return {
      scaleDeviceId,
      period: { from: dateFrom, to: dateTo },
      eventCount: count,
      latency: {
        avgMs: latencyStats._avg.latencyMs,
        minMs: latencyStats._min.latencyMs,
        maxMs: latencyStats._max.latencyMs,
      },
    };
  }

  private mapLogToResponse(log: any) {
    // Map to frontend expected format
    const referenceType = log.receiptId ? 'RECEIPT' : log.shipmentId ? 'SHIPMENT' : null;
    const referenceId = log.receiptId || log.shipmentId || null;
    
    return {
      id: log.id,
      weighbridgeEventId: log.weighbridgeEventId,
      vehicleNumber: log.vehicleNumber,
      weighingType: log.weighingType,
      weighingSequence: log.weighingSequence,
      grossWeightKg: log.grossWeightKg ? Number(log.grossWeightKg) : null,
      tareWeightKg: log.tareWeightKg ? Number(log.tareWeightKg) : null,
      netWeightKg: log.netWeightKg ? Number(log.netWeightKg) : null,
      // Frontend expected fields
      referenceType,
      referenceId,
      weightKg: log.netWeightKg ? Number(log.netWeightKg) : (log.grossWeightKg ? Number(log.grossWeightKg) : null),
      capturedAt: log.weighingTimestamp,
      isStableWeight: log.isStableWeight,
      isDuplicateSignal: log.isDuplicateSignal,
      isManualEntry: log.isManualEntry,
      manualReasonCode: log.manualReasonCode,
      scaleDeviceId: log.scaleDeviceId,
      sourceChannel: log.sourceChannel,
      weighingTimestamp: log.weighingTimestamp,
      createdAt: log.createdAt,
      processingStatus: log.eventState?.processingStatus,
      callbackStatus: log.eventState?.callbackStatus,
    };
  }

  private mapLogToDetailResponse(log: any) {
    return {
      ...this.mapLogToResponse(log),
      rawPayload: log.rawPayload,
      rawWeightValue: log.rawWeightValue,
      duplicateOfEventId: log.duplicateOfEventId,
      approvedBy: log.approvedBy,
      photoAlprPath: log.photoAlprPath,
      photoCargoPath: log.photoCargoPath,
      latencyMs: log.latencyMs,
      externalId: log.externalId,
      correlationId: log.correlationId,
      createdBy: log.createdBy,
      receiptId: log.receiptId,
      shipmentId: log.shipmentId,
      eventState: log.eventState ? {
        processingStatus: log.eventState.processingStatus,
        linkedModule: log.eventState.linkedModule,
        linkedObjectId: log.eventState.linkedObjectId,
        callbackStatus: log.eventState.callbackStatus,
        callbackError: log.eventState.callbackError,
        retryCount: log.eventState.retryCount,
        lastRetryAt: log.eventState.lastRetryAt,
      } : null,
      device: log.device ? {
        deviceCode: log.device.deviceCode,
        deviceName: log.device.deviceName,
        warehouseId: log.device.warehouseId,
      } : null,
    };
  }
}
