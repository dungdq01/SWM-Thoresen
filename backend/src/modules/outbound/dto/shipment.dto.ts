import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateShipmentLineDto {
  @IsUUID()
  itemId!: string;

  @IsUUID()
  uomId!: string;

  @IsNumber()
  expectedQty!: number;

  @IsOptional()
  @IsString()
  soLineId?: string;

  @IsOptional()
  @IsString()
  lotNumber?: string;
}

export class CreateShipmentDto {
  @IsUUID()
  salesOrderId!: string;

  @IsUUID()
  warehouseId!: string;

  @IsString()
  vehicleNumber!: string;

  @IsOptional()
  @IsString()
  blNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateShipmentLineDto)
  lines!: CreateShipmentLineDto[];
}

export class ShipmentQueryDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  pageSize?: number = 20;
}
