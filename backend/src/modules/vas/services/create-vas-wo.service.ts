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
      // Validate master data using simplified params
      await this.validationService.validateMasterData(
        {
          ownerId: dto.ownerId,
          warehouseId: dto.warehouseId,
          sourceItemId: dto.sourceItemId,
        },
        tx,
      );

      const woNumber = await this.generateWoNumber(tx);
      const correlationId = uuidv4();
      const externalId = `VAS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Map frontend fields to Prisma schema fields
      // sourceItemId -> bulkSourceItemId (same item used as both source and output for simplicity)
      // sourceQty -> plannedQtyKg
      // targetQty -> packagingQtyPlanned
      // Use owner as packaging owner (TVL_OWNED by default)
      const wo = await this.woRepo.create(
        {
          woNumber,
          status: VasWoStatus.DRAFT,
          owner: { connect: { id: dto.ownerId } },
          warehouse: { connect: { id: dto.warehouseId } },
          bulkSourceItem: { connect: { id: dto.sourceItemId } },
          baggedOutputItem: { connect: { id: dto.sourceItemId } }, // Same item for simplicity
          plannedQtyKg: new Prisma.Decimal(dto.sourceQty),
          packagingOwnership: 'TVL_OWNED' as any,
          packagingItem: { connect: { id: dto.sourceItemId } }, // Placeholder - same item
          packagingOwner: { connect: { id: dto.ownerId } }, // Same owner
          packagingQtyPlanned: dto.targetQty,
          startDate: new Date(),
          notes: dto.notes,
          externalId,
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
