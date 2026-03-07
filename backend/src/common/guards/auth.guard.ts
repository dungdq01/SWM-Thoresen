import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { verify } from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthorizationService } from '../../modules/foundation/services/authorization.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      const request = context.switchToHttp().getRequest();
      request.requestId ??= randomUUID();
      return true;
    }

    const request = context.switchToHttp().getRequest();
    request.requestId ??= randomUUID();

    const bypass = this.configService.get<string>('DEV_AUTH_BYPASS') === 'true';
    const userCodeHeader = request.headers['x-user-code'];
    const requestedUserCode = Array.isArray(userCodeHeader)
      ? userCodeHeader[0]
      : userCodeHeader;

    if (bypass) {
      const requestUser = await this.authorizationService.resolveRequestUser(
        requestedUserCode ?? 'admin',
      );
      request.user = requestUser;
      return true;
    }

    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Thiếu Bearer token hợp lệ.');
    }

    const token = authorization.slice('Bearer '.length);
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new UnauthorizedException('Thiếu cấu hình JWT_SECRET.');
    }

    let payload: unknown;
    try {
      payload = verify(token, secret);
    } catch {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn.');
    }

    const userCode =
      typeof payload === 'object' && payload !== null && 'userCode' in payload
        ? String(payload.userCode)
        : null;

    if (!userCode) {
      throw new UnauthorizedException('Token không chứa userCode hợp lệ.');
    }

    request.user = await this.authorizationService.resolveRequestUser(userCode);
    return true;
  }
}
