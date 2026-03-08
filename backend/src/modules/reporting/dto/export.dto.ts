import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';
import { ExportFormat } from '../domain/reporting.enums';

export class CreateExportJobDto {
  @IsNotEmpty()
  @IsString()
  reportId!: string;

  @IsNotEmpty()
  @IsEnum(ExportFormat)
  exportFormat!: ExportFormat;

  @IsNotEmpty()
  @IsObject()
  filters!: Record<string, unknown>;
}

export class ExportJobQueryDto {
  @IsOptional()
  @IsString()
  reportId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  pageSize?: number = 20;
}

export interface ExportJobResponseDto {
  exportJobId: string;
  reportId: string;
  exportFormat: string;
  jobStatus: string;
  rowCount?: number;
  fileSizeBytes?: number;
  expiresAt?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExportJobDetailResponseDto extends ExportJobResponseDto {
  filterPayload: Record<string, unknown>;
  events: {
    eventType: string;
    createdAt: string;
    eventPayload?: Record<string, unknown>;
  }[];
}

export interface DownloadExportResponseDto {
  downloadUrl: string;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  checksumSha256?: string;
}
