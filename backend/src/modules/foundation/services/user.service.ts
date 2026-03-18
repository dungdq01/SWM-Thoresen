import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { ListUsersQueryDto, CreateUserDto, UpdateUserDto, ResetUserPasswordDto } from '../dto';
import * as argon2 from 'argon2';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListUsersQueryDto) {
    const { search, roleCode, isActive, page = 1, pageSize = 20 } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { userCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (roleCode) {
      where.userRoles = {
        some: { role: { roleCode }, isActive: true },
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.appUser.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          userCode: true,
          username: true,
          fullName: true,
          email: true,
          isActive: true,
          lastLoginAt: true,
          lockedUntil: true,
          failedLoginCount: true,
          createdAt: true,
          updatedAt: true,
          userRoles: {
            where: { isActive: true },
            select: {
              id: true,
              isPrimary: true,
              warehouseCode: true,
              role: {
                select: { id: true, roleCode: true, roleName: true },
              },
            },
          },
          credential: {
            select: { mustChangePassword: true },
          },
        },
      }),
      this.prisma.appUser.count({ where }),
    ]);

    return {
      items: items.map((u) => ({
        ...u,
        roles: u.userRoles.map((ur) => ({
          id: ur.id,
          roleCode: ur.role.roleCode,
          roleName: ur.role.roleName,
          roleId: ur.role.id,
          isPrimary: ur.isPrimary,
          warehouseCode: ur.warehouseCode,
        })),
        mustChangePassword: u.credential?.mustChangePassword ?? false,
        userRoles: undefined,
        credential: undefined,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getById(id: string) {
    const user = await this.prisma.appUser.findUnique({
      where: { id },
      select: {
        id: true,
        userCode: true,
        username: true,
        fullName: true,
        email: true,
        isActive: true,
        lastLoginAt: true,
        lockedUntil: true,
        failedLoginCount: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          where: { isActive: true },
          select: {
            id: true,
            isPrimary: true,
            warehouseCode: true,
            role: {
              select: { id: true, roleCode: true, roleName: true },
            },
          },
        },
        credential: {
          select: { mustChangePassword: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Tài khoản không tồn tại');
    }

    return {
      ...user,
      roles: user.userRoles.map((ur) => ({
        id: ur.id,
        roleCode: ur.role.roleCode,
        roleName: ur.role.roleName,
        roleId: ur.role.id,
        isPrimary: ur.isPrimary,
        warehouseCode: ur.warehouseCode,
      })),
      mustChangePassword: user.credential?.mustChangePassword ?? false,
      userRoles: undefined,
      credential: undefined,
    };
  }

  async create(dto: CreateUserDto, actorId: string) {
    const existing = await this.prisma.appUser.findFirst({
      where: { OR: [{ username: dto.username }, { userCode: dto.username }] },
    });

    if (existing) {
      throw new ConflictException('Username đã tồn tại');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.appUser.create({
        data: {
          userCode: dto.username,
          username: dto.username,
          fullName: dto.fullName,
          email: dto.email,
        },
      });

      await tx.authLocalCredential.create({
        data: {
          userId: newUser.id,
          passwordHash,
          passwordAlgo: 'ARGON2ID',
          mustChangePassword: dto.mustChangePassword ?? true,
        },
      });

      if (dto.roleCode) {
        const role = await tx.role.findUnique({ where: { roleCode: dto.roleCode } });
        if (role) {
          await tx.userRole.create({
            data: {
              userId: newUser.id,
              roleId: role.id,
              isPrimary: true,
              isActive: true,
              warehouseCode: dto.warehouseCode,
              assignedBy: actorId,
            },
          });
        }
      }

      return newUser;
    });

    return this.getById(user.id);
  }

  async update(id: string, dto: UpdateUserDto, actorId: string) {
    const user = await this.prisma.appUser.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Tài khoản không tồn tại');
    }

    await this.prisma.appUser.update({
      where: { id },
      data: {
        ...(dto.fullName !== undefined && { fullName: dto.fullName }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        updatedBy: actorId,
      },
    });

    return this.getById(id);
  }

  async resetPassword(id: string, dto: ResetUserPasswordDto, actorId: string) {
    const user = await this.prisma.appUser.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Tài khoản không tồn tại');
    }

    const passwordHash = await argon2.hash(dto.newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.authLocalCredential.upsert({
        where: { userId: id },
        update: {
          passwordHash,
          mustChangePassword: dto.mustChangePassword ?? true,
        },
        create: {
          userId: id,
          passwordHash,
          passwordAlgo: 'ARGON2ID',
          mustChangePassword: dto.mustChangePassword ?? true,
        },
      });

      await tx.appUser.update({
        where: { id },
        data: { authVersion: { increment: 1 } },
      });
    });

    return { message: 'Đặt lại mật khẩu thành công' };
  }

  async toggleActive(id: string, actorId: string) {
    const user = await this.prisma.appUser.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Tài khoản không tồn tại');
    }

    await this.prisma.appUser.update({
      where: { id },
      data: { isActive: !user.isActive, updatedBy: actorId },
    });

    return this.getById(id);
  }
}
