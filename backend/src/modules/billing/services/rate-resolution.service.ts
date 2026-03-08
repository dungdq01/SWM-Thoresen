import { Injectable, Logger } from '@nestjs/common';
import { BillingContractRepository } from '../repositories/billing-contract.repository';
import { BilFeeType, BilDayType } from '../domain/billing.enums';
import { CargoForm } from '@prisma/client';

export interface RateResolutionInput {
  ownerId: string;
  feeType: BilFeeType;
  eventDate: Date;
  cargoForm?: CargoForm;
  warehouseId?: string;
  dayType?: BilDayType;
}

export interface ResolvedRate {
  unitRate: number;
  minimumCharge?: number;
  freeDays?: number;
  materialRatePerBag?: number;
  contractId: string;
  feeLineId: string;
  billingUom: string;
  matchScore: number;
}

@Injectable()
export class RateResolutionService {
  private readonly logger = new Logger(RateResolutionService.name);

  constructor(private readonly contractRepo: BillingContractRepository) {}

  async resolveRate(input: RateResolutionInput): Promise<ResolvedRate | null> {
    const contract = await this.contractRepo.findActiveByOwner(input.ownerId, input.eventDate);
    if (!contract) {
      this.logger.warn(`No active contract found for owner=${input.ownerId}, date=${input.eventDate}`);
      return null;
    }

    const feeLines = contract.feeLines.filter(
      line => line.isActive && line.feeType === input.feeType,
    );

    if (feeLines.length === 0) {
      this.logger.warn(`No fee lines for feeType=${input.feeType} in contract=${contract.id}`);
      return null;
    }

    const scored = feeLines.map(line => {
      let score = 0;

      if (line.cargoForm && line.cargoForm === input.cargoForm) {
        score += 100;
      } else if (line.cargoForm && line.cargoForm !== input.cargoForm) {
        score -= 1000;
      }

      if (line.warehouseId && line.warehouseId === input.warehouseId) {
        score += 50;
      } else if (line.warehouseId && line.warehouseId !== input.warehouseId) {
        score -= 1000;
      }

      if (line.dayTypeScope) {
        const scopes = line.dayTypeScope.split(',');
        if (input.dayType && scopes.includes(input.dayType)) {
          score += 25;
        } else if (input.dayType && !scopes.includes(input.dayType) && !scopes.includes('ALL')) {
          score -= 1000;
        }
      }

      score -= line.priorityRank;

      return { line, score };
    });

    const eligible = scored.filter(s => s.score > -500);
    if (eligible.length === 0) {
      this.logger.warn(`No matching fee line for input: ${JSON.stringify(input)}`);
      return null;
    }

    eligible.sort((a, b) => b.score - a.score);
    const best = eligible[0];

    return {
      unitRate: Number(best.line.unitRate),
      minimumCharge: best.line.minimumCharge ? Number(best.line.minimumCharge) : undefined,
      freeDays: best.line.freeDays ?? undefined,
      materialRatePerBag: best.line.materialRatePerBag ? Number(best.line.materialRatePerBag) : undefined,
      contractId: contract.id,
      feeLineId: best.line.id,
      billingUom: best.line.billingUom,
      matchScore: best.score,
    };
  }

  async resolveStorageRate(
    ownerId: string,
    eventDate: Date,
    cargoForm?: CargoForm,
    warehouseId?: string,
  ): Promise<ResolvedRate | null> {
    return this.resolveRate({
      ownerId,
      feeType: BilFeeType.STORAGE,
      eventDate,
      cargoForm,
      warehouseId,
    });
  }

  async resolveHandlingRate(
    ownerId: string,
    feeType: BilFeeType.HANDLING_INBOUND | BilFeeType.HANDLING_OUTBOUND,
    eventDate: Date,
    cargoForm?: CargoForm,
    warehouseId?: string,
    dayType?: BilDayType,
  ): Promise<ResolvedRate | null> {
    return this.resolveRate({
      ownerId,
      feeType,
      eventDate,
      cargoForm,
      warehouseId,
      dayType,
    });
  }
}
