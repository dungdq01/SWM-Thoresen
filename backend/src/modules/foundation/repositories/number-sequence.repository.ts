import { Injectable } from '@nestjs/common';
import {
  NumberSequence,
  Prisma,
  SequenceResetPolicy,
  SequenceScopeType,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class NumberSequenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.numberSequence.findMany({
      orderBy: { sequenceCode: 'asc' },
    });
  }

  findById(id: string) {
    return this.prisma.numberSequence.findUnique({ where: { id } });
  }

  findByCode(sequenceCode: string) {
    return this.prisma.numberSequence.findUnique({ where: { sequenceCode } });
  }

  create(data: {
    sequenceCode: string;
    description?: string;
    scopeType: SequenceScopeType;
    resetPolicy: SequenceResetPolicy;
    prefixTemplate: string;
    formatTemplate: string;
    runningNoLength?: number;
    allowGap?: boolean;
    actorUserId: string;
  }) {
    return this.prisma.numberSequence.create({
      data: {
        sequenceCode: data.sequenceCode,
        description: data.description,
        scopeType: data.scopeType,
        resetPolicy: data.resetPolicy,
        prefixTemplate: data.prefixTemplate,
        formatTemplate: data.formatTemplate,
        runningNoLength: data.runningNoLength ?? 6,
        allowGap: data.allowGap ?? true,
        createdBy: data.actorUserId,
        updatedBy: data.actorUserId,
      },
    });
  }

  update(
    id: string,
    data: {
      description?: string;
      scopeType?: SequenceScopeType;
      resetPolicy?: SequenceResetPolicy;
      prefixTemplate?: string;
      formatTemplate?: string;
      runningNoLength?: number;
      allowGap?: boolean;
      isActive?: boolean;
      actorUserId: string;
    },
  ) {
    return this.prisma.numberSequence.update({
      where: { id },
      data: {
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.scopeType !== undefined ? { scopeType: data.scopeType } : {}),
        ...(data.resetPolicy !== undefined ? { resetPolicy: data.resetPolicy } : {}),
        ...(data.prefixTemplate !== undefined
          ? { prefixTemplate: data.prefixTemplate }
          : {}),
        ...(data.formatTemplate !== undefined
          ? { formatTemplate: data.formatTemplate }
          : {}),
        ...(data.runningNoLength !== undefined
          ? { runningNoLength: data.runningNoLength }
          : {}),
        ...(data.allowGap !== undefined ? { allowGap: data.allowGap } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        updatedBy: data.actorUserId,
      },
    });
  }

  async getNextRunningNumber(sequence: NumberSequence, scopeKey: string, counterDate: Date) {
    const counterDateLiteral = counterDate.toISOString().slice(0, 10);

    await this.prisma.numberSequenceCounter.upsert({
      where: {
        sequenceId_scopeKey_counterDate: {
          sequenceId: sequence.id,
          scopeKey,
          counterDate,
        },
      },
      update: {},
      create: {
        id: randomUUID(),
        sequenceId: sequence.id,
        scopeKey,
        counterDate,
      },
    });

    const rows = await this.prisma.$queryRawUnsafe<Array<{ last_number: bigint }>>(
      `UPDATE "number_sequence_counter"
       SET "last_number" = "last_number" + 1,
           "version_no" = "version_no" + 1,
           "updated_at" = NOW()
       WHERE "sequence_id" = $1::uuid AND "scope_key" = $2 AND "counter_date" = $3::date
       RETURNING "last_number"`,
      sequence.id,
      scopeKey,
      counterDateLiteral,
    );

    return Number(rows[0].last_number);
  }
}
