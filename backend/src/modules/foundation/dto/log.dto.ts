import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
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

export class ListAuditLogsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  entityType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  entityId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  correlationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  userId?: string;
}

export class ListExceptionLogsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sourceModule?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => transformBoolean(value))
  @IsBoolean()
  isResolved?: boolean;
}
