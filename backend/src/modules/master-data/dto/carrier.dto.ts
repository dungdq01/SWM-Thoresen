import { IsString, IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CarrierGroup, TransportMode } from '@prisma/client';

export class CreateCarrierDto {
  @IsString()
  carrierCode!: string;

  @IsString()
  carrierName!: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEnum(CarrierGroup)
  carrierGroup!: CarrierGroup;

  @IsEnum(TransportMode)
  transportMode!: TransportMode;

  @IsOptional()
  @IsString()
  defaultVehicleTypeCode?: string;
}

export class UpdateCarrierDto {
  @IsOptional()
  @IsString()
  carrierName?: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(CarrierGroup)
  carrierGroup?: CarrierGroup;

  @IsOptional()
  @IsEnum(TransportMode)
  transportMode?: TransportMode;

  @IsOptional()
  @IsString()
  defaultVehicleTypeCode?: string;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  rowVersion!: number;
}

export class ListCarrierDto {
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
  carrierGroup?: string;

  @IsOptional()
  @IsString()
  transportMode?: string;
}
