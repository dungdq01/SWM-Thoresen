import { IsUUID, IsNotEmpty, IsOptional, IsEnum, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { IncompatibilityRuleType } from '@prisma/client';
import { PaginationDto } from './common.dto';

export class CreateItemIncompatibilityDto {
  @IsEnum(IncompatibilityRuleType)
  ruleType!: IncompatibilityRuleType;

  @IsOptional()
  @IsUUID()
  itemId?: string;

  @IsOptional()
  @IsUUID()
  itemGroupId?: string;

  @IsOptional()
  @IsUUID()
  incompatibleWithItemId?: string;

  @IsOptional()
  @IsUUID()
  incompatibleWithGroupId?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  externalId?: string;
}

export class UpdateItemIncompatibilityDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  rowVersion!: number;
}

export class ListItemIncompatibilityDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  itemId?: string;

  @IsOptional()
  @IsUUID()
  itemGroupId?: string;

  @IsOptional()
  @IsEnum(IncompatibilityRuleType)
  ruleType?: IncompatibilityRuleType;
}

export class CheckIncompatibilityDto {
  @IsUUID()
  @IsNotEmpty()
  itemId1!: string;

  @IsUUID()
  @IsNotEmpty()
  itemId2!: string;
}
