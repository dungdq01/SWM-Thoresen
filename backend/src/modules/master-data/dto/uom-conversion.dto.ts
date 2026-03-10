import { IsString, IsUUID, IsOptional, IsNumber, IsPositive, IsNotEmpty } from 'class-validator';
import { PaginationDto } from './common.dto';

export class CreateUomConversionDto {
  @IsUUID()
  fromUomId!: string;

  @IsUUID()
  toUomId!: string;

  @IsNumber()
  @IsPositive()
  conversionFactor!: number;

  @IsOptional()
  @IsUUID()
  itemId?: string;
}

export class UpdateUomConversionDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  conversionFactor?: number;

  @IsNumber()
  rowVersion!: number;
}

export class ListUomConversionDto extends PaginationDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsUUID()
  fromUomId?: string;

  @IsOptional()
  @IsUUID()
  toUomId?: string;
}
