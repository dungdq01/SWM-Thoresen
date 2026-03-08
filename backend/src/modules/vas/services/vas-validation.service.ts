import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma, CargoForm } from '@prisma/client';
import { VasDomainError } from '../domain/vas.errors';
import { VasExceptionCode } from '../domain/vas.enums';
import { HttpStatus } from '@nestjs/common';

export interface ValidatedMasterData {
  owner: { id: string; ownerCode: string; ownerName: string };
  warehouse: { id: string; warehouseCode: string; warehouseName: string };
  bulkSourceItem: { id: string; itemCode: string; itemName: string; cargoForm: string };
  baggedOutputItem: { id: string; itemCode: string; itemName: string; cargoForm: string };
  packagingItem: { id: string; itemCode: string; itemName: string; isPackaging: boolean };
  packagingOwner: { id: string; ownerCode: string; ownerName: string };
}

@Injectable()
export class VasValidationService {
  private readonly logger = new Logger(VasValidationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async validateMasterData(
    params: {
      ownerId: string;
      warehouseId: string;
      bulkSourceItemId: string;
      baggedOutputItemId: string;
      packagingItemId: string;
      packagingOwnerId: string;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<ValidatedMasterData> {
    const client = tx || this.prisma;

    const [owner, warehouse, bulkSourceItem, baggedOutputItem, packagingItem, packagingOwner] =
      await Promise.all([
        client.mdOwner.findUnique({
          where: { id: params.ownerId, isActive: true },
          select: { id: true, ownerCode: true, ownerName: true },
        }),
        client.mdWarehouse.findUnique({
          where: { id: params.warehouseId, isActive: true },
          select: { id: true, warehouseCode: true, warehouseName: true },
        }),
        client.mdItem.findUnique({
          where: { id: params.bulkSourceItemId, isActive: true },
          select: { id: true, itemCode: true, itemName: true, cargoForm: true },
        }),
        client.mdItem.findUnique({
          where: { id: params.baggedOutputItemId, isActive: true },
          select: { id: true, itemCode: true, itemName: true, cargoForm: true },
        }),
        client.mdItem.findUnique({
          where: { id: params.packagingItemId, isActive: true },
          select: { id: true, itemCode: true, itemName: true, isPackaging: true },
        }),
        client.mdOwner.findUnique({
          where: { id: params.packagingOwnerId, isActive: true },
          select: { id: true, ownerCode: true, ownerName: true },
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

    if (!bulkSourceItem) {
      throw new VasDomainError(
        VasExceptionCode.VAS_WO_NOT_FOUND,
        `Bulk source item not found: ${params.bulkSourceItemId}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (bulkSourceItem.cargoForm !== CargoForm.BULK) {
      throw new VasDomainError(
        VasExceptionCode.VAS_SESSION_INVALID,
        `Bulk source item must have cargoForm = BULK. Got: ${bulkSourceItem.cargoForm}`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (!baggedOutputItem) {
      throw new VasDomainError(
        VasExceptionCode.VAS_WO_NOT_FOUND,
        `Bagged output item not found: ${params.baggedOutputItemId}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const validBaggedForms: CargoForm[] = [
      CargoForm.BAGGED_25KG,
      CargoForm.BAGGED_40KG,
      CargoForm.BAGGED_50KG,
      CargoForm.JUMBO,
    ];
    if (!validBaggedForms.includes(baggedOutputItem.cargoForm as CargoForm)) {
      throw new VasDomainError(
        VasExceptionCode.VAS_SESSION_INVALID,
        `Bagged output item must have cargoForm = BAGGED_*. Got: ${baggedOutputItem.cargoForm}`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (!packagingItem) {
      throw new VasDomainError(
        VasExceptionCode.VAS_WO_NOT_FOUND,
        `Packaging item not found: ${params.packagingItemId}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!packagingItem.isPackaging) {
      throw new VasDomainError(
        VasExceptionCode.VAS_PACKAGING_OWNER_INVALID,
        `Item ${packagingItem.itemCode} is not marked as packaging material`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (!packagingOwner) {
      throw new VasDomainError(
        VasExceptionCode.VAS_PACKAGING_OWNER_INVALID,
        `Packaging owner not found: ${params.packagingOwnerId}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      owner,
      warehouse,
      bulkSourceItem,
      baggedOutputItem,
      packagingItem,
      packagingOwner,
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
