import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { VasWorkOrderRepository } from '../repositories/vas-work-order.repository';
import { VasStateHistoryRepository } from '../repositories/vas-state-history.repository';
import { VasStateMachineService } from './vas-state-machine.service';
import { VasInventoryFacade } from '../facades/vas-inventory.facade';
import { CancelVasWoDto } from '../dto/cancel-vas-wo.dto';
import { VasWoNotFoundError } from '../domain/vas.errors';
import { VasWoStatus, VasStateAction } from '../domain/vas.enums';

@Injectable()
export class CancelVasWoService {
  private readonly logger = new Logger(CancelVasWoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly woRepo: VasWorkOrderRepository,
    private readonly stateHistoryRepo: VasStateHistoryRepository,
    private readonly stateMachine: VasStateMachineService,
    private readonly inventoryFacade: VasInventoryFacade,
  ) {}

  async execute(
    woId: string,
    dto: CancelVasWoDto,
    actor: { userId: string; role: string },
  ): Promise<{ id: string; woNumber: string; status: string }> {
    return this.prisma.$transaction(async (tx) => {
      const wo = await this.woRepo.findByIdForUpdate(woId, tx);
      if (!wo) {
        throw new VasWoNotFoundError(woId);
      }

      this.stateMachine.assertCanCancel(wo.status);

      if (wo.status === VasWoStatus.CONFIRMED || wo.status === VasWoStatus.IN_PROGRESS) {
        await this.inventoryFacade.releaseVasReservation(wo.id, tx);
      }

      const cancelled = await this.woRepo.markCancelled(wo.id, actor.userId, dto.reasonCode, tx);

      await this.stateHistoryRepo.append(
        {
          woId: wo.id,
          fromStatus: wo.status as any,
          toStatus: VasWoStatus.CANCELLED as any,
          action: VasStateAction.CANCEL as any,
          actorId: actor.userId,
          actorRole: actor.role,
          correlationId: wo.correlationId,
          reasonCode: dto.reasonCode,
          remarks: dto.remarks,
        },
        tx,
      );

      this.logger.log(`Cancelled VAS WO: ${cancelled.woNumber}`);

      return {
        id: cancelled.id,
        woNumber: cancelled.woNumber,
        status: cancelled.status,
      };
    });
  }
}
