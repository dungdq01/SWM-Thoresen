import { IsString, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLocationTypeDto {
  @IsString()
  locationTypeCode!: string;

  @IsString()
  locationTypeName!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateLocationTypeDto {
  @IsOptional()
  @IsString()
  locationTypeName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  rowVersion!: number;
}

export class ListLocationTypeDto {
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
}
