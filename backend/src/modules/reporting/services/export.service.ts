import { Injectable, Logger } from '@nestjs/common';
import { ExportJobRepository } from '../repositories/export-job.repository';
import { 
  CreateExportJobDto, 
  ExportJobQueryDto,
  ExportJobResponseDto,
  ExportJobDetailResponseDto,
  DownloadExportResponseDto,
} from '../dto';
import { 
  ExportJobNotFoundError, 
  ExportJobExpiredError,
  ExportRowLimitExceededError,
} from '../domain/reporting.errors';
import { REPORTING_CONSTANTS } from '../domain/reporting.constants';
import { ExportFormat, ExportJobStatus } from '../domain/reporting.enums';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(private readonly exportJobRepository: ExportJobRepository) {}

  async createExportJob(dto: CreateExportJobDto, userId: string, userRole: string): Promise<ExportJobResponseDto> {
    const correlationId = uuidv4();
    const idempotencyKey = this.buildIdempotencyKey(dto, userId);

    const existing = await this.exportJobRepository.findByIdempotencyKey(idempotencyKey);
    if (existing) {
      const createdAt = new Date(existing.createdAt);
      const windowMs = REPORTING_CONSTANTS.EXPORT_IDEMPOTENCY_WINDOW_MINUTES * 60 * 1000;
      
      if (Date.now() - createdAt.getTime() < windowMs) {
        this.logger.debug(`Returning existing export job: ${existing.exportJobId}`);
        return this.mapJobToResponse(existing);
      }
    }

    const maxRows = dto.exportFormat === ExportFormat.PDF 
      ? REPORTING_CONSTANTS.EXPORT_PDF_MAX_ROWS 
      : REPORTING_CONSTANTS.EXPORT_CSV_MAX_ROWS;

    const job = await this.exportJobRepository.create({
      reportId: dto.reportId,
      exportFormat: dto.exportFormat as any,
      requestedBy: userId,
      requestedRole: userRole,
      filterPayload: dto.filters,
      correlationId,
      idempotencyKey,
    });

    this.logger.log(`Created export job: ${job.exportJobId} for report ${dto.reportId}`);

    this.processExportJob(job.exportJobId).catch(err => {
      this.logger.error(`Export job ${job.exportJobId} failed: ${err.message}`);
    });

    return this.mapJobToResponse(job);
  }

  private async processExportJob(exportJobId: string): Promise<void> {
    try {
      await this.exportJobRepository.updateStatus(exportJobId, 'RUNNING' as any);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const fileUri = `/exports/${exportJobId}.csv`;
      const expiresAt = new Date(Date.now() + REPORTING_CONSTANTS.EXPORT_FILE_EXPIRY_HOURS * 60 * 60 * 1000);

      await this.exportJobRepository.updateStatus(exportJobId, 'COMPLETED' as any, {
        rowCount: 100,
        fileUri,
        fileSizeBytes: BigInt(1024),
        checksumSha256: 'placeholder-checksum',
        expiresAt,
      });

      this.logger.log(`Export job ${exportJobId} completed`);
    } catch (error) {
      await this.exportJobRepository.updateStatus(exportJobId, 'FAILED' as any, {
        failureReason: String(error),
      });
      throw error;
    }
  }

  async getJobStatus(exportJobId: string): Promise<ExportJobDetailResponseDto> {
    const job = await this.exportJobRepository.findById(exportJobId);
    if (!job) {
      throw new ExportJobNotFoundError(exportJobId);
    }

    return {
      ...this.mapJobToResponse(job),
      filterPayload: job.filterPayload as Record<string, unknown>,
      events: job.events.map(e => ({
        eventType: e.eventType,
        createdAt: e.createdAt.toISOString(),
        eventPayload: e.eventPayload as Record<string, unknown> | undefined,
      })),
    };
  }

  async downloadExport(exportJobId: string, userId: string): Promise<DownloadExportResponseDto> {
    const job = await this.exportJobRepository.findById(exportJobId);
    if (!job) {
      throw new ExportJobNotFoundError(exportJobId);
    }

    if (job.jobStatus !== 'COMPLETED') {
      throw new ExportJobNotFoundError(exportJobId);
    }

    if (job.expiresAt && job.expiresAt < new Date()) {
      throw new ExportJobExpiredError(exportJobId);
    }

    const contentType = job.exportFormat === 'CSV' ? 'text/csv' : 'application/pdf';
    const extension = job.exportFormat === 'CSV' ? 'csv' : 'pdf';

    return {
      downloadUrl: job.fileUri || '',
      fileName: `${job.reportId}_${exportJobId}.${extension}`,
      contentType,
      fileSizeBytes: Number(job.fileSizeBytes || 0),
      checksumSha256: job.checksumSha256 || undefined,
    };
  }

  async getUserExports(userId: string, query: ExportJobQueryDto): Promise<{ data: ExportJobResponseDto[]; total: number }> {
    const result = await this.exportJobRepository.findByUser(userId, query.page, query.pageSize);

    return {
      data: result.data.map(j => this.mapJobToResponse(j)),
      total: result.total,
    };
  }

  private buildIdempotencyKey(dto: CreateExportJobDto, userId: string): string {
    const filterHash = JSON.stringify(dto.filters);
    return `export|${userId}|${dto.reportId}|${dto.exportFormat}|${filterHash.slice(0, 50)}`;
  }

  private mapJobToResponse(job: any): ExportJobResponseDto {
    return {
      exportJobId: job.exportJobId,
      reportId: job.reportId,
      exportFormat: job.exportFormat,
      jobStatus: job.jobStatus,
      rowCount: job.rowCount || undefined,
      fileSizeBytes: job.fileSizeBytes ? Number(job.fileSizeBytes) : undefined,
      expiresAt: job.expiresAt?.toISOString(),
      failureReason: job.failureReason || undefined,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    };
  }
}
