import { RequestUser } from '../../../common/interfaces/request-user.interface';
import { PermissionRepository } from '../repositories/permission.repository';
import { UserRepository } from '../repositories/user.repository';
export declare class AuthorizationService {
    private readonly userRepository;
    private readonly permissionRepository;
    constructor(userRepository: UserRepository, permissionRepository: PermissionRepository);
    resolveRequestUser(userCode: string): Promise<RequestUser>;
    assertUserExists(userId: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        userCode: string;
        username: string;
        fullName: string;
        email: string | null;
    }>;
}
