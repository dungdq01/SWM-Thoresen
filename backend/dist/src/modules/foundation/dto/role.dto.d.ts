export declare class ListRolesQueryDto {
    isActive?: boolean;
    roleCode?: string;
}
export declare class CreateRoleDto {
    roleCode: string;
    roleName: string;
    description?: string;
}
export declare class UpdateRoleDto {
    roleName?: string;
    description?: string;
    isActive?: boolean;
}
export declare class PermissionChangeDto {
    permissionCode: string;
    effect?: 'ALLOW' | 'DENY';
}
export declare class AssignRolePermissionsDto {
    changes: PermissionChangeDto[];
}
export declare class AssignUserRoleDto {
    roleCode: string;
    warehouseCode?: string;
    ownerId?: string | null;
    isPrimary?: boolean;
}
