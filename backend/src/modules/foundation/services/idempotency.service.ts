import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { IdempotencyStatus } from '@prisma/client';
import { createHash } from 'crypto';
import { LogRepository } from '../repositories/log.repository';

@Injectable()
export class IdempotencyService {
  constructor(private readonly logRepository: LogRepository) {}

  async executeIfKeyProvided<T>(params: {
    idempotencyKey?: string;
    commandName: string;
    sourceModule: string;
    payload: unknown;
    correlationId?: string;
    execute: () => Promise<T>;
    mapSuccess: (result: T) => {
      responseCode?: number;
      responseBody?: unknown;
      resourceType?: string;
      resourceId?: string;
    };
  }): Promise<T> {
    const trimmedKey = params.idempotencyKey?.trim();
    if (!trimmedKey) {
      return params.execute();
    }

    const requestHash = this.hashPayload(params.payload);
    const existing = await this.logRepository.getIdempotencyByKey(trimmedKey);

    if (existing) {
      if (existing.requestHash && existing.requestHash !== requestHash) {
        await this.logRepository.createExceptionLog({
          exceptionNo: `EX-${Date.now()}`,
          exceptionType: 'IDEMPOTENCY_CONFLICT',
          severity: 'HIGH',
          sourceModule: params.sourceModule,
          action: params.commandName,
          message: 'same key + different payload',
          correlationId: params.correlationId,
        });
        throw new ConflictException(
          'Idempotency-Key đã được dùng với payload khác. Vui lòng tạo key mới.',
        );
      }

      if (existing.status === IdempotencyStatus.PROCESSING) {
        throw new ConflictException(
          'Yêu cầu với Idempotency-Key này đang được xử lý. Vui lòng thử lại sau.',
        );
      }

      if (existing.status === IdempotencyStatus.SUCCEEDED) {
        return existing.responseBody as T;
      }
    }

    await this.logRepository.createIdempotencyRecord({
      idempotencyKey: trimmedKey,
      commandName: params.commandName,
      sourceModule: params.sourceModule,
      requestHash,
      requestPayload: params.payload as never,
      correlationId: params.correlationId,
      lockedUntil: new Date(Date.now() + 60_000),
      expiredAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    try {
      const result = await params.execute();
      const mapped = params.mapSuccess(result);
      await this.logRepository.updateIdempotencyRecord(trimmedKey, {
        responseCode: mapped.responseCode ?? 200,
        responseBody: (mapped.responseBody ?? result) as never,
        resourceType: mapped.resourceType,
        resourceId: mapped.resourceId,
        status: IdempotencyStatus.SUCCEEDED,
        lockedUntil: null,
      });
      return result;
    } catch (error) {
      await this.logRepository.updateIdempotencyRecord(trimmedKey, {
        status: IdempotencyStatus.FAILED,
        lockedUntil: null,
      });

      if (error instanceof Error) {
        throw error;
      }

      throw new InternalServerErrorException('Không thể xử lý yêu cầu idempotent.');
    }
  }

  getByKey(idempotencyKey: string) {
    return this.logRepository.getIdempotencyByKey(idempotencyKey);
  }

  private hashPayload(payload: unknown): string {
    const serialized = JSON.stringify(payload ?? {});
    return createHash('sha256').update(serialized).digest('hex');
  }
}
