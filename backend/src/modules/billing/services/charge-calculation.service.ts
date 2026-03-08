import { Injectable, Logger } from '@nestjs/common';
import { RateResolutionService, ResolvedRate } from './rate-resolution.service';
import { BilFeeType, BilDayType } from '../domain/billing.enums';
import { CargoForm } from '@prisma/client';
import Decimal from 'decimal.js';

export interface ChargeInput {
  ownerId: string;
  feeType: BilFeeType;
  billingQtyMt: number;
  eventDate: Date;
  cargoForm?: CargoForm;
  warehouseId?: string;
  dayType?: BilDayType;
  isOvertime?: boolean;
  combinedMultiplier?: number;
}

export interface CalculatedCharge {
  baseAmount: number;
  multiplier: number;
  finalAmount: number;
  unitRate: number;
  billingQtyMt: number;
  billingUom: string;
  minimumApplied: boolean;
  calculationTrace: Record<string, unknown>;
  resolvedRate: ResolvedRate;
}

@Injectable()
export class ChargeCalculationService {
  private readonly logger = new Logger(ChargeCalculationService.name);

  constructor(private readonly rateService: RateResolutionService) {}

  async calculateCharge(input: ChargeInput): Promise<CalculatedCharge | null> {
    const rate = await this.rateService.resolveRate({
      ownerId: input.ownerId,
      feeType: input.feeType,
      eventDate: input.eventDate,
      cargoForm: input.cargoForm,
      warehouseId: input.warehouseId,
      dayType: input.dayType,
    });

    if (!rate) {
      this.logger.warn(`Cannot calculate charge - no rate found for: ${JSON.stringify(input)}`);
      return null;
    }

    const qty = new Decimal(input.billingQtyMt);
    const unitRate = new Decimal(rate.unitRate);
    const multiplier = new Decimal(input.combinedMultiplier ?? 1);

    let baseAmount = qty.times(unitRate);
    let minimumApplied = false;

    if (rate.minimumCharge) {
      const minCharge = new Decimal(rate.minimumCharge);
      if (baseAmount.lt(minCharge)) {
        baseAmount = minCharge;
        minimumApplied = true;
      }
    }

    const finalAmount = baseAmount.times(multiplier);

    const trace = {
      input: {
        billingQtyMt: input.billingQtyMt,
        feeType: input.feeType,
        cargoForm: input.cargoForm,
        dayType: input.dayType,
        isOvertime: input.isOvertime,
      },
      rate: {
        unitRate: rate.unitRate,
        minimumCharge: rate.minimumCharge,
        billingUom: rate.billingUom,
        contractId: rate.contractId,
        feeLineId: rate.feeLineId,
      },
      calculation: {
        baseFormula: `${input.billingQtyMt} × ${rate.unitRate}`,
        baseAmount: baseAmount.toNumber(),
        multiplier: multiplier.toNumber(),
        minimumApplied,
        finalFormula: minimumApplied
          ? `max(${qty.times(unitRate).toNumber()}, ${rate.minimumCharge}) × ${multiplier.toNumber()}`
          : `${baseAmount.toNumber()} × ${multiplier.toNumber()}`,
        finalAmount: finalAmount.toNumber(),
      },
      timestamp: new Date().toISOString(),
    };

    return {
      baseAmount: baseAmount.toNumber(),
      multiplier: multiplier.toNumber(),
      finalAmount: finalAmount.toNumber(),
      unitRate: rate.unitRate,
      billingQtyMt: input.billingQtyMt,
      billingUom: rate.billingUom,
      minimumApplied,
      calculationTrace: trace,
      resolvedRate: rate,
    };
  }

  async calculateStorageCharge(
    ownerId: string,
    billableQtyMt: number,
    snapshotDate: Date,
    cargoForm?: CargoForm,
    warehouseId?: string,
  ): Promise<CalculatedCharge | null> {
    return this.calculateCharge({
      ownerId,
      feeType: BilFeeType.STORAGE,
      billingQtyMt: billableQtyMt,
      eventDate: snapshotDate,
      cargoForm,
      warehouseId,
      combinedMultiplier: 1,
    });
  }

  async calculateHandlingCharge(
    ownerId: string,
    feeType: BilFeeType.HANDLING_INBOUND | BilFeeType.HANDLING_OUTBOUND,
    billingQtyMt: number,
    eventDate: Date,
    combinedMultiplier: number,
    cargoForm?: CargoForm,
    warehouseId?: string,
    dayType?: BilDayType,
    isOvertime?: boolean,
  ): Promise<CalculatedCharge | null> {
    return this.calculateCharge({
      ownerId,
      feeType,
      billingQtyMt,
      eventDate,
      cargoForm,
      warehouseId,
      dayType,
      isOvertime,
      combinedMultiplier,
    });
  }
}
