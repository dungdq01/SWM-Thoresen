import { Injectable, Logger } from '@nestjs/common';
import { DashboardRepository, WidgetData, DashboardFilters } from '../repositories/dashboard.repository';
import { DashboardSummaryQueryDto, DashboardSummaryResponseDto, WidgetDataDto } from '../dto';
import { REPORTING_CONSTANTS } from '../domain/reporting.constants';
import { WidgetCode } from '../domain/reporting.enums';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly dashboardRepository: DashboardRepository) {}

  async getSummary(query: DashboardSummaryQueryDto, userId: string, userRole: string): Promise<DashboardSummaryResponseDto> {
    const date = query.date ? new Date(query.date) : new Date();
    const filters: DashboardFilters = {
      ownerId: query.ownerId,
      warehouseId: query.warehouseId,
      date,
    };

    const cacheKey = this.buildCacheKey(filters);
    const widgets: WidgetDataDto[] = [];

    const widgetConfigs = [
      { code: WidgetCode.INBOUND_TODAY, fetcher: () => this.dashboardRepository.getInboundTodayWidget(filters), ttl: REPORTING_CONSTANTS.DASHBOARD_CACHE_TTL_SECONDS },
      { code: WidgetCode.OUTBOUND_TODAY, fetcher: () => this.dashboardRepository.getOutboundTodayWidget(filters), ttl: REPORTING_CONSTANTS.DASHBOARD_CACHE_TTL_SECONDS },
      { code: WidgetCode.WORK_QUEUE, fetcher: () => this.dashboardRepository.getWorkQueueWidget(filters), ttl: REPORTING_CONSTANTS.DASHBOARD_CACHE_TTL_SECONDS },
      { code: WidgetCode.EXCEPTION_COUNT, fetcher: () => this.dashboardRepository.getExceptionCountWidget(filters), ttl: REPORTING_CONSTANTS.DASHBOARD_CACHE_TTL_SECONDS },
      { code: WidgetCode.PENDING_DN, fetcher: () => this.dashboardRepository.getPendingDnWidget(filters), ttl: REPORTING_CONSTANTS.BILLING_CACHE_TTL_SECONDS },
      { code: WidgetCode.UTILIZATION, fetcher: () => this.dashboardRepository.getUtilizationWidget(filters), ttl: REPORTING_CONSTANTS.UTILIZATION_CACHE_TTL_SECONDS },
    ];

    for (const config of widgetConfigs) {
      try {
        const cached = await this.dashboardRepository.getCacheEntry(config.code, cacheKey);
        
        if (cached) {
          widgets.push({
            ...(cached.payload as WidgetData),
            stale: false,
          });
          continue;
        }

        const data = await config.fetcher();
        
        await this.dashboardRepository.setCacheEntry(config.code, cacheKey, data, config.ttl);

        widgets.push({ ...data, stale: false });
      } catch (error) {
        this.logger.warn(`Failed to fetch widget ${config.code}: ${error}`);
        
        const staleCache = await this.dashboardRepository.getCacheEntry(config.code, cacheKey);
        if (staleCache) {
          widgets.push({
            ...(staleCache.payload as WidgetData),
            stale: true,
          });
        }
      }
    }

    return {
      widgets,
      lastRefreshedAt: new Date().toISOString(),
      appliedFilters: {
        date: date.toISOString().split('T')[0],
        ...(filters.ownerId && { ownerId: filters.ownerId }),
        ...(filters.warehouseId && { warehouseId: filters.warehouseId }),
      },
    };
  }

  async getWidgetData(widgetCode: string, query: DashboardSummaryQueryDto): Promise<WidgetDataDto> {
    const date = query.date ? new Date(query.date) : new Date();
    const filters: DashboardFilters = {
      ownerId: query.ownerId,
      warehouseId: query.warehouseId,
      date,
    };

    const widgetFetchers: Record<string, () => Promise<WidgetData>> = {
      [WidgetCode.INBOUND_TODAY]: () => this.dashboardRepository.getInboundTodayWidget(filters),
      [WidgetCode.OUTBOUND_TODAY]: () => this.dashboardRepository.getOutboundTodayWidget(filters),
      [WidgetCode.WORK_QUEUE]: () => this.dashboardRepository.getWorkQueueWidget(filters),
      [WidgetCode.EXCEPTION_COUNT]: () => this.dashboardRepository.getExceptionCountWidget(filters),
      [WidgetCode.PENDING_DN]: () => this.dashboardRepository.getPendingDnWidget(filters),
      [WidgetCode.UTILIZATION]: () => this.dashboardRepository.getUtilizationWidget(filters),
    };

    const fetcher = widgetFetchers[widgetCode];
    if (!fetcher) {
      throw new Error(`Unknown widget code: ${widgetCode}`);
    }

    const data = await fetcher();
    return { ...data, stale: false };
  }

  private buildCacheKey(filters: DashboardFilters): string {
    return `${filters.date.toISOString().split('T')[0]}|${filters.ownerId || 'all'}|${filters.warehouseId || 'all'}`;
  }
}
