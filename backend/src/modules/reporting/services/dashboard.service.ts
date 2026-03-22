import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { DashboardRepository, WidgetData, DashboardFilters } from '../repositories/dashboard.repository';
import { DashboardSummaryQueryDto, DashboardSummaryResponseDto, WidgetDataDto } from '../dto';
import { REPORTING_CONSTANTS } from '../domain/reporting.constants';
import { WidgetCode } from '../domain/reporting.enums';

export interface KpiByOwner {
  ownerId: string;
  ownerCode: string;
  onHandKg: number;
  pendingShipments: number;
  billingOutstanding: number;
}

export interface MovementTrend {
  date: string;
  inboundKg: number;
  outboundKg: number;
}

export interface FlatDashboardResponse {
  totalOwners: number;
  activeShipments: number;
  onHandQtyKg: number;
  pendingBillingEvents: number;
  openAlerts: number;
  reconPassRate: number;
  inboundToday: number;
  outboundToday: number;
  warehouseUtilPct: number;
  kpiByOwner: KpiByOwner[];
  movementTrend: MovementTrend[];
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly dashboardRepository: DashboardRepository,
    private readonly prisma: PrismaService,
  ) {}

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

  /**
   * Get flat dashboard data matching frontend expectations
   */
  async getFlatDashboard(query: DashboardSummaryQueryDto): Promise<FlatDashboardResponse> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get total owners
    const totalOwners = await this.prisma.mdOwner.count({
      where: { isActive: true },
    });

    // Get active shipments (using correct enum values from schema)
    const activeShipments = await this.prisma.shipmentHeader.count({
      where: { status: { in: ['CONFIRMED', 'ALLOCATED', 'PICKING', 'PICKED', 'WEIGHING_TARE', 'LOADING', 'PENDING_APPROVAL'] } },
    });

    // Get on-hand quantity (KG) - using physicalQty field
    const onHandResult = await this.prisma.onHand.aggregate({
      _sum: { physicalQty: true },
    });
    const onHandQtyKg = Number(onHandResult._sum?.physicalQty || 0);

    // Get pending billing events (using bilDebitNote as proxy)
    let pendingBillingEvents = 0;
    try {
      pendingBillingEvents = await this.prisma.bilDebitNote.count({
        where: { status: { in: ['DRAFT', 'REVIEWED'] } },
      });
    } catch {
      pendingBillingEvents = 0;
    }

    // Get open alerts (using exceptionLog as proxy)
    let openAlerts = 0;
    try {
      openAlerts = await this.prisma.exceptionLog.count({
        where: { isResolved: false },
      });
    } catch {
      openAlerts = 0;
    }

    // Get inbound today - count all receipts created today (any active status)
    const inboundToday = await this.prisma.receiptHeader.count({
      where: {
        status: { in: ['PROCESSING', 'WEIGHED_IN', 'WEIGHED_OUT', 'RECEIVED', 'PUTAWAY', 'CLOSED'] },
        createdAt: { gte: today },
      },
    });

    // Get outbound today
    const outboundToday = await this.prisma.shipmentHeader.count({
      where: {
        status: { in: ['SHIPPED', 'CLOSED'] },
        createdAt: { gte: today },
      },
    });

    // Calculate warehouse utilization
    let warehouseUtilPct = 0;
    try {
      const warehouseCapacity = await this.prisma.mdWarehouse.aggregate({
        _sum: { maxCapacityMt: true },
      });
      const totalCapacity = Number(warehouseCapacity._sum?.maxCapacityMt || 1);
      warehouseUtilPct = totalCapacity > 0 ? Math.round((onHandQtyKg / 1000 / totalCapacity) * 100) : 0;
    } catch {
      warehouseUtilPct = 0;
    }

    // Get KPI by owner
    const kpiByOwner = await this.getKpiByOwner();

    // Get movement trend (last 7 days)
    const movementTrend = await this.getMovementTrend();

    // Recon pass rate (mock for now - would need actual recon data)
    const reconPassRate = 97.8;

    return {
      totalOwners,
      activeShipments,
      onHandQtyKg,
      pendingBillingEvents,
      openAlerts,
      reconPassRate,
      inboundToday,
      outboundToday,
      warehouseUtilPct,
      kpiByOwner,
      movementTrend,
    };
  }

  private async getKpiByOwner(): Promise<KpiByOwner[]> {
    const owners = await this.prisma.mdOwner.findMany({
      where: { isActive: true },
      select: { id: true, ownerCode: true },
    });

    const kpiByOwner: KpiByOwner[] = [];

    for (const owner of owners) {
      // Get on-hand for this owner using physicalQty
      const onHandResult = await this.prisma.onHand.aggregate({
        where: {
          inventDim: { ownerId: owner.id },
        },
        _sum: { physicalQty: true },
      });

      // Get pending shipments for this owner
      const pendingShipments = await this.prisma.shipmentHeader.count({
        where: {
          ownerId: owner.id,
          status: { in: ['CONFIRMED', 'ALLOCATED', 'PICKING', 'PICKED', 'WEIGHING_TARE', 'LOADING', 'PENDING_APPROVAL'] },
        },
      });

      // Get billing outstanding for this owner (using grandTotal field)
      let billingOutstanding = 0;
      try {
        const billingResult = await this.prisma.bilDebitNote.aggregate({
          where: {
            ownerId: owner.id,
            status: { in: ['DRAFT', 'REVIEWED', 'APPROVED'] },
          },
          _sum: { grandTotal: true },
        });
        billingOutstanding = Number(billingResult._sum?.grandTotal || 0);
      } catch {
        billingOutstanding = 0;
      }

      kpiByOwner.push({
        ownerId: owner.id,
        ownerCode: owner.ownerCode,
        onHandKg: Number(onHandResult._sum?.physicalQty || 0),
        pendingShipments,
        billingOutstanding,
      });
    }

    return kpiByOwner;
  }

  private async getMovementTrend(): Promise<MovementTrend[]> {
    const trend: MovementTrend[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      // Get inbound for this day
      const inboundResult = await this.prisma.inventTrans.aggregate({
        where: {
          transType: { in: ['RECEIPT', 'RECEIPT_IN'] as any },
          postedAt: { gte: date, lt: nextDate },
        },
        _sum: { qty: true },
      });

      // Get outbound for this day
      const outboundResult = await this.prisma.inventTrans.aggregate({
        where: {
          transType: { in: ['ISSUE', 'SHIPMENT_OUT'] as any },
          postedAt: { gte: date, lt: nextDate },
        },
        _sum: { qty: true },
      });

      trend.push({
        date: date.toISOString().split('T')[0],
        inboundKg: Math.abs(Number(inboundResult._sum?.qty || 0)),
        outboundKg: Math.abs(Number(outboundResult._sum?.qty || 0)),
      });
    }

    return trend;
  }
}
