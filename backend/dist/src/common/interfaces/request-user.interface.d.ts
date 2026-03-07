export interface RequestUser {
    id: string;
    userCode: string;
    username: string;
    fullName: string;
    roleCodes: string[];
    permissionCodes: string[];
    warehouseScopes: string[];
    ownerScopes: string[];
}
