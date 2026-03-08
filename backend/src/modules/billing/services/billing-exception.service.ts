import { Injectable, Logger } from '@nestjs/common';
import { BillingExceptionRepository } from '../repositories/billing-exception.repository';
import { ResolveExceptionDto, QueryExceptionDto } from '../dto';
import { BilExceptionStatus, BilExceptionType, BilExceptionSeverity } from '../domain/billing.enums';
import { createBillingError } from '../domain/billing.errors';

export interface CreateExceptionInput {
  exceptionType: BilExceptionType;
  severity: BilExceptionSeverity;
  ownerId?: string;
  sourceModule?: string;
  sourceRefType?: string;
  sourceRefId?: string;
  billingEventId?: string;
  snapshotRunId?: string;
  debitNoteId?: string;
  message: string;
  detailJson?: Record<string, unknown>;
}

@Injectable()
export class BillingExceptionService {
  private readonly logger = new Logger(BillingExceptionService.name);

  constructor(private readonly exceptionRepo: BillingExceptionRepository) {}

  async create(input: CreateExceptionInput) {
    const exception = await this.exceptionRepo.create({
      exceptionType: input.exceptionType,
      severity: input.severity,
      status: BilExceptionStatus.OPEN,
      owner: input.ownerId ? { connect: { id: input.ownerId } } : undefined,
      sourceModule: input.sourceModule,
      sourceRefType: input.sourceRefType,
      sourceRefId: input.sourceRefId,
      billingEvent: input.billingEventId ? { connect: { id: input.billingEventId } } : undefined,
      snapshotRun: input.snapshotRunId ? { connect: { id: input.snapshotRunId } } : undefined,
      debitNote: input.debitNoteId ? { connect: { id: input.debitNoteId } } : undefined,
      message: input.message,
      detailJson: input.detailJson as object | undefined,
    });

    this.logger.log(`Created billing exception: ${exception.id}, type=${input.exceptionType}`);
    return exception;
  }

  async findById(id: string) {
    const exception = await this.exceptionRepo.findById(id);
    if (!exception) {
      throw createBillingError('EXCEPTION_NOT_FOUND', { id });
    }
    return exception;
  }

  async findMany(query: QueryExceptionDto) {
    return this.exceptionRepo.findMany({
      exceptionType: query.exceptionType,
      severity: query.severity,
      status: query.status,
      ownerId: query.ownerId,
      debitNoteId: query.debitNoteId,
      page: query.page,
      limit: query.limit,
    });
  }

  async resolve(id: string, dto: ResolveExceptionDto, userId: string) {
    const exception = await this.exceptionRepo.findById(id);
    if (!exception) {
      throw createBillingError('EXCEPTION_NOT_FOUND', { id });
    }

    if (exception.status === BilExceptionStatus.RESOLVED) {
      throw createBillingError('EXCEPTION_ALREADY_RESOLVED', { id });
    }

    let newStatus = BilExceptionStatus.RESOLVED;
    if (dto.action === 'IGNORE') {
      newStatus = BilExceptionStatus.IGNORED;
    } else if (dto.action === 'REQUEUE') {
      newStatus = BilExceptionStatus.OPEN;
    }

    return this.exceptionRepo.update(id, {
      status: newStatus,
      resolvedBy: userId,
      resolvedAt: new Date(),
      resolutionCode: dto.resolutionCode,
    });
  }

  async findOpenByOwner(ownerId: string) {
    return this.exceptionRepo.findOpenByOwner(ownerId);
  }

  async findBlockersByDebitNote(debitNoteId: string) {
    return this.exceptionRepo.findBlockersByDebitNote(debitNoteId);
  }

  async createMissingRateException(
    eventId: string,
    ownerId: string,
    feeType: string,
    eventDate: Date,
  ) {
    return this.create({
      exceptionType: BilExceptionType.MISSING_RATE,
      severity: BilExceptionSeverity.ERROR,
      ownerId,
      billingEventId: eventId,
      message: `Missing rate for fee type ${feeType} on ${eventDate.toISOString().split('T')[0]}`,
      detailJson: { feeType, eventDate: eventDate.toISOString() },
    });
  }
}
