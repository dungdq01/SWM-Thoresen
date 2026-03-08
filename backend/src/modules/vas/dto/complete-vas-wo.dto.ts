import {
  IsString,
  IsNumber,
  IsOptional,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CompleteVasWoDto {
  @ApiProperty({ description: 'Khối lượng bulk tiêu hao thực tế (kg)' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Type(() => Number)
  actualConsumedQtyKg!: number;

  @ApiProperty({ description: 'Khối lượng bagged đầu ra thực tế (kg)' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Type(() => Number)
  actualOutputQtyKg!: number;

  @ApiProperty({ description: 'Số bao thực tế' })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  actualBagCount!: number;

  @ApiProperty({ description: 'Số lượng bao bì tiêu hao thực tế' })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  packagingQtyActual!: number;

  @ApiPropertyOptional({ description: 'Reason code cho yield variance (nếu vượt ngưỡng)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  yieldVarianceReasonCode?: string;

  @ApiPropertyOptional({ description: 'Ghi chú hoàn thành' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiProperty({ description: 'External ID cho idempotency' })
  @IsString()
  @MaxLength(100)
  externalId!: string;
}
