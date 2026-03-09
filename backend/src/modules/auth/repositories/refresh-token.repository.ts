import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { AuthRefreshToken, Prisma } from '@prisma/client';

export interface CreateRefreshTokenInput {
  sessionId: string;
  tokenHash: string;
  tokenFamily: string;
  expiresAt: Date;
  rotatedFromId?: string;
}

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTokenHash(tokenHash: string): Promise<AuthRefreshToken | null> {
    return this.prisma.authRefreshToken.findUnique({
      where: { tokenHash },
    });
  }

  async findByTokenHashWithSession(tokenHash: string): Promise<
    | (AuthRefreshToken & {
        session: {
          id: string;
          userId: string;
          channel: string;
          isCurrent: boolean;
          revokedAt: Date | null;
          expiresAt: Date;
          authVersionAtIssue: bigint;
          selectedWarehouseId: string | null;
        };
      })
    | null
  > {
    return this.prisma.authRefreshToken.findUnique({
      where: { tokenHash },
      include: {
        session: {
          select: {
            id: true,
            userId: true,
            channel: true,
            isCurrent: true,
            revokedAt: true,
            expiresAt: true,
            authVersionAtIssue: true,
            selectedWarehouseId: true,
          },
        },
      },
    });
  }

  async create(
    data: CreateRefreshTokenInput,
    tx?: Prisma.TransactionClient,
  ): Promise<AuthRefreshToken> {
    const client = tx ?? this.prisma;
    return client.authRefreshToken.create({
      data: {
        sessionId: data.sessionId,
        tokenHash: data.tokenHash,
        tokenFamily: data.tokenFamily,
        expiresAt: data.expiresAt,
        rotatedFromId: data.rotatedFromId,
      },
    });
  }

  async revoke(
    id: string,
    reason: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AuthRefreshToken> {
    const client = tx ?? this.prisma;
    return client.authRefreshToken.update({
      where: { id },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokeReason: reason,
      },
    });
  }

  async revokeBySessionId(
    sessionId: string,
    reason: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;
    const result = await client.authRefreshToken.updateMany({
      where: {
        sessionId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokeReason: reason,
      },
    });
    return result.count;
  }

  async revokeByTokenFamily(
    tokenFamily: string,
    reason: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;
    const result = await client.authRefreshToken.updateMany({
      where: {
        tokenFamily,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokeReason: reason,
      },
    });
    return result.count;
  }

  async findActiveBySessionId(sessionId: string): Promise<AuthRefreshToken[]> {
    return this.prisma.authRefreshToken.findMany({
      where: {
        sessionId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { issuedAt: 'desc' },
    });
  }
}
