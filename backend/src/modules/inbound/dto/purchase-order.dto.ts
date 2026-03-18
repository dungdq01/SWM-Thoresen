import { IsString, IsUUID, IsNumber, IsOptional, IsArray, ValidateNested, IsPositive, Min, Max, IsInt, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PurchaseOrderType {
  SEA = 'SEA',
  LAND = 'LAND',
}

export class CreatePurchaseOrderLineDto {
  @ApiProperty()
  @IsUUID()
  itemId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  uomId?: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  expectedQty!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePurchaseOrderLineDto {
  @ApiPropertyOptional({ description: 'Line ID (required for existing lines)' })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty()
  @IsUUID()
  itemId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  uomId?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  expectedQty!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePurchaseOrderDto {
  @ApiPropertyOptional({ enum: PurchaseOrderType, default: PurchaseOrderType.SEA })
  @IsOptional()
  @IsEnum(PurchaseOrderType)
  poType?: PurchaseOrderType = PurchaseOrderType.SEA;

  @ApiProperty()
  @IsUUID()
  ownerId!: string;

  @ApiProperty()
  @IsUUID()
  vendorId!: string;

  @ApiPropertyOptional({ description: 'Single warehouse ID (deprecated, use warehouseIds)' })
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiProperty({ type: [String], description: 'Array of warehouse IDs' })
  @IsArray()
  @IsUUID('4', { each: true })
  warehouseIds!: string[];

  @ApiPropertyOptional({ description: 'Tên tàu / Nguồn gốc (chỉ dùng khi poType=SEA)' })
  @IsOptional()
  @IsString()
  vesselName?: string;

  @ApiPropertyOptional({ description: 'Nguồn gốc hàng hóa (chỉ dùng khi poType=SEA)' })
  @IsOptional()
  @IsString()
  origin?: string;

  @ApiPropertyOptional({ description: 'Số Bill of Lading (chỉ dùng khi poType=SEA)' })
  @IsOptional()
  @IsString()
  blNumber?: string;

  @ApiPropertyOptional({ description: 'Biển số xe' })
  @IsOptional()
  @IsString()
  vehiclePlate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreatePurchaseOrderLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderLineDto)
  lines!: CreatePurchaseOrderLineDto[];
}

export class UpdatePurchaseOrderDto {
  @ApiPropertyOptional({ enum: PurchaseOrderType })
  @IsOptional()
  @IsEnum(PurchaseOrderType)
  poType?: PurchaseOrderType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @ApiPropertyOptional({ description: 'Single warehouse ID (deprecated, use warehouseIds)' })
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional({ type: [String], description: 'Array of warehouse IDs' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  warehouseIds?: string[];

  @ApiPropertyOptional({ description: 'Tên tàu / Nguồn gốc (chỉ dùng khi poType=SEA)' })
  @IsOptional()
  @IsString()
  vesselName?: string;

  @ApiPropertyOptional({ description: 'Nguồn gốc hàng hóa (chỉ dùng khi poType=SEA)' })
  @IsOptional()
  @IsString()
  origin?: string;

  @ApiPropertyOptional({ description: 'Số Bill of Lading (chỉ dùng khi poType=SEA)' })
  @IsOptional()
  @IsString()
  blNumber?: string;

  @ApiPropertyOptional({ description: 'Biển số xe' })
  @IsOptional()
  @IsString()
  vehiclePlate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [UpdatePurchaseOrderLineDto], description: 'PO Lines to update' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdatePurchaseOrderLineDto)
  lines?: UpdatePurchaseOrderLineDto[];

  @ApiProperty({ description: 'Optimistic locking version' })
  @IsInt()
  @Min(0)
  rowVersion!: number;
}

export class CancelPurchaseOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reasonCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class PurchaseOrderQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ default: 20, description: 'Alias for limit' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiPropertyOptional({ default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ default: 'desc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
