import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ReconciliationResultStatus, ReconciliationSeverity } from '../domain/reporting.enums';

export class RunReconciliationDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  checkIds!: string[];

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;
}

export class ReconciliationResultsFilterDto {
  @IsOptional()
  @IsString()
  checkId?: string;

  @IsOptional()
  @IsEnum(ReconciliationResultStatus)
  resultStatus?: ReconciliationResultStatus;

  @IsOptional()
  @IsEnum(ReconciliationSeverity)
  severity?: ReconciliationSeverity;

  @IsOptional()
  isResolved?: boolean;

  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  pageSize?: number = 50;
}

export class ResolveReconciliationDto {
  @IsNotEmpty()
  @IsString()
  resolutionNote!: string;

  @IsOptional()
  @IsString()
  evidenceRef?: string;

  @IsOptional()
  @IsString()
  sourceModule?: string;

  @IsOptional()
  @IsString()
  sourceRefId?: string;
}

export interface ReconciliationRunResponseDto {
  runId: string;
  triggerType: string;
  checkIds: string[];
  runStatus: string;
  acceptedChecksCount: number;
  completedChecksCount: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface ReconciliationResultResponseDto {
  resultId: string;
  runId: string;
  checkCode: string;
  checkName: string;
  resultStatus: string;
  severity: string;
  dimensionKey?: Record<string, unknown>;
  sourceModule: string;
  sourceRefType?: string;
  sourceRefId?: string;
  expectedValue?: number;
  actualValue?: number;
  varianceValue?: number;
  mismatchDetail?: Record<string, unknown>;
  isResolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNote?: string;
  evidenceRef?: string;
  createdAt: string;
}

export interface ReconciliationSummaryDto {
  totalResults: number;
  byStatus: Record<string, number>;
  bySeverity: Record<string, number>;
  unresolvedCount: number;
}
