import { IsString, IsEnum, IsOptional, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { UomClass } from '@prisma/client';

export class CreateUomDto {
  @IsString()
  uomCode!: string;

  @IsString()
  description!: string;

  @IsEnum(UomClass)
  uomClass!: UomClass;

  @IsOptional()
  @IsBoolean()
  isBaseUom?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(12)
  @Type(() => Number)
  decimalPrecision?: number;
}

export class UpdateUomDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(12)
  @Type(() => Number)
  decimalPrecision?: number;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  rowVersion!: number;
}

export class ListUomDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  pageSize?: number = 20;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;

  @IsOptional()
  @IsString()
  uomClass?: string;
}
