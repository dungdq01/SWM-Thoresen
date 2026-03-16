import { IsString, IsOptional, IsUUID, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOwnerSkuMappingDto {
  @IsOptional()
  @IsString()
  mappingCode?: string;

  @IsUUID()
  ownerId!: string;

  @IsUUID()
  itemId!: string;

  @IsString()
  ownerSkuCode!: string;

  @IsString()
  ownerSkuName!: string;

  @IsOptional()
  @IsString()
  billingClass?: string;
}

export class UpdateOwnerSkuMappingDto {
  @IsOptional()
  @IsString()
  ownerSkuCode?: string;

  @IsOptional()
  @IsString()
  ownerSkuName?: string;

  @IsOptional()
  @IsString()
  billingClass?: string;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  rowVersion!: number;
}

export class ListOwnerSkuMappingDto {
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
  ownerId?: string;

  @IsOptional()
  @IsString()
  itemId?: string;
}
