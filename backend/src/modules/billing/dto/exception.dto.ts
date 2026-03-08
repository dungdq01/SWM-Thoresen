import { IsString, IsUUID, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { BilExceptionType, BilExceptionStatus, BilExceptionSeverity } from '../domain/billing.enums';

export class ResolveExceptionDto {
  @IsString()
  resolutionCode!: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsString()
  action?: 'RESOLVE' | 'IGNORE' | 'REQUEUE';
}

export class QueryExceptionDto {
  @IsOptional()
  @IsEnum(BilExceptionType)
  exceptionType?: BilExceptionType;

  @IsOptional()
  @IsEnum(BilExceptionSeverity)
  severity?: BilExceptionSeverity;

  @IsOptional()
  @IsEnum(BilExceptionStatus)
  status?: BilExceptionStatus;

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsUUID()
  debitNoteId?: string;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}
