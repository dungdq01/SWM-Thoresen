import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { RequestUser } from '../../../common/interfaces/request-user.interface';
import { PermissionRepository } from '../repositories/permission.repository';
import { UserRepository } from '../repositories/user.repository';

@Injectable()
export class AuthorizationService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly permissionRepository: PermissionRepository,
  ) {}

  async resolveRequestUser(userCode: string): Promise<RequestUser> {
    const user = await this.userRepository.findByUserCode(userCode);
    if (!user || !user.isActive) {
      throw new UnauthorizedException(`Không tìm thấy user active với mã ${userCode}.`);
    }

    const permissions = await this.permissionRepository.getEffectivePermissionsByUserId(
      user.id,
    );

    return {
      id: user.id,
      userCode: user.userCode,
      username: user.username,
      fullName: user.fullName,
      roleCodes: permissions.roleCodes as string[],
      permissionCodes: permissions.permissionCodes as string[],
      warehouseScopes: permissions.warehouseScopes as string[],
      ownerScopes: permissions.ownerScopes as string[],
    };
  }

  async assertUserExists(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`Không tìm thấy user với id ${userId}.`);
    }

    return user;
  }
}
