import { IsString, IsEnum, IsOptional, IsNumber, IsUUID, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { RackType } from '@prisma/client';

export class CreateRackDto {
  @IsUUID()
  warehouseId!: string;

  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsString()
  rackCode!: string;

  @IsOptional()
  @IsString()
  rackName?: string;

  @IsEnum(RackType)
  rackType!: RackType;

  @IsNumber()
  xCoord!: number;

  @IsNumber()
  yCoord!: number;

  @IsNumber()
  @Min(0)
  rackWidthM!: number;

  @IsNumber()
  @Min(0)
  rackDepthM!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rackHeightM?: number;

  @IsOptional()
  @IsNumber()
  rotationDeg?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  levels?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  baysPerLevel?: number;

  @IsOptional()
  @IsString()
  displayColor?: string;
}

export class UpdateRackDto {
  @IsOptional()
  @IsString()
  rackName?: string;

  @IsOptional()
  @IsEnum(RackType)
  rackType?: RackType;

  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsOptional()
  @IsNumber()
  xCoord?: number;

  @IsOptional()
  @IsNumber()
  yCoord?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rackWidthM?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rackDepthM?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rackHeightM?: number;

  @IsOptional()
  @IsNumber()
  rotationDeg?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  levels?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  baysPerLevel?: number;

  @IsOptional()
  @IsString()
  displayColor?: string;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  rowVersion!: number;
}

export class ListRackDto {
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
  rackType?: string;
}
