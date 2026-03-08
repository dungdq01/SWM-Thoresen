import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { AuthPasswordHistory, Prisma } from '@prisma/client';

export interface CreatePasswordHistoryInput {
  userId: string;
  passwordHash: string;
  changedBy?: string;
  changeReason: string;
}

@Injectable()
export class PasswordHistoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreatePasswordHistoryInput,
    tx?: Prisma.TransactionClient,
  ): Promise<AuthPasswordHistory> {
    const client = tx ?? this.prisma;
    return client.authPasswordHistory.create({
      data: {
        userId: data.userId,
        passwordHash: data.passwordHash,
        changedBy: data.changedBy,
        changeReason: data.changeReason,
      },
    });
  }

  async findRecentByUserId(
    userId: string,
    limit: number,
  ): Promise<AuthPasswordHistory[]> {
    return this.prisma.authPasswordHistory.findMany({
      where: { userId },
      orderBy: { changedAt: 'desc' },
      take: limit,
    });
  }

  async countByUserId(userId: string): Promise<number> {
    return this.prisma.authPasswordHistory.count({
      where: { userId },
    });
  }
}
