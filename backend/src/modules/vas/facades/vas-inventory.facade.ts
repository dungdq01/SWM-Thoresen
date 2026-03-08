import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { InventoryCoreAdapter } from '../adapters/inventory-core.adapter';

export interface StockAvailability {
  physicalQty: Prisma.Decimal;
  reservedQtyShipment: Prisma.Decimal;
  reservedQtyVas: Prisma.Decimal;
  availableQty: Prisma.Decimal;
}

export interface VasPostingCommand {
  woId: string;
  woNumber: string;
  ownerId: string;
  ownerCode: string;
  warehouseId: string;
  warehouseCode: string;
  bulkSourceItemId: string;
  baggedOutputItemId: string;
  packagingItemId: string;
  packagingOwnerId: string;
  packagingOwnerCode: string;
  actualConsumedQtyKg: Prisma.Decimal;
  actualOutputQtyKg: Prisma.Decimal;
  packagingQtyActual: number;
  correlationId: string;
  actorId: string;
}

export interface VasHoldInfo {
  holdId: string;
  holdNo: string;
}

@Injectable()
export class VasInventoryFacade {
  private readonly logger = new Logger(VasInventoryFacade.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryCoreAdapter: InventoryCoreAdapter,
  ) {}

  async getBulkAvailable(
    params: {
      ownerId: string;
      warehouseId: string;
      itemId: string;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<StockAvailability> {
    const client = tx ?? this.prisma;

    const onHandRecords = await client.onHand.findMany({
      where: {
        itemId: params.itemId,
        inventDim: {
          ownerId: params.ownerId,
          warehouseId: params.warehouseId,
        },
      },
    });

    if (onHandRecords.length === 0) {
      return {
        physicalQty: new Prisma.Decimal(0),
        reservedQtyShipment: new Prisma.Decimal(0),
        reservedQtyVas: new Prisma.Decimal(0),
        availableQty: new Prisma.Decimal(0),
      };
    }

    let totalPhysical = new Prisma.Decimal(0);
    let totalReserved = new Prisma.Decimal(0);
    for (const oh of onHandRecords) {
      totalPhysical = totalPhysical.plus(oh.physicalQty);
      totalReserved = totalReserved.plus(oh.reservedQty);
    }

    const availableQty = totalPhysical.minus(totalReserved);

    return {
      physicalQty: totalPhysical,
      reservedQtyShipment: totalReserved,
      reservedQtyVas: new Prisma.Decimal(0),
      availableQty: availableQty.greaterThan(0) ? availableQty : new Prisma.Decimal(0),
    };
  }

  async getPackagingAvailable(
    params: {
      ownerId: string;
      warehouseId: string;
      itemId: string;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;

    const onHandRecords = await client.onHand.findMany({
      where: {
        itemId: params.itemId,
        inventDim: {
          ownerId: params.ownerId,
          warehouseId: params.warehouseId,
        },
      },
    });

    if (onHandRecords.length === 0) return 0;

    let available = new Prisma.Decimal(0);
    for (const oh of onHandRecords) {
      available = available.plus(oh.physicalQty.minus(oh.reservedQty));
    }

    return available.greaterThan(0) ? available.toNumber() : 0;
  }

  async reserveVasBulk(
    woId: string,
    params: {
      ownerId: string;
      ownerCode: string;
      warehouseId: string;
      warehouseCode: string;
      itemId: string;
      qtyKg: Prisma.Decimal;
      correlationId: string;
      actorId: string;
    },
    _tx: Prisma.TransactionClient,
  ): Promise<VasHoldInfo> {
    this.logger.log(`Reserving bulk for WO ${woId}: ${params.qtyKg}kg`);

    const result = await this.inventoryCoreAdapter.createHold({
      externalId: `VAS_HOLD_${woId}`,
      correlationId: params.correlationId,
      refType: 'VAS_WO',
      refId: woId,
      itemId: params.itemId,
      qty: params.qtyKg.toString(),
      dim: {
        warehouseCode: params.warehouseCode,
        ownerCode: params.ownerCode,
        statusCode: 'AVAILABLE',
      },
      createdBy: params.actorId,
    });

    this.logger.log(`Created hold ${result.holdNo} for WO ${woId}`);
    return { holdId: result.holdId, holdNo: result.holdNo };
  }

  async releaseVasReservation(
    woId: string,
    actorId: string,
    correlationId: string,
    _tx: Prisma.TransactionClient,
  ): Promise<void> {
    this.logger.log(`Releasing VAS reservation for WO ${woId}`);

    const holds = await this.inventoryCoreAdapter.findHoldsByRef('VAS_WO', woId);
    
    for (const hold of holds) {
      try {
        await this.inventoryCoreAdapter.cancelHold(hold.id, actorId, correlationId);
        this.logger.log(`Cancelled hold ${hold.holdNo} for WO ${woId}`);
      } catch (error: any) {
        this.logger.warn(`Failed to cancel hold ${hold.id}: ${error?.message}`);
      }
    }
  }

  async postVasCompletion(
    command: VasPostingCommand,
    _tx: Prisma.TransactionClient,
  ): Promise<string[]> {
    this.logger.log(`Posting VAS completion for WO ${command.woNumber}`);
    const transIds: string[] = [];

    // 1. Post CONSUME for bulk source (negative qty)
    const consumeResult = await this.inventoryCoreAdapter.postInventory({
      externalId: `VAS_CONSUME_${command.woNumber}`,
      correlationId: command.correlationId,
      eventCode: 'VAS_CONSUME_BULK',
      refType: 'VAS_WO',
      refId: command.woId,
      itemId: command.bulkSourceItemId,
      qty: command.actualConsumedQtyKg.negated().toString(),
      uomCode: 'KG',
      dimFrom: {
        warehouseCode: command.warehouseCode,
        ownerCode: command.ownerCode,
        statusCode: 'AVAILABLE',
      },
      sourceApp: 'WMS',
      postedBy: command.actorId,
    });
    transIds.push(consumeResult.transId);
    this.logger.log(`Posted consume trans ${consumeResult.transId}`);

    // 2. Post PRODUCE for bagged output (positive qty)
    const produceResult = await this.inventoryCoreAdapter.postInventory({
      externalId: `VAS_PRODUCE_${command.woNumber}`,
      correlationId: command.correlationId,
      eventCode: 'VAS_PRODUCE_BAGGED',
      refType: 'VAS_WO',
      refId: command.woId,
      itemId: command.baggedOutputItemId,
      qty: command.actualOutputQtyKg.toString(),
      uomCode: 'KG',
      dimTo: {
        warehouseCode: command.warehouseCode,
        ownerCode: command.ownerCode,
        statusCode: 'AVAILABLE',
      },
      sourceApp: 'WMS',
      postedBy: command.actorId,
    });
    transIds.push(produceResult.transId);
    this.logger.log(`Posted produce trans ${produceResult.transId}`);

    // 3. Post CONSUME for packaging (negative qty)
    const packagingResult = await this.inventoryCoreAdapter.postInventory({
      externalId: `VAS_PACKAGING_${command.woNumber}`,
      correlationId: command.correlationId,
      eventCode: 'VAS_CONSUME_PACKAGING',
      refType: 'VAS_WO',
      refId: command.woId,
      itemId: command.packagingItemId,
      qty: (-command.packagingQtyActual).toString(),
      uomCode: 'EA',
      dimFrom: {
        warehouseCode: command.warehouseCode,
        ownerCode: command.packagingOwnerCode,
        statusCode: 'AVAILABLE',
      },
      sourceApp: 'WMS',
      postedBy: command.actorId,
    });
    transIds.push(packagingResult.transId);
    this.logger.log(`Posted packaging trans ${packagingResult.transId}`);

    this.logger.log(`Posted ${transIds.length} transactions for WO ${command.woNumber}`);
    return transIds;
  }
}
