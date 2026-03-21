import { IsString, IsEnum, IsNumber, IsOptional, IsBoolean, IsUUID, IsDateString, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { WeighingType, ReferenceType, LogMode, WeighDirection } from '../../domain/integration.enums';

export class CreateWeighEventDto {
  @IsString()
  weighbridgeEventId!: string;

  @IsOptional()
  @IsString()
  scaleDeviceId?: string;

  @IsString()
  vehicleNumber!: string;

  @IsEnum(WeighingType)
  weighingType!: WeighingType;

  @IsNumber()
  weighingSequence!: number;

  @IsOptional()
  @IsNumber()
  grossWeightKg?: number;

  @IsOptional()
  @IsNumber()
  tareWeightKg?: number;

  @IsOptional()
  @IsNumber()
  netWeightKg?: number;

  @IsOptional()
  @IsObject()
  rawPayload?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isManualEntry?: boolean;

  @IsOptional()
  @IsString()
  manualReasonCode?: string;

  @IsOptional()
  @IsUUID()
  approvedBy?: string;

  @IsOptional()
  @IsEnum(ReferenceType)
  referenceType?: ReferenceType;

  @IsOptional()
  @IsUUID()
  referenceId?: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsString()
  itemCode?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsUUID()
  correlationId!: string;

  @IsString()
  sourceChannel!: string;

  @IsDateString()
  eventTime!: string;

  @IsOptional()
  @IsEnum(LogMode)
  logMode?: LogMode;

  @IsOptional()
  @IsString()
  scaleTicketId?: string;

  @IsOptional()
  @IsEnum(WeighDirection)
  direction?: WeighDirection;

  @IsOptional()
  @IsString()
  documentNumber?: string;

  @IsOptional()
  @IsUUID()
  receiptLineId?: string;

  @IsOptional()
  @IsUUID()
  shipmentLineId?: string;

  @IsOptional()
  @IsUUID()
  previousLogId?: string;
}

export class HeartbeatDto {
  @IsString()
  deviceCode!: string;

  @IsOptional()
  @IsString()
  agentVersion?: string;

  @IsOptional()
  @IsString()
  portName?: string;

  @IsOptional()
  @IsDateString()
  lastWeightReadAt?: string;

  @IsOptional()
  @IsNumber()
  bufferPendingCount?: number;

  @IsOptional()
  @IsString()
  healthStatus?: string;
}

export class UpdateWeighLogDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RecordWeightDto {
  @IsNumber()
  weightKg!: number;
}

export class ReprocessWeighEventDto {
  @IsOptional()
  @IsString()
  reasonCode?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
