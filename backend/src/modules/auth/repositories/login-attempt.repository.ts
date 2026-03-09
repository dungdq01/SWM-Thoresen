import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { AuthLoginAttempt, AuthChannel, Prisma } from '@prisma/client';

export interface CreateLoginAttemptInput {
  username: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  channel: AuthChannel;
  success: boolean;
  failureReason?: string;
  correlationId?: string;
}

@Injectable()
export class LoginAttemptRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateLoginAttemptInput,
    tx?: Prisma.TransactionClient,
  ): Promise<AuthLoginAttempt> {
    const client = tx ?? this.prisma;
    return client.authLoginAttempt.create({
      data: {
        username: data.username,
        userId: data.userId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        channel: data.channel,
        success: data.success,
        failureReason: data.failureReason,
        correlationId: data.correlationId,
      },
    });
  }

  async countRecentFailedAttempts(
    username: string,
    sinceMinutes: number,
  ): Promise<number> {
    const since = new Date(Date.now() - sinceMinutes * 60 * 1000);
    return this.prisma.authLoginAttempt.count({
      where: {
        username,
        success: false,
        attemptAt: { gte: since },
      },
    });
  }

  async countRecentFailedByIp(
    ipAddress: string,
    sinceMinutes: number,
  ): Promise<number> {
    const since = new Date(Date.now() - sinceMinutes * 60 * 1000);
    return this.prisma.authLoginAttempt.count({
      where: {
        ipAddress,
        success: false,
        attemptAt: { gte: since },
      },
    });
  }

  async findRecentByUsername(
    username: string,
    limit: number,
  ): Promise<AuthLoginAttempt[]> {
    return this.prisma.authLoginAttempt.findMany({
      where: { username },
      orderBy: { attemptAt: 'desc' },
      take: limit,
    });
  }
}
