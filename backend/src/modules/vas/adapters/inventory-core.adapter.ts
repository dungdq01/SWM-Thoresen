/**
 * Adapter to bridge VAS Module (NestJS/TypeScript) with M3 Inventory Core (JavaScript)
 * This adapter wraps M3's PostingEngineService and HoldService for use in VAS module
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma, InventoryTransType } from '@prisma/client';

// Import M3 services (CommonJS)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PostingEngineService } = require('../../inventory-core/application/posting-engine.service');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { HoldService } = require('../../inventory-core/application/hold.service');

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
  dimFrom?: DimensionInput;
  dimTo?: DimensionInput;
  reasonCode?: string;
  sourceApp: string;
  postedBy: string;
  weighbridgeTicketId?: string;
}

export interface DimensionInput {
  warehouseCode: string;
  locationCode?: string;
  ownerCode: string;
  statusCode: string;
}

export interface PostInventoryResult {
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

export interface CreateHoldCommand {
  externalId?: string;
  correlationId: string;
  refType: string;
  refId: string;
  itemId: string;
  qty: string;
  dim: DimensionInput;
  reasonCode?: string;
  createdBy: string;
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

@Injectable()
export class InventoryCoreAdapter implements OnModuleInit {
  private readonly logger = new Logger(InventoryCoreAdapter.name);
  private postingEngine: any;
  private holdService: any;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    // Initialize M3 services with Prisma client
    this.postingEngine = new PostingEngineService(this.prisma);
    this.holdService = new HoldService(this.prisma);
    this.logger.log('InventoryCoreAdapter initialized with M3 services');
  }

  /**
   * Post inventory transaction through M3 PostingEngine
   */
  async postInventory(command: PostInventoryCommand): Promise<PostInventoryResult> {
    this.logger.log(`Posting inventory: ${command.eventCode} for ${command.refType}/${command.refId}`);
    
    try {
      const result = await this.postingEngine.postInventory(command);
      
      this.logger.log(`Posted transaction ${result.transId}, idempotent=${result.idempotentReplay}`);
      
      return {
        transId: result.transId,
        transDbId: result.transDbId,
        transType: result.transType,
        itemId: result.itemId,
        qty: result.qty,
        onHandAfter: result.onHandAfter,
        idempotentReplay: result.idempotentReplay,
      };
    } catch (error: any) {
      this.logger.error(`Failed to post inventory: ${error?.message}`, error?.stack);
      throw error;
    }
  }

  /**
   * Create hold (reservation) through M3 HoldService
   */
  async createHold(command: CreateHoldCommand): Promise<HoldResult> {
    this.logger.log(`Creating hold for ${command.refType}/${command.refId}, qty=${command.qty}`);
    
    try {
      const result = await this.holdService.createHold({
        externalId: command.externalId,
        correlationId: command.correlationId,
        shipmentId: command.refType === 'VAS_WO' ? null : command.refId,
        shipmentLineId: null,
        workHeaderId: command.refType === 'VAS_WO' ? command.refId : null,
        itemId: command.itemId,
        qty: command.qty,
        dim: command.dim,
        reasonCode: command.reasonCode,
        createdBy: command.createdBy,
      });
      
      this.logger.log(`Created hold ${result.holdNo}, idempotent=${result.idempotentReplay}`);
      
      return {
        holdId: result.holdId,
        holdNo: result.holdNo,
        holdQty: result.holdQty,
        idempotentReplay: result.idempotentReplay,
      };
    } catch (error: any) {
      this.logger.error(`Failed to create hold: ${error?.message}`, error?.stack);
      throw error;
    }
  }

  /**
   * Release hold through M3 HoldService
   */
  async releaseHold(holdId: string, releasedBy: string, correlationId: string): Promise<ReleaseHoldResult> {
    this.logger.log(`Releasing hold ${holdId}`);
    
    try {
      const result = await this.holdService.releaseHold(holdId, null, releasedBy, correlationId);
      
      this.logger.log(`Released hold ${result.holdNo}, status=${result.newStatus}`);
      
      return {
        holdId: result.holdId,
        holdNo: result.holdNo,
        releasedQty: result.releasedQty,
        newStatus: result.newStatus,
      };
    } catch (error: any) {
      this.logger.error(`Failed to release hold: ${error?.message}`, error?.stack);
      throw error;
    }
  }

  /**
   * Cancel hold through M3 HoldService
   */
  async cancelHold(holdId: string, cancelledBy: string, correlationId: string): Promise<ReleaseHoldResult> {
    this.logger.log(`Cancelling hold ${holdId}`);
    
    try {
      const result = await this.holdService.cancelHold(holdId, cancelledBy, correlationId);
      
      this.logger.log(`Cancelled hold ${result.holdNo}`);
      
      return {
        holdId: result.holdId,
        holdNo: result.holdNo,
        releasedQty: result.releasedQty,
        newStatus: result.newStatus,
      };
    } catch (error: any) {
      this.logger.error(`Failed to cancel hold: ${error?.message}`, error?.stack);
      throw error;
    }
  }

  /**
   * Find holds by reference
   */
  async findHoldsByRef(refType: string, refId: string): Promise<any[]> {
    return this.prisma.inventoryHold.findMany({
      where: {
        OR: [
          { shipmentId: refType === 'VAS_WO' ? undefined : refId },
          { workHeaderId: refType === 'VAS_WO' ? refId : undefined },
        ],
        status: { in: ['ACTIVE', 'PARTIALLY_RELEASED'] },
      },
    });
  }
}
