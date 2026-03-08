import { Injectable, Logger } from '@nestjs/common';
import { MobileSyncBatchRepository } from '../repositories/mobile-sync-batch.repository';
import { MobileSyncEventRepository } from '../repositories/mobile-sync-event.repository';
import { SyncBatchStatus, SyncEventStatus } from '../domain/integration.enums';
import { MobileSyncError, IntegrationErrorCodes } from '../domain/integration.errors';
import { v4 as uuidv4 } from 'uuid';

export interface SubmitBatchParams {
  batchId: string;
  deviceId: string;
  keeperUserId: string;
  appVersion?: string;
  correlationId: string;
  events: Array<{
    eventExternalId: string;
    eventType: string;
    workId?: string;
    workLineId?: string;
    sourceModule: string;
    deviceEventTime: string;
    sequenceNo: number;
    payload: Record<string, unknown>;
  }>;
}

@Injectable()
export class MobileSyncBatchService {
  private readonly logger = new Logger(MobileSyncBatchService.name);

  constructor(
    private readonly batchRepo: MobileSyncBatchRepository,
    private readonly eventRepo: MobileSyncEventRepository,
  ) {}

  async submitBatch(params: SubmitBatchParams) {
    // Check idempotency
    const existing = await this.batchRepo.findByBatchId(params.batchId);
    if (existing) {
      this.logger.log(`Duplicate batch received: ${params.batchId}`);
      return {
        id: existing.id,
        batchId: existing.batchId,
        isDuplicate: true,
        status: existing.status,
        message: 'Duplicate batch - returning existing record',
      };
    }

    const externalId = uuidv4();
    const eventCount = params.events.length;
    const sequenceNos = params.events.map(e => e.sequenceNo);
    const firstSequenceNo = sequenceNos.length > 0 ? Math.min(...sequenceNos) : null;
    const lastSequenceNo = sequenceNos.length > 0 ? Math.max(...sequenceNos) : null;

    // Create batch
    const batch = await this.batchRepo.create({
      batchId: params.batchId,
      deviceId: params.deviceId,
      keeperUserId: params.keeperUserId,
      appVersion: params.appVersion,
      eventCount,
      payload: { events: params.events },
      status: SyncBatchStatus.QUEUED,
      firstSequenceNo,
      lastSequenceNo,
      externalId,
      correlationId: params.correlationId,
      sourceChannel: 'MOBILE_SYNC',
    });

    // Create events and check for duplicates
    let duplicateCount = 0;
    const createdEvents = [];

    for (const eventData of params.events) {
      const eventExists = await this.eventRepo.existsByExternalId(eventData.eventExternalId);
      if (eventExists) {
        duplicateCount++;
        continue;
      }

      const event = await this.eventRepo.create({
        batchId: batch.id,
        eventExternalId: eventData.eventExternalId,
        eventType: eventData.eventType,
        workId: eventData.workId,
        workLineId: eventData.workLineId,
        sourceModule: eventData.sourceModule,
        deviceId: params.deviceId,
        deviceEventTime: new Date(eventData.deviceEventTime),
        sequenceNo: eventData.sequenceNo,
        payload: eventData.payload,
        processStatus: SyncEventStatus.RECEIVED,
        correlationId: params.correlationId,
      });
      createdEvents.push(event);
    }

    // Update batch counts
    await this.batchRepo.updateCounts(batch.id, { duplicateCount });

    this.logger.log(`Batch ${params.batchId} created with ${eventCount} events, ${duplicateCount} duplicates`);

    return {
      id: batch.id,
      batchId: params.batchId,
      isDuplicate: false,
      status: SyncBatchStatus.QUEUED,
      eventCount,
      duplicateCount,
      acceptedCount: eventCount - duplicateCount,
      message: 'Batch accepted for processing',
    };
  }

  async getBatches(params: {
    deviceId?: string;
    keeperUserId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const result = await this.batchRepo.findMany({
      deviceId: params.deviceId,
      keeperUserId: params.keeperUserId,
      status: params.status,
      dateFrom: params.dateFrom ? new Date(params.dateFrom) : undefined,
      dateTo: params.dateTo ? new Date(params.dateTo) : undefined,
      skip: ((params.page || 1) - 1) * (params.limit || 20),
      take: params.limit || 20,
    });

    return {
      data: result.data,
      pagination: {
        total: result.total,
        page: params.page || 1,
        limit: params.limit || 20,
        totalPages: Math.ceil(result.total / (params.limit || 20)),
      },
    };
  }

  async getBatchById(id: string) {
    const batch = await this.batchRepo.findById(id);
    if (!batch) {
      throw new MobileSyncError(IntegrationErrorCodes.BATCH_NOT_FOUND, `Batch ${id} not found`);
    }
    return batch;
  }

  async getEventById(id: string) {
    const event = await this.eventRepo.findById(id);
    if (!event) {
      throw new MobileSyncError(IntegrationErrorCodes.EVENT_NOT_FOUND, `Event ${id} not found`);
    }
    return event;
  }
}
