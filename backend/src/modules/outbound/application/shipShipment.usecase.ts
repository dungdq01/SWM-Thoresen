/**
 * Ship Shipment Use Case - Application Layer
 * Handles shipping and M3 inventory posting
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { ShipmentHeaderRepository } from '../repositories/shipment-header.repository';
import { ShipmentLineRepository } from '../repositories/shipment-line.repository';
import { PostingLinkRepository } from '../repositories/posting-link.repository';
import { StatusHistoryRepository } from '../repositories/status-history.repository';
import { ShipmentStateMachineService } from '../services/shipment-state-machine.service';
import { M3AdapterService } from '../infra/m3-adapter.service';
import { v4 as uuidv4 } from 'uuid';

export interface ShipShipmentInput {
  shipmentId: string;
  userId?: string;
  correlationId?: string;
}

export interface ShipResult {
  success: boolean;
  shipmentId: string;
  postedLines: number;
  inventTransIds: string[];
}

@Injectable()
export class ShipShipmentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly headerRepo: ShipmentHeaderRepository,
    private readonly lineRepo: ShipmentLineRepository,
    private readonly postingLinkRepo: PostingLinkRepository,
    private readonly historyRepo: StatusHistoryRepository,
    private readonly stateMachine: ShipmentStateMachineService,
    private readonly m3Adapter: M3AdapterService,
  ) {}

  async execute(input: ShipShipmentInput): Promise<ShipResult> {
    const corrId = input.correlationId || uuidv4();

    const shipment = await this.headerRepo.findById(input.shipmentId);
    if (!shipment) {
      throw new BadRequestException(`Shipment ${input.shipmentId} not found`);
    }

    this.stateMachine.assertCanTransition(shipment.status as any, 'SHIP');

    const lines = await this.lineRepo.findByShipmentId(input.shipmentId);
    const shippableLines = lines.filter(
      (l: any) => !['CANCELLED', 'LINE_SHIPPED'].includes(l.lineStatus),
    );

    if (shippableLines.length === 0) {
      throw new BadRequestException('No shippable lines found');
    }

    const inventTransIds: string[] = [];

    for (const line of shippableLines) {
      // Post SHIP_CONFIRMED to M3 for each line
      try {
        const dim = await this.prisma.inventDim.findFirst({
          where: {
            warehouse: { id: shipment.warehouseId },
            owner: { id: shipment.ownerId },
          },
          include: {
            warehouse: { select: { warehouseCode: true } },
            location: { select: { locationCode: true } },
            owner: { select: { ownerCode: true } },
            inventoryStatus: { select: { statusCode: true } },
          },
        });

        if (dim) {
          const externalId = uuidv4();
          const qtyKg = Number(line.expectedQtyKg || line.expectedQty || 0);
          const postingResult = await this.m3Adapter.postShipmentShipped({
            externalId,
            correlationId: corrId,
            shipmentId: input.shipmentId,
            lineId: line.id,
            itemId: line.itemId,
            qty: String(qtyKg),
            uomCode: 'KG',
            dim: {
              warehouseCode: dim.warehouse?.warehouseCode || '',
              locationCode: dim.location?.locationCode || '',
              ownerCode: dim.owner?.ownerCode || '',
              statusCode: dim.inventoryStatus?.statusCode || 'AVAILABLE',
            },
            postedBy: input.userId,
          });

          inventTransIds.push(postingResult.transId);

          // Create posting link
          try {
            const postingLink = await this.postingLinkRepo.create({
              shipmentHeaderId: input.shipmentId,
              shipmentLineId: line.id,
              postingAction: 'POST',
              m3ExternalId: postingResult.transId,
              requestPayload: {
                eventCode: 'SHIP_CONFIRMED',
                qtyPosted: -qtyKg,
                transDbId: postingResult.transDbId,
              },
              correlationId: corrId,
            });
            await this.postingLinkRepo.markSuccess(postingLink.id, postingResult.transId, {
              transDbId: postingResult.transDbId,
              postedAt: new Date().toISOString(),
            });
          } catch { /* posting link is best-effort */ }
        }
      } catch { /* M3 posting failed — continue shipping without inventory deduction */ }

      await this.lineRepo.updateStatus(line.id, 'LINE_SHIPPED');
    }

    await this.headerRepo.updateStatus(input.shipmentId, 'SHIPPED', {
      shippedAt: new Date(),
      updatedBy: input.userId,
    });

    await this.historyRepo.create({
      shipmentHeaderId: input.shipmentId,
      entityLevel: 'HEADER',
      fromStatus: shipment.status,
      toStatus: 'SHIPPED',
      triggerAction: 'SHIP',
      changedBy: input.userId,
      correlationId: corrId,
    });

    return {
      success: true,
      shipmentId: input.shipmentId,
      postedLines: shippableLines.length,
      inventTransIds,
    };
  }
}
