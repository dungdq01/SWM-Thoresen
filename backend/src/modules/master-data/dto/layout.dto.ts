import { IsNumber, IsOptional, IsString, IsUUID, IsArray, ValidateNested, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { RackType, SiteElementType } from '@prisma/client';

// ─── Warehouse Layout (bulk save) ────────────────────────────────────────────

export class ZoneLayoutItemDto {
  @IsUUID()
  id!: string;

  @IsNumber()
  xCoord!: number;

  @IsNumber()
  yCoord!: number;

  @IsNumber()
  @Min(0)
  zoneWidthM!: number;

  @IsNumber()
  @Min(0)
  zoneDepthM!: number;

  @IsOptional()
  @IsNumber()
  rotationDeg?: number;

  @IsOptional()
  @IsString()
  displayColor?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class RackLayoutItemDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  rackCode!: string;

  @IsOptional()
  @IsString()
  rackName?: string;

  @IsEnum(RackType)
  rackType!: RackType;

  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsNumber()
  xCoord!: number;

  @IsNumber()
  yCoord!: number;

  @IsNumber()
  @Min(0)
  rackWidthM!: number;

  @IsNumber()
  @Min(0)
  rackDepthM!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rackHeightM?: number;

  @IsOptional()
  @IsNumber()
  rotationDeg?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  levels?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  baysPerLevel?: number;

  @IsOptional()
  @IsString()
  displayColor?: string;
}

export class LocationLayoutItemDto {
  @IsUUID()
  id!: string;

  @IsOptional()
  @IsNumber()
  xCoord?: number;

  @IsOptional()
  @IsNumber()
  yCoord?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  locationWidthM?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  locationDepthM?: number;

  @IsOptional()
  @IsNumber()
  rotationDeg?: number;

  @IsOptional()
  @IsString()
  displayColor?: string;
}

export class SaveWarehouseLayoutDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  lengthM?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  widthM?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ZoneLayoutItemDto)
  zones!: ZoneLayoutItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RackLayoutItemDto)
  racks!: RackLayoutItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LocationLayoutItemDto)
  locations!: LocationLayoutItemDto[];

  @IsInt()
  @Min(0)
  @Type(() => Number)
  rowVersion!: number;
}

// ─── Site Map Layout (bulk save) ─────────────────────────────────────────────

export class WarehouseSitePositionDto {
  @IsUUID()
  id!: string;

  @IsNumber()
  siteXCoord!: number;

  @IsNumber()
  siteYCoord!: number;

  @IsOptional()
  @IsNumber()
  siteRotationDeg?: number;

  @IsOptional()
  @IsString()
  displayColor?: string;
}

export class SiteMapElementDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsEnum(SiteElementType)
  elementType!: SiteElementType;

  @IsOptional()
  @IsString()
  label?: string;

  @IsNumber()
  xCoord!: number;

  @IsNumber()
  yCoord!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  elementWidthM?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  elementDepthM?: number;

  @IsOptional()
  @IsNumber()
  rotationDeg?: number;

  @IsOptional()
  metadata?: any;
}

export class SaveSiteLayoutDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WarehouseSitePositionDto)
  warehouses!: WarehouseSitePositionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SiteMapElementDto)
  elements!: SiteMapElementDto[];
}
