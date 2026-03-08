import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { VasWorkOrderRepository } from '../repositories/vas-work-order.repository';
import { VasStateHistoryRepository } from '../repositories/vas-state-history.repository';
import { VasValidationService } from './vas-validation.service';
import { CreateVasWoDto } from '../dto/create-vas-wo.dto';
import { VasDuplicateExternalIdError } from '../domain/vas.errors';
import { VasWoStatus, VasStateAction } from '../domain/vas.enums';
import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';

export interface CreateVasWoResult {
  id: string;
  woNumber: string;
  status: string;
}

@Injectable()
export class CreateVasWoService {
  private readonly logger = new Logger(CreateVasWoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly woRepo: VasWorkOrderRepository,
    private readonly stateHistoryRepo: VasStateHistoryRepository,
    private readonly validationService: VasValidationService,
  ) {}

  async execute(
    dto: CreateVasWoDto,
    actor: { userId: string; role: string },
  ): Promise<CreateVasWoResult> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.woRepo.findByExternalId(dto.externalId, tx);
      if (existing) {
        this.logger.warn(`Duplicate externalId: ${dto.externalId}`);
        return {
          id: existing.id,
          woNumber: existing.woNumber,
          status: existing.status,
        };
      }

      await this.validationService.validateMasterData(
        {
          ownerId: dto.ownerId,
          warehouseId: dto.warehouseId,
          bulkSourceItemId: dto.bulkSourceItemId,
          baggedOutputItemId: dto.baggedOutputItemId,
          packagingItemId: dto.packagingItemId,
          packagingOwnerId: dto.packagingOwnerId,
        },
        tx,
      );

      const woNumber = await this.generateWoNumber(tx);
      const correlationId = uuidv4();

      const wo = await this.woRepo.create(
        {
          woNumber,
          status: VasWoStatus.DRAFT,
          owner: { connect: { id: dto.ownerId } },
          warehouse: { connect: { id: dto.warehouseId } },
          bulkSourceItem: { connect: { id: dto.bulkSourceItemId } },
          baggedOutputItem: { connect: { id: dto.baggedOutputItemId } },
          plannedQtyKg: new Prisma.Decimal(dto.plannedQtyKg),
          packagingOwnership: dto.packagingOwnership as any,
          packagingItem: { connect: { id: dto.packagingItemId } },
          packagingOwner: { connect: { id: dto.packagingOwnerId } },
          packagingQtyPlanned: dto.packagingQtyPlanned,
          startDate: new Date(dto.startDate),
          estimatedCompletionDate: dto.estimatedCompletionDate
            ? new Date(dto.estimatedCompletionDate)
            : null,
          notes: dto.notes,
          externalId: dto.externalId,
          correlationId,
          createdBy: actor.userId,
        },
        tx,
      );

      await this.stateHistoryRepo.append(
        {
          woId: wo.id,
          fromStatus: null,
          toStatus: VasWoStatus.DRAFT as any,
          action: VasStateAction.CREATE as any,
          actorId: actor.userId,
          actorRole: actor.role,
          correlationId,
        },
        tx,
      );

      this.logger.log(`Created VAS WO: ${woNumber}`);

      return {
        id: wo.id,
        woNumber: wo.woNumber,
        status: wo.status,
      };
    });
  }

  private async generateWoNumber(tx: Prisma.TransactionClient): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    const count = await tx.vasWorkOrder.count({
      where: {
        createdAt: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
          lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
        },
      },
    });

    const seq = String(count + 1).padStart(6, '0');
    return `VAS-${dateStr}-${seq}`;
  }
}
