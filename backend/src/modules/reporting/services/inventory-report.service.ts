import { Injectable, Logger } from '@nestjs/common';
import { InventoryReportRepository } from '../repositories/inventory-report.repository';
import { 
  OnHandReportFilterDto, 
  MovementReportFilterDto, 
  AgingReportFilterDto,
  PaginatedResponseDto,
} from '../dto';
import { REPORTING_CONSTANTS } from '../domain/reporting.constants';
import { DateRangeExceededError } from '../domain/reporting.errors';

@Injectable()
export class InventoryReportService {
  private readonly logger = new Logger(InventoryReportService.name);

  constructor(private readonly inventoryReportRepository: InventoryReportRepository) {}

  async getOnHandReport(filters: OnHandReportFilterDto, userId: string): Promise<PaginatedResponseDto<unknown>> {
    const startTime = Date.now();

    const result = await this.inventoryReportRepository.getOnHandSummary(filters);
    const totals = await this.inventoryReportRepository.getTotals(filters);

    const durationMs = Date.now() - startTime;
    this.logger.debug(`On-hand report generated in ${durationMs}ms, ${result.total} rows`);

    return {
      data: result.data,
      pagination: {
        page: filters.page || 1,
        pageSize: filters.pageSize || 50,
        totalItems: result.total,
        totalPages: Math.ceil(result.total / (filters.pageSize || 50)),
      },
      totals: {
        totalQty: totals.totalQty,
        totalReserved: totals.totalReserved,
        totalAvailable: totals.totalAvailable,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  async getMovementHistory(filters: MovementReportFilterDto, userId: string): Promise<PaginatedResponseDto<unknown>> {
    this.validateDateRange(filters.fromDate, filters.toDate);

    const startTime = Date.now();
    const result = await this.inventoryReportRepository.getMovementHistory(filters);
    const durationMs = Date.now() - startTime;

    this.logger.debug(`Movement report generated in ${durationMs}ms, ${result.total} rows`);

    return {
      data: result.data,
      pagination: {
        page: filters.page || 1,
        pageSize: filters.pageSize || 50,
        totalItems: result.total,
        totalPages: Math.ceil(result.total / (filters.pageSize || 50)),
      },
      generatedAt: new Date().toISOString(),
    };
  }

  async getAgingReport(filters: AgingReportFilterDto, userId: string): Promise<PaginatedResponseDto<unknown>> {
    const startTime = Date.now();
    const result = await this.inventoryReportRepository.getAgingReport(filters);
    const durationMs = Date.now() - startTime;

    this.logger.debug(`Aging report generated in ${durationMs}ms, ${result.total} rows`);

    return {
      data: result.data,
      pagination: {
        page: filters.page || 1,
        pageSize: filters.pageSize || 50,
        totalItems: result.total,
        totalPages: Math.ceil(result.total / (filters.pageSize || 50)),
      },
      generatedAt: new Date().toISOString(),
    };
  }

  async getInboundSummary(filters: OnHandReportFilterDto, userId: string): Promise<PaginatedResponseDto<unknown>> {
    this.validateDateRange(filters.fromDate, filters.toDate);
    return this.getOnHandReport(filters, userId);
  }

  async getOutboundSummary(filters: OnHandReportFilterDto, userId: string): Promise<PaginatedResponseDto<unknown>> {
    this.validateDateRange(filters.fromDate, filters.toDate);
    return this.getOnHandReport(filters, userId);
  }

  async getUtilizationReport(filters: OnHandReportFilterDto, userId: string): Promise<PaginatedResponseDto<unknown>> {
    return this.getOnHandReport(filters, userId);
  }

  private validateDateRange(fromDate?: string, toDate?: string): void {
    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      const diffDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays > REPORTING_CONSTANTS.MAX_DATE_RANGE_DAYS) {
        throw new DateRangeExceededError(REPORTING_CONSTANTS.MAX_DATE_RANGE_DAYS);
      }
    }
  }
}
