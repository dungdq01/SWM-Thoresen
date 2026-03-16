import { IsString, IsOptional, IsInt, Min } from 'class-validator';
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
