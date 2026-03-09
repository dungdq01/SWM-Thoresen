import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { AuthSession, AuthChannel, Prisma } from '@prisma/client';

export interface CreateSessionInput {
  sessionCode: string;
  userId: string;
  channel: AuthChannel;
  deviceId?: string;
  deviceName?: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
  authVersionAtIssue: bigint;
  selectedWarehouseId?: string;
}

@Injectable()
export class SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<AuthSession | null> {
    return this.prisma.authSession.findUnique({
      where: { id },
    });
  }

  async findBySessionCode(sessionCode: string): Promise<AuthSession | null> {
    return this.prisma.authSession.findUnique({
      where: { sessionCode },
    });
  }

  async findActiveByUserId(userId: string): Promise<AuthSession[]> {
    return this.prisma.authSession.findMany({
      where: {
        userId,
        isCurrent: true,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { loginAt: 'desc' },
    });
  }

  async create(
    data: CreateSessionInput,
    tx?: Prisma.TransactionClient,
  ): Promise<AuthSession> {
    const client = tx ?? this.prisma;
    return client.authSession.create({
      data: {
        sessionCode: data.sessionCode,
        userId: data.userId,
        channel: data.channel,
        deviceId: data.deviceId,
        deviceName: data.deviceName,
        userAgent: data.userAgent,
        ipAddress: data.ipAddress,
        expiresAt: data.expiresAt,
        authVersionAtIssue: data.authVersionAtIssue,
        selectedWarehouseId: data.selectedWarehouseId,
      },
    });
  }

  async updateLastSeen(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AuthSession> {
    const client = tx ?? this.prisma;
    return client.authSession.update({
      where: { id },
      data: { lastSeenAt: new Date() },
    });
  }

  async updateSelectedWarehouse(
    id: string,
    warehouseId: string | null,
    tx?: Prisma.TransactionClient,
  ): Promise<AuthSession> {
    const client = tx ?? this.prisma;
    return client.authSession.update({
      where: { id },
      data: { selectedWarehouseId: warehouseId },
    });
  }

  async revoke(
    id: string,
    revokedBy: string | null,
    reason: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AuthSession> {
    const client = tx ?? this.prisma;
    return client.authSession.update({
      where: { id },
      data: {
        isCurrent: false,
        revokedAt: new Date(),
        revokedBy,
        revokeReason: reason,
      },
    });
  }

  async revokeAllByUserId(
    userId: string,
    revokedBy: string | null,
    reason: string,
    excludeSessionId?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;
    const result = await client.authSession.updateMany({
      where: {
        userId,
        isCurrent: true,
        revokedAt: null,
        ...(excludeSessionId ? { id: { not: excludeSessionId } } : {}),
      },
      data: {
        isCurrent: false,
        revokedAt: new Date(),
        revokedBy,
        revokeReason: reason,
      },
    });
    return result.count;
  }

  async countActiveByUserId(userId: string): Promise<number> {
    return this.prisma.authSession.count({
      where: {
        userId,
        isCurrent: true,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }
}
