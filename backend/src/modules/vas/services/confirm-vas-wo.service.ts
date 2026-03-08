import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { VasWorkOrderRepository } from '../repositories/vas-work-order.repository';
import { VasStateHistoryRepository } from '../repositories/vas-state-history.repository';
import { VasExceptionLogRepository } from '../repositories/vas-exception-log.repository';
import { VasStateMachineService } from './vas-state-machine.service';
import { VasInventoryFacade } from '../facades/vas-inventory.facade';
import { ConfirmVasWoDto } from '../dto/confirm-vas-wo.dto';
import {
  VasWoNotFoundError,
  VasInsufficientBulkError,
  VasInsufficientPackagingError,
} from '../domain/vas.errors';
import { VasWoStatus, VasStateAction, VasExceptionCode } from '../domain/vas.enums';
import { VasExceptionSeverity } from '@prisma/client';

@Injectable()
export class ConfirmVasWoService {
  private readonly logger = new Logger(ConfirmVasWoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly woRepo: VasWorkOrderRepository,
    private readonly stateHistoryRepo: VasStateHistoryRepository,
    private readonly exceptionLogRepo: VasExceptionLogRepository,
    private readonly stateMachine: VasStateMachineService,
    private readonly inventoryFacade: VasInventoryFacade,
  ) {}

  async execute(
    woId: string,
    dto: ConfirmVasWoDto,
    actor: { userId: string; role: string },
  ): Promise<{ id: string; woNumber: string; status: string }> {
    return this.prisma.$transaction(async (tx) => {
      const wo = await this.woRepo.findByIdForUpdate(woId, tx);
      if (!wo) {
        throw new VasWoNotFoundError(woId);
      }

      this.stateMachine.assertCanConfirm(wo.status);

      const bulkAvailability = await this.inventoryFacade.getBulkAvailable(
        {
          ownerId: wo.ownerId,
          warehouseId: wo.warehouseId,
          itemId: wo.bulkSourceItemId,
        },
        tx,
      );

      if (bulkAvailability.availableQty.lessThan(wo.plannedQtyKg)) {
        await this.exceptionLogRepo.create(
          {
            woId: wo.id,
            exceptionCode: VasExceptionCode.VAS_INSUFFICIENT_BULK,
            severity: VasExceptionSeverity.ERROR,
            payloadJson: {
              available: bulkAvailability.availableQty.toString(),
              required: wo.plannedQtyKg.toString(),
            },
          },
          tx,
        );
        throw new VasInsufficientBulkError(
          bulkAvailability.availableQty.toNumber(),
          wo.plannedQtyKg.toNumber(),
        );
      }

      const packagingAvailable = await this.inventoryFacade.getPackagingAvailable(
        {
          ownerId: wo.packagingOwnerId,
          warehouseId: wo.warehouseId,
          itemId: wo.packagingItemId,
        },
        tx,
      );

      if (packagingAvailable < wo.packagingQtyPlanned) {
        await this.exceptionLogRepo.create(
          {
            woId: wo.id,
            exceptionCode: VasExceptionCode.VAS_INSUFFICIENT_PACKAGING,
            severity: VasExceptionSeverity.ERROR,
            payloadJson: {
              available: packagingAvailable,
              required: wo.packagingQtyPlanned,
            },
          },
          tx,
        );
        throw new VasInsufficientPackagingError(packagingAvailable, wo.packagingQtyPlanned);
      }

      await this.inventoryFacade.reserveVasBulk(
        wo.id,
        {
          ownerId: wo.ownerId,
          warehouseId: wo.warehouseId,
          itemId: wo.bulkSourceItemId,
          qtyKg: wo.plannedQtyKg,
        },
        tx,
      );

      const confirmed = await this.woRepo.markConfirmed(wo.id, actor.userId, tx);

      await this.stateHistoryRepo.append(
        {
          woId: wo.id,
          fromStatus: VasWoStatus.DRAFT as any,
          toStatus: VasWoStatus.CONFIRMED as any,
          action: VasStateAction.CONFIRM as any,
          actorId: actor.userId,
          actorRole: actor.role,
          correlationId: wo.correlationId,
        },
        tx,
      );

      this.logger.log(`Confirmed VAS WO: ${confirmed.woNumber}`);

      return {
        id: confirmed.id,
        woNumber: confirmed.woNumber,
        status: confirmed.status,
      };
    });
  }
}
