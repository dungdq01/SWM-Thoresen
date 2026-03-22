import { IsString, IsEnum, IsOptional, IsNumber, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { VehicleCategory } from '@prisma/client';

export class CreateVehicleTypeDto {
  @IsString()
  vehicleTypeCode!: string;

  @IsString()
  vehicleTypeName!: string;

  @IsEnum(VehicleCategory)
  category!: VehicleCategory;

  @IsNumber()
  @Type(() => Number)
  defaultTareWeightKg!: number;

  @IsNumber()
  @Type(() => Number)
  maxPayloadKg!: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxVolumeM3?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lengthM?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  widthM?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  heightM?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  teuEquivalent?: number;

  @IsOptional()
  @IsString()
  handlingFeeGroup?: string;

  @IsOptional()
  @IsString()
  externalId?: string;
}

export class UpdateVehicleTypeDto {
  @IsOptional()
  @IsString()
  vehicleTypeName?: string;

  @IsOptional()
  @IsEnum(VehicleCategory)
  category?: VehicleCategory;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  defaultTareWeightKg?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxPayloadKg?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxVolumeM3?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lengthM?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  widthM?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  heightM?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  teuEquivalent?: number;

  @IsOptional()
  @IsString()
  handlingFeeGroup?: string;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  rowVersion!: number;
}

export class ListVehicleTypeDto {
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
  @IsString()
  category?: string;
}
