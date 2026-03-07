import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SequenceResetPolicy, SequenceScopeType } from '@prisma/client';
import { LogService } from './log.service';
import { NumberSequenceRepository } from '../repositories/number-sequence.repository';

@Injectable()
export class NumberSequenceService {
  constructor(
    private readonly numberSequenceRepository: NumberSequenceRepository,
    private readonly logService: LogService,
  ) {}

  list() {
    return this.numberSequenceRepository.list();
  }

  async create(data: {
    sequenceCode: string;
    description?: string;
    scopeType: 'GLOBAL' | 'PER_WAREHOUSE' | 'CUSTOM';
    resetPolicy: 'NONE' | 'DAILY' | 'MONTHLY' | 'YEARLY';
    prefixTemplate: string;
    formatTemplate: string;
    runningNoLength?: number;
    allowGap?: boolean;
    actorUserId: string;
    actorRole?: string;
    requestId?: string;
  }) {
    const existing = await this.numberSequenceRepository.findByCode(data.sequenceCode);
    if (existing) {
      throw new ConflictException(`Sequence code ${data.sequenceCode} đã tồn tại.`);
    }

    const created = await this.numberSequenceRepository.create({
      ...data,
      scopeType: data.scopeType as SequenceScopeType,
      resetPolicy: data.resetPolicy as SequenceResetPolicy,
    });

    await this.logService.createAuditLog({
      entityType: 'NUMBER_SEQUENCE',
      entityId: created.id,
      action: 'CREATE_NUMBER_SEQUENCE',
      newValue: created,
      userId: data.actorUserId,
      userRole: data.actorRole,
      requestId: data.requestId,
      sourceModule: 'FOUNDATION',
    });
    return created;
  }

  async update(
    id: string,
    data: {
      description?: string;
      scopeType?: 'GLOBAL' | 'PER_WAREHOUSE' | 'CUSTOM';
      resetPolicy?: 'NONE' | 'DAILY' | 'MONTHLY' | 'YEARLY';
      prefixTemplate?: string;
      formatTemplate?: string;
      runningNoLength?: number;
      allowGap?: boolean;
      isActive?: boolean;
      actorUserId: string;
      actorRole?: string;
      requestId?: string;
    },
  ) {
    const existing = await this.numberSequenceRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Không tìm thấy number sequence với id ${id}.`);
    }

    const updated = await this.numberSequenceRepository.update(id, {
      ...data,
      scopeType: data.scopeType as SequenceScopeType | undefined,
      resetPolicy: data.resetPolicy as SequenceResetPolicy | undefined,
    });

    await this.logService.createAuditLog({
      entityType: 'NUMBER_SEQUENCE',
      entityId: id,
      action: 'UPDATE_NUMBER_SEQUENCE',
      oldValue: existing,
      newValue: updated,
      userId: data.actorUserId,
      userRole: data.actorRole,
      requestId: data.requestId,
      sourceModule: 'FOUNDATION',
    });

    return updated;
  }

  async getNextNumber(
    sequenceCode: string,
    scopeKey: string,
    actor: { actorUserId: string; actorRole?: string; requestId?: string },
  ) {
    const sequence = await this.numberSequenceRepository.findByCode(sequenceCode);
    if (!sequence || !sequence.isActive) {
      throw new NotFoundException(`Không tìm thấy sequence active ${sequenceCode}.`);
    }

    const normalizedScopeKey = this.resolveScopeKey(sequence.scopeType, scopeKey);
    const counterDate = this.resolveCounterDate(sequence.resetPolicy);
    const runningNumber = await this.numberSequenceRepository.getNextRunningNumber(
      sequence,
      normalizedScopeKey,
      counterDate,
    );

    const formatted = this.formatNumber({
      prefixTemplate: sequence.prefixTemplate,
      formatTemplate: sequence.formatTemplate,
      sequenceCode: sequence.sequenceCode,
      runningNoLength: sequence.runningNoLength,
      runningNumber,
      counterDate,
      scopeKey: normalizedScopeKey,
    });

    await this.logService.createAuditLog({
      entityType: 'NUMBER_SEQUENCE',
      entityId: sequence.id,
      action: 'GET_NEXT_NUMBER',
      newValue: {
        sequenceCode,
        scopeKey: normalizedScopeKey,
        value: formatted,
      },
      userId: actor.actorUserId,
      userRole: actor.actorRole,
      requestId: actor.requestId,
      sourceModule: 'FOUNDATION',
      warehouseCode:
        sequence.scopeType === SequenceScopeType.PER_WAREHOUSE
          ? normalizedScopeKey
          : undefined,
    });

    return {
      sequenceCode,
      scopeKey: normalizedScopeKey,
      value: formatted,
      runningNumber,
      counterDate: counterDate.toISOString().slice(0, 10),
    };
  }

  private resolveScopeKey(scopeType: SequenceScopeType, scopeKey: string): string {
    if (scopeType === SequenceScopeType.GLOBAL) {
      return 'GLOBAL';
    }

    if (!scopeKey) {
      throw new BadRequestException('scopeKey là bắt buộc cho sequence không phải GLOBAL.');
    }

    return scopeKey;
  }

  private resolveCounterDate(resetPolicy: SequenceResetPolicy): Date {
    const now = new Date();
    const current = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    if (resetPolicy === SequenceResetPolicy.NONE) {
      return new Date(Date.UTC(2000, 0, 1));
    }

    if (resetPolicy === SequenceResetPolicy.MONTHLY) {
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    }

    if (resetPolicy === SequenceResetPolicy.YEARLY) {
      return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    }

    return current;
  }

  private formatNumber(params: {
    prefixTemplate: string;
    formatTemplate: string;
    sequenceCode: string;
    runningNoLength: number;
    runningNumber: number;
    counterDate: Date;
    scopeKey: string;
  }) {
    const yyyy = params.counterDate.getUTCFullYear().toString();
    const mm = String(params.counterDate.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(params.counterDate.getUTCDate()).padStart(2, '0');
    const yyyymmdd = `${yyyy}${mm}${dd}`;
    const prefix = params.prefixTemplate.replaceAll('{SEQ}', params.sequenceCode);
    const runningNo = String(params.runningNumber).padStart(
      params.runningNoLength,
      '0',
    );

    return params.formatTemplate
      .replaceAll('{prefix}', prefix)
      .replaceAll('{SEQ}', params.sequenceCode)
      .replaceAll('{yyyy}', yyyy)
      .replaceAll('{mm}', mm)
      .replaceAll('{dd}', dd)
      .replaceAll('{yyyymmdd}', yyyymmdd)
      .replaceAll('{scope_key}', params.scopeKey)
      .replaceAll('{running_no}', runningNo);
  }
}
