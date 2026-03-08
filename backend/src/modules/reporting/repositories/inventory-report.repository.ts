import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { OnHandReportFilterDto, MovementReportFilterDto, AgingReportFilterDto } from '../dto';

export interface OnHandRow {
  warehouseCode: string;
  warehouseName: string;
  ownerCode: string;
  ownerName: string;
  itemCode: string;
  itemName: string;
  inventoryStatus: string;
  locationCode?: string;
  qty: number;
  reservedQty: number;
  availableQty: number;
}

export interface MovementRow {
  transId: string;
  postedAt: Date;
  transType: string;
  refType: string;
  refId: string;
  itemCode: string;
  itemName: string;
  qty: number;
  warehouseCode: string;
  ownerCode: string;
  locationCode: string;
  inventoryStatus: string;
  createdBy?: string;
}

export interface AgingRow {
  itemCode: string;
  itemName: string;
  ownerCode: string;
  warehouseCode: string;
  ageGroup: string;
  qty: number;
  daysInStorage: number;
}

@Injectable()
export class InventoryReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getOnHandSummary(filters: OnHandReportFilterDto): Promise<{ data: OnHandRow[]; total: number }> {
    const offset = ((filters.page || 1) - 1) * (filters.pageSize || 50);
    const limit = filters.pageSize || 50;

    const whereConditions: string[] = ['1=1'];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters.ownerId) {
      whereConditions.push(`id.owner_id = $${paramIndex}::uuid`);
      params.push(filters.ownerId);
      paramIndex++;
    }
    if (filters.warehouseId) {
      whereConditions.push(`id.warehouse_id = $${paramIndex}::uuid`);
      params.push(filters.warehouseId);
      paramIndex++;
    }
    if (filters.itemId) {
      whereConditions.push(`oh.item_id = $${paramIndex}::uuid`);
      params.push(filters.itemId);
      paramIndex++;
    }
    if (filters.inventoryStatus) {
      whereConditions.push(`is.status_code = $${paramIndex}`);
      params.push(filters.inventoryStatus);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    const countResult = await this.prisma.$queryRawUnsafe<{ count: bigint }[]>(`
      SELECT COUNT(*)::bigint as count
      FROM on_hand oh
      JOIN invent_dim id ON oh.invent_dim_id = id.id
      JOIN md_owner o ON id.owner_id = o.id
      JOIN md_warehouse wh ON id.warehouse_id = wh.id
      JOIN md_item i ON oh.item_id = i.id
      JOIN md_inventory_status is ON id.inventory_status_id = is.id
      WHERE ${whereClause}
    `, ...params);

    const dataResult = await this.prisma.$queryRawUnsafe<OnHandRow[]>(`
      SELECT 
        wh.warehouse_code as "warehouseCode",
        wh.warehouse_name as "warehouseName",
        o.owner_code as "ownerCode",
        o.owner_name as "ownerName",
        i.item_code as "itemCode",
        i.item_name as "itemName",
        is.status_code as "inventoryStatus",
        oh.qty::numeric as qty,
        COALESCE(oh.reserved_qty_picking, 0)::numeric + COALESCE(oh.reserved_qty_shipping, 0)::numeric as "reservedQty",
        (oh.qty - COALESCE(oh.reserved_qty_picking, 0) - COALESCE(oh.reserved_qty_shipping, 0))::numeric as "availableQty"
      FROM on_hand oh
      JOIN invent_dim id ON oh.invent_dim_id = id.id
      JOIN md_owner o ON id.owner_id = o.id
      JOIN md_warehouse wh ON id.warehouse_id = wh.id
      JOIN md_item i ON oh.item_id = i.id
      JOIN md_inventory_status is ON id.inventory_status_id = is.id
      WHERE ${whereClause}
      ORDER BY wh.warehouse_code, o.owner_code, i.item_code
      OFFSET ${offset} LIMIT ${limit}
    `, ...params);

    return {
      data: dataResult,
      total: Number(countResult[0]?.count || 0),
    };
  }

  async getMovementHistory(filters: MovementReportFilterDto): Promise<{ data: MovementRow[]; total: number }> {
    const offset = ((filters.page || 1) - 1) * (filters.pageSize || 50);
    const limit = filters.pageSize || 50;

    const whereConditions: string[] = ['1=1'];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters.ownerId) {
      whereConditions.push(`it.owner_id = $${paramIndex}::uuid`);
      params.push(filters.ownerId);
      paramIndex++;
    }
    if (filters.warehouseId) {
      whereConditions.push(`id.warehouse_id = $${paramIndex}::uuid`);
      params.push(filters.warehouseId);
      paramIndex++;
    }
    if (filters.itemId) {
      whereConditions.push(`it.item_id = $${paramIndex}::uuid`);
      params.push(filters.itemId);
      paramIndex++;
    }
    if (filters.fromDate) {
      whereConditions.push(`it.posted_at >= $${paramIndex}::timestamp`);
      params.push(new Date(filters.fromDate));
      paramIndex++;
    }
    if (filters.toDate) {
      whereConditions.push(`it.posted_at <= $${paramIndex}::timestamp`);
      params.push(new Date(filters.toDate));
      paramIndex++;
    }
    if (filters.transType) {
      whereConditions.push(`it.trans_type = $${paramIndex}`);
      params.push(filters.transType);
      paramIndex++;
    }
    if (filters.refType) {
      whereConditions.push(`it.ref_type = $${paramIndex}`);
      params.push(filters.refType);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    const countResult = await this.prisma.$queryRawUnsafe<{ count: bigint }[]>(`
      SELECT COUNT(*)::bigint as count
      FROM invent_trans it
      JOIN invent_dim id ON it.invent_dim_id = id.id
      WHERE ${whereClause}
    `, ...params);

    const dataResult = await this.prisma.$queryRawUnsafe<MovementRow[]>(`
      SELECT 
        it.trans_id as "transId",
        it.posted_at as "postedAt",
        it.trans_type as "transType",
        it.ref_type as "refType",
        it.ref_id as "refId",
        i.item_code as "itemCode",
        i.item_name as "itemName",
        it.qty::numeric as qty,
        wh.warehouse_code as "warehouseCode",
        o.owner_code as "ownerCode",
        COALESCE(loc.location_code, 'N/A') as "locationCode",
        is.status_code as "inventoryStatus",
        it.created_by::text as "createdBy"
      FROM invent_trans it
      JOIN invent_dim id ON it.invent_dim_id = id.id
      JOIN md_item i ON it.item_id = i.id
      JOIN md_owner o ON it.owner_id = o.id
      JOIN md_warehouse wh ON id.warehouse_id = wh.id
      LEFT JOIN md_location loc ON id.location_id = loc.id
      JOIN md_inventory_status is ON id.inventory_status_id = is.id
      WHERE ${whereClause}
      ORDER BY it.posted_at DESC, it.trans_id DESC
      OFFSET ${offset} LIMIT ${limit}
    `, ...params);

    return {
      data: dataResult,
      total: Number(countResult[0]?.count || 0),
    };
  }

  async getAgingReport(filters: AgingReportFilterDto): Promise<{ data: AgingRow[]; total: number }> {
    const offset = ((filters.page || 1) - 1) * (filters.pageSize || 50);
    const limit = filters.pageSize || 50;
    const buckets = filters.agingBuckets || [30, 60, 90, 180];

    const whereConditions: string[] = ['1=1'];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters.ownerId) {
      whereConditions.push(`id.owner_id = $${paramIndex}::uuid`);
      params.push(filters.ownerId);
      paramIndex++;
    }
    if (filters.warehouseId) {
      whereConditions.push(`id.warehouse_id = $${paramIndex}::uuid`);
      params.push(filters.warehouseId);
      paramIndex++;
    }
    if (filters.itemId) {
      whereConditions.push(`oh.item_id = $${paramIndex}::uuid`);
      params.push(filters.itemId);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    const countResult = await this.prisma.$queryRawUnsafe<{ count: bigint }[]>(`
      SELECT COUNT(DISTINCT (oh.item_id, id.owner_id, id.warehouse_id))::bigint as count
      FROM on_hand oh
      JOIN invent_dim id ON oh.invent_dim_id = id.id
      WHERE ${whereClause}
    `, ...params);

    const dataResult = await this.prisma.$queryRawUnsafe<AgingRow[]>(`
      SELECT 
        i.item_code as "itemCode",
        i.item_name as "itemName",
        o.owner_code as "ownerCode",
        wh.warehouse_code as "warehouseCode",
        CASE 
          WHEN dss.days_in_storage <= ${buckets[0]} THEN '0-${buckets[0]} days'
          WHEN dss.days_in_storage <= ${buckets[1]} THEN '${buckets[0]}-${buckets[1]} days'
          WHEN dss.days_in_storage <= ${buckets[2]} THEN '${buckets[1]}-${buckets[2]} days'
          ELSE '>${buckets[2]} days'
        END as "ageGroup",
        oh.qty::numeric as qty,
        COALESCE(dss.days_in_storage, 0) as "daysInStorage"
      FROM on_hand oh
      JOIN invent_dim id ON oh.invent_dim_id = id.id
      JOIN md_item i ON oh.item_id = i.id
      JOIN md_owner o ON id.owner_id = o.id
      JOIN md_warehouse wh ON id.warehouse_id = wh.id
      LEFT JOIN bil_storage_snapshot dss ON dss.item_id = oh.item_id 
        AND dss.owner_id = id.owner_id 
        AND dss.warehouse_id = id.warehouse_id
        AND dss.snapshot_date = CURRENT_DATE
      WHERE ${whereClause}
      ORDER BY dss.days_in_storage DESC NULLS LAST, i.item_code
      OFFSET ${offset} LIMIT ${limit}
    `, ...params);

    return {
      data: dataResult,
      total: Number(countResult[0]?.count || 0),
    };
  }

  async getTotals(filters: OnHandReportFilterDto): Promise<{ totalQty: number; totalReserved: number; totalAvailable: number }> {
    const whereConditions: string[] = ['1=1'];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters.ownerId) {
      whereConditions.push(`id.owner_id = $${paramIndex}::uuid`);
      params.push(filters.ownerId);
      paramIndex++;
    }
    if (filters.warehouseId) {
      whereConditions.push(`id.warehouse_id = $${paramIndex}::uuid`);
      params.push(filters.warehouseId);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    const result = await this.prisma.$queryRawUnsafe<{ total_qty: number; total_reserved: number }[]>(`
      SELECT 
        COALESCE(SUM(oh.qty), 0)::numeric as total_qty,
        COALESCE(SUM(COALESCE(oh.reserved_qty_picking, 0) + COALESCE(oh.reserved_qty_shipping, 0)), 0)::numeric as total_reserved
      FROM on_hand oh
      JOIN invent_dim id ON oh.invent_dim_id = id.id
      WHERE ${whereClause}
    `, ...params);

    const totalQty = Number(result[0]?.total_qty || 0);
    const totalReserved = Number(result[0]?.total_reserved || 0);

    return {
      totalQty,
      totalReserved,
      totalAvailable: totalQty - totalReserved,
    };
  }
}
