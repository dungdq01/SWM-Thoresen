import { Injectable, BadRequestException } from '@nestjs/common';
import { ExceptionLogRepository } from '../repositories/exception-log.repository';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

export interface ToleranceCheckParams {
  shipmentId: string;
  lineId: string;
  netWeightKg: number;
  expectedQtyKg: number;
  itemId: string;
  ownerId: string;
  correlationId?: string;
}

export interface ToleranceResult {
  passed: boolean;
  variancePct: number;
  tolerancePct: number;
  netWeightKg: number;
  expectedQtyKg: number;
  varianceKg: number;
  exceptionId?: string;
}

@Injectable()
export class ToleranceService {
  private readonly DEFAULT_TOLERANCE_PCT = parseFloat(process.env.OUTBOUND_TOLERANCE_PCT || '2.0');

  constructor(
    private readonly prisma: PrismaService,
    private readonly exceptionRepo: ExceptionLogRepository,
  ) {}

  async checkTolerance(params: ToleranceCheckParams): Promise<ToleranceResult> {
    const tolerancePct = await this.getTolerancePct(params.itemId, params.ownerId);

    const varianceKg = params.netWeightKg - params.expectedQtyKg;
    const variancePct = params.expectedQtyKg > 0
      ? (varianceKg / params.expectedQtyKg) * 100
      : 0;

    const passed = Math.abs(variancePct) <= tolerancePct;

    let exceptionId: string | undefined;

    if (!passed) {
      const exception = await this.exceptionRepo.create({
        shipmentHeaderId: params.shipmentId,
        shipmentLineId: params.lineId,
        exceptionType: 'TOLERANCE_FAIL',
        exceptionCode: variancePct > 0 ? 'TOLERANCE_OVER' : 'TOLERANCE_UNDER',
        severity: 'HIGH',
        detailJson: {
          netWeightKg: params.netWeightKg,
          expectedQtyKg: params.expectedQtyKg,
          varianceKg,
          variancePct,
          tolerancePct,
        },
        correlationId: params.correlationId || uuidv4(),
      });
      exceptionId = exception.id;
    }

    return {
      passed,
      variancePct,
      tolerancePct,
      netWeightKg: params.netWeightKg,
      expectedQtyKg: params.expectedQtyKg,
      varianceKg,
      exceptionId,
    };
  }

  /**
   * HI-2: 4-level tolerance cascade lookup
   * Priority: OwnerItemPolicy → Item → Owner → ENV default
   */
  private async getTolerancePct(itemId: string, ownerId: string): Promise<number> {
    // Level 1: Check OwnerItemPolicy for specific owner+item combination
    const ownerItemPolicy = await this.prisma.mdOwnerItemPolicy.findFirst({
      where: {
        ownerId,
        itemId,
        isActive: true,
      },
      select: { tolerancePctOutboundOverride: true },
    });
    if (ownerItemPolicy?.tolerancePctOutboundOverride != null) {
      return Number(ownerItemPolicy.tolerancePctOutboundOverride);
    }

    // Level 2: Check Item default tolerance
    const item = await this.prisma.mdItem.findUnique({
      where: { id: itemId },
      select: { tolerancePctOutbound: true },
    });
    if (item?.tolerancePctOutbound != null) {
      return Number(item.tolerancePctOutbound);
    }

    // Level 3: Check Owner default tolerance
    const owner = await this.prisma.mdOwner.findUnique({
      where: { id: ownerId },
      select: { defaultTolerancePct: true },
    });
    if (owner?.defaultTolerancePct != null) {
      return Number(owner.defaultTolerancePct);
    }

    // Level 4: ENV default
    return this.DEFAULT_TOLERANCE_PCT;
  }

  async resolveToleranceException(
    exceptionId: string,
    decision: 'APPROVE' | 'REJECT',
    userId: string,
  ) {
    if (decision === 'APPROVE') {
      return this.exceptionRepo.resolve(exceptionId, userId);
    } else {
      return this.exceptionRepo.reject(exceptionId, userId);
    }
  }
}
