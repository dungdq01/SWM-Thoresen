import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { UserAuthRepository } from '../repositories/user-auth.repository';
import { LoginAttemptRepository } from '../repositories/login-attempt.repository';
import { SecurityEventRepository } from '../repositories/security-event.repository';
import { AuthChannel, AuthSecurityEventSeverity, AuthSecurityEventType } from '@prisma/client';

@Injectable()
export class LockoutService {
  private readonly maxFailedAttempts: number;
  private readonly lockoutMinutes: number;
  private readonly attemptWindowMinutes: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly userAuthRepository: UserAuthRepository,
    private readonly loginAttemptRepository: LoginAttemptRepository,
    private readonly securityEventRepository: SecurityEventRepository,
  ) {
    this.maxFailedAttempts = this.configService.get<number>('LOGIN_MAX_FAILED_ATTEMPTS') || 5;
    this.lockoutMinutes = this.configService.get<number>('LOGIN_LOCK_MINUTES') || 15;
    this.attemptWindowMinutes = this.configService.get<number>('LOGIN_ATTEMPT_WINDOW_MINUTES') || 30;
  }

  isAccountLocked(lockedUntil: Date | null): boolean {
    if (!lockedUntil) return false;
    return lockedUntil > new Date();
  }

  async recordFailedAttempt(
    userId: string,
    username: string,
    channel: AuthChannel,
    ipAddress?: string,
    userAgent?: string,
    failureReason?: string,
    correlationId?: string,
  ): Promise<{ locked: boolean; lockedUntil: Date | null }> {
    return this.prisma.$transaction(async (tx) => {
      await this.loginAttemptRepository.create(
        {
          username,
          userId,
          channel,
          ipAddress,
          userAgent,
          success: false,
          failureReason,
          correlationId,
        },
        tx,
      );

      const user = await this.userAuthRepository.incrementFailedLoginCount(userId, tx);
      const failedCount = user.failedLoginCount;

      if (failedCount >= this.maxFailedAttempts) {
        const lockedUntil = new Date(Date.now() + this.lockoutMinutes * 60 * 1000);
        await this.userAuthRepository.lockAccount(userId, lockedUntil, tx);

        await tx.authAccountLock.create({
          data: {
            userId,
            lockedUntil,
            lockReason: 'EXCEEDED_FAILED_ATTEMPTS',
            failedCount,
            correlationId,
          },
        });

        await this.securityEventRepository.create(
          {
            eventType: AuthSecurityEventType.ACCOUNT_LOCKED,
            severity: AuthSecurityEventSeverity.HIGH,
            userId,
            channel,
            ipAddress,
            userAgent,
            correlationId,
            eventPayload: { failedCount, lockoutMinutes: this.lockoutMinutes },
          },
          tx,
        );

        return { locked: true, lockedUntil };
      }

      return { locked: false, lockedUntil: null };
    });
  }

  async recordSuccessfulLogin(
    userId: string,
    username: string,
    channel: AuthChannel,
    ipAddress?: string,
    userAgent?: string,
    correlationId?: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.loginAttemptRepository.create(
        {
          username,
          userId,
          channel,
          ipAddress,
          userAgent,
          success: true,
          correlationId,
        },
        tx,
      );

      await this.userAuthRepository.resetFailedLoginCount(userId, tx);
      await this.userAuthRepository.updateLastLogin(userId, tx);
    });
  }

  async unlockAccount(
    userId: string,
    unlockedBy: string,
    reason?: string,
    correlationId?: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.userAuthRepository.unlockAccount(userId, tx);

      const lastLock = await tx.authAccountLock.findFirst({
        where: { userId, unlockedAt: null },
        orderBy: { lockedAt: 'desc' },
      });

      if (lastLock) {
        await tx.authAccountLock.update({
          where: { id: lastLock.id },
          data: {
            unlockedAt: new Date(),
            unlockedBy,
            unlockReason: reason || 'ADMIN_UNLOCK',
          },
        });
      }

      await this.securityEventRepository.create(
        {
          eventType: AuthSecurityEventType.ACCOUNT_UNLOCKED,
          severity: AuthSecurityEventSeverity.INFO,
          userId,
          correlationId,
          eventPayload: { unlockedBy, reason },
        },
        tx,
      );
    });
  }
}
