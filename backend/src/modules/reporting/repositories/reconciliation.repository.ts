import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { ReconciliationResultsFilterDto } from '../dto';
import { 
  RptReconciliationRunStatus, 
  RptReconciliationTriggerType,
  RptReconciliationResultStatus,
  RptReconciliationSeverity,
  RptReconciliationResolutionAction,
  Prisma,
} from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

export interface CreateRunParams {
  triggerType: RptReconciliationTriggerType;
  requestedBy?: string;
  checkIds: string[];
  runScope: Record<string, unknown>;
  correlationId: string;
  idempotencyKey?: string;
}

export interface CreateResultParams {
  runId: string;
  checkId: string;
  checkCode: string;
  checkName: string;
  resultStatus: RptReconciliationResultStatus;
  severity: RptReconciliationSeverity;
  sourceModule: string;
  dimensionKey?: Record<string, unknown>;
  sourceRefType?: string;
  sourceRefId?: string;
  expectedValue?: number;
  actualValue?: number;
  varianceValue?: number;
  mismatchDetail?: Record<string, unknown>;
}

@Injectable()
export class ReconciliationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findRunByIdempotencyKey(idempotencyKey: string) {
    return this.prisma.rptReconciliationRun.findFirst({
      where: { idempotencyKey },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createRun(params: CreateRunParams) {
    const runId = uuidv4();
    return this.prisma.rptReconciliationRun.create({
      data: {
        runId,
        triggerType: params.triggerType,
        requestedBy: params.requestedBy,
        checkIds: params.checkIds,
        runScope: params.runScope as Prisma.InputJsonValue,
        runStatus: RptReconciliationRunStatus.QUEUED,
        acceptedChecksCount: params.checkIds.length,
        correlationId: params.correlationId,
        idempotencyKey: params.idempotencyKey,
      },
    });
  }

  async updateRunStatus(
    runId: string, 
    status: RptReconciliationRunStatus, 
    completedChecksCount?: number,
    failureReason?: string,
  ) {
    const updateData: Record<string, unknown> = { runStatus: status };
    
    if (status === RptReconciliationRunStatus.RUNNING) {
      updateData.startedAt = new Date();
    }
    if (status === RptReconciliationRunStatus.COMPLETED || status === RptReconciliationRunStatus.FAILED) {
      updateData.completedAt = new Date();
    }
    if (completedChecksCount !== undefined) {
      updateData.completedChecksCount = completedChecksCount;
    }
    if (failureReason) {
      updateData.failureReason = failureReason;
    }

    return this.prisma.rptReconciliationRun.update({
      where: { runId },
      data: updateData,
    });
  }

  async createResult(params: CreateResultParams) {
    const resultId = uuidv4();
    return this.prisma.rptReconciliationResult.create({
      data: {
        resultId,
        runId: params.runId,
        checkId: params.checkId,
        checkCode: params.checkCode,
        checkName: params.checkName,
        resultStatus: params.resultStatus,
        severity: params.severity,
        sourceModule: params.sourceModule,
        dimensionKey: params.dimensionKey as Prisma.InputJsonValue | undefined,
        sourceRefType: params.sourceRefType,
        sourceRefId: params.sourceRefId,
        expectedValue: params.expectedValue,
        actualValue: params.actualValue,
        varianceValue: params.varianceValue,
        mismatchDetail: params.mismatchDetail as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async findResults(filters: ReconciliationResultsFilterDto) {
    const offset = ((filters.page || 1) - 1) * (filters.pageSize || 50);
    const take = filters.pageSize || 50;

    const where: Record<string, unknown> = {};
    
    if (filters.checkId) {
      where.checkCode = filters.checkId;
    }
    if (filters.resultStatus) {
      where.resultStatus = filters.resultStatus;
    }
    if (filters.severity) {
      where.severity = filters.severity;
    }
    if (filters.isResolved !== undefined) {
      where.isResolved = filters.isResolved;
    }
    if (filters.fromDate || filters.toDate) {
      where.createdAt = {};
      if (filters.fromDate) {
        (where.createdAt as Record<string, unknown>).gte = new Date(filters.fromDate);
      }
      if (filters.toDate) {
        (where.createdAt as Record<string, unknown>).lte = new Date(filters.toDate);
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.rptReconciliationResult.findMany({
        where,
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
        skip: offset,
        take,
        include: {
          run: true,
          check: true,
        },
      }),
      this.prisma.rptReconciliationResult.count({ where }),
    ]);

    return { data, total };
  }

  async findResultById(resultId: string) {
    return this.prisma.rptReconciliationResult.findUnique({
      where: { resultId },
      include: {
        run: true,
        check: true,
        resolutions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async resolveResult(
    resultId: string,
    resolvedBy: string,
    resolutionNote: string,
    evidenceRef?: string,
    sourceModule?: string,
    sourceRefId?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.rptReconciliationResolution.create({
        data: {
          reconciliationResultId: resultId,
          actionType: RptReconciliationResolutionAction.RESOLVED,
          resolutionNote,
          evidenceRef,
          sourceModule,
          sourceRefId,
          createdBy: resolvedBy,
        },
      });

      return tx.rptReconciliationResult.update({
        where: { id: resultId },
        data: {
          isResolved: true,
          resolvedAt: new Date(),
          resolvedBy,
          resolutionNote,
          evidenceRef,
        },
      });
    });
  }

  // MD-6 Fix: Atomic resolve with check inside transaction
  async resolveResultAtomic(
    resultId: string,
    resolvedBy: string,
    resolutionNote: string,
    evidenceRef?: string,
    sourceModule?: string,
    sourceRefId?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Find and check in same transaction
      const result = await tx.rptReconciliationResult.findUnique({
        where: { resultId },
        include: { run: true, check: true },
      });

      if (!result) {
        throw new Error(`RECON_RESULT_NOT_FOUND: ${resultId}`);
      }

      if (result.isResolved) {
        throw new Error(`RECON_ALREADY_RESOLVED: ${resultId}`);
      }

      // Create resolution record
      await tx.rptReconciliationResolution.create({
        data: {
          reconciliationResultId: result.id,
          actionType: RptReconciliationResolutionAction.RESOLVED,
          resolutionNote,
          evidenceRef,
          sourceModule,
          sourceRefId,
          createdBy: resolvedBy,
        },
      });

      // Update result
      return tx.rptReconciliationResult.update({
        where: { id: result.id },
        data: {
          isResolved: true,
          resolvedAt: new Date(),
          resolvedBy,
          resolutionNote,
          evidenceRef,
        },
        include: { run: true, check: true },
      });
    });
  }

  async getSummary() {
    const [byStatus, bySeverity, unresolvedCount] = await Promise.all([
      this.prisma.rptReconciliationResult.groupBy({
        by: ['resultStatus'],
        _count: { _all: true },
      }),
      this.prisma.rptReconciliationResult.groupBy({
        by: ['severity'],
        _count: { _all: true },
      }),
      this.prisma.rptReconciliationResult.count({
        where: { isResolved: false },
      }),
    ]);

    return {
      totalResults: byStatus.reduce((sum, item) => sum + item._count._all, 0),
      byStatus: Object.fromEntries(byStatus.map(s => [s.resultStatus, s._count._all])),
      bySeverity: Object.fromEntries(bySeverity.map(s => [s.severity, s._count._all])),
      unresolvedCount,
    };
  }

  async findAllChecks() {
    return this.prisma.rptReconciliationCheck.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findCheckById(checkId: string) {
    return this.prisma.rptReconciliationCheck.findUnique({
      where: { checkId },
    });
  }
}
