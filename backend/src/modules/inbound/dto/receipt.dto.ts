import { IsString, IsUUID, IsNumber, IsOptional, IsEnum, IsArray, ValidateNested, IsDateString, IsPositive, Min, Max, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ReceiptType {
  STANDARD = 'STANDARD',
  VESSEL = 'VESSEL',
}

export enum CargoForm {
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

export enum SourceApp {
  WEB = 'WEB',
  MOBILE = 'MOBILE',
  API = 'API',
  INTEGRATION = 'INTEGRATION',
  SYSTEM = 'SYSTEM',
}

export class CreateReceiptLineDto {
  @ApiProperty()
  @IsUUID()
  itemId!: string;

  @ApiProperty()
  @IsUUID()
  uomId!: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  expectedQty!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  bagCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  nominalWeightPerBag?: number;

  @ApiProperty({ enum: CargoForm })
  @IsEnum(CargoForm)
  cargoForm!: CargoForm;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateReceiptDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiPropertyOptional({ enum: ReceiptType, default: ReceiptType.STANDARD })
  @IsOptional()
  @IsEnum(ReceiptType)
  receiptType?: ReceiptType = ReceiptType.STANDARD;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  poId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  poNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  asnId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  asnNumber?: string;

  @ApiProperty()
  @IsUUID()
  ownerId!: string;

  @ApiProperty()
  @IsUUID()
  vendorId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  itemId?: string;

  @ApiProperty()
  @IsUUID()
  warehouseId!: string;

  @ApiProperty()
  @IsString()
  vehicleNumber!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  blNumber?: string;

  @ApiPropertyOptional({ description: 'Tên tàu / Nguồn gốc' })
  @IsOptional()
  @IsString()
  vesselName?: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  expectedQty!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  bagCount?: number;

  @ApiPropertyOptional({ enum: CargoForm })
  @IsOptional()
  @IsEnum(CargoForm)
  cargoForm?: CargoForm;

  @ApiPropertyOptional({ enum: SourceApp, default: SourceApp.WEB })
  @IsOptional()
  @IsEnum(SourceApp)
  sourceApp?: SourceApp = SourceApp.WEB;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  correlationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdBy?: string;

  @ApiPropertyOptional({ type: [CreateReceiptLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReceiptLineDto)
  lines?: CreateReceiptLineDto[];
}

export class UpdateReceiptLineDto {
  @ApiProperty()
  @IsUUID()
  itemId!: string;

  @ApiProperty()
  @IsUUID()
  uomId!: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  expectedQty!: number;

  @ApiPropertyOptional({ enum: CargoForm, default: CargoForm.BULK })
  @IsOptional()
  @IsEnum(CargoForm)
  cargoForm?: CargoForm = CargoForm.BULK;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateReceiptDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vehicleNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  expectedQty?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [UpdateReceiptLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateReceiptLineDto)
  lines?: UpdateReceiptLineDto[];
}

export class ConfirmReceiptDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalId?: string;
}

export class CancelReceiptDto {
  @ApiProperty()
  @IsString()
  reasonCode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class WeighInDto {
  @ApiProperty()
  @IsUUID()
  receiptId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ticketId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  grossWeightKg?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  eventTimestamp?: string;

  @ApiPropertyOptional({ enum: SourceApp, default: SourceApp.INTEGRATION })
  @IsOptional()
  @IsEnum(SourceApp)
  sourceApp?: SourceApp = SourceApp.INTEGRATION;

  @ApiPropertyOptional()
  @IsOptional()
  rawPayload?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isManualEntry?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reasonCode?: string;
}

export class WeighOutDto {
  @ApiProperty()
  @IsUUID()
  receiptId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ticketId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tareWeightKg?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  eventTimestamp?: string;

  @ApiPropertyOptional({ enum: SourceApp, default: SourceApp.INTEGRATION })
  @IsOptional()
  @IsEnum(SourceApp)
  sourceApp?: SourceApp = SourceApp.INTEGRATION;

  @ApiPropertyOptional()
  @IsOptional()
  rawPayload?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isManualEntry?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reasonCode?: string;
}

export class ReceiptQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receiptNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vehicleNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  blNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  poId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  asnId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  itemId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({ default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ default: 'desc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
