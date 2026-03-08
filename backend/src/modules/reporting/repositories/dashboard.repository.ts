import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

export interface WidgetData {
  code: string;
  label: string;
  value: number;
  subValue?: number;
  unit?: string;
}

export interface DashboardFilters {
  ownerId?: string;
  warehouseId?: string;
  date: Date;
}

@Injectable()
export class DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getInboundTodayWidget(filters: DashboardFilters): Promise<WidgetData> {
    const result = await this.prisma.$queryRaw<{ count: bigint; total_mt: number }[]>`
      SELECT 
        COUNT(*)::bigint as count,
        COALESCE(SUM(rl.received_qty_mt), 0)::numeric as total_mt
      FROM receipt_header rh
      JOIN receipt_line rl ON rh.id = rl.receipt_header_id
      WHERE rh.status IN ('RECEIVED', 'CLOSED')
        AND DATE(rh.received_at) = ${filters.date}
        ${filters.warehouseId ? this.prisma.$queryRaw`AND rh.warehouse_id = ${filters.warehouseId}::uuid` : this.prisma.$queryRaw``}
        ${filters.ownerId ? this.prisma.$queryRaw`AND rh.owner_id = ${filters.ownerId}::uuid` : this.prisma.$queryRaw``}
    `;

    return {
      code: 'INBOUND_TODAY',
      label: 'Inbound Today',
      value: Number(result[0]?.count || 0),
      subValue: Number(result[0]?.total_mt || 0),
      unit: 'receipt / MT',
    };
  }

  async getOutboundTodayWidget(filters: DashboardFilters): Promise<WidgetData> {
    const result = await this.prisma.$queryRaw<{ count: bigint; total_mt: number }[]>`
      SELECT 
        COUNT(*)::bigint as count,
        COALESCE(SUM(sl.shipped_qty_mt), 0)::numeric as total_mt
      FROM shipment_header sh
      JOIN shipment_line sl ON sh.id = sl.shipment_header_id
      WHERE sh.status IN ('SHIPPED', 'CLOSED')
        AND DATE(sh.shipped_at) = ${filters.date}
        ${filters.warehouseId ? this.prisma.$queryRaw`AND sh.warehouse_id = ${filters.warehouseId}::uuid` : this.prisma.$queryRaw``}
        ${filters.ownerId ? this.prisma.$queryRaw`AND sh.owner_id = ${filters.ownerId}::uuid` : this.prisma.$queryRaw``}
    `;

    return {
      code: 'OUTBOUND_TODAY',
      label: 'Outbound Today',
      value: Number(result[0]?.count || 0),
      subValue: Number(result[0]?.total_mt || 0),
      unit: 'shipment / MT',
    };
  }

  async getWorkQueueWidget(filters: DashboardFilters): Promise<WidgetData> {
    const result = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint as count
      FROM we_work_header wh
      WHERE wh.status IN ('OPEN', 'CLAIMED', 'IN_PROGRESS')
        ${filters.warehouseId ? this.prisma.$queryRaw`AND wh.warehouse_id = ${filters.warehouseId}::uuid` : this.prisma.$queryRaw``}
    `;

    return {
      code: 'WORK_QUEUE',
      label: 'Work Queue',
      value: Number(result[0]?.count || 0),
      unit: 'tasks',
    };
  }

  async getExceptionCountWidget(filters: DashboardFilters): Promise<WidgetData> {
    const result = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint as count
      FROM exception_log el
      WHERE el.is_resolved = false
        AND DATE(el.occurred_at) >= ${new Date(filters.date.getTime() - 7 * 24 * 60 * 60 * 1000)}
    `;

    return {
      code: 'EXCEPTION_COUNT',
      label: 'Open Exceptions',
      value: Number(result[0]?.count || 0),
      unit: 'issues',
    };
  }

  async getPendingDnWidget(filters: DashboardFilters): Promise<WidgetData> {
    const result = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint as count
      FROM bil_debit_note dn
      WHERE dn.status IN ('DRAFT', 'UNDER_REVIEW', 'APPROVED')
        ${filters.ownerId ? this.prisma.$queryRaw`AND dn.owner_id = ${filters.ownerId}::uuid` : this.prisma.$queryRaw``}
    `;

    return {
      code: 'PENDING_DN',
      label: 'Pending Debit Notes',
      value: Number(result[0]?.count || 0),
      unit: 'DN',
    };
  }

  async getUtilizationWidget(filters: DashboardFilters): Promise<WidgetData> {
    const result = await this.prisma.$queryRaw<{ used_mt: number; capacity_mt: number }[]>`
      SELECT 
        COALESCE(SUM(oh.qty), 0)::numeric as used_mt,
        COALESCE(SUM(wh.max_capacity_mt), 0)::numeric as capacity_mt
      FROM on_hand oh
      JOIN invent_dim id ON oh.invent_dim_id = id.id
      JOIN md_warehouse wh ON id.warehouse_id = wh.id
      WHERE 1=1
        ${filters.warehouseId ? this.prisma.$queryRaw`AND id.warehouse_id = ${filters.warehouseId}::uuid` : this.prisma.$queryRaw``}
    `;

    const usedMt = Number(result[0]?.used_mt || 0);
    const capacityMt = Number(result[0]?.capacity_mt || 1);
    const utilizationPct = Math.round((usedMt / capacityMt) * 100);

    return {
      code: 'UTILIZATION',
      label: 'Capacity Utilization',
      value: utilizationPct,
      subValue: usedMt,
      unit: '%',
    };
  }

  async getCacheEntry(widgetCode: string, cacheKey: string): Promise<{ payload: unknown; expiresAt: Date } | null> {
    const cache = await this.prisma.rptDashboardCache.findUnique({
      where: { widgetCode_cacheKey: { widgetCode, cacheKey } },
    });

    if (!cache || cache.expiresAt < new Date()) {
      return null;
    }

    return { payload: cache.cachePayload, expiresAt: cache.expiresAt };
  }

  async setCacheEntry(widgetCode: string, cacheKey: string, payload: unknown, ttlSeconds: number): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    
    await this.prisma.rptDashboardCache.upsert({
      where: { widgetCode_cacheKey: { widgetCode, cacheKey } },
      update: {
        cachePayload: payload as any,
        sourceFreshAt: new Date(),
        expiresAt,
      },
      create: {
        widgetCode,
        cacheKey,
        cachePayload: payload as any,
        sourceFreshAt: new Date(),
        expiresAt,
      },
    });
  }
}
