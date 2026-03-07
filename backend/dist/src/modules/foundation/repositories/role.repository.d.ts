import { Prisma, RolePermissionEffect } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
export declare class RoleRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(filters: {
        isActive?: boolean;
        roleCode?: string;
    }): Prisma.PrismaPromise<({
        permissions: ({
            permission: {
                id: string;
                description: string | null;
                isActive: boolean;
                createdBy: string | null;
                updatedBy: string | null;
                createdAt: Date;
                updatedAt: Date;
                permissionCode: string;
                moduleCode: string;
                resourceCode: string;
                actionCode: string;
                isSensitive: boolean;
            };
        } & {
            id: string;
            createdBy: string | null;
            createdAt: Date;
            roleId: string;
            permissionId: string;
            effect: import(".prisma/client").$Enums.RolePermissionEffect;
            scopeType: string | null;
            scopeValue: string | null;
        })[];
    } & {
        id: string;
        roleCode: string;
        roleName: string;
        description: string | null;
        isSystemRole: boolean;
        isActive: boolean;
        effectiveFrom: Date | null;
        effectiveTo: Date | null;
        createdBy: string | null;
        updatedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    findById(roleId: string): Prisma.Prisma__RoleClient<({
        permissions: ({
            permission: {
                id: string;
                description: string | null;
                isActive: boolean;
                createdBy: string | null;
                updatedBy: string | null;
                createdAt: Date;
                updatedAt: Date;
                permissionCode: string;
                moduleCode: string;
                resourceCode: string;
                actionCode: string;
                isSensitive: boolean;
            };
        } & {
            id: string;
            createdBy: string | null;
            createdAt: Date;
            roleId: string;
            permissionId: string;
            effect: import(".prisma/client").$Enums.RolePermissionEffect;
            scopeType: string | null;
            scopeValue: string | null;
        })[];
    } & {
        id: string;
        roleCode: string;
        roleName: string;
        description: string | null;
        isSystemRole: boolean;
        isActive: boolean;
        effectiveFrom: Date | null;
        effectiveTo: Date | null;
        createdBy: string | null;
        updatedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
    }) | null, null, import("@prisma/client/runtime/library").DefaultArgs>;
    findByCode(roleCode: string): Prisma.Prisma__RoleClient<{
        id: string;
        roleCode: string;
        roleName: string;
        description: string | null;
        isSystemRole: boolean;
        isActive: boolean;
        effectiveFrom: Date | null;
        effectiveTo: Date | null;
        createdBy: string | null;
        updatedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
    } | null, null, import("@prisma/client/runtime/library").DefaultArgs>;
    create(data: {
        roleCode: string;
        roleName: string;
        description?: string;
        actorUserId: string;
    }): Prisma.Prisma__RoleClient<{
        id: string;
        roleCode: string;
        roleName: string;
        description: string | null;
        isSystemRole: boolean;
        isActive: boolean;
        effectiveFrom: Date | null;
        effectiveTo: Date | null;
        createdBy: string | null;
        updatedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    update(roleId: string, data: {
        roleName?: string;
        description?: string;
        isActive?: boolean;
        actorUserId: string;
    }): Prisma.Prisma__RoleClient<{
        id: string;
        roleCode: string;
        roleName: string;
        description: string | null;
        isSystemRole: boolean;
        isActive: boolean;
        effectiveFrom: Date | null;
        effectiveTo: Date | null;
        createdBy: string | null;
        updatedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    assignPermissions(roleId: string, permissionLinks: Array<{
        permissionId: string;
        effect: RolePermissionEffect;
    }>, actorUserId: string): Promise<({
        permissions: ({
            permission: {
                id: string;
                description: string | null;
                isActive: boolean;
                createdBy: string | null;
                updatedBy: string | null;
                createdAt: Date;
                updatedAt: Date;
                permissionCode: string;
                moduleCode: string;
                resourceCode: string;
                actionCode: string;
                isSensitive: boolean;
            };
        } & {
            id: string;
            createdBy: string | null;
            createdAt: Date;
            roleId: string;
            permissionId: string;
            effect: import(".prisma/client").$Enums.RolePermissionEffect;
            scopeType: string | null;
            scopeValue: string | null;
        })[];
    } & {
        id: string;
        roleCode: string;
        roleName: string;
        description: string | null;
        isSystemRole: boolean;
        isActive: boolean;
        effectiveFrom: Date | null;
        effectiveTo: Date | null;
        createdBy: string | null;
        updatedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
    }) | null>;
    assignRoleToUser(data: {
        userId: string;
        roleId: string;
        warehouseCode?: string;
        ownerId?: string | null;
        isPrimary?: boolean;
        actorUserId: string;
    }): Promise<{
        role: {
            id: string;
            roleCode: string;
            roleName: string;
            description: string | null;
            isSystemRole: boolean;
            isActive: boolean;
            effectiveFrom: Date | null;
            effectiveTo: Date | null;
            createdBy: string | null;
            updatedBy: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
        user: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            userCode: string;
            username: string;
            fullName: string;
            email: string | null;
        };
    } & {
        id: string;
        isActive: boolean;
        roleId: string;
        warehouseCode: string | null;
        ownerId: string | null;
        isPrimary: boolean;
        assignedAt: Date;
        assignedBy: string | null;
        revokedAt: Date | null;
        revokedBy: string | null;
        userId: string;
    }>;
}
