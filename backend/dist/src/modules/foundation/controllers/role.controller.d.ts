import { RequestUser } from '../../../common/interfaces/request-user.interface';
import { AssignRolePermissionsDto, AssignUserRoleDto, CreateRoleDto, ListRolesQueryDto, UpdateRoleDto } from '../dto';
import { IdempotencyService } from '../services/idempotency.service';
import { RoleService } from '../services/role.service';
export declare class RoleController {
    private readonly roleService;
    private readonly idempotencyService;
    constructor(roleService: RoleService, idempotencyService: IdempotencyService);
    listRoles(query: ListRolesQueryDto): import(".prisma/client").Prisma.PrismaPromise<({
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
    createRole(body: CreateRoleDto, user: RequestUser, request: {
        headers: Record<string, string | string[] | undefined>;
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
    updateRole(id: string, body: UpdateRoleDto, user: RequestUser, request: {
        headers: Record<string, string | string[] | undefined>;
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
    assignPermissions(id: string, body: AssignRolePermissionsDto, user: RequestUser, request: {
        headers: Record<string, string | string[] | undefined>;
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
    assignUserRole(userId: string, body: AssignUserRoleDto, user: RequestUser, request: {
        headers: Record<string, string | string[] | undefined>;
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
    private getHeader;
}
