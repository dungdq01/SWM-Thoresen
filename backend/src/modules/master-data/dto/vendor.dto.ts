import { IsString, IsEnum, IsOptional, IsEmail, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { SupplierGroup } from '@prisma/client';

export class CreateVendorDto {
  @IsString()
  vendorCode!: string;

  @IsString()
  vendorName!: string;

  @IsEnum(SupplierGroup)
  supplierGroup!: SupplierGroup;

  @IsOptional()
  @IsString()
  countryRegion?: string;

  @IsOptional()
  @IsString()
  vesselName?: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  taxCode?: string;

  @IsOptional()
  @IsString()
  externalId?: string;
}

export class UpdateVendorDto {
  @IsOptional()
  @IsString()
  vendorName?: string;

  @IsOptional()
  @IsEnum(SupplierGroup)
  supplierGroup?: SupplierGroup;

  @IsOptional()
  @IsString()
  countryRegion?: string;

  @IsOptional()
  @IsString()
  vesselName?: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  taxCode?: string;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  rowVersion!: number;
}

export class ListVendorDto {
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
  supplierGroup?: string;
}
