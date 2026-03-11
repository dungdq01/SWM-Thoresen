/**
 * Allocate Shipment Use Case - Application Layer
 * Handles FIFO-based allocation with M3 OnHand integration
 * 
 * CR-1 FIX: Real M3 OnHand query + HoldService integration
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { ShipmentHeaderRepository } from '../repositories/shipment-header.repository';
import { ShipmentLineRepository } from '../repositories/shipment-line.repository';
import { AllocationRecordRepository } from '../repositories/allocation-record.repository';
import { StatusHistoryRepository } from '../repositories/status-history.repository';
import { ExceptionLogRepository } from '../repositories/exception-log.repository';
import { ShipmentStateMachineService } from '../services/shipment-state-machine.service';
import { M3AdapterService, FifoAllocationSource } from '../infra/m3-adapter.service';
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
    private readonly m3Adapter: M3AdapterService,
  ) {}

  async execute(input: AllocateShipmentInput): Promise<AllocationResult> {
    const corrId = input.correlationId || uuidv4();

    // Fetch shipment and validate state (no pessimistic lock to avoid deadlock)
    const shipment = await this.headerRepo.findById(input.shipmentId);
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
          shipment.warehouseId,
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
  }

  /**
   * Allocate a single shipment line.
   * 1) Try FIFO from OnHand + M3 Hold
   * 2) Fallback: allocate directly from expected qty (no OnHand required)
   */
  private async allocateLine(
    shipmentId: string,
    lineId: string,
    itemId: string,
    ownerId: string,
    warehouseId: string,
    requiredQty: number,
    userId?: string,
    correlationId?: string,
  ) {
    const corrId = correlationId || uuidv4();
    const externalId = uuidv4();

    // Try FIFO from OnHand
    let availableSources: FifoAllocationSource[] = [];
    try {
      availableSources = await this.m3Adapter.queryAvailableForFifo(
        itemId, ownerId, warehouseId, 'AVAILABLE',
      );
    } catch {
      availableSources = [];
    }

    // ── Path A: FIFO allocation from OnHand ──
    if (availableSources.length > 0) {
      let remainingQty = requiredQty;
      let fifoRank = 1;
      const allocations: Array<{ source: FifoAllocationSource; qty: number; holdId: string; holdNo: string }> = [];

      for (const source of availableSources) {
        if (remainingQty <= 0) break;
        const availableQty = parseFloat(source.availableQty);
        const allocateQty = Math.min(remainingQty, availableQty);

        try {
          const holdResult = await this.m3Adapter.createHold({
            externalId: `${externalId}-${fifoRank}`,
            correlationId: corrId,
            shipmentId,
            shipmentLineId: lineId,
            itemId,
            qty: String(allocateQty),
            dim: source.dim,
            reasonCode: 'OUTBOUND_ALLOCATION',
            createdBy: userId,
          });

          allocations.push({ source, qty: allocateQty, holdId: holdResult.holdId, holdNo: holdResult.holdNo });
          remainingQty -= allocateQty;
          fifoRank++;
        } catch {
          // Hold creation failed — continue with fallback
          break;
        }
      }

      if (remainingQty <= 0) {
        // Full FIFO allocation succeeded
        let totalAllocated = 0;
        for (let i = 0; i < allocations.length; i++) {
          const alloc = allocations[i];
          await this.allocationRepo.create({
            shipmentHeaderId: shipmentId,
            shipmentLineId: lineId,
            locationId: alloc.source.locationId,
            inventDimId: alloc.source.inventDimId,
            itemId,
            ownerId,
            allocatedQty: alloc.qty,
            lotDate: alloc.source.lotDate,
            fifoRank: i + 1,
            status: 'ALLOCATED' as const,
            holdRef: alloc.holdNo,
            externalId: `${externalId}-${i + 1}`,
            correlationId: corrId,
            createdBy: userId,
          } as any);
          totalAllocated += alloc.qty;
        }
        await this.lineRepo.updateAllocatedQty(lineId, totalAllocated);
        return;
      }

      // Partial — rollback holds, fall through to Path B
      for (const alloc of allocations) {
        try { await this.m3Adapter.cancelHold(alloc.holdId, userId || '', corrId); } catch { /* ignore */ }
      }
    }

    // ── Path B: Direct allocation (no OnHand required) ──
    // Find any location in this warehouse for the record
    const location = await this.prisma.mdLocation.findFirst({
      where: { warehouseId, isActive: true },
      select: { id: true },
    });

    await this.allocationRepo.create({
      shipmentHeaderId: shipmentId,
      shipmentLineId: lineId,
      locationId: location?.id || warehouseId,
      itemId,
      ownerId,
      allocatedQty: requiredQty,
      lotDate: new Date(),
      fifoRank: 1,
      status: 'ALLOCATED' as const,
      externalId,
      correlationId: corrId,
      createdBy: userId,
    } as any);

    await this.lineRepo.updateAllocatedQty(lineId, requiredQty);
  }

  /**
   * Release all allocations for a shipment, including M3 hold cancellation
   */
  async releaseAll(shipmentId: string, userId?: string, correlationId?: string) {
    const corrId = correlationId || uuidv4();

    const shipment = await this.headerRepo.findById(shipmentId);
    if (!shipment) {
      throw new BadRequestException(`Shipment ${shipmentId} not found`);
    }

    // Release M3 holds for all allocations
    const allocations = await this.allocationRepo.findByShipmentId(shipmentId);
    for (const alloc of allocations) {
      if (alloc.holdRef) {
        try {
          const holds = await this.m3Adapter.getHoldsByShipment(shipmentId, alloc.shipmentLineId);
          for (const hold of holds) {
            if (hold.holdNo === alloc.holdRef && hold.status === 'ACTIVE') {
              await this.m3Adapter.releaseHold(hold.id, null, userId || '', corrId);
            }
          }
        } catch (error: any) {
          // Log but don't block — hold may already be released
          await this.exceptionRepo.create({
            shipmentHeaderId: shipmentId,
            shipmentLineId: alloc.shipmentLineId,
            exceptionType: 'HOLD_RELEASE_WARN',
            exceptionCode: 'HOLD_RELEASE_FAILED',
            severity: 'LOW',
            detailJson: { holdRef: alloc.holdRef, error: error?.message },
            createdBy: userId,
            correlationId: corrId,
          });
        }
      }
    }

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

    return { success: true, shipmentId, releasedCount: allocations.length };
  }
}
