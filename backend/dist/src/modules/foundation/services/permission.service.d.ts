import { PermissionRepository } from '../repositories/permission.repository';
export declare class PermissionService {
    private readonly permissionRepository;
    constructor(permissionRepository: PermissionRepository);
    list(filters: {
        moduleCode?: string;
        resourceCode?: string;
    }): import(".prisma/client").Prisma.PrismaPromise<{
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
    getMyPermissions(userId: string): Promise<{
        roleCodes: string[];
        warehouseScopes: string[];
        ownerScopes: string[];
        permissionCodes: string[];
    }>;
}
