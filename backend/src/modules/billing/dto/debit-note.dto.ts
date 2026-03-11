import { IsString, IsUUID, IsDateString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { BilDebitNoteStatus } from '../domain/billing.enums';

export class GenerateDebitNoteDto {
  @IsUUID()
  ownerId!: string;

  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsString()
  externalId!: string;
}

export class ReviewDebitNoteDto {
  @IsOptional()
  @IsString()
  remarks?: string;

  @IsString()
  externalId!: string;
}

export class ApproveDebitNoteDto {
  @IsOptional()
  @IsString()
  remarks?: string;

  @IsString()
  externalId!: string;
}

export class LockDebitNoteDto {
  @IsOptional()
  @IsString()
  remarks?: string;

  @IsString()
  externalId!: string;
}

export class RegenerateDebitNoteDto {
  @IsOptional()
  @IsString()
  reasonCode?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsString()
  externalId!: string;
}

export class QueryDebitNoteDto {
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsEnum(BilDebitNoteStatus)
  status?: BilDebitNoteStatus;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsString()
  dnNumber?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}

export class ExportDebitNoteDto {
  @IsOptional()
  @IsString()
  format?: 'PDF' | 'EXCEL';
}
