import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export enum InboundDocumentType {
  BILL_OF_LADING = 'BILL_OF_LADING',
  PACKING_LIST = 'PACKING_LIST',
  COMMERCIAL_INVOICE = 'COMMERCIAL_INVOICE',
  CERTIFICATE_OF_ORIGIN = 'CERTIFICATE_OF_ORIGIN',
  QUALITY_CERTIFICATE = 'QUALITY_CERTIFICATE',
  WEIGHT_CERTIFICATE = 'WEIGHT_CERTIFICATE',
  OTHER = 'OTHER',
}

export enum InboundDocumentStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class UploadInboundDocumentDto {
  @ApiProperty({ enum: InboundDocumentType })
  @IsEnum(InboundDocumentType)
  docType!: InboundDocumentType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  receiptHeaderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vehicleNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class InboundDocumentQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  receiptHeaderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({ enum: InboundDocumentType })
  @IsOptional()
  @IsEnum(InboundDocumentType)
  docType?: InboundDocumentType;

  @ApiPropertyOptional({ enum: InboundDocumentStatus })
  @IsOptional()
  @IsEnum(InboundDocumentStatus)
  status?: InboundDocumentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  pageSize?: number = 20;
}

export class UpdateInboundDocumentDto {
  @ApiPropertyOptional({ enum: InboundDocumentStatus })
  @IsOptional()
  @IsEnum(InboundDocumentStatus)
  status?: InboundDocumentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
