import { IsOptional, IsString, IsUUID, IsDateString, IsInt, Min, Max, IsEnum, IsArray } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class BaseReportFilterDto {
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  @Type(() => Number)
  pageSize?: number = 50;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class OnHandReportFilterDto extends BaseReportFilterDto {
  @IsOptional()
  @IsUUID()
  itemId?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsString()
  inventoryStatus?: string;

  @IsOptional()
  @IsEnum(['summary', 'detail'])
  view?: 'summary' | 'detail' = 'summary';
}

export class MovementReportFilterDto extends BaseReportFilterDto {
  @IsOptional()
  @IsUUID()
  itemId?: string;

  @IsOptional()
  @IsString()
  transType?: string;

  @IsOptional()
  @IsString()
  refType?: string;

  @IsOptional()
  @IsString()
  refId?: string;
}

export class AgingReportFilterDto extends BaseReportFilterDto {
  @IsOptional()
  @IsUUID()
  itemId?: string;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').map(Number) : value))
  agingBuckets?: number[];
}

export class InboundSummaryFilterDto extends BaseReportFilterDto {
  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @IsOptional()
  @IsString()
  receiptStatus?: string;
}

export class OutboundSummaryFilterDto extends BaseReportFilterDto {
  @IsOptional()
  @IsString()
  shipmentStatus?: string;
}

export class UtilizationFilterDto extends BaseReportFilterDto {
  @IsOptional()
  @IsUUID()
  zoneId?: string;
}

export class BillingEventsFilterDto extends BaseReportFilterDto {
  @IsOptional()
  @IsString()
  chargeCode?: string;

  @IsOptional()
  @IsString()
  eventStatus?: string;
}

export class DebitNotesFilterDto extends BaseReportFilterDto {
  @IsOptional()
  @IsString()
  dnStatus?: string;

  @IsOptional()
  @IsString()
  dnNumber?: string;
}

export class UserActivityFilterDto extends BaseReportFilterDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  entityType?: string;
}

export class PostingTraceFilterDto {
  @IsOptional()
  @IsString()
  transId?: string;

  @IsOptional()
  @IsString()
  refType?: string;

  @IsOptional()
  @IsString()
  refId?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}

export interface PaginatedResponseDto<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  totals?: Record<string, number>;
  generatedAt: string;
}
