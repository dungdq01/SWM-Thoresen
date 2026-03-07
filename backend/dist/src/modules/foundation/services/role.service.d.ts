import { LogService } from './log.service';
import { PermissionRepository } from '../repositories/permission.repository';
import { RoleRepository } from '../repositories/role.repository';
import { AuthorizationService } from './authorization.service';
export declare class RoleService {
    private readonly roleRepository;
    private readonly permissionRepository;
    private readonly authorizationService;
    private readonly logService;
    constructor(roleRepository: RoleRepository, permissionRepository: PermissionRepository, authorizationService: AuthorizationService, logService: LogService);
    list(filters: {
        isActive?: boolean;
        roleCode?: string;
    }): import(".prisma/client").Prisma.PrismaPromise<({
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
    create(data: {
        roleCode: string;
        roleName: string;
        description?: string;
        actorUserId: string;
        actorRole?: string;
        requestId?: string;
    }): Promise<{
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
    }>;
    update(roleId: string, data: {
        roleName?: string;
        description?: string;
        isActive?: boolean;
        actorUserId: string;
        actorRole?: string;
        requestId?: string;
    }): Promise<{
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
    }>;
    assignPermissions(roleId: string, changes: Array<{
        permissionCode: string;
        effect?: 'ALLOW' | 'DENY';
    }>, actor: {
        actorUserId: string;
        actorRole?: string;
        requestId?: string;
    }): Promise<({
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
    assignUserRole(userId: string, data: {
        roleCode: string;
        warehouseCode?: string;
        ownerId?: string | null;
        isPrimary?: boolean;
        actorUserId: string;
        actorRole?: string;
        requestId?: string;
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
