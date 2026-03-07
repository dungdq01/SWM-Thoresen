import { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { AuthorizationService } from '../../modules/foundation/services/authorization.service';
export declare class AuthGuard implements CanActivate {
    private readonly reflector;
    private readonly configService;
    private readonly authorizationService;
    constructor(reflector: Reflector, configService: ConfigService, authorizationService: AuthorizationService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
