import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import {
  AuthSecurityEvent,
  AuthSecurityEventType,
  AuthSecurityEventSeverity,
  AuthChannel,
  Prisma,
} from '@prisma/client';

export interface CreateSecurityEventInput {
  eventType: AuthSecurityEventType;
  severity: AuthSecurityEventSeverity;
  userId?: string;
  sessionId?: string;
  channel?: AuthChannel;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
  resourceType?: string;
  resourceId?: string;
  action?: string;
  errorCode?: string;
  eventPayload?: Record<string, unknown>;
}

@Injectable()
export class SecurityEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateSecurityEventInput,
    tx?: Prisma.TransactionClient,
  ): Promise<AuthSecurityEvent> {
    const client = tx ?? this.prisma;
    return client.authSecurityEvent.create({
      data: {
        eventType: data.eventType,
        severity: data.severity,
        userId: data.userId,
        sessionId: data.sessionId,
        channel: data.channel,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        correlationId: data.correlationId,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        action: data.action,
        errorCode: data.errorCode,
        eventPayload: data.eventPayload as Prisma.JsonObject | undefined,
      },
    });
  }

  async findByUserId(
    userId: string,
    limit: number,
  ): Promise<AuthSecurityEvent[]> {
    return this.prisma.authSecurityEvent.findMany({
      where: { userId },
      orderBy: { occurredAt: 'desc' },
      take: limit,
    });
  }

  async findByEventType(
    eventType: AuthSecurityEventType,
    limit: number,
  ): Promise<AuthSecurityEvent[]> {
    return this.prisma.authSecurityEvent.findMany({
      where: { eventType },
      orderBy: { occurredAt: 'desc' },
      take: limit,
    });
  }

  async findBySeverity(
    severity: AuthSecurityEventSeverity,
    limit: number,
  ): Promise<AuthSecurityEvent[]> {
    return this.prisma.authSecurityEvent.findMany({
      where: { severity },
      orderBy: { occurredAt: 'desc' },
      take: limit,
    });
  }
}
