import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
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

export class ListRolesQueryDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => transformBoolean(value))
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  roleCode?: string;

  // HI-1 Fix: Add pagination
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  roleCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  roleName!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  roleName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => transformBoolean(value))
  @IsBoolean()
  isActive?: boolean;
}

export class PermissionChangeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  permissionCode!: string;

  @IsOptional()
  @IsIn(['ALLOW', 'DENY'])
  effect?: 'ALLOW' | 'DENY';
}

export class AssignRolePermissionsDto {
  @IsArray()
  @ArrayNotEmpty()
  changes!: PermissionChangeDto[];
}

export class AssignUserRoleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  roleCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  warehouseCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  ownerId?: string | null;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => transformBoolean(value))
  @IsBoolean()
  isPrimary?: boolean;
}
