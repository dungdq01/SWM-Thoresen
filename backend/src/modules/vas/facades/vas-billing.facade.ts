import { Injectable, Logger } from '@nestjs/common';
import { VasOutboxRepository } from '../repositories/vas-outbox.repository';
import { Prisma } from '@prisma/client';

export interface BaggingFeeEventPayload {
  eventType: 'BAGGING_FEE_CAPTURE';
  woId: string;
  woNumber: string;
  ownerId: string;
  warehouseId: string;
  bulkSourceItemId: string;
  baggedOutputItemId: string;
  actualOutputQtyKg: number;
  actualOutputQtyMt: number;
  actualBagCount: number;
  packagingOwnership: string;
  packagingItemId: string;
  packagingQtyActual: number;
  isOvertime: boolean;
  overtimeSessions: number;
  completedAt: string;
  correlationId: string;
}

@Injectable()
export class VasBillingFacade {
  private readonly logger = new Logger(VasBillingFacade.name);

  constructor(private readonly outboxRepo: VasOutboxRepository) {}

  async captureBaggingFee(
    data: {
      woId: string;
      woNumber: string;
      ownerId: string;
      warehouseId: string;
      bulkSourceItemId: string;
      baggedOutputItemId: string;
      actualOutputQtyKg: Prisma.Decimal;
      actualBagCount: number;
      packagingOwnership: string;
      packagingItemId: string;
      packagingQtyActual: number;
      overtimeSessions: number;
      correlationId: string;
    },
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const eventKey = `BAGGING_FEE:${data.woNumber}`;
    
    const existing = await this.outboxRepo.findByEventKey(eventKey, tx);
    if (existing) {
      this.logger.warn(`Billing event already exists for ${data.woNumber}`);
      return;
    }

    const payload: BaggingFeeEventPayload = {
      eventType: 'BAGGING_FEE_CAPTURE',
      woId: data.woId,
      woNumber: data.woNumber,
      ownerId: data.ownerId,
      warehouseId: data.warehouseId,
      bulkSourceItemId: data.bulkSourceItemId,
      baggedOutputItemId: data.baggedOutputItemId,
      actualOutputQtyKg: data.actualOutputQtyKg.toNumber(),
      actualOutputQtyMt: data.actualOutputQtyKg.dividedBy(1000).toNumber(),
      actualBagCount: data.actualBagCount,
      packagingOwnership: data.packagingOwnership,
      packagingItemId: data.packagingItemId,
      packagingQtyActual: data.packagingQtyActual,
      isOvertime: data.overtimeSessions > 0,
      overtimeSessions: data.overtimeSessions,
      completedAt: new Date().toISOString(),
      correlationId: data.correlationId,
    };

    await this.outboxRepo.create(
      {
        eventType: 'BAGGING_FEE_CAPTURE',
        aggregateId: data.woId,
        aggregateNumber: data.woNumber,
        eventKey,
        payloadJson: payload as unknown as Prisma.InputJsonValue,
      },
      tx,
    );

    this.logger.log(`Billing event captured for WO ${data.woNumber}`);
  }
}
