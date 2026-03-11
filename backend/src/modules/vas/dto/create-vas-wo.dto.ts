import {
  IsString,
  IsUUID,
  IsNumber,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum VasTypeDto {
  BAGGING = 'BAGGING',
  REPACKING = 'REPACKING',
}

export enum PackagingOwnershipDto {
  TVL_OWNED = 'TVL_OWNED',
  CLIENT_OWNED = 'CLIENT_OWNED',
}

/**
 * Simplified DTO for frontend compatibility.
 * Maps to Prisma schema fields in service layer.
 */
export class CreateVasWoDto {
  @ApiPropertyOptional({ description: 'Loại VAS (BAGGING hoặc REPACKING)', enum: VasTypeDto })
  @IsOptional()
  @IsEnum(VasTypeDto)
  vasType?: VasTypeDto;

  @ApiProperty({ description: 'Owner ID của hàng' })
  @IsUUID()
  ownerId!: string;

  @ApiProperty({ description: 'Warehouse ID nơi thực hiện' })
  @IsUUID()
  warehouseId!: string;

  @ApiProperty({ description: 'Item ID nguồn (source item) - maps to bulkSourceItemId' })
  @IsUUID()
  sourceItemId!: string;

  @ApiProperty({ description: 'Khối lượng nguồn (kg) - maps to plannedQtyKg', minimum: 0.001 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Type(() => Number)
  sourceQty!: number;

  @ApiProperty({ description: 'Số lượng bao mục tiêu - maps to packagingQtyPlanned', minimum: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  targetQty!: number;

  @ApiPropertyOptional({ description: 'Trọng lượng mỗi bao (kg)', minimum: 0.001 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Type(() => Number)
  bagWeightKg?: number;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
