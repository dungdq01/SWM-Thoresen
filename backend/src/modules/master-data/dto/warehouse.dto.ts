import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsUUID, IsBoolean, Min, Max } from 'class-validator';
import { WarehouseType } from '@prisma/client';
import { PaginationDto } from './common.dto';

export class CreateWarehouseDto {
  @IsString()
  @IsNotEmpty()
  warehouseCode!: string;

  @IsString()
  @IsNotEmpty()
  warehouseName!: string;

  @IsOptional()
  @IsString()
  siteId?: string;

  @IsEnum(WarehouseType)
  warehouseType!: WarehouseType;

  @IsNumber()
  @Min(0)
  totalAreaM2!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  usableAreaM2?: number;

  @IsNumber()
  @Min(0)
  maxHeightM!: number;

  @IsNumber()
  @Min(0)
  maxCapacityMt!: number;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsBoolean()
  hasWeighbridge?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weighbridgeCount?: number;

  @IsOptional()
  @IsBoolean()
  isBonded?: boolean;

  @IsNumber()
  @Min(0)
  @Max(100)
  capacityWarningPct!: number;

  @IsOptional()
  @IsString()
  externalId?: string;
}

export class UpdateWarehouseDto {
  @IsOptional()
  @IsString()
  warehouseName?: string;

  @IsOptional()
  @IsEnum(WarehouseType)
  warehouseType?: WarehouseType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAreaM2?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  usableAreaM2?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxHeightM?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxCapacityMt?: number;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsBoolean()
  hasWeighbridge?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weighbridgeCount?: number;

  @IsOptional()
  @IsBoolean()
  isBonded?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  capacityWarningPct?: number;

  @IsOptional()
  @IsUUID()
  defaultReceivingLocationId?: string;

  @IsOptional()
  @IsUUID()
  defaultStagingLocationId?: string;

  @IsOptional()
  @IsUUID()
  defaultShippingLocationId?: string;

  @IsNumber()
  rowVersion!: number;
}

export class ListWarehouseDto extends PaginationDto {
  @IsOptional()
  @IsEnum(WarehouseType)
  warehouseType?: WarehouseType;

  @IsOptional()
  @IsBoolean()
  hasWeighbridge?: boolean;
}
