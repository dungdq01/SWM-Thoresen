import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

function transformBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).toLowerCase();
  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  return undefined;
}

export class CreateNumberSequenceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  sequenceCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsIn(['GLOBAL', 'PER_WAREHOUSE', 'CUSTOM'])
  scopeType!: 'GLOBAL' | 'PER_WAREHOUSE' | 'CUSTOM';

  @IsIn(['NONE', 'DAILY', 'MONTHLY', 'YEARLY'])
  resetPolicy!: 'NONE' | 'DAILY' | 'MONTHLY' | 'YEARLY';

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  prefixTemplate!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  formatTemplate!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  runningNoLength?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => transformBoolean(value))
  @IsBoolean()
  allowGap?: boolean;
}

export class UpdateNumberSequenceDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsIn(['GLOBAL', 'PER_WAREHOUSE', 'CUSTOM'])
  scopeType?: 'GLOBAL' | 'PER_WAREHOUSE' | 'CUSTOM';

  @IsOptional()
  @IsIn(['NONE', 'DAILY', 'MONTHLY', 'YEARLY'])
  resetPolicy?: 'NONE' | 'DAILY' | 'MONTHLY' | 'YEARLY';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  prefixTemplate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  formatTemplate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  runningNoLength?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => transformBoolean(value))
  @IsBoolean()
  allowGap?: boolean;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => transformBoolean(value))
  @IsBoolean()
  isActive?: boolean;
}

export class GetNextNumberDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  scopeKey!: string;
}
