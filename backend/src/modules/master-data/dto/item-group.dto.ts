import { IsString, IsOptional, IsInt, IsBoolean, IsArray, Min, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateItemGroupDto {
  @IsString()
  itemGroupCode!: string;

  @IsString()
  itemGroupName!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  cargoForm?: string;

  @IsOptional()
  @IsUUID()
  weighbridgeQtyUomId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  warehouseIds?: string[];

  @IsOptional()
  @IsString()
  externalId?: string;
}

export class UpdateItemGroupDto {
  @IsOptional()
  @IsString()
  itemGroupName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  cargoForm?: string;

  @IsOptional()
  @IsUUID()
  weighbridgeQtyUomId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  warehouseIds?: string[];

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  rowVersion!: number;
}

export class ListItemGroupDto {
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
  cargoForm?: string;
}
