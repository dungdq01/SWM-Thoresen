import { IsString, IsOptional, IsInt, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVesselDto {
  @IsString()
  vesselCode!: string;

  @IsString()
  vesselName!: string;

  @IsOptional()
  @IsString()
  imoNumber?: string;

  @IsString()
  vesselType!: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  callSign?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  dwtTon?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  loaM?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  beamM?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  draftM?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  yearBuilt?: number;

  @IsOptional()
  @IsString()
  owner?: string;

  @IsOptional()
  @IsString()
  operator?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  externalId?: string;
}

export class UpdateVesselDto {
  @IsOptional()
  @IsString()
  vesselName?: string;

  @IsOptional()
  @IsString()
  imoNumber?: string;

  @IsOptional()
  @IsString()
  vesselType?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  callSign?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  dwtTon?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  loaM?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  beamM?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  draftM?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  yearBuilt?: number;

  @IsOptional()
  @IsString()
  owner?: string;

  @IsOptional()
  @IsString()
  operator?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  rowVersion!: number;
}

export class ListVesselDto {
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
  vesselType?: string;
}
