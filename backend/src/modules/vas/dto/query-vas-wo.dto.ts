import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum VasWoStatusQuery {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export class QueryVasWoDto {
  @ApiPropertyOptional({ description: 'Filter theo warehouse ID' })
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional({ description: 'Filter theo owner ID' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({ description: 'Filter theo status', enum: VasWoStatusQuery })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(VasWoStatusQuery)
  status?: VasWoStatusQuery;

  @ApiPropertyOptional({ description: 'Filter theo bulk source item ID' })
  @IsOptional()
  @IsUUID()
  bulkSourceItemId?: string;

  @ApiPropertyOptional({ description: 'Filter theo bagged output item ID' })
  @IsOptional()
  @IsUUID()
  baggedOutputItemId?: string;

  @ApiPropertyOptional({ description: 'Filter từ ngày tạo (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @ApiPropertyOptional({ description: 'Filter đến ngày tạo (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  createdTo?: string;

  @ApiPropertyOptional({ description: 'Filter từ ngày hoàn thành' })
  @IsOptional()
  @IsDateString()
  completedFrom?: string;

  @ApiPropertyOptional({ description: 'Filter đến ngày hoàn thành' })
  @IsOptional()
  @IsDateString()
  completedTo?: string;

  @ApiPropertyOptional({ description: 'Filter theo VAS type (BAGGING, REPACKING)' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  vasType?: string;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo wo_number' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: 'Số trang', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Số record mỗi trang', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}
