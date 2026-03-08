/**
 * Allocate Shipment Use Case - Application Layer
 * Handles FIFO-based allocation with M3 OnHand integration
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { ShipmentHeaderRepository } from '../repositories/shipment-header.repository';
import { ShipmentLineRepository } from '../repositories/shipment-line.repository';
import { AllocationRecordRepository } from '../repositories/allocation-record.repository';
import { StatusHistoryRepository } from '../repositories/status-history.repository';
import { ExceptionLogRepository } from '../repositories/exception-log.repository';
import { ShipmentStateMachineService } from '../services/shipment-state-machine.service';
import { v4 as uuidv4 } from 'uuid';

export interface AllocateShipmentInput {
  shipmentId: string;
  userId?: string;
  correlationId?: string;
}

export interface AllocationResult {
  success: boolean;
  shipmentId: string;
  allocatedLines: number;
  failedLines: number;
  errors?: string[];
}

@Injectable()
export class AllocateShipmentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly headerRepo: ShipmentHeaderRepository,
    private readonly lineRepo: ShipmentLineRepository,
    private readonly allocationRepo: AllocationRecordRepository,
    private readonly historyRepo: StatusHistoryRepository,
    private readonly exceptionRepo: ExceptionLogRepository,
    private readonly stateMachine: ShipmentStateMachineService,
  ) {}

  async execute(input: AllocateShipmentInput): Promise<AllocationResult> {
    const corrId = input.correlationId || uuidv4();

    return this.prisma.$transaction(async (tx) => {
      const shipment = await this.headerRepo.lockForUpdate(input.shipmentId, tx);
      if (!shipment) {
        throw new BadRequestException(`Shipment ${input.shipmentId} not found`);
      }

      this.stateMachine.assertCanTransition(shipment.status as any, 'ALLOCATE');

      const lines = await this.lineRepo.findPendingLines(input.shipmentId);
      if (lines.length === 0) {
        throw new BadRequestException('No pending lines to allocate');
      }

      const errors: string[] = [];
      let allocatedCount = 0;

      for (const line of lines) {
        try {
          await this.allocateLine(
            input.shipmentId,
            line.id,
            line.itemId,
            shipment.ownerId,
            Number(line.expectedQtyKg),
            input.userId,
            corrId,
          );
          allocatedCount++;
        } catch (error: any) {
          errors.push(`Line ${line.lineNumber}: ${error?.message || 'Unknown error'}`);
          await this.exceptionRepo.create({
            shipmentHeaderId: input.shipmentId,
            shipmentLineId: line.id,
            exceptionType: 'ALLOCATION_FAIL',
            exceptionCode: 'ALLOC_INSUFFICIENT_STOCK',
            severity: 'HIGH',
            detailJson: { error: error?.message || 'Unknown error' },
            createdBy: input.userId,
            correlationId: corrId,
          });
        }
      }

      if (errors.length > 0) {
        return {
          success: false,
          shipmentId: input.shipmentId,
          allocatedLines: allocatedCount,
          failedLines: errors.length,
          errors,
        };
      }

      await this.headerRepo.updateStatus(input.shipmentId, 'ALLOCATED', {
        updatedBy: input.userId,
      });

      await this.historyRepo.create({
        shipmentHeaderId: input.shipmentId,
        entityLevel: 'HEADER',
        fromStatus: 'CONFIRMED',
        toStatus: 'ALLOCATED',
        triggerAction: 'ALLOCATE',
        changedBy: input.userId,
        correlationId: corrId,
      });

      return {
        success: true,
        shipmentId: input.shipmentId,
        allocatedLines: allocatedCount,
        failedLines: 0,
      };
    });
  }

  private async allocateLine(
    shipmentId: string,
    lineId: string,
    itemId: string,
    ownerId: string,
    requiredQty: number,
    userId?: string,
    correlationId?: string,
  ) {
    const corrId = correlationId || uuidv4();

    // TODO: CR-1 - Replace mock with real M3 OnHand query and HoldService
    // Real implementation should:
    // 1. Query M3 OnHand for available stock: onHandService.queryAvailable(itemId, ownerId, warehouseId)
    // 2. Sort by FIFO (lotDate)
    // 3. Create holds: holdService.createHold(inventDimId, qty, holdRef)
    // 4. Return actual locationId, inventDimId from OnHand
    
    const allocationRecord = {
      shipmentHeaderId: shipmentId,
      shipmentLineId: lineId,
      locationId: '00000000-0000-0000-0000-000000000000', // TODO: Get from OnHand
      inventDimId: '00000000-0000-0000-0000-000000000000', // TODO: Get from OnHand
      itemId,
      ownerId,
      allocatedQty: requiredQty,
      lotDate: new Date(),
      fifoRank: 1,
      status: 'ALLOCATED' as const,
      holdRef: `HOLD-${uuidv4().substring(0, 8)}`, // TODO: Get from HoldService
      externalId: uuidv4(),
      correlationId: corrId,
      createdBy: userId,
    };

    await this.allocationRepo.create(allocationRecord as any);
    await this.lineRepo.updateAllocatedQty(lineId, requiredQty);
  }
}
