import { IsString, IsUUID, IsNumber, IsOptional, IsEnum, IsArray, ValidateNested, IsDateString, IsPositive, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SalesOrderType {
  STANDARD = 'STANDARD',
  CONSIGNMENT = 'CONSIGNMENT',
  INTERNAL = 'INTERNAL',
}

export enum CargoForm {
  BULK = 'BULK',
  BAGGED_25KG = 'BAGGED_25KG',
  BAGGED_40KG = 'BAGGED_40KG',
  BAGGED_50KG = 'BAGGED_50KG',
  JUMBO = 'JUMBO',
  PACKAGING = 'PACKAGING',
  CONTAINER = 'CONTAINER',
  DRUM = 'DRUM',
  PALLET = 'PALLET',
  OTHER = 'OTHER',
}

export enum SalesOrderStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  PARTIALLY_RELEASED = 'PARTIALLY_RELEASED',
  FULLY_RELEASED = 'FULLY_RELEASED',
  SHIPPED = 'SHIPPED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

// ── Create SO Line ──
export class CreateSalesOrderLineDto {
  @ApiProperty()
  @IsUUID()
  itemId!: string;

  @ApiProperty({ enum: CargoForm })
  @IsEnum(CargoForm)
  cargoForm!: CargoForm;

  @ApiProperty()
  @IsUUID()
  uomId!: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  expectedQty!: number;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  expectedQtyKg!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  bagCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  nominalWeightPerBag?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

// ── Create SO ──
export class CreateSalesOrderDto {
  @ApiProperty()
  @IsString()
  externalId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalSoNumber?: string;

  @ApiPropertyOptional({ enum: SalesOrderType, default: SalesOrderType.STANDARD })
  @IsOptional()
  @IsEnum(SalesOrderType)
  orderType?: SalesOrderType = SalesOrderType.STANDARD;

  @ApiProperty()
  @IsUUID()
  ownerId!: string;

  @ApiProperty()
  @IsUUID()
  customerId!: string;

  @ApiProperty()
  @IsUUID()
  warehouseId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expectedDeliveryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deliveryAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ default: 'VND' })
  @IsOptional()
  @IsString()
  currency?: string = 'VND';

  @ApiProperty({ type: [CreateSalesOrderLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSalesOrderLineDto)
  lines!: CreateSalesOrderLineDto[];
}

// ── Update SO ──
export class UpdateSalesOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalSoNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expectedDeliveryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deliveryAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [CreateSalesOrderLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSalesOrderLineDto)
  lines?: CreateSalesOrderLineDto[];
}

// ── Cancel SO ──
export class CancelSalesOrderDto {
  @ApiProperty()
  @IsString()
  reasonCode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

// ── Close SO ──
export class CloseSalesOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

// ── Release Shipment Line ──
export class ReleaseShipmentLineDto {
  @ApiProperty()
  @IsUUID()
  soLineId!: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  releaseQtyKg!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  bagCount?: number;
}

// ── Release Shipment ──
export class ReleaseShipmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiProperty()
  @IsString()
  vehicleNumber!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  vehicleTypeId?: string;

  @ApiProperty({ type: [ReleaseShipmentLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReleaseShipmentLineDto)
  lines!: ReleaseShipmentLineDto[];
}

// ── Query ──
export class SalesOrderQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  soNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalSoNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional({ enum: SalesOrderStatus })
  @IsOptional()
  @IsEnum(SalesOrderStatus)
  status?: SalesOrderStatus;

  @ApiPropertyOptional({ enum: SalesOrderType })
  @IsOptional()
  @IsEnum(SalesOrderType)
  orderType?: SalesOrderType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export class DashboardQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerId?: string;
}
