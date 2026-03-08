import { IsString, IsUUID, IsDateString, IsOptional, IsBoolean, IsArray, ValidateNested, IsNumber, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { BilFeeType } from '../domain/billing.enums';
import { CargoForm } from '@prisma/client';

export class CreateContractFeeLineDto {
  @IsEnum(BilFeeType)
  feeType!: BilFeeType;

  @IsOptional()
  @IsEnum(CargoForm)
  cargoForm?: CargoForm;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  dayTypeScope?: string;

  @IsOptional()
  @IsString()
  billingUom?: string;

  @IsNumber()
  @Min(0)
  unitRate!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumCharge?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  freeDays?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  materialRatePerBag?: number;

  @IsOptional()
  @IsString()
  tierRuleCode?: string;

  @IsOptional()
  @IsNumber()
  priorityRank?: number;
}

export class CreateContractDto {
  @IsUUID()
  ownerId!: string;

  @IsOptional()
  @IsString()
  contractScope?: string;

  @IsDateString()
  effectiveFrom!: string;

  @IsDateString()
  effectiveTo!: string;

  @IsOptional()
  @IsString()
  currencyCode?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsString()
  externalId!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateContractFeeLineDto)
  feeLines?: CreateContractFeeLineDto[];
}

export class UpdateContractDto {
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @IsOptional()
  @IsString()
  currencyCode?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateContractFeeLineDto)
  feeLines?: CreateContractFeeLineDto[];
}

export class ActivateContractDto {
  @IsString()
  externalId!: string;
}

export class QueryContractDto {
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}
