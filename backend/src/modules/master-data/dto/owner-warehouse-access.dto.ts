import { IsUUID, IsNotEmpty, IsOptional, IsInt, Min, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from './common.dto';

export class AssignWarehouseDto {
  @IsUUID()
  @IsNotEmpty()
  warehouseId!: string;

  @IsOptional()
  @IsString()
  externalId?: string;
}

export class ListOwnerWarehouseAccessDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;
}

export class OwnerWarehouseAccessResponseDto {
  id!: string;
  ownerId!: string;
  ownerCode!: string;
  ownerName!: string;
  warehouseId!: string;
  warehouseCode!: string;
  warehouseName!: string;
  isActive!: boolean;
  rowVersion!: number;
  createdAt!: Date;
}
