import { Injectable, BadRequestException } from '@nestjs/common';
import { ShipmentHeaderRepository } from '../repositories/shipment-header.repository';
import { ShipmentLineRepository } from '../repositories/shipment-line.repository';
import { AllocationRecordRepository } from '../repositories/allocation-record.repository';
import { StatusHistoryRepository } from '../repositories/status-history.repository';
import { ExceptionLogRepository } from '../repositories/exception-log.repository';
import { ShipmentStateMachineService } from './shipment-state-machine.service';
import { ShipmentLineStateService } from './shipment-line-state.service';
import { v4 as uuidv4 } from 'uuid';

export interface AllocationResult {
  success: boolean;
  shipmentId: string;
  allocatedLines: number;
  failedLines: number;
  errors?: string[];
}

@Injectable()
export class AllocationService {
  constructor(
    private readonly headerRepo: ShipmentHeaderRepository,
    private readonly lineRepo: ShipmentLineRepository,
    private readonly allocationRepo: AllocationRecordRepository,
    private readonly historyRepo: StatusHistoryRepository,
    private readonly exceptionRepo: ExceptionLogRepository,
    private readonly headerStateMachine: ShipmentStateMachineService,
    private readonly lineStateMachine: ShipmentLineStateService,
  ) {}

  async allocateShipment(
    shipmentId: string,
    userId?: string,
    correlationId?: string,
  ): Promise<AllocationResult> {
    const shipment = await this.headerRepo.findById(shipmentId);
    if (!shipment) {
      throw new BadRequestException(`Shipment ${shipmentId} not found`);
    }

    this.headerStateMachine.assertCanTransition(shipment.status as any, 'ALLOCATE');

    const corrId = correlationId || uuidv4();
    const lines = await this.lineRepo.findPendingLines(shipmentId);

    if (lines.length === 0) {
      throw new BadRequestException('No pending lines to allocate');
    }

    const errors: string[] = [];
    let allocatedCount = 0;

    for (const line of lines) {
      try {
        await this.allocateLine(
          shipmentId,
          line.id,
          line.itemId,
          shipment.ownerId,
          Number(line.expectedQtyKg),
          userId,
          corrId,
        );
        allocatedCount++;
      } catch (error: any) {
        errors.push(`Line ${line.lineNumber}: ${error?.message || 'Unknown error'}`);
        await this.exceptionRepo.create({
          shipmentHeaderId: shipmentId,
          shipmentLineId: line.id,
          exceptionType: 'ALLOCATION_FAIL',
          exceptionCode: 'ALLOC_INSUFFICIENT_STOCK',
          severity: 'HIGH',
          detailJson: { error: error?.message || 'Unknown error' },
          createdBy: userId,
          correlationId: corrId,
        });
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        shipmentId,
        allocatedLines: allocatedCount,
        failedLines: errors.length,
        errors,
      };
    }

    await this.headerRepo.updateStatus(shipmentId, 'ALLOCATED', {
      updatedBy: userId,
    });

    await this.historyRepo.create({
      shipmentHeaderId: shipmentId,
      entityLevel: 'HEADER',
      fromStatus: 'CONFIRMED',
      toStatus: 'ALLOCATED',
      triggerAction: 'ALLOCATE',
      changedBy: userId,
      correlationId: corrId,
    });

    return {
      success: true,
      shipmentId,
      allocatedLines: allocatedCount,
      failedLines: 0,
    };
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

    const mockAllocationRecord = {
      shipmentHeaderId: shipmentId,
      shipmentLineId: lineId,
      locationId: '00000000-0000-0000-0000-000000000000',
      inventDimId: '00000000-0000-0000-0000-000000000000',
      itemId,
      ownerId,
      allocatedQty: requiredQty,
      lotDate: new Date(),
      fifoRank: 1,
      status: 'ALLOCATED' as const,
      holdRef: `HOLD-${uuidv4().substring(0, 8)}`,
      externalId: uuidv4(),
      correlationId: corrId,
      createdBy: userId,
    };

    await this.allocationRepo.create(mockAllocationRecord as any);

    await this.lineRepo.updateAllocatedQty(lineId, requiredQty);
  }

  async releaseAll(shipmentId: string, userId?: string, correlationId?: string) {
    const corrId = correlationId || uuidv4();

    await this.allocationRepo.releaseAllByShipment(shipmentId);

    const lines = await this.lineRepo.findAllocatedLines(shipmentId);
    for (const line of lines) {
      await this.lineRepo.updateStatus(line.id, 'PENDING');
    }

    await this.headerRepo.updateStatus(shipmentId, 'CONFIRMED', {
      updatedBy: userId,
    });

    await this.historyRepo.create({
      shipmentHeaderId: shipmentId,
      entityLevel: 'HEADER',
      fromStatus: 'ALLOCATED',
      toStatus: 'CONFIRMED',
      triggerAction: 'UNALLOCATE',
      changedBy: userId,
      correlationId: corrId,
    });
  }

  async getAllocations(shipmentId: string) {
    return this.allocationRepo.findByShipmentId(shipmentId);
  }
}
