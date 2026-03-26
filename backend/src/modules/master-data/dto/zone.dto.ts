import { IsString, IsEnum, IsOptional, IsBoolean, IsNumber, IsUUID, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ZoneType } from '@prisma/client';

export class CreateZoneDto {
  @IsUUID()
  warehouseId!: string;

  @IsString()
  zoneCode!: string;

  @IsString()
  zoneName!: string;

  @IsEnum(ZoneType)
  zoneType!: ZoneType;

  @IsOptional()
  @IsBoolean()
  isBillingZone?: boolean;

  @IsOptional()
  @IsString()
  billingRateZone?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxCapacityMt?: number;

  @IsOptional()
  @IsString()
  externalId?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  xCoord?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  yCoord?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  zoneWidthM?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  zoneDepthM?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  rotationDeg?: number;

  @IsOptional()
  @IsString()
  displayColor?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  sortOrder?: number;
}

export class UpdateZoneDto {
  @IsOptional()
  @IsString()
  zoneName?: string;

  @IsOptional()
  @IsEnum(ZoneType)
  zoneType?: ZoneType;

  @IsOptional()
  @IsBoolean()
  isBillingZone?: boolean;

  @IsOptional()
  @IsString()
  billingRateZone?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxCapacityMt?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  xCoord?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  yCoord?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  zoneWidthM?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  zoneDepthM?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  rotationDeg?: number;

  @IsOptional()
  @IsString()
  displayColor?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  sortOrder?: number;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  rowVersion!: number;
}

export class ListZoneDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  pageSize?: number = 20;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  zoneType?: string;
}
