import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { AppUser, Prisma } from '@prisma/client';

export interface UserWithCredential extends AppUser {
  credential: {
    id: string;
    passwordHash: string;
    passwordAlgo: string;
    mustChangePassword: boolean;
  } | null;
}

export interface UserWithRolesAndWarehouses extends AppUser {
  userRoles: Array<{
    role: {
      roleCode: string;
      roleName: string;
    };
    warehouseCode: string | null;
    ownerId: string | null;
    isActive: boolean;
  }>;
}

@Injectable()
export class UserAuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUsername(username: string): Promise<AppUser | null> {
    return this.prisma.appUser.findUnique({
      where: { username },
    });
  }

  async findById(id: string): Promise<AppUser | null> {
    return this.prisma.appUser.findUnique({
      where: { id },
    });
  }

  async findByUsernameWithCredential(
    username: string,
  ): Promise<UserWithCredential | null> {
    return this.prisma.appUser.findUnique({
      where: { username },
      include: {
        credential: {
          select: {
            id: true,
            passwordHash: true,
            passwordAlgo: true,
            mustChangePassword: true,
          },
        },
      },
    });
  }

  async findByIdWithRolesAndWarehouses(
    id: string,
  ): Promise<UserWithRolesAndWarehouses | null> {
    return this.prisma.appUser.findUnique({
      where: { id },
      include: {
        userRoles: {
          where: { isActive: true },
          include: {
            role: {
              select: {
                roleCode: true,
                roleName: true,
              },
            },
          },
        },
      },
    });
  }

  async incrementFailedLoginCount(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AppUser> {
    const client = tx ?? this.prisma;
    return client.appUser.update({
      where: { id },
      data: {
        failedLoginCount: { increment: 1 },
      },
    });
  }

  async resetFailedLoginCount(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AppUser> {
    const client = tx ?? this.prisma;
    return client.appUser.update({
      where: { id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
  }

  async lockAccount(
    id: string,
    lockedUntil: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<AppUser> {
    const client = tx ?? this.prisma;
    return client.appUser.update({
      where: { id },
      data: { lockedUntil },
    });
  }

  async unlockAccount(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AppUser> {
    const client = tx ?? this.prisma;
    return client.appUser.update({
      where: { id },
      data: {
        lockedUntil: null,
        failedLoginCount: 0,
      },
    });
  }

  async updateLastLogin(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AppUser> {
    const client = tx ?? this.prisma;
    return client.appUser.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  async incrementAuthVersion(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AppUser> {
    const client = tx ?? this.prisma;
    return client.appUser.update({
      where: { id },
      data: {
        authVersion: { increment: 1 },
        lastPasswordChangedAt: new Date(),
      },
    });
  }

  async getAuthVersion(id: string): Promise<bigint | null> {
    const user = await this.prisma.appUser.findUnique({
      where: { id },
      select: { authVersion: true },
    });
    return user?.authVersion ?? null;
  }
}
