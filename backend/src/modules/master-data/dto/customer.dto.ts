import { IsString, IsNotEmpty, IsOptional, IsEnum, IsEmail, IsNumber } from 'class-validator';
import { CustomerGroup, CustomerType } from '@prisma/client';
import { PaginationDto } from './common.dto';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  customerCode!: string;

  @IsString()
  @IsNotEmpty()
  customerName!: string;

  @IsOptional()
  @IsString()
  shortName?: string;

  @IsEnum(CustomerGroup)
  customerGroup!: CustomerGroup;

  @IsEnum(CustomerType)
  customerType!: CustomerType;

  @IsOptional()
  @IsString()
  taxCode?: string;

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
  address?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  shortName?: string;

  @IsOptional()
  @IsEnum(CustomerGroup)
  customerGroup?: CustomerGroup;

  @IsOptional()
  @IsEnum(CustomerType)
  customerType?: CustomerType;

  @IsOptional()
  @IsString()
  taxCode?: string;

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
  address?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsNumber()
  rowVersion!: number;
}

export class ListCustomerDto extends PaginationDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsEnum(CustomerGroup)
  customerGroup?: CustomerGroup;

  @IsOptional()
  @IsEnum(CustomerType)
  customerType?: CustomerType;
}
