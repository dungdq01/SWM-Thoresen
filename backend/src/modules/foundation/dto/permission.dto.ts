import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ListPermissionsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  moduleCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  resourceCode?: string;
}
