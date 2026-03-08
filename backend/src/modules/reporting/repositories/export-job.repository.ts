import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { RptExportJobStatus, RptExportFormat } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

export interface CreateExportJobParams {
  reportId: string;
  reportCatalogId?: string;
  exportFormat: RptExportFormat;
  requestedBy: string;
  requestedRole: string;
  ownerScopeId?: string;
  warehouseScopeJson?: Record<string, unknown>;
  filterPayload: Record<string, unknown>;
  correlationId: string;
  idempotencyKey?: string;
}

@Injectable()
export class ExportJobRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByIdempotencyKey(idempotencyKey: string) {
    return this.prisma.rptExportJob.findFirst({
      where: { idempotencyKey },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(params: CreateExportJobParams) {
    const exportJobId = uuidv4();
    
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.rptExportJob.create({
        data: {
          exportJobId,
          reportId: params.reportId,
          reportCatalogId: params.reportCatalogId,
          exportFormat: params.exportFormat,
          requestedBy: params.requestedBy,
          requestedRole: params.requestedRole,
          ownerScopeId: params.ownerScopeId,
          warehouseScopeJson: params.warehouseScopeJson,
          filterPayload: params.filterPayload,
          jobStatus: RptExportJobStatus.QUEUED,
          correlationId: params.correlationId,
          idempotencyKey: params.idempotencyKey,
        },
      });

      await tx.rptExportJobEvent.create({
        data: {
          exportJobId: job.id,
          eventType: 'QUEUED',
          createdBy: params.requestedBy,
        },
      });

      return job;
    });
  }

  async findById(exportJobId: string) {
    return this.prisma.rptExportJob.findUnique({
      where: { exportJobId },
      include: {
        events: {
          orderBy: { createdAt: 'desc' },
        },
        reportCatalog: true,
      },
    });
  }

  async findByUser(userId: string, page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.rptExportJob.findMany({
        where: { requestedBy: userId },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: pageSize,
      }),
      this.prisma.rptExportJob.count({ where: { requestedBy: userId } }),
    ]);

    return { data, total };
  }

  async updateStatus(
    exportJobId: string,
    status: RptExportJobStatus,
    updates?: {
      rowCount?: number;
      fileUri?: string;
      fileSizeBytes?: bigint;
      checksumSha256?: string;
      expiresAt?: Date;
      failureReason?: string;
    },
    eventCreatedBy?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.rptExportJob.update({
        where: { exportJobId },
        data: {
          jobStatus: status,
          ...updates,
        },
      });

      await tx.rptExportJobEvent.create({
        data: {
          exportJobId: job.id,
          eventType: status,
          eventPayload: updates as any,
          createdBy: eventCreatedBy,
        },
      });

      return job;
    });
  }

  async findExpiredJobs() {
    return this.prisma.rptExportJob.findMany({
      where: {
        jobStatus: { in: [RptExportJobStatus.COMPLETED] },
        expiresAt: { lt: new Date() },
      },
    });
  }

  async markExpired(exportJobId: string) {
    return this.updateStatus(exportJobId, RptExportJobStatus.EXPIRED);
  }

  async logReportRun(
    reportId: string,
    runMode: 'SCREEN' | 'EXPORT' | 'API',
    requestedBy: string,
    filterPayload: Record<string, unknown>,
    durationMs?: number,
    rowCount?: number,
    cacheHit = false,
    status: 'SUCCESS' | 'FAILED' = 'SUCCESS',
    errorCode?: string,
  ) {
    return this.prisma.rptReportRunLog.create({
      data: {
        reportId,
        runMode,
        requestedBy,
        filterPayload,
        durationMs,
        rowCount,
        cacheHit,
        status,
        errorCode,
      },
    });
  }
}
