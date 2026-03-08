import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { DebitNoteRepository } from '../repositories/debit-note.repository';
import { BillingEventRepository } from '../repositories/billing-event.repository';
import { BillingExceptionRepository } from '../repositories/billing-exception.repository';
import { ChargeCalculationService } from './charge-calculation.service';
import { BillingContractService } from './billing-contract.service';
import {
  GenerateDebitNoteDto,
  ReviewDebitNoteDto,
  ApproveDebitNoteDto,
  LockDebitNoteDto,
  RegenerateDebitNoteDto,
  QueryDebitNoteDto,
} from '../dto';
import {
  BilDebitNoteStatus,
  BilFeeType,
  BilEventBillingStatus,
  BilDnActionCode,
  BilExceptionSeverity,
  BIL_DEFAULT_VAT_RATE,
} from '../domain/billing.enums';
import { DebitNoteStateMachine } from '../domain/debit-note-state-machine';
import { createBillingError } from '../domain/billing.errors';
import { NumberSequenceService } from '../../foundation/services/number-sequence.service';
import Decimal from 'decimal.js';
import { v4 as uuidv4 } from 'uuid';

interface LineAccumulator {
  chargeCode: string;
  description: string;
  feeType: BilFeeType;
  sourceType: string;
  billingQtyMt: Decimal;
  amountVnd: Decimal;
  unitRate: number;
  combinedMultiplier: number;
  eventIds: string[];
  calculationTraces: Record<string, unknown>[];
}

@Injectable()
export class DebitNoteService {
  private readonly logger = new Logger(DebitNoteService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dnRepo: DebitNoteRepository,
    private readonly eventRepo: BillingEventRepository,
    private readonly exceptionRepo: BillingExceptionRepository,
    private readonly chargeCalcService: ChargeCalculationService,
    private readonly contractService: BillingContractService,
    private readonly numberSequenceService: NumberSequenceService,
  ) {}

  async generate(dto: GenerateDebitNoteDto, userId: string) {
    const existing = await this.dnRepo.findByExternalId(dto.externalId);
    if (existing) {
      this.logger.warn(`DN externalId replay: ${dto.externalId}`);
      return { data: existing, isReplay: true };
    }

    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);

    if (periodStart > periodEnd) {
      throw createBillingError('INVALID_PERIOD', {
        periodStart: dto.periodStart,
        periodEnd: dto.periodEnd,
      });
    }

    const existingDraft = await this.dnRepo.findExistingDraft(dto.ownerId, periodStart, periodEnd);
    if (existingDraft) {
      throw createBillingError('DN_EXTERNAL_ID_EXISTS', {
        existingDnNumber: existingDraft.dnNumber,
        message: 'A debit note already exists for this period. Use regenerate instead.',
      });
    }

    const contract = await this.contractService.findActiveContract(dto.ownerId, periodStart);
    const unbilledEvents = await this.eventRepo.findUnbilledByOwnerAndPeriod(
      dto.ownerId,
      periodStart,
      periodEnd,
    );

    if (unbilledEvents.length === 0) {
      throw createBillingError('DN_NO_CHARGES', {
        ownerId: dto.ownerId,
        periodStart: dto.periodStart,
        periodEnd: dto.periodEnd,
      });
    }

    const lineAccumulators = new Map<string, LineAccumulator>();

    for (const event of unbilledEvents) {
      const charge = await this.chargeCalcService.calculateCharge({
        ownerId: event.ownerId,
        feeType: event.eventType as unknown as BilFeeType,
        billingQtyMt: Number(event.billingQtyMt),
        eventDate: event.eventDate,
        cargoForm: event.cargoForm ?? undefined,
        warehouseId: event.warehouseId,
        combinedMultiplier: Number(event.combinedMultiplier),
      });

      if (!charge) {
        this.logger.warn(`No rate found for event ${event.id}, creating exception`);
        continue;
      }

      const key = `${event.eventType}-${charge.resolvedRate.feeLineId}`;
      const existing = lineAccumulators.get(key);

      if (existing) {
        existing.billingQtyMt = existing.billingQtyMt.plus(charge.billingQtyMt);
        existing.amountVnd = existing.amountVnd.plus(charge.finalAmount);
        existing.eventIds.push(event.id);
        existing.calculationTraces.push(charge.calculationTrace);
      } else {
        lineAccumulators.set(key, {
          chargeCode: `${event.eventType}-${charge.resolvedRate.billingUom}`,
          description: this.getChargeDescription(event.eventType as unknown as BilFeeType),
          feeType: event.eventType as unknown as BilFeeType,
          sourceType: 'BILLING_EVENT',
          billingQtyMt: new Decimal(charge.billingQtyMt),
          amountVnd: new Decimal(charge.finalAmount),
          unitRate: charge.unitRate,
          combinedMultiplier: charge.multiplier,
          eventIds: [event.id],
          calculationTraces: [charge.calculationTrace],
        });
      }
    }

    const seqResult = await this.numberSequenceService.getNextNumber(
      'DN',
      'GLOBAL',
      { actorUserId: userId },
    );
    const dnNumber = seqResult.value;
    const correlationId = uuidv4();

    return this.prisma.$transaction(async (tx) => {
      let totalBeforeVat = new Decimal(0);
      const lines: Array<{
        lineSeq: number;
        chargeCode: string;
        description: string;
        feeType: BilFeeType;
        sourceType: string;
        ownerId: string;
        billingQtyMt: number;
        unitRate: number;
        combinedMultiplier: number;
        amountVnd: number;
        calculationTraceJson: Record<string, unknown>;
        eventIds: string[];
      }> = [];

      let seq = 1;
      for (const [, acc] of lineAccumulators) {
        totalBeforeVat = totalBeforeVat.plus(acc.amountVnd);
        lines.push({
          lineSeq: seq++,
          chargeCode: acc.chargeCode,
          description: acc.description,
          feeType: acc.feeType,
          sourceType: acc.sourceType,
          ownerId: dto.ownerId,
          billingQtyMt: acc.billingQtyMt.toNumber(),
          unitRate: acc.unitRate,
          combinedMultiplier: acc.combinedMultiplier,
          amountVnd: acc.amountVnd.toNumber(),
          calculationTraceJson: {
            aggregatedTraces: acc.calculationTraces,
            eventCount: acc.eventIds.length,
          },
          eventIds: acc.eventIds,
        });
      }

      const vatAmount = totalBeforeVat.times(BIL_DEFAULT_VAT_RATE);
      const grandTotal = totalBeforeVat.plus(vatAmount);

      const dn = await this.dnRepo.create(
        {
          dnNumber,
          owner: { connect: { id: dto.ownerId } },
          contract: contract ? { connect: { id: contract.id } } : undefined,
          billingPeriodStart: periodStart,
          billingPeriodEnd: periodEnd,
          generationBasis: 'PERIOD',
          status: BilDebitNoteStatus.DRAFT,
          totalBeforeVat: totalBeforeVat.toNumber(),
          vatRate: BIL_DEFAULT_VAT_RATE,
          vatAmount: vatAmount.toNumber(),
          grandTotal: grandTotal.toNumber(),
          currencyCode: 'VND',
          contractVersionJson: contract ? { contractId: contract.id, version: contract.versionNo } : undefined,
          externalId: dto.externalId,
          correlationId,
          createdBy: userId,
          updatedBy: userId,
        },
        tx,
      );

      for (const line of lines) {
        const createdLine = await tx.bilDebitNoteLine.create({
          data: {
            debitNoteId: dn.id,
            lineSeq: line.lineSeq,
            chargeCode: line.chargeCode,
            description: line.description,
            feeType: line.feeType,
            sourceType: line.sourceType,
            ownerId: line.ownerId,
            billingQtyMt: line.billingQtyMt,
            unitRate: line.unitRate,
            combinedMultiplier: line.combinedMultiplier,
            amountVnd: line.amountVnd,
            calculationTraceJson: line.calculationTraceJson as object,
          },
        });

        await this.eventRepo.updateBillingStatus(
          line.eventIds,
          BilEventBillingStatus.BILLED,
          createdLine.id,
          tx,
        );
      }

      await this.dnRepo.createHistory(
        {
          debitNote: { connect: { id: dn.id } },
          actionCode: BilDnActionCode.GENERATED,
          fromStatus: null,
          toStatus: BilDebitNoteStatus.DRAFT,
          actionBy: userId,
          remarks: `Generated DN for period ${dto.periodStart} to ${dto.periodEnd}`,
        },
        tx,
      );

      const result = await this.dnRepo.findById(dn.id, tx);
      return { data: result, isReplay: false };
    });
  }

  async review(id: string, dto: ReviewDebitNoteDto, userId: string) {
    const dn = await this.dnRepo.findById(id);
    if (!dn) throw createBillingError('DN_NOT_FOUND', { id });

    DebitNoteStateMachine.validateTransition(
      dn.status as BilDebitNoteStatus,
      BilDebitNoteStatus.REVIEWED,
    );

    return this.prisma.$transaction(async (tx) => {
      await this.dnRepo.update(
        id,
        {
          status: BilDebitNoteStatus.REVIEWED,
          reviewedBy: userId,
          reviewedAt: new Date(),
          updatedBy: userId,
        },
        tx,
      );

      await this.dnRepo.createHistory(
        {
          debitNote: { connect: { id } },
          actionCode: BilDnActionCode.REVIEWED,
          fromStatus: dn.status as BilDebitNoteStatus,
          toStatus: BilDebitNoteStatus.REVIEWED,
          actionBy: userId,
          remarks: dto.remarks,
        },
        tx,
      );

      return this.dnRepo.findById(id, tx);
    });
  }

  async approve(id: string, dto: ApproveDebitNoteDto, userId: string) {
    const dn = await this.dnRepo.findById(id);
    if (!dn) throw createBillingError('DN_NOT_FOUND', { id });

    DebitNoteStateMachine.validateTransition(
      dn.status as BilDebitNoteStatus,
      BilDebitNoteStatus.APPROVED,
    );

    return this.prisma.$transaction(async (tx) => {
      await this.dnRepo.update(
        id,
        {
          status: BilDebitNoteStatus.APPROVED,
          approvedBy: userId,
          approvedAt: new Date(),
          updatedBy: userId,
        },
        tx,
      );

      await this.dnRepo.createHistory(
        {
          debitNote: { connect: { id } },
          actionCode: BilDnActionCode.APPROVED,
          fromStatus: dn.status as BilDebitNoteStatus,
          toStatus: BilDebitNoteStatus.APPROVED,
          actionBy: userId,
          remarks: dto.remarks,
        },
        tx,
      );

      return this.dnRepo.findById(id, tx);
    });
  }

  async lock(id: string, dto: LockDebitNoteDto, userId: string) {
    const dn = await this.dnRepo.findById(id);
    if (!dn) throw createBillingError('DN_NOT_FOUND', { id });

    DebitNoteStateMachine.validateTransition(
      dn.status as BilDebitNoteStatus,
      BilDebitNoteStatus.LOCKED,
    );

    const blockers = await this.exceptionRepo.findBlockersByDebitNote(id);
    if (blockers.length > 0) {
      throw createBillingError('DN_BLOCKER_EXCEPTION', {
        blockerCount: blockers.length,
        blockerIds: blockers.map(b => b.id),
      });
    }

    return this.prisma.$transaction(async (tx) => {
      await this.dnRepo.update(
        id,
        {
          status: BilDebitNoteStatus.LOCKED,
          lockedBy: userId,
          lockedAt: new Date(),
          updatedBy: userId,
        },
        tx,
      );

      await this.dnRepo.createHistory(
        {
          debitNote: { connect: { id } },
          actionCode: BilDnActionCode.LOCKED,
          fromStatus: dn.status as BilDebitNoteStatus,
          toStatus: BilDebitNoteStatus.LOCKED,
          actionBy: userId,
          remarks: dto.remarks,
        },
        tx,
      );

      return this.dnRepo.findById(id, tx);
    });
  }

  async findById(id: string) {
    const dn = await this.dnRepo.findById(id);
    if (!dn) throw createBillingError('DN_NOT_FOUND', { id });
    return dn;
  }

  async findMany(query: QueryDebitNoteDto) {
    return this.dnRepo.findMany({
      ownerId: query.ownerId,
      status: query.status,
      fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
      toDate: query.toDate ? new Date(query.toDate) : undefined,
      dnNumber: query.dnNumber,
      page: query.page,
      limit: query.limit,
    });
  }

  async getHistory(id: string) {
    const dn = await this.dnRepo.findById(id);
    if (!dn) throw createBillingError('DN_NOT_FOUND', { id });
    return this.dnRepo.getHistory(id);
  }

  private getChargeDescription(feeType: BilFeeType): string {
    const descriptions: Record<BilFeeType, string> = {
      [BilFeeType.STORAGE]: 'Phí lưu kho',
      [BilFeeType.HANDLING_INBOUND]: 'Phí bốc xếp nhập',
      [BilFeeType.HANDLING_OUTBOUND]: 'Phí bốc xếp xuất',
      [BilFeeType.BAGGING]: 'Phí đóng bao',
      [BilFeeType.STUFFING]: 'Phí đóng container',
    };
    return descriptions[feeType] || feeType;
  }
}
