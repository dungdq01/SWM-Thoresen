import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma } from '@prisma/client';

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
  warehouseId: string;
  bulkSourceItemId: string;
  baggedOutputItemId: string;
  packagingItemId: string;
  packagingOwnerId: string;
  actualConsumedQtyKg: Prisma.Decimal;
  actualOutputQtyKg: Prisma.Decimal;
  packagingQtyActual: number;
  correlationId: string;
  actorId: string;
}

@Injectable()
export class VasInventoryFacade {
  private readonly logger = new Logger(VasInventoryFacade.name);

  constructor(private readonly prisma: PrismaService) {}

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
      warehouseId: string;
      itemId: string;
      qtyKg: Prisma.Decimal;
    },
    _tx: Prisma.TransactionClient,
  ): Promise<void> {
    this.logger.log(`[STUB] Reserving bulk for WO ${woId}: ${params.qtyKg}kg`);
    // TODO: Integrate with M3 InventoryHold service when available
    // For now, this is a stub - actual hold creation requires onHandId which needs proper dimension lookup
  }

  async releaseVasReservation(
    woId: string,
    _tx: Prisma.TransactionClient,
  ): Promise<void> {
    this.logger.log(`[STUB] Releasing VAS reservation for WO ${woId}`);
    // TODO: Integrate with M3 InventoryHold service when available
  }

  async postVasCompletion(
    command: VasPostingCommand,
    _tx: Prisma.TransactionClient,
  ): Promise<string[]> {
    this.logger.log(`[STUB] Posting VAS completion for WO ${command.woNumber}`);
    // TODO: Integrate with M3 Posting Engine when available
    // This requires proper InventDim lookup/creation and InventTrans posting with all required fields
    
    const stubTransIds = [
      `STUB-VAS-C-${Date.now()}`,
      `STUB-VAS-P-${Date.now()}`,
      `STUB-VAS-K-${Date.now()}`,
    ];

    this.logger.log(`[STUB] Would post ${stubTransIds.length} transactions for WO ${command.woNumber}`);
    return stubTransIds;
  }
}
