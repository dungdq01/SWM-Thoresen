import { IsString, IsDateString, IsNumber, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { BilDayType } from '../domain/billing.enums';

export class UpsertDayTypeDto {
  @IsDateString()
  calendarDate!: string;

  @IsEnum(BilDayType)
  dayType!: BilDayType;

  @IsNumber()
  @Min(0)
  @Max(10)
  defaultOtMultiplier!: number;

  @IsNumber()
  @Min(0)
  @Max(10)
  noOtMultiplier!: number;

  @IsNumber()
  @Min(0)
  @Max(10)
  withOtMultiplier!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class QueryDayTypeDto {
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsEnum(BilDayType)
  dayType?: BilDayType;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}
