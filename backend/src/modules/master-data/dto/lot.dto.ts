import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID, IsNumber, IsObject, IsDateString } from 'class-validator';
import { LotStatus } from '@prisma/client';
import { PaginationDto } from './common.dto';

export class CreateLotDto {
  @IsOptional()
  @IsString()
  lotCode?: string;

  @IsUUID()
  @IsNotEmpty()
  itemId!: string;

  @IsUUID()
  @IsNotEmpty()
  ownerId!: string;

  @IsUUID()
  @IsNotEmpty()
  warehouseId!: string;

  @IsOptional()
  @IsDateString()
  firstReceivedDate?: string;

  @IsOptional()
  @IsUUID()
  sourceLotId?: string;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class GetOrCreateLotDto {
  @IsUUID()
  @IsNotEmpty()
  itemId!: string;

  @IsUUID()
  @IsNotEmpty()
  ownerId!: string;

  @IsUUID()
  @IsNotEmpty()
  warehouseId!: string;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;

  @IsOptional()
  @IsDateString()
  firstReceivedDate?: string;
}

export class UpdateLotDto {
  @IsOptional()
  @IsEnum(LotStatus)
  status?: LotStatus;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsNumber()
  rowVersion!: number;
}

export class ListLotDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  itemId?: string;

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsEnum(LotStatus)
  status?: LotStatus;

  @IsOptional()
  @IsUUID()
  sourceLotId?: string;
}

export class FindByHashDto {
  @IsString()
  @IsNotEmpty()
  lotHash!: string;
}
