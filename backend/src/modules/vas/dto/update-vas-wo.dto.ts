import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateVasWoDto {
  @ApiPropertyOptional({ description: 'Khối lượng kế hoạch (kg)' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Type(() => Number)
  plannedQtyKg?: number;

  @ApiPropertyOptional({ description: 'Số lượng bao kế hoạch' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  packagingQtyPlanned?: number;

  @ApiPropertyOptional({ description: 'Ngày bắt đầu dự kiến' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Ngày hoàn thành dự kiến' })
  @IsOptional()
  @IsDateString()
  estimatedCompletionDate?: string;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Row version cho optimistic locking' })
  @IsOptional()
  @Type(() => Number)
  rowVersion?: number;
}
