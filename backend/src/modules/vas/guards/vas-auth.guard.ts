/**
 * VAS Module - Authentication & Authorization Guards
 * Integrates with M1 Foundation auth system
 */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  SetMetadata,
  UnauthorizedException,
  ForbiddenException,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const PERMISSION_KEY = 'permission';
export const Permission = (permission: string) => SetMetadata(PERMISSION_KEY, permission);

export interface UserContext {
  userId: string;
  username: string;
  role: string;
  permissions: string[];
  warehouseIds: string[];
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

@Injectable()
export class VasAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Extract token from Authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
    
    // TODO: Validate token with M1 Foundation auth service
    // For now, decode JWT and extract user info
    try {
      const user = await this.validateToken(token);
      request.user = user;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private async validateToken(token: string): Promise<UserContext> {
    // TODO: Integrate with M1 Foundation JWT validation
    // For now, basic JWT decode (in production, verify signature)
    try {
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString()
      );
      
      return {
        userId: payload.sub || payload.userId,
        username: payload.username || 'unknown',
        role: payload.role || 'USER',
        permissions: payload.permissions || [],
        warehouseIds: payload.warehouseIds || [],
      };
    } catch {
      throw new UnauthorizedException('Invalid token format');
    }
  }
}

@Injectable()
export class VasPermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.getAllAndOverride<string>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredPermission) {
      return true; // No permission required
    }

    const request = context.switchToHttp().getRequest();
    const user: UserContext = request.user;

    if (!user) {
      throw new ForbiddenException('User context not found');
    }

    // Admin/Manager roles have all permissions
    if (['ADMIN', 'WH_MANAGER', 'OPS_SUPER'].includes(user.role)) {
      return true;
    }

    // Check specific permission
    if (user.permissions.includes(requiredPermission)) {
      return true;
    }

    throw new ForbiddenException(
      `Permission denied: ${requiredPermission} required`
    );
  }
}
