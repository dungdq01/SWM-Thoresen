import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { AuthLocalCredential, Prisma } from '@prisma/client';

@Injectable()
export class CredentialRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<AuthLocalCredential | null> {
    return this.prisma.authLocalCredential.findUnique({
      where: { userId },
    });
  }

  async create(
    data: Prisma.AuthLocalCredentialCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<AuthLocalCredential> {
    const client = tx ?? this.prisma;
    return client.authLocalCredential.create({ data });
  }

  async updatePassword(
    userId: string,
    passwordHash: string,
    mustChangePassword: boolean,
    tx?: Prisma.TransactionClient,
  ): Promise<AuthLocalCredential> {
    const client = tx ?? this.prisma;
    return client.authLocalCredential.update({
      where: { userId },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        mustChangePassword,
      },
    });
  }

  async setMustChangePassword(
    userId: string,
    mustChangePassword: boolean,
    tx?: Prisma.TransactionClient,
  ): Promise<AuthLocalCredential> {
    const client = tx ?? this.prisma;
    return client.authLocalCredential.update({
      where: { userId },
      data: { mustChangePassword },
    });
  }
}
