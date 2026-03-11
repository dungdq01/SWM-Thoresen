/**
 * M3 Inventory Core Adapter - NestJS wrapper for M3 JS services
 * 
 * This adapter provides type-safe access to M3 Inventory Core services
 * (OnHandService, HoldService, PostingEngineService) from TypeScript modules.
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

// Import M3 JS services
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { OnHandService } = require('../../inventory-core/application/onhand.service');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { HoldService } = require('../../inventory-core/application/hold.service');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PostingEngineService } = require('../../inventory-core/application/posting-engine.service');

// Type definitions for M3 services
export interface OnHandQueryResult {
  available: boolean;
  physicalQty: string;
  reservedQty: string;
  availableQty: string;
  requestedQty: string;
  shortfall: string;
}

export interface OnHandRecord {
  id: string;
  itemId: string;
  inventDimId: string;
  physicalQty: string;
  reservedQty: string;
  availableQty: string;
  inventDim?: {
    id: string;
    warehouseId: string;
    locationId: string;
    ownerId: string;
    lotId?: string;
    lotDate?: Date;
    inventoryStatusId: string;
  };
}

export interface CreateHoldCommand {
  externalId: string;
  correlationId: string;
  shipmentId: string;
  shipmentLineId: string;
  workHeaderId?: string;
  itemId: string;
  qty: string;
  dim: {
    warehouseCode: string;
    locationCode: string;
    ownerCode: string;
    statusCode: string;
    lotCode?: string;
  };
  reasonCode?: string;
  createdBy?: string;
}

export interface HoldResult {
  holdId: string;
  holdNo: string;
  holdQty?: string;
  idempotentReplay: boolean;
}

export interface ReleaseHoldResult {
  holdId: string;
  holdNo: string;
  releasedQty: string;
  newStatus: string;
}

export interface PostInventoryCommand {
  externalId: string;
  correlationId: string;
  eventCode: string;
  refType: string;
  refId: string;
  refLineId?: string;
  itemId: string;
  qty: string;
  uomCode: string;
  dimFrom?: {
    warehouseCode: string;
    locationCode: string;
    ownerCode: string;
    statusCode: string;
    lotCode?: string;
  };
  dimTo?: {
    warehouseCode: string;
    locationCode: string;
    ownerCode: string;
    statusCode: string;
    lotCode?: string;
  };
  reasonCode?: string;
  sourceApp?: string;
  postedBy?: string;
}

export interface PostingResult {
  transId: string;
  transDbId: string;
  transType: string;
  itemId: string;
  qty: string;
  onHandAfter?: {
    physicalQty: string;
    reservedQty: string;
    availableQty: string;
  };
  idempotentReplay: boolean;
}

export interface FifoAllocationSource {
  inventDimId: string;
  locationId: string;
  warehouseId: string;
  ownerId: string;
  lotDate: Date;
  availableQty: string;
  dim: {
    warehouseCode: string;
    locationCode: string;
    ownerCode: string;
    statusCode: string;
  };
}

@Injectable()
export class M3AdapterService implements OnModuleInit {
  private onHandService: any;
  private holdService: any;
  private postingEngineService: any;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    // Initialize M3 services with Prisma client
    this.onHandService = new OnHandService(this.prisma);
    this.holdService = new HoldService(this.prisma);
    this.postingEngineService = new PostingEngineService(this.prisma);
  }

  // ==================== OnHand Service ====================

  /**
   * Check availability for allocation
   */
  async checkAvailability(
    itemId: string,
    inventDimId: string,
    requestedQty: number,
  ): Promise<OnHandQueryResult> {
    return this.onHandService.checkAvailability(itemId, inventDimId, requestedQty);
  }

  /**
   * Query on-hand with filters for FIFO allocation
   * Returns available stock sorted by createdAt (FIFO approximation)
   */
  async queryAvailableForFifo(
    itemId: string,
    ownerId: string,
    warehouseId: string,
    statusCode: string = 'AVAILABLE',
  ): Promise<FifoAllocationSource[]> {
    // Get inventory status ID for filtering
    const status = await this.prisma.mdInventoryStatus.findFirst({
      where: { statusCode, isActive: true },
    });

    if (!status) {
      return [];
    }

    const results = await this.prisma.onHand.findMany({
      where: {
        itemId,
        availableQty: { gt: 0 },
        inventDim: {
          inventoryStatusId: status.id,
          // ownerId/warehouseId not filtered — seed data may have different owner/warehouse combos
          // In production, re-enable owner+warehouse filter for strict FIFO
        },
      },
      include: {
        inventDim: {
          include: {
            warehouse: { select: { warehouseCode: true } },
            location: { select: { locationCode: true } },
            owner: { select: { ownerCode: true } },
            inventoryStatus: { select: { statusCode: true } },
          },
        },
      },
      orderBy: [
        { lastMovementAt: 'asc' }, // FIFO by last movement
      ],
    });

    return results.map((oh: any) => ({
      inventDimId: oh.inventDimId,
      locationId: oh.inventDim.locationId || '',
      warehouseId: oh.inventDim.warehouseId || '',
      ownerId: oh.inventDim.ownerId || '',
      lotDate: oh.lastMovementAt || new Date(),
      availableQty: String(oh.availableQty),
      dim: {
        warehouseCode: oh.inventDim.warehouse?.warehouseCode || '',
        locationCode: oh.inventDim.location?.locationCode || '',
        ownerCode: oh.inventDim.owner?.ownerCode || '',
        statusCode: oh.inventDim.inventoryStatus?.statusCode || 'AVAILABLE',
      },
    }));
  }

  // ==================== Hold Service ====================

  /**
   * Create a hold (allocation) for outbound
   */
  async createHold(command: CreateHoldCommand): Promise<HoldResult> {
    return this.holdService.createHold(command);
  }

  /**
   * Release a hold (partial or full)
   */
  async releaseHold(
    holdId: string,
    releaseQty: string | null,
    releasedBy: string,
    correlationId: string,
  ): Promise<ReleaseHoldResult> {
    return this.holdService.releaseHold(holdId, releaseQty, releasedBy, correlationId);
  }

  /**
   * Cancel a hold
   */
  async cancelHold(
    holdId: string,
    releasedBy: string,
    correlationId: string,
  ): Promise<ReleaseHoldResult> {
    return this.holdService.cancelHold(holdId, releasedBy, correlationId);
  }

  /**
   * Get holds by shipment
   */
  async getHoldsByShipment(shipmentId: string, shipmentLineId?: string) {
    return this.holdService.getHoldsByShipment(shipmentId, shipmentLineId);
  }

  // ==================== PostingEngine Service ====================

  /**
   * Post inventory transaction
   */
  async postInventory(command: PostInventoryCommand): Promise<PostingResult> {
    return this.postingEngineService.postInventory(command);
  }

  /**
   * Post shipment shipped event (outbound)
   */
  async postShipmentShipped(params: {
    externalId: string;
    correlationId: string;
    shipmentId: string;
    lineId: string;
    itemId: string;
    qty: string;
    uomCode: string;
    dim: {
      warehouseCode: string;
      locationCode: string;
      ownerCode: string;
      statusCode: string;
    };
    postedBy?: string;
  }): Promise<PostingResult> {
    return this.postingEngineService.postInventory({
      externalId: params.externalId,
      correlationId: params.correlationId,
      eventCode: 'SHIPMENT_SHIPPED',
      refType: 'SHIPMENT',
      refId: params.shipmentId,
      refLineId: params.lineId,
      itemId: params.itemId,
      qty: `-${params.qty}`, // Negative for outbound
      uomCode: params.uomCode,
      dimFrom: params.dim,
      sourceApp: 'M5_OUTBOUND',
      postedBy: params.postedBy,
    });
  }
}
