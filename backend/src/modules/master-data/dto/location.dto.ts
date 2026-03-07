import { IsString, IsEnum, IsOptional, IsBoolean, IsNumber, IsUUID, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { LocationType, LocationStatus } from '@prisma/client';

export class CreateLocationDto {
  @IsUUID()
  warehouseId!: string;

  @IsUUID()
  zoneId!: string;

  @IsString()
  locationCode!: string;

  @IsEnum(LocationType)
  locationType!: LocationType;

  @IsString()
  locationProfile!: string;

  @IsOptional()
  @IsEnum(LocationStatus)
  status?: LocationStatus;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  areaM2?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxHeightM?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  stackLimitKg?: number;

  @IsOptional()
  @IsBoolean()
  isMixedOwner?: boolean;

  @IsOptional()
  @IsBoolean()
  isMixedProduct?: boolean;

  @IsOptional()
  @IsBoolean()
  isBillingLocation?: boolean;

  @IsOptional()
  @IsString()
  stackingRule?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  xCoord?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  yCoord?: number;
}

export class UpdateLocationDto {
  @IsOptional()
  @IsEnum(LocationType)
  locationType?: LocationType;

  @IsOptional()
  @IsString()
  locationProfile?: string;

  @IsOptional()
  @IsEnum(LocationStatus)
  status?: LocationStatus;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  areaM2?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxHeightM?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  stackLimitKg?: number;

  @IsOptional()
  @IsBoolean()
  isMixedOwner?: boolean;

  @IsOptional()
  @IsBoolean()
  isMixedProduct?: boolean;

  @IsOptional()
  @IsBoolean()
  isBillingLocation?: boolean;

  @IsOptional()
  @IsString()
  stackingRule?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  xCoord?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  yCoord?: number;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  rowVersion!: number;
}

export class ListLocationDto {
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
  @IsUUID()
  zoneId?: string;

  @IsOptional()
  @IsString()
  locationType?: string;
}
