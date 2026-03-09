import { Injectable } from '@nestjs/common';
import { SecurityEventRepository, CreateSecurityEventInput } from '../repositories/security-event.repository';
import { AuthSecurityEventType, AuthSecurityEventSeverity, AuthChannel } from '@prisma/client';

@Injectable()
export class SecurityAuditService {
  constructor(private readonly securityEventRepository: SecurityEventRepository) {}

  async logLoginSuccess(
    userId: string,
    sessionId: string,
    channel: AuthChannel,
    ipAddress?: string,
    userAgent?: string,
    correlationId?: string,
  ): Promise<void> {
    await this.securityEventRepository.create({
      eventType: AuthSecurityEventType.LOGIN_SUCCESS,
      severity: AuthSecurityEventSeverity.INFO,
      userId,
      sessionId,
      channel,
      ipAddress,
      userAgent,
      correlationId,
    });
  }

  async logLoginFail(
    username: string,
    channel: AuthChannel,
    errorCode: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    correlationId?: string,
  ): Promise<void> {
    await this.securityEventRepository.create({
      eventType: AuthSecurityEventType.LOGIN_FAIL,
      severity: AuthSecurityEventSeverity.WARN,
      userId,
      channel,
      ipAddress,
      userAgent,
      correlationId,
      errorCode,
      eventPayload: { username },
    });
  }

  async logLogout(
    userId: string,
    sessionId: string,
    channel?: AuthChannel,
    ipAddress?: string,
    correlationId?: string,
  ): Promise<void> {
    await this.securityEventRepository.create({
      eventType: AuthSecurityEventType.LOGOUT,
      severity: AuthSecurityEventSeverity.INFO,
      userId,
      sessionId,
      channel,
      ipAddress,
      correlationId,
    });
  }

  async logAccessDenied(
    userId: string,
    resourceType: string,
    resourceId: string,
    action: string,
    errorCode: string,
    sessionId?: string,
    ipAddress?: string,
    correlationId?: string,
  ): Promise<void> {
    await this.securityEventRepository.create({
      eventType: AuthSecurityEventType.ACCESS_DENIED,
      severity: AuthSecurityEventSeverity.WARN,
      userId,
      sessionId,
      ipAddress,
      correlationId,
      resourceType,
      resourceId,
      action,
      errorCode,
    });
  }

  async logWarehouseContextSwitch(
    userId: string,
    sessionId: string,
    fromWarehouseId: string | null,
    toWarehouseId: string,
    correlationId?: string,
  ): Promise<void> {
    await this.securityEventRepository.create({
      eventType: AuthSecurityEventType.WAREHOUSE_CONTEXT_SWITCHED,
      severity: AuthSecurityEventSeverity.INFO,
      userId,
      sessionId,
      correlationId,
      eventPayload: { fromWarehouseId, toWarehouseId },
    });
  }

  async logPasswordChanged(
    userId: string,
    changedBy: string,
    correlationId?: string,
  ): Promise<void> {
    await this.securityEventRepository.create({
      eventType: AuthSecurityEventType.PASSWORD_CHANGED,
      severity: AuthSecurityEventSeverity.INFO,
      userId,
      correlationId,
      eventPayload: { changedBy },
    });
  }

  async logAdminPasswordReset(
    userId: string,
    adminUserId: string,
    reason?: string,
    correlationId?: string,
  ): Promise<void> {
    await this.securityEventRepository.create({
      eventType: AuthSecurityEventType.PASSWORD_RESET_ADMIN,
      severity: AuthSecurityEventSeverity.HIGH,
      userId,
      correlationId,
      eventPayload: { adminUserId, reason },
    });
  }

  async logSecurityEvent(input: CreateSecurityEventInput): Promise<void> {
    await this.securityEventRepository.create(input);
  }
}
