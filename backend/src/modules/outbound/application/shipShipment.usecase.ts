/**
 * Ship Shipment Use Case - Application Layer
 * Handles shipping and M3 inventory posting
 * 
 * CR-2 FIX: Real M3 PostingEngine call + hold release
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { ShipmentHeaderRepository } from '../repositories/shipment-header.repository';
import { ShipmentLineRepository } from '../repositories/shipment-line.repository';
import { AllocationRecordRepository } from '../repositories/allocation-record.repository';
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
    private readonly allocationRepo: AllocationRecordRepository,
    private readonly postingLinkRepo: PostingLinkRepository,
    private readonly historyRepo: StatusHistoryRepository,
    private readonly stateMachine: ShipmentStateMachineService,
    private readonly m3Adapter: M3AdapterService,
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

      // CR-2 FIX: Real M3 PostingEngine integration
      for (const line of passedLines) {
        // Get allocation records for this line
        const lineAllocations = await this.allocationRepo.findByLineId(line.id);
        
        for (const alloc of lineAllocations) {
          const externalId = uuidv4();
          
          // CR-2: Get dimension info from allocation
          const dim = await this.prisma.inventDim.findUnique({
            where: { id: alloc.inventDimId },
            include: {
              warehouse: { select: { warehouseCode: true } },
              location: { select: { locationCode: true } },
              owner: { select: { ownerCode: true } },
              inventoryStatus: { select: { statusCode: true } },
            },
          });

          if (!dim) {
            throw new BadRequestException(`InventDim not found for allocation ${alloc.id}`);
          }

          // CR-2: Call M3 PostingEngine for inventory deduction
          const postingResult = await this.m3Adapter.postShipmentShipped({
            externalId,
            correlationId: corrId,
            shipmentId: input.shipmentId,
            lineId: line.id,
            itemId: line.itemId,
            qty: String(alloc.allocatedQty),
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

          // CR-2: Release hold via M3 HoldService
          if (alloc.holdRef) {
            const holds = await this.m3Adapter.getHoldsByShipment(input.shipmentId, line.id);
            for (const hold of holds) {
              if (hold.holdNo === alloc.holdRef && hold.status === 'ACTIVE') {
                await this.m3Adapter.releaseHold(
                  hold.id,
                  null, // Release full qty
                  input.userId || '',
                  corrId,
                );
              }
            }
          }

          // Create posting link record
          await this.postingLinkRepo.create({
            shipmentHeaderId: input.shipmentId,
            shipmentLineId: line.id,
            postingAction: 'POST',
            m3ExternalId: postingResult.transId,
            requestPayload: {
              eventCode: 'SHIPMENT_SHIPPED',
              qtyPosted: -Number(alloc.allocatedQty),
              transDbId: postingResult.transDbId,
            },
            correlationId: corrId,
          });

          // Mark allocation as posted
          await this.allocationRepo.markPosted(alloc.id, Number(alloc.allocatedQty));
        }

        await this.lineRepo.updateStatus(line.id, 'LINE_SHIPPED');
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
