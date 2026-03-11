import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma, CargoForm } from '@prisma/client';
import { VasDomainError } from '../domain/vas.errors';
import { VasExceptionCode } from '../domain/vas.enums';
import { HttpStatus } from '@nestjs/common';

export interface ValidatedMasterData {
  owner: { id: string; ownerCode: string; ownerName: string };
  warehouse: { id: string; warehouseCode: string; warehouseName: string };
  sourceItem: { id: string; itemCode: string; itemName: string; cargoForm: string };
}

@Injectable()
export class VasValidationService {
  private readonly logger = new Logger(VasValidationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async validateMasterData(
    params: {
      ownerId: string;
      warehouseId: string;
      sourceItemId: string;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<ValidatedMasterData> {
    const client = tx || this.prisma;

    const [owner, warehouse, sourceItem] = await Promise.all([
      client.mdOwner.findUnique({
        where: { id: params.ownerId, isActive: true },
        select: { id: true, ownerCode: true, ownerName: true },
      }),
      client.mdWarehouse.findUnique({
        where: { id: params.warehouseId, isActive: true },
        select: { id: true, warehouseCode: true, warehouseName: true },
      }),
      client.mdItem.findUnique({
        where: { id: params.sourceItemId, isActive: true },
        select: { id: true, itemCode: true, itemName: true, cargoForm: true },
      }),
    ]);

    if (!owner) {
      throw new VasDomainError(
        VasExceptionCode.VAS_WO_NOT_FOUND,
        `Owner not found: ${params.ownerId}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!warehouse) {
      throw new VasDomainError(
        VasExceptionCode.VAS_WO_NOT_FOUND,
        `Warehouse not found: ${params.warehouseId}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!sourceItem) {
      throw new VasDomainError(
        VasExceptionCode.VAS_WO_NOT_FOUND,
        `Source item not found: ${params.sourceItemId}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      owner,
      warehouse,
      sourceItem,
    };
  }

  validateMaterialBalance(
    actualConsumedQtyKg: number,
    actualOutputQtyKg: number,
  ): { processLossQtyKg: number; isValid: boolean } {
    const processLossQtyKg = actualConsumedQtyKg - actualOutputQtyKg;
    const isValid = processLossQtyKg >= 0 && actualOutputQtyKg <= actualConsumedQtyKg;

    return { processLossQtyKg, isValid };
  }

  requiresVarianceReason(
    processLossQtyKg: number,
    actualConsumedQtyKg: number,
    thresholdPct: number = 2,
  ): boolean {
    if (actualConsumedQtyKg === 0) return false;
    const lossPercentage = (processLossQtyKg / actualConsumedQtyKg) * 100;
    return lossPercentage > thresholdPct;
  }
}
