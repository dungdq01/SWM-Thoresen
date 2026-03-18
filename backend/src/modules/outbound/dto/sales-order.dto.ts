import { IsString, IsEnum, IsOptional, IsArray, ValidateNested, IsNumber, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export enum SoType {
  SEA = 'SEA',
  LAND = 'LAND',
}

export enum SoStatus {
  NEW = 'NEW',
  CONFIRMED = 'CONFIRMED',
  PARTIAL = 'PARTIAL',
  SHIPPED = 'SHIPPED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export class CreateSoLineDto {
  @IsUUID()
  itemId!: string;

  @IsNumber()
  expectedQty!: number;

  @IsOptional()
  @IsUUID()
  uomId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSoLineDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsUUID()
  itemId!: string;

  @IsNumber()
  expectedQty!: number;

  @IsOptional()
  @IsUUID()
  uomId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateSalesOrderDto {
  @IsEnum(SoType)
  soType!: SoType;

  @IsUUID()
  ownerId!: string;

  @IsString()
  blNumber!: string;

  @IsOptional()
  @IsString()
  vesselName?: string;

  @IsOptional()
  @IsString()
  vehiclePlate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSoLineDto)
  lines!: CreateSoLineDto[];
}

export class UpdateSalesOrderDto {
  @IsOptional()
  @IsEnum(SoType)
  soType?: SoType;

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsString()
  blNumber?: string;

  @IsOptional()
  @IsString()
  vesselName?: string;

  @IsOptional()
  @IsString()
  vehiclePlate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateSoLineDto)
  lines?: UpdateSoLineDto[];

  @IsOptional()
  @IsNumber()
  rowVersion?: number;
}

export class SalesOrderQueryDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  pageSize?: number = 20;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsEnum(SoStatus)
  status?: SoStatus;

  @IsOptional()
  @IsUUID()
  ownerId?: string;
}
