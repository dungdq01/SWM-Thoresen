/**
 * Ship Shipment Use Case - Application Layer
 * Handles shipping and M3 inventory posting
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { ShipmentHeaderRepository } from '../repositories/shipment-header.repository';
import { ShipmentLineRepository } from '../repositories/shipment-line.repository';
import { AllocationRecordRepository } from '../repositories/allocation-record.repository';
import { PostingLinkRepository } from '../repositories/posting-link.repository';
import { StatusHistoryRepository } from '../repositories/status-history.repository';
import { ShipmentStateMachineService } from '../services/shipment-state-machine.service';
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
    private readonly allocationRepo: AllocationRecordRepository,
    private readonly postingLinkRepo: PostingLinkRepository,
    private readonly historyRepo: StatusHistoryRepository,
    private readonly stateMachine: ShipmentStateMachineService,
  ) {}

  async execute(input: ShipShipmentInput): Promise<ShipResult> {
    const corrId = input.correlationId || uuidv4();

    return this.prisma.$transaction(async (tx) => {
      const shipment = await this.headerRepo.lockForUpdate(input.shipmentId, tx);
      if (!shipment) {
        throw new BadRequestException(`Shipment ${input.shipmentId} not found`);
      }

      this.stateMachine.assertCanTransition(shipment.status as any, 'SHIP');

      const lines = await this.lineRepo.findByShipmentId(input.shipmentId);
      const passedLines = lines.filter((l: any) => l.lineStatus === 'WEIGHED_PASS');

      if (passedLines.length === 0) {
        throw new BadRequestException('No lines passed weighing');
      }

      const inventTransIds: string[] = [];

      for (const line of passedLines) {
        // TODO: CR-2 - Replace mock with real M3 PostingEngine call
        // Real implementation should:
        // 1. Get allocation records for line
        // 2. Call postingEngine.postInventory({
        //      eventCode: 'SHIPMENT_SHIPPED',
        //      itemId: line.itemId,
        //      ownerId: shipment.ownerId,
        //      warehouseId: shipment.warehouseId,
        //      inventDimId: allocation.inventDimId,
        //      qty: -line.netWeightKg, // Negative for outbound
        //      sourceRef: shipmentId,
        //      correlationId
        //    })
        // 3. Release holds: holdService.releaseHold(allocation.holdRef)

        const mockInventTransId = uuidv4();
        inventTransIds.push(mockInventTransId);

        await this.postingLinkRepo.create({
          shipmentHeaderId: input.shipmentId,
          shipmentLineId: line.id,
          postingAction: 'POST',
          m3ExternalId: mockInventTransId,
          requestPayload: {
            eventCode: 'SHIPMENT_SHIPPED',
            qtyPosted: -Number(line.netWeightKg),
          },
          correlationId: corrId,
        });

        await this.lineRepo.updateStatus(line.id, 'LINE_SHIPPED');
      }

      // Mark allocations as posted
      const allocations = await this.allocationRepo.findByShipmentId(input.shipmentId);
      for (const alloc of allocations) {
        if (alloc.status === 'PICKED') {
          await this.allocationRepo.markPosted(alloc.id, Number(alloc.pickedQty || alloc.allocatedQty));
        }
      }

      await this.headerRepo.updateStatus(input.shipmentId, 'SHIPPED', {
        shippedAt: new Date(),
        updatedBy: input.userId,
      });

      await this.historyRepo.create({
        shipmentHeaderId: input.shipmentId,
        entityLevel: 'HEADER',
        fromStatus: 'ALL_WEIGHED',
        toStatus: 'SHIPPED',
        triggerAction: 'SHIP',
        changedBy: input.userId,
        correlationId: corrId,
      });

      return {
        success: true,
        shipmentId: input.shipmentId,
        postedLines: passedLines.length,
        inventTransIds,
      };
    });
  }
}
