import { IsString, IsUUID, IsNumber, IsOptional, IsArray, ValidateNested, IsDateString, IsPositive, Min, Max, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePurchaseOrderLineDto {
  @ApiProperty()
  @IsUUID()
  itemId!: string;

  @ApiProperty()
  @IsUUID()
  uomId!: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  expectedQty!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePurchaseOrderDto {
  @ApiProperty()
  @IsUUID()
  ownerId!: string;

  @ApiProperty()
  @IsUUID()
  vendorId!: string;

  @ApiProperty()
  @IsUUID()
  warehouseId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalPoNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expectedDeliveryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ default: 'VND' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ type: [CreatePurchaseOrderLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderLineDto)
  lines!: CreatePurchaseOrderLineDto[];
}

export class UpdatePurchaseOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalPoNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expectedDeliveryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

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
