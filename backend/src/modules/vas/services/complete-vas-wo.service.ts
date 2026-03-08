import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { VasWorkOrderRepository } from '../repositories/vas-work-order.repository';
import { VasSessionRepository } from '../repositories/vas-session.repository';
import { VasStateHistoryRepository } from '../repositories/vas-state-history.repository';
import { VasStateMachineService } from './vas-state-machine.service';
import { VasValidationService } from './vas-validation.service';
import { VasInventoryFacade } from '../facades/vas-inventory.facade';
import { VasBillingFacade } from '../facades/vas-billing.facade';
import { CompleteVasWoDto } from '../dto/complete-vas-wo.dto';
import {
  VasWoNotFoundError,
  VasInvalidMaterialBalanceError,
  VasReasonRequiredError,
} from '../domain/vas.errors';
import { VasWoStatus, VasStateAction } from '../domain/vas.enums';
import { Prisma } from '@prisma/client';

@Injectable()
export class CompleteVasWoService {
  private readonly logger = new Logger(CompleteVasWoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly woRepo: VasWorkOrderRepository,
    private readonly sessionRepo: VasSessionRepository,
    private readonly stateHistoryRepo: VasStateHistoryRepository,
    private readonly stateMachine: VasStateMachineService,
    private readonly validationService: VasValidationService,
    private readonly inventoryFacade: VasInventoryFacade,
    private readonly billingFacade: VasBillingFacade,
  ) {}

  async execute(
    woId: string,
    dto: CompleteVasWoDto,
    actor: { userId: string; role: string },
  ): Promise<{ id: string; woNumber: string; status: string; transIds: string[] }> {
    return this.prisma.$transaction(async (tx) => {
      const wo = await this.woRepo.findByIdForUpdate(woId, tx);
      if (!wo) {
        throw new VasWoNotFoundError(woId);
      }

      this.stateMachine.assertCanComplete(wo.status);

      const { processLossQtyKg, isValid } = this.validationService.validateMaterialBalance(
        dto.actualConsumedQtyKg,
        dto.actualOutputQtyKg,
      );

      if (!isValid) {
        throw new VasInvalidMaterialBalanceError(dto.actualConsumedQtyKg, dto.actualOutputQtyKg);
      }

      const requiresReason = this.validationService.requiresVarianceReason(
        processLossQtyKg,
        dto.actualConsumedQtyKg,
      );

      if (requiresReason && !dto.yieldVarianceReasonCode) {
        throw new VasReasonRequiredError('COMPLETE with high process loss');
      }

      const transIds = await this.inventoryFacade.postVasCompletion(
        {
          woId: wo.id,
          woNumber: wo.woNumber,
          ownerId: wo.ownerId,
          warehouseId: wo.warehouseId,
          bulkSourceItemId: wo.bulkSourceItemId,
          baggedOutputItemId: wo.baggedOutputItemId,
          packagingItemId: wo.packagingItemId,
          packagingOwnerId: wo.packagingOwnerId,
          actualConsumedQtyKg: new Prisma.Decimal(dto.actualConsumedQtyKg),
          actualOutputQtyKg: new Prisma.Decimal(dto.actualOutputQtyKg),
          packagingQtyActual: dto.packagingQtyActual,
          correlationId: wo.correlationId,
          actorId: actor.userId,
        },
        tx,
      );

      await this.inventoryFacade.releaseVasReservation(wo.id, tx);

      const sessionSummary = await this.sessionRepo.getSessionSummary(wo.id, tx);

      const completed = await this.woRepo.markCompleted(
        wo.id,
        {
          actualConsumedQtyKg: new Prisma.Decimal(dto.actualConsumedQtyKg),
          actualOutputQtyKg: new Prisma.Decimal(dto.actualOutputQtyKg),
          processLossQtyKg: new Prisma.Decimal(processLossQtyKg),
          actualBagCount: dto.actualBagCount,
          packagingQtyActual: dto.packagingQtyActual,
          yieldVarianceReasonCode: dto.yieldVarianceReasonCode,
          completedBy: actor.userId,
        },
        tx,
      );

      await this.billingFacade.captureBaggingFee(
        {
          woId: wo.id,
          woNumber: wo.woNumber,
          ownerId: wo.ownerId,
          warehouseId: wo.warehouseId,
          bulkSourceItemId: wo.bulkSourceItemId,
          baggedOutputItemId: wo.baggedOutputItemId,
          actualOutputQtyKg: new Prisma.Decimal(dto.actualOutputQtyKg),
          actualBagCount: dto.actualBagCount,
          packagingOwnership: wo.packagingOwnership,
          packagingItemId: wo.packagingItemId,
          packagingQtyActual: dto.packagingQtyActual,
          overtimeSessions: sessionSummary.overtimeSessionCount,
          correlationId: wo.correlationId,
        },
        tx,
      );

      await this.stateHistoryRepo.append(
        {
          woId: wo.id,
          fromStatus: VasWoStatus.IN_PROGRESS as any,
          toStatus: VasWoStatus.COMPLETED as any,
          action: VasStateAction.COMPLETE as any,
          actorId: actor.userId,
          actorRole: actor.role,
          correlationId: wo.correlationId,
        },
        tx,
      );

      this.logger.log(`Completed VAS WO: ${completed.woNumber}, ${transIds.length} transactions`);

      return {
        id: completed.id,
        woNumber: completed.woNumber,
        status: completed.status,
        transIds,
      };
    });
  }
}
