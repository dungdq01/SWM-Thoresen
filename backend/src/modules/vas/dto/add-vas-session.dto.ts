import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsDateString,
  IsInt,
  IsBoolean,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ShiftCodeDto {
  MORNING = 'MORNING',
  AFTERNOON = 'AFTERNOON',
  NIGHT = 'NIGHT',
}

export class AddVasSessionDto {
  @ApiProperty({ description: 'Ngày session (YYYY-MM-DD)' })
  @IsDateString()
  sessionDate!: string;

  @ApiProperty({ description: 'Ca làm việc', enum: ShiftCodeDto })
  @IsEnum(ShiftCodeDto)
  shiftCode!: ShiftCodeDto;

  @ApiProperty({ description: 'Khối lượng đóng bao trong session (kg)', minimum: 0.001 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Type(() => Number)
  sessionQtyKg!: number;

  @ApiProperty({ description: 'Số bao đóng trong session', minimum: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  sessionBagCount!: number;

  @ApiPropertyOptional({ description: 'Số giờ làm việc' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  workHours?: number;

  @ApiPropertyOptional({ description: 'Có phải overtime không' })
  @IsOptional()
  @IsBoolean()
  isOvertime?: boolean;

  @ApiPropertyOptional({ description: 'Thời gian bắt đầu (ISO datetime)' })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({ description: 'Thời gian kết thúc (ISO datetime)' })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiProperty({ description: 'External ID cho idempotency' })
  @IsString()
  @MaxLength(100)
  externalId!: string;
}
