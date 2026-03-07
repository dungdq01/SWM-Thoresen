import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
export declare class PermissionRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(filters: {
        moduleCode?: string;
        resourceCode?: string;
    }): Prisma.PrismaPromise<{
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
    }[]>;
    findByCodes(permissionCodes: string[]): Prisma.PrismaPromise<{
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
    }[]>;
    getEffectivePermissionsByUserId(userId: string): Promise<{
        roleCodes: string[];
        warehouseScopes: string[];
        ownerScopes: string[];
        permissionCodes: string[];
    }>;
}
