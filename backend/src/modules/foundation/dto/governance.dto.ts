import { Transform } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class ListRulesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  domain?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;
}

export class CreateBusinessRuleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  ruleCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  domain!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsIn(['CONFIRMED', 'TO_CONFIRM', 'PHASE_2'])
  currentStatus!: 'CONFIRMED' | 'TO_CONFIRM' | 'PHASE_2';

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  sourceOfTruth!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  brdReference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  supersedes?: string;

  @IsIn(['GO_LIVE', 'PHASE_2'])
  effectivePhase!: 'GO_LIVE' | 'PHASE_2';

  @IsOptional()
  @IsString()
  @MaxLength(50)
  ownerRole?: string;
}

export class UpdateBusinessRuleDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['CONFIRMED', 'TO_CONFIRM', 'PHASE_2'])
  currentStatus?: 'CONFIRMED' | 'TO_CONFIRM' | 'PHASE_2';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  sourceOfTruth?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  brdReference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  supersedes?: string;

  @IsOptional()
  @IsIn(['GO_LIVE', 'PHASE_2'])
  effectivePhase?: 'GO_LIVE' | 'PHASE_2';

  @IsOptional()
  @IsString()
  @MaxLength(50)
  ownerRole?: string;
}

export class ListDecisionLogsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  contextDomain?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;
}

export class CreateDecisionLogDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  decisionNo!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  decisionType!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  contextDomain!: string;

  @IsString()
  @IsNotEmpty()
  summary!: string;

  @IsString()
  @IsNotEmpty()
  decidedValue!: string;

  @IsOptional()
  @IsString()
  rationale?: string;

  @IsIn(['DRAFT', 'CONFIRMED', 'SUPERSEDED'])
  status!: 'DRAFT' | 'CONFIRMED' | 'SUPERSEDED';

  @IsOptional()
  @IsArray()
  sourceRefs?: string[];

  @IsOptional()
  @IsArray()
  impactedModules?: string[];
}

export class CreateChangeControlDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  changeNo!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  changeType!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  priority!: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @IsOptional()
  @IsString()
  impactSummary?: string;

  @IsOptional()
  @IsArray()
  impactedModules?: string[];

  @IsIn(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'IMPLEMENTED'])
  status!: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'IMPLEMENTED';

  @IsOptional()
  @IsString()
  @MaxLength(30)
  targetRelease?: string;
}
