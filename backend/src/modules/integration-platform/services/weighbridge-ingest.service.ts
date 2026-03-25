import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { WeighbridgeLogRepository } from '../repositories/weighbridge-log.repository';
import Decimal from 'decimal.js';
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
    private readonly prisma: PrismaService,
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

    // 2. Validate device is active (required for local agent)
    if (!dto.scaleDeviceId) {
      throw new WeighbridgeError(
        IntegrationErrorCodes.DEVICE_NOT_FOUND,
        'scaleDeviceId is required for device-based weigh events',
      );
    }
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

    // 4. Calculate net weight if not provided (using decimal.js for precision)
    let netWeightKg = dto.netWeightKg;
    if (!netWeightKg && dto.grossWeightKg && dto.tareWeightKg) {
      netWeightKg = new Decimal(dto.grossWeightKg).minus(dto.tareWeightKg).toNumber();
    }

    // 5. Determine reference fields
    const receiptId = dto.referenceType === 'RECEIPT' ? dto.referenceId : undefined;
    const shipmentId = dto.referenceType === 'SHIPMENT' ? dto.referenceId : undefined;

    // 6. Calculate latency
    const eventTime = new Date(dto.eventTime);
    const latencyMs = Date.now() - eventTime.getTime();

    // 7. Create immutable log entry with transaction for atomicity
    const externalId = uuidv4();
    const log = await this.prisma.$transaction(async (tx) => {
      const createdLog = await tx.m8WeighbridgeLog.create({
        data: {
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
        },
        include: { eventState: true },
      });

      // Create event state in same transaction
      await tx.m8WeighbridgeEventState.create({
        data: {
          weighbridgeLogId: createdLog.id,
          processingStatus: WeighEventProcessingStatus.RECEIVED,
          callbackStatus: CallbackStatus.PENDING,
        },
      });

      return createdLog;
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

  /**
   * Create manual weigh event from web UI
   * - Does not require device validation
   * - Auto-approves with current user
   */
  async createManualWeighEvent(dto: CreateWeighEventDto, createdBy: string): Promise<WeighEventResult> {
    // 1. Check idempotency
    const existing = await this.logRepo.findByEventId(dto.weighbridgeEventId);
    if (existing) {
      return {
        id: existing.id,
        weighbridgeEventId: existing.weighbridgeEventId,
        isDuplicate: true,
        processingStatus: existing.eventState?.processingStatus || 'RECEIVED',
        message: 'Duplicate event - returning existing record',
      };
    }

    // 2. Calculate net weight if provided
    let netWeightKg = dto.netWeightKg;
    if (!netWeightKg && dto.grossWeightKg && dto.tareWeightKg) {
      netWeightKg = new Decimal(dto.grossWeightKg).minus(dto.tareWeightKg).toNumber();
    }

    // 3. Determine reference fields
    const receiptId = dto.referenceType === 'RECEIPT' ? dto.referenceId : undefined;
    const shipmentId = dto.referenceType === 'SHIPMENT' ? dto.referenceId : undefined;

    // 4. Calculate latency
    const eventTime = new Date(dto.eventTime);
    const latencyMs = Date.now() - eventTime.getTime();

    // 5. Create log entry without device connection
    const externalId = uuidv4();
    const log = await this.prisma.$transaction(async (tx) => {
      const createdLog = await tx.m8WeighbridgeLog.create({
        data: {
          weighbridgeEventId: dto.weighbridgeEventId,
          receiptId,
          shipmentId,
          vehicleNumber: dto.vehicleNumber,
          weighingType: dto.weighingType as any,
          weighingSequence: dto.weighingSequence || 1,
          grossWeightKg: dto.grossWeightKg,
          tareWeightKg: dto.tareWeightKg,
          netWeightKg,
          rawPayload: dto.rawPayload as any,
          isStableWeight: true,
          isDuplicateSignal: false,
          isManualEntry: true,
          manualReasonCode: dto.manualReasonCode || 'WEB_MANUAL_CREATE',
          approvedBy: createdBy,
          latencyMs,
          externalId,
          correlationId: dto.correlationId,
          sourceChannel: dto.sourceChannel || 'WEB_MANUAL',
          weighingTimestamp: eventTime,
          createdBy,
          scaleDeviceId: dto.scaleDeviceId || undefined,
          warehouseId: dto.warehouseId,
          ownerId: dto.ownerId,
          itemCode: dto.itemCode,
          notes: dto.notes,
        },
        include: { eventState: true },
      });

      // Create event state
      await tx.m8WeighbridgeEventState.create({
        data: {
          weighbridgeLogId: createdLog.id,
          processingStatus: WeighEventProcessingStatus.RECEIVED,
          callbackStatus: CallbackStatus.PENDING,
        },
      });

      return createdLog;
    });

    this.logger.log(`Manual weigh event created: ${dto.weighbridgeEventId}, log ID: ${log.id}`);

    // Update receipt status: CONFIRMED → AWAITING_WEIGHING when weigh ticket created
    if (receiptId) {
      try {
        const receipt = await this.prisma.receiptHeader.findUnique({ where: { id: receiptId }, select: { status: true } });
        if (receipt && receipt.status === 'CONFIRMED') {
          await this.prisma.receiptHeader.update({
            where: { id: receiptId },
            data: { status: 'AWAITING_WEIGHING' },
          });
          await this.prisma.receiptStatusHistory.create({
            data: {
              receiptHeaderId: receiptId,
              fromStatus: 'CONFIRMED',
              toStatus: 'AWAITING_WEIGHING',
              transitionCode: 'CREATE_WEIGH_TICKET',
              triggeredBy: createdBy,
              correlationId: dto.correlationId || receiptId,
              occurredAt: new Date(),
            },
          });
          this.logger.log(`Receipt ${receiptId} status: CONFIRMED → AWAITING_WEIGHING`);
        }
      } catch (e: any) {
        this.logger.warn(`Failed to update receipt status on weigh ticket creation: ${e.message}`);
      }
    }

    // Dispatch callback
    this.dispatchCallbackAsync(log.id, dto.referenceType, dto.referenceId);

    return {
      id: log.id,
      weighbridgeEventId: dto.weighbridgeEventId,
      isDuplicate: false,
      processingStatus: WeighEventProcessingStatus.RECEIVED,
      message: 'Manual weigh event created successfully',
    };
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
