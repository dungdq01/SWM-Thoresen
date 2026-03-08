import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { BillingEventRepository } from '../repositories/billing-event.repository';
import { BillingDayTypeService } from './billing-day-type.service';
import { CaptureEventDto, QueryEventDto } from '../dto';
import { BilEventRateStatus, BilEventBillingStatus, BilDayType } from '../domain/billing.enums';
import { createBillingError } from '../domain/billing.errors';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BillingEventService {
  private readonly logger = new Logger(BillingEventService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventRepo: BillingEventRepository,
    private readonly dayTypeService: BillingDayTypeService,
  ) {}

  async captureEvent(dto: CaptureEventDto) {
    const existing = await this.eventRepo.findByExternalId(dto.externalId);
    if (existing) {
      this.logger.warn(`Event externalId replay: ${dto.externalId}`);
      return { data: existing, isReplay: true };
    }

    const eventDate = new Date(dto.eventDate);
    const operationTimestamp = new Date(dto.operationTimestamp);

    const dayType = dto.dayType || await this.dayTypeService.getDayType(eventDate);
    const isOvertime = dto.isOvertime || false;
    const combinedMultiplier = await this.dayTypeService.getMultiplier(eventDate, isOvertime);

    const event = await this.eventRepo.create({
      eventType: dto.eventType,
      refType: dto.refType,
      refId: dto.refId,
      refLineId: dto.refLineId,
      owner: { connect: { id: dto.ownerId } },
      warehouse: { connect: { id: dto.warehouseId } },
      item: dto.itemId ? { connect: { id: dto.itemId } } : undefined,
      cargoForm: dto.cargoForm,
      billingQtyMt: dto.billingQtyMt,
      eventDate,
      operationTimestamp,
      dayType,
      isOvertime,
      combinedMultiplier,
      rateStatus: BilEventRateStatus.UNRESOLVED,
      billingStatus: BilEventBillingStatus.CAPTURED,
      sourceModule: dto.sourceModule,
      sourcePayloadJson: dto.sourcePayload as object | undefined,
      externalId: dto.externalId,
      correlationId: dto.correlationId,
      deviceOrSourceApp: dto.deviceOrSourceApp,
    });

    this.logger.log(`Captured billing event: ${event.id}, type=${dto.eventType}, owner=${dto.ownerId}`);
    return { data: event, isReplay: false };
  }

  async findById(id: string) {
    const event = await this.eventRepo.findById(id);
    if (!event) {
      throw createBillingError('EVENT_NOT_FOUND', { id });
    }
    return event;
  }

  async findMany(query: QueryEventDto) {
    return this.eventRepo.findMany({
      ownerId: query.ownerId,
      eventType: query.eventType,
      fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
      toDate: query.toDate ? new Date(query.toDate) : undefined,
      billingStatus: query.billingStatus,
      sourceModule: query.sourceModule,
      page: query.page,
      limit: query.limit,
    });
  }

  async findUnbilledByOwnerAndPeriod(ownerId: string, periodStart: Date, periodEnd: Date) {
    return this.eventRepo.findUnbilledByOwnerAndPeriod(ownerId, periodStart, periodEnd);
  }

  async markAsBilled(eventIds: string[], debitNoteLineId: string, tx?: any) {
    return this.eventRepo.updateBillingStatus(
      eventIds,
      BilEventBillingStatus.BILLED,
      debitNoteLineId,
      tx,
    );
  }

  async resetBillingStatus(eventIds: string[], tx?: any) {
    return this.eventRepo.updateBillingStatus(
      eventIds,
      BilEventBillingStatus.CAPTURED,
      undefined,
      tx,
    );
  }
}
