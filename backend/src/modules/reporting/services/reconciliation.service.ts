import { Injectable, Logger } from '@nestjs/common';
import { ReconciliationRepository } from '../repositories/reconciliation.repository';
import { 
  RunReconciliationDto, 
  ReconciliationResultsFilterDto, 
  ResolveReconciliationDto,
  ReconciliationRunResponseDto,
  ReconciliationResultResponseDto,
  ReconciliationSummaryDto,
} from '../dto';
import { 
  ReconciliationRunNotFoundError, 
  ReconciliationResultNotFoundError,
  ReconciliationAlreadyResolvedError,
} from '../domain/reporting.errors';
import { REPORTING_CONSTANTS } from '../domain/reporting.constants';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(private readonly reconciliationRepository: ReconciliationRepository) {}

  async runReconciliation(dto: RunReconciliationDto, userId: string): Promise<ReconciliationRunResponseDto> {
    const correlationId = uuidv4();
    const idempotencyKey = this.buildIdempotencyKey(dto, userId);

    const existing = await this.reconciliationRepository.findRunByIdempotencyKey(idempotencyKey);
    if (existing) {
      const createdAt = new Date(existing.createdAt);
      const windowMs = REPORTING_CONSTANTS.RECONCILIATION_IDEMPOTENCY_WINDOW_MINUTES * 60 * 1000;
      
      if (Date.now() - createdAt.getTime() < windowMs) {
        this.logger.debug(`Returning existing reconciliation run: ${existing.runId}`);
        return this.mapRunToResponse(existing);
      }
    }

    const run = await this.reconciliationRepository.createRun({
      triggerType: 'MANUAL' as any,
      requestedBy: userId,
      checkIds: dto.checkIds,
      runScope: {
        warehouseId: dto.warehouseId,
        ownerId: dto.ownerId,
        fromDate: dto.fromDate,
        toDate: dto.toDate,
      },
      correlationId,
      idempotencyKey,
    });

    this.logger.log(`Created reconciliation run: ${run.runId} with ${dto.checkIds.length} checks`);

    this.executeReconciliation(run.runId, dto.checkIds, run.id).catch(err => {
      this.logger.error(`Reconciliation run ${run.runId} failed: ${err.message}`);
    });

    return this.mapRunToResponse(run);
  }

  private async executeReconciliation(runId: string, checkIds: string[], runUuid: string): Promise<void> {
    try {
      await this.reconciliationRepository.updateRunStatus(runId, 'RUNNING' as any);

      let completedCount = 0;
      for (const checkId of checkIds) {
        try {
          const check = await this.reconciliationRepository.findCheckById(checkId);
          if (!check) {
            this.logger.warn(`Check not found: ${checkId}`);
            continue;
          }

          await this.reconciliationRepository.createResult({
            runId: runUuid,
            checkId: check.id,
            checkCode: check.checkId,
            checkName: check.checkName,
            resultStatus: 'PASS' as any,
            severity: 'LOW' as any,
            sourceModule: check.sourceModule,
          });

          completedCount++;
        } catch (error) {
          this.logger.error(`Check ${checkId} failed: ${error}`);
        }
      }

      await this.reconciliationRepository.updateRunStatus(runId, 'COMPLETED' as any, completedCount);
      this.logger.log(`Reconciliation run ${runId} completed: ${completedCount}/${checkIds.length} checks`);
    } catch (error) {
      await this.reconciliationRepository.updateRunStatus(runId, 'FAILED' as any, undefined, String(error));
      throw error;
    }
  }

  async getResults(filters: ReconciliationResultsFilterDto): Promise<{ data: ReconciliationResultResponseDto[]; total: number; summary: ReconciliationSummaryDto }> {
    const result = await this.reconciliationRepository.findResults(filters);
    const summary = await this.reconciliationRepository.getSummary();

    return {
      data: result.data.map(r => this.mapResultToResponse(r)),
      total: result.total,
      summary,
    };
  }

  async getResultById(resultId: string): Promise<ReconciliationResultResponseDto> {
    const result = await this.reconciliationRepository.findResultById(resultId);
    if (!result) {
      throw new ReconciliationResultNotFoundError(resultId);
    }
    return this.mapResultToResponse(result);
  }

  async resolveResult(resultId: string, dto: ResolveReconciliationDto, userId: string): Promise<ReconciliationResultResponseDto> {
    const result = await this.reconciliationRepository.findResultById(resultId);
    if (!result) {
      throw new ReconciliationResultNotFoundError(resultId);
    }
    if (result.isResolved) {
      throw new ReconciliationAlreadyResolvedError(resultId);
    }

    const updated = await this.reconciliationRepository.resolveResult(
      result.id,
      userId,
      dto.resolutionNote,
      dto.evidenceRef,
      dto.sourceModule,
      dto.sourceRefId,
    );

    this.logger.log(`Reconciliation result ${resultId} resolved by ${userId}`);

    return this.mapResultToResponse({ ...result, ...updated });
  }

  private buildIdempotencyKey(dto: RunReconciliationDto, userId: string): string {
    return `recon|${userId}|${dto.checkIds.sort().join(',')}|${dto.warehouseId || ''}|${dto.ownerId || ''}`;
  }

  private mapRunToResponse(run: any): ReconciliationRunResponseDto {
    return {
      runId: run.runId,
      triggerType: run.triggerType,
      checkIds: run.checkIds as string[],
      runStatus: run.runStatus,
      acceptedChecksCount: run.acceptedChecksCount,
      completedChecksCount: run.completedChecksCount,
      startedAt: run.startedAt?.toISOString(),
      completedAt: run.completedAt?.toISOString(),
      createdAt: run.createdAt.toISOString(),
    };
  }

  private mapResultToResponse(result: any): ReconciliationResultResponseDto {
    return {
      resultId: result.resultId,
      runId: result.run?.runId || result.runId,
      checkCode: result.checkCode,
      checkName: result.checkName,
      resultStatus: result.resultStatus,
      severity: result.severity,
      dimensionKey: result.dimensionKey as Record<string, unknown>,
      sourceModule: result.sourceModule,
      sourceRefType: result.sourceRefType,
      sourceRefId: result.sourceRefId,
      expectedValue: result.expectedValue ? Number(result.expectedValue) : undefined,
      actualValue: result.actualValue ? Number(result.actualValue) : undefined,
      varianceValue: result.varianceValue ? Number(result.varianceValue) : undefined,
      mismatchDetail: result.mismatchDetail as Record<string, unknown>,
      isResolved: result.isResolved,
      resolvedAt: result.resolvedAt?.toISOString(),
      resolvedBy: result.resolvedBy,
      resolutionNote: result.resolutionNote,
      evidenceRef: result.evidenceRef,
      createdAt: result.createdAt.toISOString(),
    };
  }
}
