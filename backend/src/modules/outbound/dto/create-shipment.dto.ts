import {
  IsString,
  IsUUID,
  IsEnum,
  IsArray,
  ValidateNested,
  IsOptional,
  IsNumber,
  IsPositive,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ShipmentSourceTypeDto {
  SO = 'SO',
  DELIVERY_REQUEST = 'DELIVERY_REQUEST',
  STANDALONE = 'STANDALONE',
}

export enum CargoFormDto {
  BULK = 'BULK',
  BAGGED_25KG = 'BAGGED_25KG',
  BAGGED_40KG = 'BAGGED_40KG',
  BAGGED_50KG = 'BAGGED_50KG',
  JUMBO = 'JUMBO',
  PACKAGING = 'PACKAGING',
  CONTAINER = 'CONTAINER',
  DRUM = 'DRUM',
  PALLET = 'PALLET',
  OTHER = 'OTHER',
}

export class CreateShipmentLineDto {
  @ApiProperty({ description: 'SO line ID reference' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  soLineId?: string;

  @ApiProperty({ description: 'Item ID' })
  @IsUUID()
  itemId: string;

  @ApiProperty({ description: 'Cargo form', enum: CargoFormDto })
  @IsEnum(CargoFormDto)
  cargoForm: CargoFormDto;

  @ApiProperty({ description: 'UOM ID' })
  @IsUUID()
  uomId: string;

  @ApiProperty({ description: 'Expected quantity' })
  @IsNumber()
  @IsPositive()
  expectedQty: number;

  @ApiProperty({ description: 'Expected quantity in KG' })
  @IsNumber()
  @IsPositive()
  expectedQtyKg: number;

  @ApiPropertyOptional({ description: 'Bag count for bagged cargo' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bagCount?: number;

  @ApiPropertyOptional({ description: 'Nominal weight per bag in KG' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  nominalWeightPerBag?: number;
}

export class CreateShipmentDto {
  @ApiProperty({ description: 'External ID for idempotency' })
  @IsString()
  @MaxLength(120)
  externalId: string;

  @ApiProperty({ description: 'Source type', enum: ShipmentSourceTypeDto })
  @IsEnum(ShipmentSourceTypeDto)
  sourceType: ShipmentSourceTypeDto;

  @ApiPropertyOptional({ description: 'Sales Order ID' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  soId?: string;

  @ApiProperty({ description: 'Owner ID' })
  @IsUUID()
  ownerId: string;

  @ApiPropertyOptional({ description: 'Customer ID' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiProperty({ description: 'Warehouse ID' })
  @IsUUID()
  warehouseId: string;

  @ApiProperty({ description: 'Vehicle number' })
  @IsString()
  @MaxLength(30)
  vehicleNumber: string;

  @ApiPropertyOptional({ description: 'Vehicle type ID' })
  @IsOptional()
  @IsUUID()
  vehicleTypeId?: string;

  @ApiProperty({ description: 'Shipment lines', type: [CreateShipmentLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateShipmentLineDto)
  lines: CreateShipmentLineDto[];
}
