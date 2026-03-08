import {
  IsString,
  IsUUID,
  IsNumber,
  IsEnum,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PackagingOwnershipDto {
  TVL_OWNED = 'TVL_OWNED',
  CLIENT_OWNED = 'CLIENT_OWNED',
}

export class CreateVasWoDto {
  @ApiProperty({ description: 'Owner ID của hàng bulk/bagged' })
  @IsUUID()
  ownerId!: string;

  @ApiProperty({ description: 'Warehouse ID nơi thực hiện bagging' })
  @IsUUID()
  warehouseId!: string;

  @ApiProperty({ description: 'Item ID hàng xá nguồn (bulk source)' })
  @IsUUID()
  bulkSourceItemId!: string;

  @ApiProperty({ description: 'Item ID hàng bao đầu ra (bagged output)' })
  @IsUUID()
  baggedOutputItemId!: string;

  @ApiProperty({ description: 'Khối lượng kế hoạch (kg)', minimum: 0.001 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Type(() => Number)
  plannedQtyKg!: number;

  @ApiProperty({ description: 'Loại sở hữu bao bì', enum: PackagingOwnershipDto })
  @IsEnum(PackagingOwnershipDto)
  packagingOwnership!: PackagingOwnershipDto;

  @ApiProperty({ description: 'Item ID vật tư bao bì' })
  @IsUUID()
  packagingItemId!: string;

  @ApiProperty({ description: 'Owner ID của bao bì stock' })
  @IsUUID()
  packagingOwnerId!: string;

  @ApiProperty({ description: 'Số lượng bao kế hoạch', minimum: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  packagingQtyPlanned!: number;

  @ApiProperty({ description: 'Ngày bắt đầu dự kiến (YYYY-MM-DD)' })
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional({ description: 'Ngày hoàn thành dự kiến (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  estimatedCompletionDate?: string;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiProperty({ description: 'External ID cho idempotency' })
  @IsString()
  @MaxLength(100)
  externalId!: string;
}
