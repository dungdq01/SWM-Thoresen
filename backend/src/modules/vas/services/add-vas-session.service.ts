import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { VasWorkOrderRepository } from '../repositories/vas-work-order.repository';
import { VasSessionRepository } from '../repositories/vas-session.repository';
import { VasStateHistoryRepository } from '../repositories/vas-state-history.repository';
import { VasStateMachineService } from './vas-state-machine.service';
import { VasInventoryFacade } from '../facades/vas-inventory.facade';
import { AddVasSessionDto } from '../dto/add-vas-session.dto';
import { VasWoNotFoundError, VasInsufficientPackagingError } from '../domain/vas.errors';
import { VasWoStatus, VasStateAction } from '../domain/vas.enums';
import { Prisma } from '@prisma/client';

@Injectable()
export class AddVasSessionService {
  private readonly logger = new Logger(AddVasSessionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly woRepo: VasWorkOrderRepository,
    private readonly sessionRepo: VasSessionRepository,
    private readonly stateHistoryRepo: VasStateHistoryRepository,
    private readonly stateMachine: VasStateMachineService,
    private readonly inventoryFacade: VasInventoryFacade,
  ) {}

  async execute(
    woId: string,
    dto: AddVasSessionDto,
    actor: { userId: string; role: string },
  ): Promise<{ sessionId: string; sessionNum: number; woStatus: string }> {
    return this.prisma.$transaction(async (tx) => {
      const existingSession = await this.sessionRepo.findByExternalId(dto.externalId, tx);
      if (existingSession) {
        this.logger.warn(`Duplicate session externalId: ${dto.externalId}`);
        const wo = await this.woRepo.findById(woId, tx);
        return {
          sessionId: existingSession.id,
          sessionNum: existingSession.sessionNum,
          woStatus: wo?.status || 'UNKNOWN',
        };
      }

      const wo = await this.woRepo.findByIdForUpdate(woId, tx);
      if (!wo) {
        throw new VasWoNotFoundError(woId);
      }

      this.stateMachine.assertCanAddSession(wo.status);

      // HI-2 Fix: Check packaging availability before creating session
      const cumulativeBags = await this.sessionRepo.getCumulativeBagCount(woId, tx);
      const totalBagsAfterSession = cumulativeBags + dto.sessionBagCount;

      const packagingAvailable = await this.inventoryFacade.getPackagingAvailable(
        {
          ownerId: wo.packagingOwnerId,
          warehouseId: wo.warehouseId,
          itemId: wo.packagingItemId,
        },
        tx,
      );

      if (packagingAvailable < totalBagsAfterSession) {
        this.logger.warn(
          `Insufficient packaging: available=${packagingAvailable}, required=${totalBagsAfterSession}`,
        );
        throw new VasInsufficientPackagingError(packagingAvailable, totalBagsAfterSession);
      }

      const sessionNum = await this.sessionRepo.getNextSessionNum(woId, tx);

      let productivityRate: Prisma.Decimal | null = null;
      if (dto.workHours && dto.workHours > 0) {
        productivityRate = new Prisma.Decimal(dto.sessionQtyKg).dividedBy(dto.workHours);
      }

      const session = await this.sessionRepo.create(
        {
          workOrder: { connect: { id: woId } },
          sessionNum,
          sessionDate: new Date(dto.sessionDate),
          shiftCode: dto.shiftCode as any,
          sessionQtyKg: new Prisma.Decimal(dto.sessionQtyKg),
          sessionBagCount: dto.sessionBagCount,
          workHours: dto.workHours ? new Prisma.Decimal(dto.workHours) : null,
          productivityRate,
          isOvertime: dto.isOvertime || false,
          startTime: dto.startTime ? new Date(dto.startTime) : null,
          endTime: dto.endTime ? new Date(dto.endTime) : null,
          notes: dto.notes,
          externalId: dto.externalId,
          createdBy: actor.userId,
        },
        tx,
      );

      let newStatus = wo.status;
      if (wo.status === VasWoStatus.CONFIRMED) {
        await this.woRepo.markInProgress(woId, tx);
        newStatus = VasWoStatus.IN_PROGRESS;

        await this.stateHistoryRepo.append(
          {
            woId: wo.id,
            fromStatus: VasWoStatus.CONFIRMED as any,
            toStatus: VasWoStatus.IN_PROGRESS as any,
            action: VasStateAction.START as any,
            actorId: actor.userId,
            actorRole: actor.role,
            correlationId: wo.correlationId,
          },
          tx,
        );
      }

      this.logger.log(`Added session ${sessionNum} to WO ${wo.woNumber}`);

      return {
        sessionId: session.id,
        sessionNum: session.sessionNum,
        woStatus: newStatus,
      };
    });
  }
}
