import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsUUID, Min, Max, IsEmail } from 'class-validator';
import { OwnerType } from '@prisma/client';
import { PaginationDto } from './common.dto';

export class CreateOwnerDto {
  @IsString()
  @IsNotEmpty()
  ownerCode!: string;

  @IsString()
  @IsNotEmpty()
  ownerName!: string;

  @IsString()
  @IsNotEmpty()
  shortName!: string;

  @IsString()
  @IsNotEmpty()
  ownerGroup!: string;

  @IsEnum(OwnerType)
  ownerType!: OwnerType;

  @IsString()
  @IsNotEmpty()
  taxCode!: string;

  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsOptional()
  @IsEmail()
  billingEmail?: string;

  @IsOptional()
  @IsString()
  billingContact?: string;

  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  defaultTolerancePct?: number;

  @IsOptional()
  @IsUUID()
  defaultWarehouseId?: string;

  @IsOptional()
  @IsString()
  externalId?: string;
}

export class UpdateOwnerDto {
  @IsOptional()
  @IsString()
  ownerName?: string;

  @IsOptional()
  @IsString()
  shortName?: string;

  @IsOptional()
  @IsString()
  ownerGroup?: string;

  @IsOptional()
  @IsEnum(OwnerType)
  ownerType?: OwnerType;

  @IsOptional()
  @IsString()
  taxCode?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsEmail()
  billingEmail?: string;

  @IsOptional()
  @IsString()
  billingContact?: string;

  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  defaultTolerancePct?: number;

  @IsOptional()
  @IsUUID()
  defaultWarehouseId?: string;

  @IsNumber()
  rowVersion!: number;
}

export class ListOwnerDto extends PaginationDto {
  @IsOptional()
  @IsString()
  ownerGroup?: string;

  @IsOptional()
  @IsEnum(OwnerType)
  ownerType?: OwnerType;
}
