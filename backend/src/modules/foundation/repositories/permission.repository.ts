import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class PermissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(filters: { moduleCode?: string; resourceCode?: string }) {
    const where: Prisma.PermissionWhereInput = {
      ...(filters.moduleCode ? { moduleCode: filters.moduleCode } : {}),
      ...(filters.resourceCode ? { resourceCode: filters.resourceCode } : {}),
      isActive: true,
    };

    return this.prisma.permission.findMany({
      where,
      orderBy: [
        { moduleCode: 'asc' },
        { resourceCode: 'asc' },
        { actionCode: 'asc' },
      ],
    });
  }

  findByCodes(permissionCodes: string[]) {
    // HI-7 Fix: Only return active permissions
    return this.prisma.permission.findMany({
      where: {
        permissionCode: {
          in: permissionCodes,
        },
        isActive: true,
      },
    });
  }

  async getEffectivePermissionsByUserId(userId: string) {
    const rows = await this.prisma.userRole.findMany({
      where: {
        userId,
        isActive: true,
        role: { isActive: true },
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    const roleCodes = rows.map((item) => item.role.roleCode);
    const warehouseScopes = Array.from(
      new Set(rows.map((item) => item.warehouseCode).filter(Boolean)),
    ) as string[];
    const ownerScopes = Array.from(
      new Set(rows.map((item) => item.ownerId).filter(Boolean)),
    ) as string[];

    // CR-1 Fix: Implement DENY effect subtraction
    const allowedCodes = new Set(
      rows.flatMap((item) =>
        item.role.permissions
          .filter((link) => link.permission.isActive && link.effect === 'ALLOW')
          .map((link) => link.permission.permissionCode),
      ),
    );
    const deniedCodes = new Set(
      rows.flatMap((item) =>
        item.role.permissions
          .filter((link) => link.permission.isActive && link.effect === 'DENY')
          .map((link) => link.permission.permissionCode),
      ),
    );
    const permissionCodes = Array.from(allowedCodes).filter(
      (code) => !deniedCodes.has(code),
    );

    return {
      roleCodes,
      warehouseScopes,
      ownerScopes,
      permissionCodes,
    };
  }
}
