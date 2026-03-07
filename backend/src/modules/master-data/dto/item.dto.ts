import { IsString, IsEnum, IsOptional, IsBoolean, IsNumber, IsUUID, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { CargoForm } from '@prisma/client';

export class CreateItemDto {
  @IsString()
  itemCode!: string;

  @IsString()
  itemName!: string;

  @IsOptional()
  @IsString()
  itemNameEn?: string;

  @IsOptional()
  @IsString()
  altItemCode?: string;

  @IsOptional()
  @IsString()
  productGroup?: string;

  @IsEnum(CargoForm)
  cargoForm!: CargoForm;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsBoolean()
  isPackaging?: boolean;

  @IsUUID()
  baseUomId!: string;

  @IsUUID()
  billingUomId!: string;

  @IsOptional()
  @IsUUID()
  catchWeightUomId?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  stdGrossWeight?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  stdNetWeight?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  densityMtPerM3?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  stdCubeM3?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  tolerancePctInbound?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  tolerancePctOutbound?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  shrinkageRatePct?: number;

  @IsOptional()
  @IsString()
  rotateBy?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  shelfLifeDays?: number;

  @IsOptional()
  @IsUUID()
  defaultZoneId?: string;

  @IsOptional()
  @IsString()
  putawayStrategyKey?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  defaultBagWeightKg?: number;

  @IsOptional()
  @IsUUID()
  packagingMaterialItemId?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  nominalQtyPerUnit?: number;

  @IsOptional()
  @IsString()
  hsCode?: string;

  @IsOptional()
  @IsString()
  countryOfOrigin?: string;

  @IsOptional()
  @IsBoolean()
  isCatchWeight?: boolean;

  @IsOptional()
  @IsBoolean()
  isStorageBillable?: boolean;
}

export class UpdateItemDto {
  @IsOptional()
  @IsString()
  itemName?: string;

  @IsOptional()
  @IsString()
  itemNameEn?: string;

  @IsOptional()
  @IsString()
  altItemCode?: string;

  @IsOptional()
  @IsString()
  productGroup?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  stdGrossWeight?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  stdNetWeight?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  densityMtPerM3?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  stdCubeM3?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  tolerancePctInbound?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  tolerancePctOutbound?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  shrinkageRatePct?: number;

  @IsOptional()
  @IsString()
  rotateBy?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  shelfLifeDays?: number;

  @IsOptional()
  @IsUUID()
  defaultZoneId?: string;

  @IsOptional()
  @IsString()
  putawayStrategyKey?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  defaultBagWeightKg?: number;

  @IsOptional()
  @IsUUID()
  packagingMaterialItemId?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  nominalQtyPerUnit?: number;

  @IsOptional()
  @IsString()
  hsCode?: string;

  @IsOptional()
  @IsString()
  countryOfOrigin?: string;

  @IsOptional()
  @IsBoolean()
  isStorageBillable?: boolean;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  rowVersion!: number;
}

export class ListItemDto {
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

  @IsOptional()
  @IsString()
  productGroup?: string;
}
