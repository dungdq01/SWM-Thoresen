import { Injectable, Logger } from '@nestjs/common';
import { WeighbridgeLogRepository } from '../repositories/weighbridge-log.repository';
import { WeighbridgeEventStateRepository } from '../repositories/weighbridge-event-state.repository';
import { WeighbridgeDeviceService } from './weighbridge-device.service';
import { CreateWeighEventDto } from '../dto/weighbridge/create-weigh-event.dto';
import { WeighingType, WeighEventProcessingStatus, CallbackStatus } from '../domain/integration.enums';
import { WeighbridgeError, IntegrationErrorCodes } from '../domain/integration.errors';
import { v4 as uuidv4 } from 'uuid';

export interface WeighEventResult {
  id: string;
  weighbridgeEventId: string;
  isDuplicate: boolean;
  processingStatus: string;
  message: string;
}

@Injectable()
export class WeighbridgeIngestService {
  private readonly logger = new Logger(WeighbridgeIngestService.name);

  constructor(
    private readonly logRepo: WeighbridgeLogRepository,
    private readonly eventStateRepo: WeighbridgeEventStateRepository,
    private readonly deviceService: WeighbridgeDeviceService,
  ) {}

  async ingestWeighEvent(dto: CreateWeighEventDto, createdBy: string): Promise<WeighEventResult> {
    // 1. Check idempotency - if event already exists, return existing record
    const existing = await this.logRepo.findByEventId(dto.weighbridgeEventId);
    if (existing) {
      this.logger.log(`Duplicate weigh event received: ${dto.weighbridgeEventId}`);
      return {
        id: existing.id,
        weighbridgeEventId: existing.weighbridgeEventId,
        isDuplicate: true,
        processingStatus: existing.eventState?.processingStatus || 'RECEIVED',
        message: 'Duplicate event - returning existing record',
      };
    }

    // 2. Validate device is active
    await this.deviceService.validateDeviceActive(dto.scaleDeviceId);

    // 3. Validate manual entry requirements
    if (dto.isManualEntry) {
      if (!dto.manualReasonCode) {
        throw new WeighbridgeError(
          IntegrationErrorCodes.MANUAL_ENTRY_REQUIRES_APPROVAL,
          'Manual entry requires a reason code',
        );
      }
      if (!dto.approvedBy) {
        throw new WeighbridgeError(
          IntegrationErrorCodes.MANUAL_ENTRY_REQUIRES_APPROVAL,
          'Manual entry requires approval',
        );
      }
    }

    // 4. Calculate net weight if not provided
    let netWeightKg = dto.netWeightKg;
    if (!netWeightKg && dto.grossWeightKg && dto.tareWeightKg) {
      netWeightKg = dto.grossWeightKg - dto.tareWeightKg;
    }

    // 5. Determine reference fields
    const receiptId = dto.referenceType === 'RECEIPT' ? dto.referenceId : undefined;
    const shipmentId = dto.referenceType === 'SHIPMENT' ? dto.referenceId : undefined;

    // 6. Calculate latency
    const eventTime = new Date(dto.eventTime);
    const latencyMs = Date.now() - eventTime.getTime();

    // 7. Create immutable log entry
    const externalId = uuidv4();
    const log = await this.logRepo.create({
      weighbridgeEventId: dto.weighbridgeEventId,
      receiptId,
      shipmentId,
      vehicleNumber: dto.vehicleNumber,
      weighingType: dto.weighingType as any,
      weighingSequence: dto.weighingSequence,
      grossWeightKg: dto.grossWeightKg,
      tareWeightKg: dto.tareWeightKg,
      netWeightKg,
      rawPayload: dto.rawPayload as any,
      isStableWeight: true,
      isDuplicateSignal: false,
      isManualEntry: dto.isManualEntry || false,
      manualReasonCode: dto.manualReasonCode,
      approvedBy: dto.approvedBy,
      latencyMs,
      externalId,
      correlationId: dto.correlationId,
      sourceChannel: dto.sourceChannel,
      weighingTimestamp: eventTime,
      createdBy,
      device: { connect: { deviceCode: dto.scaleDeviceId } },
      eventState: {
        create: {
          processingStatus: WeighEventProcessingStatus.RECEIVED,
          callbackStatus: CallbackStatus.PENDING,
        },
      },
    });

    this.logger.log(`Weigh event ingested: ${dto.weighbridgeEventId}, log ID: ${log.id}`);

    // 8. Dispatch callback async (in real implementation, this would be a queue job)
    this.dispatchCallbackAsync(log.id, dto.referenceType, dto.referenceId);

    return {
      id: log.id,
      weighbridgeEventId: dto.weighbridgeEventId,
      isDuplicate: false,
      processingStatus: WeighEventProcessingStatus.RECEIVED,
      message: 'Weigh event received and queued for processing',
    };
  }

  private async dispatchCallbackAsync(logId: string, referenceType?: string, referenceId?: string) {
    // In production, this would enqueue to BullMQ/Redis
    // For now, just update state to indicate callback is pending
    this.logger.log(`Callback queued for log ${logId}, ref: ${referenceType}/${referenceId}`);
  }

  async reprocessCallback(logId: string, userId: string, reason?: string) {
    const log = await this.logRepo.findById(logId);
    if (!log) {
      throw new WeighbridgeError(
        IntegrationErrorCodes.WEIGH_EVENT_NOT_FOUND,
        `Weigh log with ID ${logId} not found`,
      );
    }

    if (!log.eventState) {
      throw new WeighbridgeError(
        IntegrationErrorCodes.WEIGH_EVENT_NOT_FOUND,
        `Event state not found for log ${logId}`,
      );
    }

    // Reset callback status and increment retry
    await this.eventStateRepo.updateByLogId(logId, {
      callbackStatus: CallbackStatus.PENDING,
      callbackError: null,
    });
    await this.eventStateRepo.incrementRetryCount(log.eventState.id);

    this.logger.log(`Reprocessing callback for log ${logId} by user ${userId}, reason: ${reason}`);

    // Dispatch callback again
    const referenceType = log.receiptId ? 'RECEIPT' : log.shipmentId ? 'SHIPMENT' : undefined;
    const referenceId = log.receiptId || log.shipmentId || undefined;
    this.dispatchCallbackAsync(logId, referenceType, referenceId);

    return { success: true, logId, message: 'Callback reprocessing initiated' };
  }
}
