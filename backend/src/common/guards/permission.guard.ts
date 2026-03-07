import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PERMISSION_KEY } from '../decorators/permission.decorator';
import { RequestUser } from '../interfaces/request-user.interface';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredPermission = this.reflector.getAllAndOverride<string>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: RequestUser;
      headers: Record<string, string | string[] | undefined>;
    }>();

    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Không tìm thấy thông tin người dùng trong request.');
    }

    if (!user.permissionCodes.includes(requiredPermission)) {
      throw new ForbiddenException(`Bạn không có quyền ${requiredPermission}.`);
    }

    const warehouseHeader = request.headers['x-warehouse-code'];
    const warehouseCode = Array.isArray(warehouseHeader)
      ? warehouseHeader[0]
      : warehouseHeader;

    if (
      warehouseCode &&
      user.warehouseScopes.length > 0 &&
      !user.warehouseScopes.includes(warehouseCode)
    ) {
      throw new ForbiddenException(
        `Bạn không có quyền thao tác warehouse ${warehouseCode}.`,
      );
    }

    // CR-2 Fix: Enforce owner scope for CUST_VIEWER and similar roles
    const ownerHeader = request.headers['x-owner-id'];
    const ownerId = Array.isArray(ownerHeader) ? ownerHeader[0] : ownerHeader;

    if (
      ownerId &&
      user.ownerScopes.length > 0 &&
      !user.ownerScopes.includes(ownerId)
    ) {
      throw new ForbiddenException(
        `Bạn không có quyền truy cập dữ liệu của owner ${ownerId}.`,
      );
    }

    return true;
  }
}
