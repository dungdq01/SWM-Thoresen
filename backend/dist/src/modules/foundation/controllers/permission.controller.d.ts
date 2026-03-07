import { RequestUser } from '../../../common/interfaces/request-user.interface';
import { ListPermissionsQueryDto } from '../dto';
import { PermissionService } from '../services/permission.service';
export declare class PermissionController {
    private readonly permissionService;
    constructor(permissionService: PermissionService);
    listPermissions(query: ListPermissionsQueryDto): import(".prisma/client").Prisma.PrismaPromise<{
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
    getMyPermissions(user: RequestUser): Promise<{
        roleCodes: string[];
        warehouseScopes: string[];
        ownerScopes: string[];
        permissionCodes: string[];
    }>;
}
