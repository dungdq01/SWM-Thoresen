import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { SessionRepository } from '../repositories/session.repository';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { SecurityEventRepository } from '../repositories/security-event.repository';
import { TokenService } from './token.service';
import { AuthChannel, AuthSecurityEventType, AuthSecurityEventSeverity } from '@prisma/client';
import { SessionInfo } from '../interfaces/security-context.interface';

export interface CreateSessionInput {
  userId: string;
  channel: AuthChannel;
  authVersion: bigint;
  deviceId?: string;
  deviceName?: string;
  userAgent?: string;
  ipAddress?: string;
  selectedWarehouseId?: string;
}

export interface CreateSessionResult {
  sessionId: string;
  sessionCode: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionRepository: SessionRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly securityEventRepository: SecurityEventRepository,
    private readonly tokenService: TokenService,
  ) {}

  async createSession(
    input: CreateSessionInput,
    userCode: string,
    username: string,
  ): Promise<CreateSessionResult> {
    return this.prisma.$transaction(async (tx) => {
      const sessionCode = this.tokenService.generateSessionCode();
      const expiresAt = this.tokenService.getSessionExpiresAt(input.channel);

      const session = await this.sessionRepository.create(
        {
          sessionCode,
          userId: input.userId,
          channel: input.channel,
          deviceId: input.deviceId,
          deviceName: input.deviceName,
          userAgent: input.userAgent,
          ipAddress: input.ipAddress,
          expiresAt,
          authVersionAtIssue: input.authVersion,
          selectedWarehouseId: input.selectedWarehouseId,
        },
        tx,
      );

      const { rawToken, tokenHash, tokenFamily } = this.tokenService.generateRefreshToken();
      await this.refreshTokenRepository.create(
        {
          sessionId: session.id,
          tokenHash,
          tokenFamily,
          expiresAt: this.tokenService.getRefreshTokenExpiresAt(),
        },
        tx,
      );

      const accessToken = this.tokenService.generateAccessToken({
        userId: input.userId,
        userCode,
        username,
        sessionId: session.id,
        channel: input.channel,
        authVersion: Number(input.authVersion),
        selectedWarehouseId: input.selectedWarehouseId ?? null,
      });

      return {
        sessionId: session.id,
        sessionCode,
        accessToken,
        refreshToken: rawToken,
        expiresIn: this.tokenService.getAccessTokenExpiresIn(),
      };
    });
  }

  async revokeSession(
    sessionId: string,
    revokedBy: string | null,
    reason: string,
    channel?: AuthChannel,
    ipAddress?: string,
    correlationId?: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const session = await this.sessionRepository.findById(sessionId);
      if (!session) return;

      await this.sessionRepository.revoke(sessionId, revokedBy, reason, tx);
      await this.refreshTokenRepository.revokeBySessionId(sessionId, reason, tx);

      await this.securityEventRepository.create(
        {
          eventType: AuthSecurityEventType.SESSION_REVOKED,
          severity: AuthSecurityEventSeverity.INFO,
          userId: session.userId,
          sessionId,
          channel,
          ipAddress,
          correlationId,
          eventPayload: { reason },
        },
        tx,
      );
    });
  }

  async revokeAllSessions(
    userId: string,
    revokedBy: string | null,
    reason: string,
    excludeSessionId?: string,
    correlationId?: string,
  ): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      const sessions = await this.sessionRepository.findActiveByUserId(userId);
      let revokedCount = 0;

      for (const session of sessions) {
        if (excludeSessionId && session.id === excludeSessionId) continue;

        await this.sessionRepository.revoke(session.id, revokedBy, reason, tx);
        await this.refreshTokenRepository.revokeBySessionId(session.id, reason, tx);
        revokedCount++;
      }

      if (revokedCount > 0) {
        await this.securityEventRepository.create(
          {
            eventType: AuthSecurityEventType.LOGOUT_ALL,
            severity: AuthSecurityEventSeverity.INFO,
            userId,
            correlationId,
            eventPayload: { revokedCount, reason },
          },
          tx,
        );
      }

      return revokedCount;
    });
  }

  async getActiveSessions(userId: string, currentSessionId?: string): Promise<SessionInfo[]> {
    const sessions = await this.sessionRepository.findActiveByUserId(userId);

    return sessions.map((s) => ({
      id: s.id,
      sessionCode: s.sessionCode,
      channel: s.channel,
      deviceName: s.deviceName,
      ipAddress: s.ipAddress,
      loginAt: s.loginAt,
      lastSeenAt: s.lastSeenAt,
      isCurrent: s.id === currentSessionId,
    }));
  }

  async updateSelectedWarehouse(
    sessionId: string,
    warehouseId: string | null,
  ): Promise<void> {
    await this.sessionRepository.updateSelectedWarehouse(sessionId, warehouseId);
  }

  async validateSession(sessionId: string, authVersion: bigint): Promise<boolean> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) return false;
    if (!session.isCurrent) return false;
    if (session.revokedAt) return false;
    if (session.expiresAt < new Date()) return false;
    if (session.authVersionAtIssue !== authVersion) return false;

    return true;
  }

  async updateLastSeen(sessionId: string): Promise<void> {
    await this.sessionRepository.updateLastSeen(sessionId);
  }
}
