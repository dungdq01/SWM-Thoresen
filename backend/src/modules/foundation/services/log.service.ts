import { Injectable } from '@nestjs/common';
import { ExceptionSeverity } from '@prisma/client';
import { LogRepository } from '../repositories/log.repository';

@Injectable()
export class LogService {
  constructor(private readonly logRepository: LogRepository) {}

  listAuditLogs(filters: {
    entityType?: string;
    entityId?: string;
    correlationId?: string;
    userId?: string;
    page?: number;
    limit?: number;
    fromDate?: Date;
    toDate?: Date;
  }) {
    return this.logRepository.listAuditLogs(filters);
  }

  listExceptionLogs(filters: {
    sourceModule?: string;
    isResolved?: boolean;
    page?: number;
    limit?: number;
    fromDate?: Date;
    toDate?: Date;
  }) {
    return this.logRepository.listExceptionLogs(filters);
  }

  resolveException(id: string, resolvedBy: string) {
    return this.logRepository.resolveException(id, resolvedBy);
  }

  createAuditLog(data: {
    entityType: string;
    entityId: string;
    action: string;
    oldValue?: unknown;
    newValue?: unknown;
    userId?: string;
    userRole?: string;
    ipAddress?: string;
    deviceType?: string;
    reasonCode?: string;
    notes?: string;
    correlationId?: string;
    requestId?: string;
    sourceModule?: string;
    warehouseCode?: string;
    ownerId?: string;
    metadata?: unknown;
  }) {
    return this.logRepository.createAuditLog({
      entityType: data.entityType,
      entityId: data.entityId,
      action: data.action,
      oldValue: data.oldValue ? JSON.stringify(data.oldValue) : undefined,
      newValue: data.newValue ? JSON.stringify(data.newValue) : undefined,
      userId: data.userId,
      userRole: data.userRole,
      ipAddress: data.ipAddress,
      deviceType: data.deviceType,
      reasonCode: data.reasonCode,
      notes: data.notes,
      correlationId: data.correlationId,
      requestId: data.requestId,
      sourceModule: data.sourceModule,
      warehouseCode: data.warehouseCode,
      ownerId: data.ownerId,
      metadata: data.metadata as never,
    });
  }

  createExceptionLog(data: {
    exceptionNo: string;
    exceptionType: string;
    severity?: ExceptionSeverity;
    sourceModule: string;
    entityType?: string;
    entityId?: string;
    action?: string;
    reasonCode?: string;
    message: string;
    details?: unknown;
    correlationId?: string;
    externalId?: string;
    userId?: string;
    userRole?: string;
  }) {
    return this.logRepository.createExceptionLog({
      exceptionNo: data.exceptionNo,
      exceptionType: data.exceptionType,
      severity: data.severity ?? ExceptionSeverity.MEDIUM,
      sourceModule: data.sourceModule,
      entityType: data.entityType,
      entityId: data.entityId,
      action: data.action,
      reasonCode: data.reasonCode,
      message: data.message,
      details: data.details as never,
      correlationId: data.correlationId,
      externalId: data.externalId,
      userId: data.userId,
      userRole: data.userRole,
    });
  }
}
