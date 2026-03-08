import { IsString, IsOptional, IsEnum, IsUUID, IsDateString, IsBoolean, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { WeighingType, ReferenceType } from '../../domain/integration.enums';

export class WeighLogQueryDto {
  @IsOptional()
  @IsString()
  scaleDeviceId?: string;

  @IsOptional()
  @IsString()
  vehicleNumber?: string;

  @IsOptional()
  @IsEnum(ReferenceType)
  referenceType?: ReferenceType;

  @IsOptional()
  @IsUUID()
  referenceId?: string;

  @IsOptional()
  @IsEnum(WeighingType)
  weighingType?: WeighingType;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isManualEntry?: boolean;

  @IsOptional()
  @IsString()
  sourceChannel?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;
}

export interface WeighLogResponseDto {
  id: string;
  weighbridgeEventId: string;
  vehicleNumber: string;
  weighingType: string;
  weighingSequence: number;
  grossWeightKg: number | null;
  tareWeightKg: number | null;
  netWeightKg: number | null;
  isStableWeight: boolean;
  isDuplicateSignal: boolean;
  isManualEntry: boolean;
  manualReasonCode: string | null;
  scaleDeviceId: string;
  sourceChannel: string;
  weighingTimestamp: Date;
  createdAt: Date;
  processingStatus?: string;
  callbackStatus?: string;
}

export interface WeighLogDetailResponseDto extends WeighLogResponseDto {
  rawPayload: Record<string, unknown> | null;
  rawWeightValue: string | null;
  duplicateOfEventId: string | null;
  approvedBy: string | null;
  photoAlprPath: string | null;
  photoCargoPath: string | null;
  latencyMs: number | null;
  externalId: string;
  correlationId: string;
  createdBy: string;
  receiptId: string | null;
  shipmentId: string | null;
  eventState: {
    processingStatus: string;
    linkedModule: string | null;
    linkedObjectId: string | null;
    callbackStatus: string | null;
    callbackError: string | null;
    retryCount: number;
    lastRetryAt: Date | null;
  } | null;
}

export interface DeviceResponseDto {
  id: string;
  deviceCode: string;
  deviceName: string;
  warehouseId: string | null;
  portName: string | null;
  heartbeatIntervalSec: number;
  isActive: boolean;
  lastSeenAt: Date | null;
  lastStatus: string | null;
  createdAt: Date;
  updatedAt: Date;
}
