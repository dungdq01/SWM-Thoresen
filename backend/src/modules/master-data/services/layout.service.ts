import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { LogService } from '../../foundation/services/log.service';
import { SaveWarehouseLayoutDto, SaveSiteLayoutDto } from '../dto/layout.dto';
import { RequestContext } from '../dto/common.dto';

@Injectable()
export class LayoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logService: LogService,
  ) {}

  // ─── Warehouse Layout ──────────────────────────────────────────────────────

  async getWarehouseLayout(warehouseId: string) {
    const warehouse = await this.prisma.mdWarehouse.findUnique({
      where: { id: warehouseId },
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
        displayColor: true,
        rowVersion: true,
      },
    });
    if (!warehouse) throw new NotFoundException(`Warehouse ${warehouseId} not found`);

    const zones = await this.prisma.mdZone.findMany({
      where: { warehouseId, isActive: true },
      select: {
        id: true,
        zoneCode: true,
        zoneName: true,
        zoneType: true,
        maxCapacityMt: true,
        xCoord: true,
        yCoord: true,
        zoneWidthM: true,
        zoneDepthM: true,
        rotationDeg: true,
        displayColor: true,
        sortOrder: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    const racks = await this.prisma.mdRack.findMany({
      where: { warehouseId, isActive: true },
      select: {
        id: true,
        rackCode: true,
        rackName: true,
        rackType: true,
        zoneId: true,
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

    const locations = await this.prisma.mdLocation.findMany({
      where: { warehouseId, isActive: true },
      select: {
        id: true,
        locationCode: true,
        locationType: true,
        locationProfile: true,
        zoneId: true,
        xCoord: true,
        yCoord: true,
        locationWidthM: true,
        locationDepthM: true,
        rotationDeg: true,
        displayColor: true,
      },
      orderBy: { locationCode: 'asc' },
    });

    return { warehouse, zones, racks, locations };
  }

  async saveWarehouseLayout(warehouseId: string, dto: SaveWarehouseLayoutDto, ctx: RequestContext) {
    const warehouse = await this.prisma.mdWarehouse.findUnique({ where: { id: warehouseId } });
    if (!warehouse) throw new NotFoundException(`Warehouse ${warehouseId} not found`);
    if (!warehouse.isActive) throw new BadRequestException('Cannot update layout of inactive warehouse');

    return this.prisma.$transaction(async (tx) => {
      // 1. Update warehouse dimensions
      const updatedWarehouse = await tx.mdWarehouse.update({
        where: { id: warehouseId, rowVersion: BigInt(dto.rowVersion) },
        data: {
          ...(dto.lengthM !== undefined ? { lengthM: dto.lengthM } : {}),
          ...(dto.widthM !== undefined ? { widthM: dto.widthM } : {}),
          rowVersion: { increment: 1 },
          updatedBy: ctx.userId,
        },
      });

      // 2. Update zone geometries
      for (const zone of dto.zones) {
        await tx.mdZone.update({
          where: { id: zone.id },
          data: {
            xCoord: zone.xCoord,
            yCoord: zone.yCoord,
            zoneWidthM: zone.zoneWidthM,
            zoneDepthM: zone.zoneDepthM,
            rotationDeg: zone.rotationDeg ?? 0,
            displayColor: zone.displayColor,
            sortOrder: zone.sortOrder,
            rowVersion: { increment: 1 },
            updatedBy: ctx.userId,
          },
        });
      }

      // 3. Upsert racks
      for (const rack of dto.racks) {
        if (rack.id) {
          await tx.mdRack.update({
            where: { id: rack.id },
            data: {
              rackCode: rack.rackCode,
              rackName: rack.rackName,
              rackType: rack.rackType,
              zoneId: rack.zoneId || null,
              xCoord: rack.xCoord,
              yCoord: rack.yCoord,
              rackWidthM: rack.rackWidthM,
              rackDepthM: rack.rackDepthM,
              rackHeightM: rack.rackHeightM,
              rotationDeg: rack.rotationDeg ?? 0,
              levels: rack.levels ?? 1,
              baysPerLevel: rack.baysPerLevel ?? 1,
              displayColor: rack.displayColor,
              rowVersion: { increment: 1 },
              updatedBy: ctx.userId,
            },
          });
        } else {
          await tx.mdRack.create({
            data: {
              rackCode: rack.rackCode,
              rackName: rack.rackName,
              rackType: rack.rackType,
              xCoord: rack.xCoord,
              yCoord: rack.yCoord,
              rackWidthM: rack.rackWidthM,
              rackDepthM: rack.rackDepthM,
              rackHeightM: rack.rackHeightM,
              rotationDeg: rack.rotationDeg ?? 0,
              levels: rack.levels ?? 1,
              baysPerLevel: rack.baysPerLevel ?? 1,
              displayColor: rack.displayColor,
              warehouse: { connect: { id: warehouseId } },
              ...(rack.zoneId ? { zone: { connect: { id: rack.zoneId } } } : {}),
              createdBy: ctx.userId,
              updatedBy: ctx.userId,
            },
          });
        }
      }

      // 4. Update location positions
      for (const loc of dto.locations) {
        await tx.mdLocation.update({
          where: { id: loc.id },
          data: {
            xCoord: loc.xCoord,
            yCoord: loc.yCoord,
            locationWidthM: loc.locationWidthM,
            locationDepthM: loc.locationDepthM,
            rotationDeg: loc.rotationDeg ?? 0,
            displayColor: loc.displayColor,
            rowVersion: { increment: 1 },
            updatedBy: ctx.userId,
          },
        });
      }

      await this.logService.createAuditLog({
        entityType: 'WAREHOUSE',
        entityId: warehouseId,
        action: 'UPDATE_LAYOUT',
        userId: ctx.userId,
        newValue: { zones: dto.zones.length, racks: dto.racks.length, locations: dto.locations.length },
      });

      return updatedWarehouse;
    });
  }

  // ─── Site Map Layout ───────────────────────────────────────────────────────

  async getSiteLayout(siteId: string) {
    const warehouses = await this.prisma.mdWarehouse.findMany({
      where: { siteId, isActive: true },
      select: {
        id: true,
        warehouseCode: true,
        warehouseName: true,
        warehouseType: true,
        totalAreaM2: true,
        lengthM: true,
        widthM: true,
        siteXCoord: true,
        siteYCoord: true,
        siteRotationDeg: true,
        displayColor: true,
      },
      orderBy: { warehouseCode: 'asc' },
    });

    const elements = await this.prisma.mdSiteMapElement.findMany({
      where: { siteId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    return { siteId, warehouses, elements };
  }

  async saveSiteLayout(siteId: string, dto: SaveSiteLayoutDto, ctx: RequestContext) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Update warehouse positions
      for (const wh of dto.warehouses) {
        await tx.mdWarehouse.update({
          where: { id: wh.id },
          data: {
            siteXCoord: wh.siteXCoord,
            siteYCoord: wh.siteYCoord,
            siteRotationDeg: wh.siteRotationDeg ?? 0,
            displayColor: wh.displayColor,
            rowVersion: { increment: 1 },
            updatedBy: ctx.userId,
          },
        });
      }

      // 2. Upsert site map elements
      for (const el of dto.elements) {
        if (el.id) {
          await tx.mdSiteMapElement.update({
            where: { id: el.id },
            data: {
              elementType: el.elementType,
              label: el.label,
              xCoord: el.xCoord,
              yCoord: el.yCoord,
              elementWidthM: el.elementWidthM,
              elementDepthM: el.elementDepthM,
              rotationDeg: el.rotationDeg ?? 0,
              metadata: el.metadata,
              updatedBy: ctx.userId,
            },
          });
        } else {
          await tx.mdSiteMapElement.create({
            data: {
              siteId,
              elementType: el.elementType,
              label: el.label,
              xCoord: el.xCoord,
              yCoord: el.yCoord,
              elementWidthM: el.elementWidthM,
              elementDepthM: el.elementDepthM,
              rotationDeg: el.rotationDeg ?? 0,
              metadata: el.metadata,
              createdBy: ctx.userId,
              updatedBy: ctx.userId,
            },
          });
        }
      }

      await this.logService.createAuditLog({
        entityType: 'SITE_MAP',
        entityId: siteId,
        action: 'UPDATE_LAYOUT',
        userId: ctx.userId,
        newValue: { warehouses: dto.warehouses.length, elements: dto.elements.length },
      });

      return { success: true };
    });
  }
}
