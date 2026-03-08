import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { GoLiveGateStatus, GoLiveMilestone } from '../domain/reporting.enums';

export class GoLiveStatusQueryDto {
  @IsOptional()
  @IsString()
  snapshotNo?: string;

  @IsOptional()
  @IsEnum(GoLiveMilestone)
  milestone?: GoLiveMilestone;

  @IsOptional()
  includeHistory?: boolean;
}

export class RunGoLiveCheckDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  gateIds?: string[];

  @IsOptional()
  @IsString()
  snapshotNo?: string;
}

export class SignOffGateDto {
  @IsNotEmpty()
  @IsEnum(GoLiveGateStatus)
  status!: GoLiveGateStatus;

  @IsNotEmpty()
  @IsString()
  note!: string;

  @IsOptional()
  @IsString()
  evidenceRef?: string;

  @IsOptional()
  @IsString()
  waiverReason?: string;

  @IsOptional()
  @IsString()
  snapshotNo?: string;
}

export interface GoLiveGateResponseDto {
  gateId: string;
  gateName: string;
  gateType: string;
  ownerRole: string;
  reviewerRole: string;
  milestone: string;
  waiverAllowed: boolean;
  displayOrder: number;
  currentStatus?: {
    status: string;
    lastCheckType: string;
    effectiveAt: string;
    effectiveBy?: string;
    note?: string;
  };
}

export interface GoLiveStatusResponseDto {
  snapshotNo: string;
  milestone: string;
  overallStatus: string;
  gates: GoLiveGateResponseDto[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    waived: number;
    pending: number;
  };
  lastCheckedAt?: string;
}

export interface GoLiveHistoryResponseDto {
  gateCode: string;
  gateName: string;
  history: {
    actionStatus: string;
    note: string;
    evidenceRef?: string;
    waiverReason?: string;
    signedBy: string;
    signedAt: string;
  }[];
}
