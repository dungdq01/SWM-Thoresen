import { Injectable, Logger } from '@nestjs/common';
import { MobileSyncEventRepository } from '../repositories/mobile-sync-event.repository';
import { MobileSyncBatchRepository } from '../repositories/mobile-sync-batch.repository';
import { SyncBatchStatus, SyncEventStatus } from '../domain/integration.enums';
import { MobileSyncError, IntegrationErrorCodes } from '../domain/integration.errors';

@Injectable()
export class MobileSyncDispatchService {
  private readonly logger = new Logger(MobileSyncDispatchService.name);

  constructor(
    private readonly eventRepo: MobileSyncEventRepository,
    private readonly batchRepo: MobileSyncBatchRepository,
  ) {}

  async dispatchEvent(eventId: string) {
    const event = await this.eventRepo.findById(eventId);
    if (!event) {
      throw new MobileSyncError(IntegrationErrorCodes.EVENT_NOT_FOUND, `Event ${eventId} not found`);
    }

    try {
      // Update status to DISPATCHED
      await this.eventRepo.updateStatus(eventId, SyncEventStatus.DISPATCHED);

      // In production, this would call the target module service
      // For now, simulate dispatch to M7/M6
      const result = await this.mockDispatchToModule(event);

      if (result.success) {
        await this.eventRepo.updateStatus(eventId, SyncEventStatus.APPLIED);
        this.logger.log(`Event ${eventId} successfully applied`);
      } else if (result.conflict) {
        await this.eventRepo.updateStatus(eventId, SyncEventStatus.CONFLICTED, result.error);
        this.logger.warn(`Event ${eventId} conflicted: ${result.error}`);
      } else {
        await this.eventRepo.updateStatus(eventId, SyncEventStatus.FAILED, result.error);
        this.logger.error(`Event ${eventId} failed: ${result.error}`);
      }

      return result;
    } catch (error) {
      await this.eventRepo.updateStatus(eventId, SyncEventStatus.FAILED, String(error));
      throw error;
    }
  }

  private async mockDispatchToModule(event: any): Promise<{ success: boolean; conflict?: boolean; error?: string }> {
    // Mock implementation - in production would call M7/M6 services
    return { success: true };
  }

  async replayEvent(eventId: string, userId: string) {
    const event = await this.eventRepo.findById(eventId);
    if (!event) {
      throw new MobileSyncError(IntegrationErrorCodes.EVENT_NOT_FOUND, `Event ${eventId} not found`);
    }

    const replayableStatuses = [SyncEventStatus.FAILED, SyncEventStatus.CONFLICTED];
    if (!replayableStatuses.includes(event.processStatus as SyncEventStatus)) {
      throw new MobileSyncError(
        IntegrationErrorCodes.INVALID_EVENT_TYPE,
        `Cannot replay event in status ${event.processStatus}`,
      );
    }

    // Reset status to RECEIVED and re-dispatch
    await this.eventRepo.updateStatus(eventId, SyncEventStatus.RECEIVED, undefined);
    
    this.logger.log(`Event ${eventId} replay initiated by ${userId}`);
    return this.dispatchEvent(eventId);
  }

  async processBatch(batchId: string) {
    const batch = await this.batchRepo.findById(batchId);
    if (!batch) {
      throw new MobileSyncError(IntegrationErrorCodes.BATCH_NOT_FOUND, `Batch ${batchId} not found`);
    }

    await this.batchRepo.update(batchId, { status: SyncBatchStatus.PROCESSING });

    const events = await this.eventRepo.findByBatchId(batchId);
    let acceptedCount = 0;
    let conflictCount = 0;
    let rejectedCount = 0;

    for (const event of events) {
      if (event.processStatus === SyncEventStatus.DUPLICATE) continue;

      try {
        const result = await this.dispatchEvent(event.id);
        if (result.success) acceptedCount++;
        else if (result.conflict) conflictCount++;
        else rejectedCount++;
      } catch (error) {
        rejectedCount++;
      }
    }

    // Determine final batch status
    let finalStatus: SyncBatchStatus;
    if (rejectedCount === 0 && conflictCount === 0) {
      finalStatus = SyncBatchStatus.SUCCESS;
    } else if (acceptedCount > 0) {
      finalStatus = SyncBatchStatus.PARTIAL_SUCCESS;
    } else if (conflictCount > 0) {
      finalStatus = SyncBatchStatus.CONFLICTED;
    } else {
      finalStatus = SyncBatchStatus.FAILED;
    }

    await this.batchRepo.update(batchId, {
      status: finalStatus,
      acceptedCount,
      conflictCount,
      rejectedCount,
      processedAt: new Date(),
    });

    this.logger.log(`Batch ${batchId} processed: ${finalStatus}`);
    return { batchId, status: finalStatus, acceptedCount, conflictCount, rejectedCount };
  }
}
