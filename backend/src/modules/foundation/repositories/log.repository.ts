import {
  ExceptionSeverity,
  IdempotencyStatus,
  Prisma,
} from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class LogRepository {
  constructor(private readonly prisma: PrismaService) {}

  listAuditLogs(filters: {
    entityType?: string;
    entityId?: string;
    correlationId?: string;
    userId?: string;
  }) {
    const where: Prisma.AuditLogWhereInput = {
      ...(filters.entityType ? { entityType: filters.entityType } : {}),
      ...(filters.entityId ? { entityId: filters.entityId } : {}),
      ...(filters.correlationId ? { correlationId: filters.correlationId } : {}),
      ...(filters.userId ? { userId: filters.userId } : {}),
    };

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
    });
  }

  createAuditLog(data: Prisma.AuditLogUncheckedCreateInput) {
    return this.prisma.auditLog.create({ data });
  }

  listExceptionLogs(filters: { sourceModule?: string; isResolved?: boolean }) {
    const where: Prisma.ExceptionLogWhereInput = {
      ...(filters.sourceModule ? { sourceModule: filters.sourceModule } : {}),
      ...(filters.isResolved !== undefined ? { isResolved: filters.isResolved } : {}),
    };

    return this.prisma.exceptionLog.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
    });
  }

  createExceptionLog(data: {
    exceptionNo: string;
    exceptionType: string;
    severity: ExceptionSeverity;
    sourceModule: string;
    entityType?: string;
    entityId?: string;
    action?: string;
    reasonCode?: string;
    message: string;
    details?: Prisma.InputJsonValue;
    correlationId?: string;
    externalId?: string;
    userId?: string;
    userRole?: string;
  }) {
    return this.prisma.exceptionLog.create({
      data,
    });
  }

  resolveException(id: string, resolvedBy: string) {
    return this.prisma.exceptionLog.update({
      where: { id },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy,
      },
    });
  }

  getIdempotencyByKey(idempotencyKey: string) {
    return this.prisma.idempotencyRecord.findUnique({
      where: { idempotencyKey },
    });
  }

  createIdempotencyRecord(data: {
    idempotencyKey: string;
    commandName: string;
    sourceModule: string;
    requestHash?: string;
    requestPayload?: Prisma.InputJsonValue;
    correlationId?: string;
    lockedUntil?: Date;
    expiredAt?: Date;
  }) {
    return this.prisma.idempotencyRecord.create({
      data: {
        ...data,
        status: IdempotencyStatus.PROCESSING,
      },
    });
  }

  updateIdempotencyRecord(
    idempotencyKey: string,
    data: {
      responseCode?: number;
      responseBody?: Prisma.InputJsonValue;
      resourceType?: string;
      resourceId?: string;
      status: IdempotencyStatus;
      lockedUntil?: Date | null;
      expiredAt?: Date | null;
    },
  ) {
    return this.prisma.idempotencyRecord.update({
      where: { idempotencyKey },
      data,
    });
  }
}
