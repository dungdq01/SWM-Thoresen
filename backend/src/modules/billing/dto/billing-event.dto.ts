import { IsString, IsUUID, IsDateString, IsNumber, IsOptional, IsBoolean, IsEnum, Min } from 'class-validator';
import { BilEventType, BilDayType, BilEventBillingStatus } from '../domain/billing.enums';
import { CargoForm } from '@prisma/client';

export class CaptureEventDto {
  @IsEnum(BilEventType)
  eventType!: BilEventType;

  @IsString()
  refType!: string;

  @IsString()
  refId!: string;

  @IsOptional()
  @IsString()
  refLineId?: string;

  @IsUUID()
  ownerId!: string;

  @IsUUID()
  warehouseId!: string;

  @IsOptional()
  @IsUUID()
  itemId?: string;

  @IsOptional()
  @IsEnum(CargoForm)
  cargoForm?: CargoForm;

  @IsNumber()
  @Min(0)
  billingQtyMt!: number;

  @IsDateString()
  eventDate!: string;

  @IsDateString()
  operationTimestamp!: string;

  @IsOptional()
  @IsEnum(BilDayType)
  dayType?: BilDayType;

  @IsOptional()
  @IsBoolean()
  isOvertime?: boolean;

  @IsString()
  sourceModule!: string;

  @IsOptional()
  sourcePayload?: Record<string, unknown>;

  @IsString()
  externalId!: string;

  @IsUUID()
  correlationId!: string;

  @IsOptional()
  @IsString()
  deviceOrSourceApp?: string;
}

export class QueryEventDto {
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsEnum(BilEventType)
  eventType?: BilEventType;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsEnum(BilEventBillingStatus)
  billingStatus?: BilEventBillingStatus;

  @IsOptional()
  @IsString()
  sourceModule?: string;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}
