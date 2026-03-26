import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class MonitoringService {
  constructor(private readonly prisma: PrismaService) {}

  async getSiteOverview(siteId: string = 'TVL-SITE') {
    const warehouses = await this.prisma.mdWarehouse.findMany({
      where: { siteId, isActive: true },
      select: {
        id: true,
        warehouseCode: true,
        warehouseName: true,
        warehouseType: true,
        totalAreaM2: true,
        usableAreaM2: true,
        maxHeightM: true,
        maxCapacityMt: true,
        lengthM: true,
        widthM: true,
        siteXCoord: true,
        siteYCoord: true,
        siteRotationDeg: true,
        displayColor: true,
        hasWeighbridge: true,
        weighbridgeCount: true,
      },
      orderBy: { warehouseCode: 'asc' },
    });

    // Aggregate stock per warehouse
    const stockByWarehouse = await this.prisma.onHand.groupBy({
      by: ['itemId'],
      _sum: { physicalQty: true },
      where: {
        inventDim: {
          warehouseId: { in: warehouses.map((w) => w.id) },
          isActive: true,
        },
      },
    });

    // Get stock per warehouse via raw query for efficiency
    const warehouseStock: Array<{ warehouse_id: string; total_stock: number }> =
      await this.prisma.$queryRaw`
        SELECT id.warehouse_id, COALESCE(SUM(oh.physical_qty), 0)::float as total_stock
        FROM on_hand oh
        JOIN invent_dim id ON id.id = oh.invent_dim_id
        WHERE id.warehouse_id = ANY(${warehouses.map((w) => w.id)})
          AND id.is_active = true
        GROUP BY id.warehouse_id
      `;

    const stockMap = new Map(warehouseStock.map((s) => [s.warehouse_id, s.total_stock]));

    // Get zones per warehouse
    const allZones = await this.prisma.mdZone.findMany({
      where: {
        warehouseId: { in: warehouses.map((w) => w.id) },
        isActive: true,
      },
      select: {
        id: true,
        warehouseId: true,
        zoneCode: true,
        zoneName: true,
        zoneType: true,
        xCoord: true,
        yCoord: true,
        zoneWidthM: true,
        zoneDepthM: true,
        displayColor: true,
        maxCapacityMt: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Get racks per warehouse
    const allRacks = await this.prisma.mdRack.findMany({
      where: {
        warehouseId: { in: warehouses.map((w) => w.id) },
        isActive: true,
      },
      select: {
        id: true,
        warehouseId: true,
        rackCode: true,
        rackType: true,
        xCoord: true,
        yCoord: true,
        rackWidthM: true,
        rackDepthM: true,
        rackHeightM: true,
        rotationDeg: true,
        levels: true,
        baysPerLevel: true,
        displayColor: true,
      },
      orderBy: { rackCode: 'asc' },
    });

    // Get top items per warehouse
    const topItems: Array<{ warehouse_id: string; item_name: string; total_qty: number }> =
      await this.prisma.$queryRaw`
        SELECT id.warehouse_id, i.item_name, COALESCE(SUM(oh.physical_qty), 0)::float as total_qty
        FROM on_hand oh
        JOIN invent_dim id ON id.id = oh.invent_dim_id
        JOIN md_item i ON i.id = oh.item_id
        WHERE id.warehouse_id = ANY(${warehouses.map((w) => w.id)})
          AND id.is_active = true
        GROUP BY id.warehouse_id, i.item_name
        ORDER BY total_qty DESC
      `;

    const topItemsMap = new Map<string, Array<{ itemName: string; quantityMt: number }>>();
    for (const row of topItems) {
      const list = topItemsMap.get(row.warehouse_id) || [];
      if (list.length < 5) {
        list.push({ itemName: row.item_name, quantityMt: row.total_qty });
      }
      topItemsMap.set(row.warehouse_id, list);
    }

    return {
      siteId,
      warehouses: warehouses.map((wh) => {
        const currentStock = stockMap.get(wh.id) || 0;
        const maxCap = Number(wh.maxCapacityMt) || 1;
        return {
          ...wh,
          currentStockMt: currentStock,
          fillPercent: Math.min(100, Math.round((currentStock / maxCap) * 100 * 10) / 10),
          zones: allZones.filter((z) => z.warehouseId === wh.id),
          racks: allRacks.filter((r) => r.warehouseId === wh.id),
          topItems: topItemsMap.get(wh.id) || [],
        };
      }),
    };
  }

  async getWarehouseDetail(warehouseId: string) {
    const warehouse = await this.prisma.mdWarehouse.findUnique({
      where: { id: warehouseId },
      include: {
        owner: { select: { id: true, ownerCode: true, ownerName: true } },
      },
    });
    if (!warehouse) throw new NotFoundException(`Warehouse ${warehouseId} not found`);

    const zones = await this.prisma.mdZone.findMany({
      where: { warehouseId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    const racks = await this.prisma.mdRack.findMany({
      where: { warehouseId, isActive: true },
      orderBy: { rackCode: 'asc' },
    });

    const locations = await this.prisma.mdLocation.findMany({
      where: { warehouseId, isActive: true },
      orderBy: { locationCode: 'asc' },
    });

    // Stock per zone
    const zoneStock: Array<{ zone_id: string; total_qty: number }> =
      await this.prisma.$queryRaw`
        SELECT l.zone_id, COALESCE(SUM(oh.physical_qty), 0)::float as total_qty
        FROM on_hand oh
        JOIN invent_dim id ON id.id = oh.invent_dim_id
        JOIN md_location l ON l.id = id.location_id
        WHERE id.warehouse_id = ${warehouseId}
          AND id.is_active = true
        GROUP BY l.zone_id
      `;

    const zoneStockMap = new Map(zoneStock.map((s) => [s.zone_id, s.total_qty]));

    // Total stock
    const totalStock: Array<{ total: number }> = await this.prisma.$queryRaw`
      SELECT COALESCE(SUM(oh.physical_qty), 0)::float as total
      FROM on_hand oh
      JOIN invent_dim id ON id.id = oh.invent_dim_id
      WHERE id.warehouse_id = ${warehouseId} AND id.is_active = true
    `;

    const currentStockMt = totalStock[0]?.total || 0;
    const maxCap = Number(warehouse.maxCapacityMt) || 1;

    return {
      ...warehouse,
      currentStockMt,
      fillPercent: Math.min(100, Math.round((currentStockMt / maxCap) * 100 * 10) / 10),
      zones: zones.map((z) => ({
        ...z,
        currentStockMt: zoneStockMap.get(z.id) || 0,
      })),
      racks,
      locations,
    };
  }
}
