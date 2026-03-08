import { IsOptional, IsString, IsUUID, IsDateString } from 'class-validator';

export class DashboardSummaryQueryDto {
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}

export interface WidgetDataDto {
  code: string;
  label: string;
  value: number;
  subValue?: number;
  unit?: string;
  stale: boolean;
  trend?: {
    direction: 'up' | 'down' | 'flat';
    percentage: number;
  };
}

export interface DashboardSummaryResponseDto {
  widgets: WidgetDataDto[];
  lastRefreshedAt: string;
  appliedFilters: Record<string, string>;
}
