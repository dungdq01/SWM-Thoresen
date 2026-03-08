import { Injectable, Logger } from '@nestjs/common';
import { ErpPushLogRepository } from '../repositories/erp-push-log.repository';
import { ErpPushStatus, AlertCode } from '../domain/integration.enums';
import { ErpPushError, IntegrationErrorCodes } from '../domain/integration.errors';
import { AlertService } from './alert.service';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

export interface EnqueuePushJobParams {
  pushType: string;
  referenceId: string;
  payload: Record<string, unknown>;
  correlationId: string;
  endpointName?: string;
}

@Injectable()
export class ErpPushService {
  private readonly logger = new Logger(ErpPushService.name);
  private readonly retryDelays = [1000, 2000, 4000, 8000, 16000, 32000, 60000, 60000, 60000, 60000];

  constructor(
    private readonly pushLogRepo: ErpPushLogRepository,
    private readonly alertService: AlertService,
  ) {}

  async enqueuePushJob(params: EnqueuePushJobParams) {
    // Check idempotency
    const existing = await this.pushLogRepo.findByReference(params.pushType, params.referenceId);
    if (existing) {
      this.logger.log(`Duplicate push job: ${params.pushType}/${params.referenceId}`);
      return {
        id: existing.id,
        pushJobId: existing.pushJobId,
        isDuplicate: true,
        status: existing.status,
        message: 'Duplicate job - returning existing record',
      };
    }

    const pushJobId = `ERP-${params.pushType}-${Date.now()}-${uuidv4().slice(0, 8)}`;
    const externalId = uuidv4();
    const payloadHash = crypto.createHash('sha256').update(JSON.stringify(params.payload)).digest('hex');

    const job = await this.pushLogRepo.create({
      pushJobId,
      pushType: params.pushType,
      referenceId: params.referenceId,
      payload: params.payload,
      payloadHash,
      status: ErpPushStatus.PENDING,
      attemptCount: 0,
      maxAttempts: 10,
      externalId,
      correlationId: params.correlationId,
      sourceChannel: 'ERP_PUSH',
      endpointName: params.endpointName,
    });

    this.logger.log(`ERP push job enqueued: ${pushJobId}`);
    return {
      id: job.id,
      pushJobId,
      isDuplicate: false,
      status: ErpPushStatus.PENDING,
      message: 'Job enqueued for processing',
    };
  }

  async getJobs(params: {
    pushType?: string;
    status?: string;
    referenceId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const result = await this.pushLogRepo.findMany({
      pushType: params.pushType,
      status: params.status,
      referenceId: params.referenceId,
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

  async getJobById(id: string) {
    const job = await this.pushLogRepo.findById(id);
    if (!job) {
      throw new ErpPushError(IntegrationErrorCodes.PUSH_JOB_NOT_FOUND, `Push job ${id} not found`);
    }
    return job;
  }

  async retryJob(id: string, userId: string) {
    const job = await this.getJobById(id);
    
    const retryableStatuses = [ErpPushStatus.ACK_FAILED, ErpPushStatus.DEAD_LETTER];
    if (!retryableStatuses.includes(job.status as ErpPushStatus)) {
      throw new ErpPushError(
        IntegrationErrorCodes.INVALID_PUSH_STATUS,
        `Cannot retry job in status ${job.status}`,
      );
    }

    await this.pushLogRepo.update(id, {
      status: ErpPushStatus.RETRY_SCHEDULED,
      nextRetryAt: new Date(),
    });

    this.logger.log(`ERP push job ${id} retry scheduled by ${userId}`);
    return { success: true, jobId: id, message: 'Retry scheduled' };
  }

  async cancelJob(id: string, userId: string, reason: string) {
    const job = await this.getJobById(id);
    
    if (job.status === ErpPushStatus.ACK_SUCCESS) {
      throw new ErpPushError(
        IntegrationErrorCodes.INVALID_PUSH_STATUS,
        'Cannot cancel successful job',
      );
    }

    await this.pushLogRepo.update(id, {
      status: ErpPushStatus.CANCELLED,
      errorMessage: `Cancelled by ${userId}: ${reason}`,
    });

    this.logger.log(`ERP push job ${id} cancelled by ${userId}: ${reason}`);
    return { success: true, jobId: id, message: 'Job cancelled' };
  }

  async processJob(id: string) {
    const job = await this.getJobById(id);
    
    if (job.status === ErpPushStatus.ACK_SUCCESS || job.status === ErpPushStatus.CANCELLED) {
      return { success: false, message: `Job already in terminal state: ${job.status}` };
    }

    try {
      // Mock ERP call - in production would use ErpPayloadMapperService
      const response = await this.mockErpCall(job);

      if (response.success) {
        await this.pushLogRepo.updateStatus(id, ErpPushStatus.ACK_SUCCESS, {
          responseCode: response.code,
          responseBody: response.body,
        });
        this.logger.log(`ERP push job ${id} succeeded`);
        return { success: true };
      } else {
        return this.handleFailedPush(id, job, response);
      }
    } catch (error) {
      return this.handleFailedPush(id, job, { success: false, code: 500, error: String(error) });
    }
  }

  private async handleFailedPush(id: string, job: any, response: any) {
    const newAttemptCount = job.attemptCount + 1;
    
    if (newAttemptCount >= job.maxAttempts) {
      // Move to dead letter
      await this.pushLogRepo.updateStatus(id, ErpPushStatus.DEAD_LETTER, {
        responseCode: response.code,
        errorMessage: response.error || 'Max retries exceeded',
      });

      // Raise alert
      await this.alertService.raiseAlert({
        alertCode: AlertCode.ERP_PUSH_DEAD_LETTER,
        alertSource: 'ERP_PUSH',
        severity: 'CRITICAL',
        sourceRefType: 'ERP_PUSH_JOB',
        sourceRefId: job.pushJobId,
        title: `ERP push job ${job.pushJobId} moved to dead letter`,
        description: `Max retries (${job.maxAttempts}) exceeded for ${job.pushType}/${job.referenceId}`,
      });

      this.logger.error(`ERP push job ${id} moved to dead letter`);
      return { success: false, deadLetter: true };
    }

    // Schedule retry
    const delay = this.retryDelays[Math.min(newAttemptCount - 1, this.retryDelays.length - 1)];
    const nextRetryAt = new Date(Date.now() + delay);

    await this.pushLogRepo.updateStatus(id, ErpPushStatus.RETRY_SCHEDULED, {
      responseCode: response.code,
      errorMessage: response.error,
      nextRetryAt,
    });

    this.logger.warn(`ERP push job ${id} scheduled for retry at ${nextRetryAt}`);
    return { success: false, retryScheduled: true, nextRetryAt };
  }

  private async mockErpCall(job: any): Promise<{ success: boolean; code: number; body?: any; error?: string }> {
    // Mock implementation - always succeeds for demo
    return { success: true, code: 200, body: { status: 'OK', referenceId: job.referenceId } };
  }
}
