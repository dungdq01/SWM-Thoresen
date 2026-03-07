import { Injectable } from '@nestjs/common';
import { Prisma, RolePermissionEffect } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class RoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(filters: {
    isActive?: boolean;
    roleCode?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const where: Prisma.RoleWhereInput = {
      ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
      ...(filters.roleCode
        ? { roleCode: { contains: filters.roleCode, mode: 'insensitive' } }
        : {}),
    };

    return this.prisma.role.findMany({
      where,
      include: {
        permissions: {
          include: { permission: true },
        },
      },
      orderBy: { roleCode: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  findById(roleId: string) {
    return this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
  }

  findByCode(roleCode: string) {
    return this.prisma.role.findUnique({
      where: { roleCode },
    });
  }

  create(data: {
    roleCode: string;
    roleName: string;
    description?: string;
    actorUserId: string;
  }) {
    return this.prisma.role.create({
      data: {
        roleCode: data.roleCode,
        roleName: data.roleName,
        description: data.description,
        createdBy: data.actorUserId,
        updatedBy: data.actorUserId,
      },
    });
  }

  update(
    roleId: string,
    data: {
      roleName?: string;
      description?: string;
      isActive?: boolean;
      actorUserId: string;
    },
  ) {
    return this.prisma.role.update({
      where: { id: roleId },
      data: {
        ...(data.roleName !== undefined ? { roleName: data.roleName } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        updatedBy: data.actorUserId,
      },
    });
  }

  async assignPermissions(
    roleId: string,
    permissionLinks: Array<{
      permissionId: string;
      effect: RolePermissionEffect;
    }>,
    actorUserId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      for (const permissionLink of permissionLinks) {
        await tx.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId,
              permissionId: permissionLink.permissionId,
            },
          },
          update: {
            effect: permissionLink.effect,
            createdBy: actorUserId,
          },
          create: {
            roleId,
            permissionId: permissionLink.permissionId,
            effect: permissionLink.effect,
            createdBy: actorUserId,
          },
        });
      }

      return tx.role.findUnique({
        where: { id: roleId },
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      });
    });
  }

  async assignRoleToUser(data: {
    userId: string;
    roleId: string;
    warehouseCode?: string;
    ownerId?: string | null;
    isPrimary?: boolean;
    actorUserId: string;
  }) {
    if (data.isPrimary) {
      await this.prisma.userRole.updateMany({
        where: {
          userId: data.userId,
          isActive: true,
        },
        data: {
          isPrimary: false,
        },
      });
    }

    return this.prisma.userRole.create({
      data: {
        userId: data.userId,
        roleId: data.roleId,
        warehouseCode: data.warehouseCode,
        ownerId: data.ownerId ?? undefined,
        isPrimary: data.isPrimary ?? false,
        assignedBy: data.actorUserId,
      },
      include: {
        role: true,
        user: true,
      },
    });
  }
}
