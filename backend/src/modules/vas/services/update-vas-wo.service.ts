import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { VasWorkOrderRepository } from '../repositories/vas-work-order.repository';
import { VasStateMachineService } from './vas-state-machine.service';
import { UpdateVasWoDto } from '../dto/update-vas-wo.dto';
import { VasWoNotFoundError, VasOptimisticLockError } from '../domain/vas.errors';
import { Prisma } from '@prisma/client';

@Injectable()
export class UpdateVasWoService {
  private readonly logger = new Logger(UpdateVasWoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly woRepo: VasWorkOrderRepository,
    private readonly stateMachine: VasStateMachineService,
  ) {}

  async execute(
    woId: string,
    dto: UpdateVasWoDto,
    actor: { userId: string; role: string },
  ): Promise<{ id: string; woNumber: string; status: string }> {
    return this.prisma.$transaction(async (tx) => {
      const wo = await this.woRepo.findByIdForUpdate(woId, tx);
      if (!wo) {
        throw new VasWoNotFoundError(woId);
      }

      this.stateMachine.assertCanUpdate(wo.status);

      const updateData: Prisma.VasWorkOrderUpdateInput = {};
      
      if (dto.plannedQtyKg !== undefined) {
        updateData.plannedQtyKg = new Prisma.Decimal(dto.plannedQtyKg);
      }
      if (dto.packagingQtyPlanned !== undefined) {
        updateData.packagingQtyPlanned = dto.packagingQtyPlanned;
      }
      if (dto.startDate !== undefined) {
        updateData.startDate = new Date(dto.startDate);
      }
      if (dto.estimatedCompletionDate !== undefined) {
        updateData.estimatedCompletionDate = new Date(dto.estimatedCompletionDate);
      }
      if (dto.notes !== undefined) {
        updateData.notes = dto.notes;
      }

      try {
        const expectedVersion = dto.rowVersion !== undefined 
          ? BigInt(dto.rowVersion) 
          : wo.rowVersion;
        
        const updated = await this.woRepo.updateWithOptimisticLock(
          woId,
          expectedVersion,
          updateData,
          tx,
        );

        this.logger.log(`Updated VAS WO: ${updated.woNumber}`);

        return {
          id: updated.id,
          woNumber: updated.woNumber,
          status: updated.status,
        };
      } catch (error) {
        if (error instanceof Error && error.message === 'OPTIMISTIC_LOCK_FAILED') {
          throw new VasOptimisticLockError(woId);
        }
        throw error;
      }
    });
  }
}
