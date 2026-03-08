import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { BillingContractRepository } from '../repositories/billing-contract.repository';
import { CreateContractDto, UpdateContractDto, QueryContractDto } from '../dto';
import { BilContractStatus } from '../domain/billing.enums';
import { createBillingError } from '../domain/billing.errors';
import { NumberSequenceService } from '../../foundation/services/number-sequence.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BillingContractService {
  private readonly logger = new Logger(BillingContractService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contractRepo: BillingContractRepository,
    private readonly numberSequenceService: NumberSequenceService,
  ) {}

  async create(dto: CreateContractDto, userId: string) {
    const existing = await this.contractRepo.findByExternalId(dto.externalId);
    if (existing) {
      this.logger.warn(`Contract externalId replay: ${dto.externalId}`);
      return { data: existing, isReplay: true };
    }

    const effectiveFrom = new Date(dto.effectiveFrom);
    const effectiveTo = new Date(dto.effectiveTo);

    if (effectiveFrom > effectiveTo) {
      throw createBillingError('CONTRACT_INVALID_DATE_RANGE', {
        effectiveFrom: dto.effectiveFrom,
        effectiveTo: dto.effectiveTo,
      });
    }

    if (dto.feeLines) {
      for (const line of dto.feeLines) {
        if (line.unitRate < 0) {
          throw createBillingError('FEE_LINE_INVALID_RATE', { unitRate: line.unitRate });
        }
        if (line.freeDays !== undefined && line.freeDays < 0) {
          throw createBillingError('FEE_LINE_INVALID_FREE_DAYS', { freeDays: line.freeDays });
        }
      }
    }

    const seqResult = await this.numberSequenceService.getNextNumber(
      'CONTRACT',
      'GLOBAL',
      { actorUserId: userId },
    );
    const contractNumber = seqResult.value;

    return this.prisma.$transaction(async (tx) => {
      const contract = await this.contractRepo.create(
        {
          contractNumber,
          owner: { connect: { id: dto.ownerId } },
          contractScope: dto.contractScope || 'OWNER',
          effectiveFrom,
          effectiveTo,
          currencyCode: dto.currencyCode || 'VND',
          isDefault: dto.isDefault || false,
          status: BilContractStatus.DRAFT,
          notes: dto.notes,
          externalId: dto.externalId,
          createdBy: userId,
          updatedBy: userId,
        },
        tx,
      );

      if (dto.feeLines && dto.feeLines.length > 0) {
        await this.contractRepo.createFeeLines(
          contract.id,
          dto.feeLines.map((line, index) => ({
            contractId: contract.id,
            feeType: line.feeType,
            cargoForm: line.cargoForm,
            warehouseId: line.warehouseId,
            dayTypeScope: line.dayTypeScope,
            billingUom: line.billingUom || 'MT',
            unitRate: line.unitRate,
            minimumCharge: line.minimumCharge,
            freeDays: line.freeDays,
            materialRatePerBag: line.materialRatePerBag,
            tierRuleCode: line.tierRuleCode,
            priorityRank: line.priorityRank || (index + 1) * 10,
            isActive: true,
          })),
          tx,
        );
      }

      const result = await this.contractRepo.findById(contract.id, tx);
      return { data: result, isReplay: false };
    });
  }

  async findById(id: string) {
    const contract = await this.contractRepo.findById(id);
    if (!contract) {
      throw createBillingError('CONTRACT_NOT_FOUND', { id });
    }
    return contract;
  }

  async findMany(query: QueryContractDto) {
    return this.contractRepo.findMany({
      ownerId: query.ownerId,
      status: query.status as BilContractStatus,
      effectiveDate: query.effectiveDate ? new Date(query.effectiveDate) : undefined,
      isDefault: query.isDefault,
      page: query.page,
      limit: query.limit,
    });
  }

  async update(id: string, dto: UpdateContractDto, userId: string) {
    const contract = await this.contractRepo.findById(id);
    if (!contract) {
      throw createBillingError('CONTRACT_NOT_FOUND', { id });
    }

    if (contract.status === BilContractStatus.ACTIVE) {
      throw createBillingError('CONTRACT_ALREADY_ACTIVE', { id, status: contract.status });
    }

    const effectiveFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : contract.effectiveFrom;
    const effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : contract.effectiveTo;

    if (effectiveFrom > effectiveTo) {
      throw createBillingError('CONTRACT_INVALID_DATE_RANGE', {
        effectiveFrom: dto.effectiveFrom,
        effectiveTo: dto.effectiveTo,
      });
    }

    return this.prisma.$transaction(async (tx) => {
      await this.contractRepo.update(
        id,
        {
          effectiveFrom,
          effectiveTo,
          currencyCode: dto.currencyCode,
          isDefault: dto.isDefault,
          notes: dto.notes,
          updatedBy: userId,
        },
        tx,
      );

      if (dto.feeLines) {
        await this.contractRepo.deleteFeeLines(id, tx);
        await this.contractRepo.createFeeLines(
          id,
          dto.feeLines.map((line, index) => ({
            contractId: id,
            feeType: line.feeType,
            cargoForm: line.cargoForm,
            warehouseId: line.warehouseId,
            dayTypeScope: line.dayTypeScope,
            billingUom: line.billingUom || 'MT',
            unitRate: line.unitRate,
            minimumCharge: line.minimumCharge,
            freeDays: line.freeDays,
            materialRatePerBag: line.materialRatePerBag,
            tierRuleCode: line.tierRuleCode,
            priorityRank: line.priorityRank || (index + 1) * 10,
            isActive: true,
          })),
          tx,
        );
      }

      return this.contractRepo.findById(id, tx);
    });
  }

  async activate(id: string, userId: string) {
    const contract = await this.contractRepo.findById(id);
    if (!contract) {
      throw createBillingError('CONTRACT_NOT_FOUND', { id });
    }

    const overlapping = await this.contractRepo.findOverlapping(
      contract.ownerId,
      contract.effectiveFrom,
      contract.effectiveTo,
      id,
    );

    const activeOverlap = overlapping.filter(c => c.status === BilContractStatus.ACTIVE);
    if (activeOverlap.length > 0) {
      throw createBillingError('CONTRACT_OVERLAP', {
        overlappingContracts: activeOverlap.map(c => c.contractNumber),
      });
    }

    return this.contractRepo.update(id, {
      status: BilContractStatus.ACTIVE,
      updatedBy: userId,
    });
  }

  async deactivate(id: string, userId: string) {
    const contract = await this.contractRepo.findById(id);
    if (!contract) {
      throw createBillingError('CONTRACT_NOT_FOUND', { id });
    }

    return this.contractRepo.update(id, {
      status: BilContractStatus.INACTIVE,
      updatedBy: userId,
    });
  }

  async findActiveContract(ownerId: string, effectiveDate: Date) {
    return this.contractRepo.findActiveByOwner(ownerId, effectiveDate);
  }

  async getFeeLines(contractId: string) {
    const contract = await this.contractRepo.findById(contractId);
    if (!contract) {
      throw createBillingError('CONTRACT_NOT_FOUND', { id: contractId });
    }
    return this.contractRepo.findFeeLines(contractId);
  }
}
