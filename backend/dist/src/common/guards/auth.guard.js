"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthGuard = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const jsonwebtoken_1 = require("jsonwebtoken");
const crypto_1 = require("crypto");
const public_decorator_1 = require("../decorators/public.decorator");
const authorization_service_1 = require("../../modules/foundation/services/authorization.service");
let AuthGuard = class AuthGuard {
    constructor(reflector, configService, authorizationService) {
        this.reflector = reflector;
        this.configService = configService;
        this.authorizationService = authorizationService;
    }
    async canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(public_decorator_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            const request = context.switchToHttp().getRequest();
            request.requestId ??= (0, crypto_1.randomUUID)();
            return true;
        }
        const request = context.switchToHttp().getRequest();
        request.requestId ??= (0, crypto_1.randomUUID)();
        const bypass = this.configService.get('DEV_AUTH_BYPASS') === 'true';
        const userCodeHeader = request.headers['x-user-code'];
        const requestedUserCode = Array.isArray(userCodeHeader)
            ? userCodeHeader[0]
            : userCodeHeader;
        if (bypass) {
            const requestUser = await this.authorizationService.resolveRequestUser(requestedUserCode ?? 'admin');
            request.user = requestUser;
            return true;
        }
        const authorization = request.headers.authorization;
        if (!authorization?.startsWith('Bearer ')) {
            throw new common_1.UnauthorizedException('Thiếu Bearer token hợp lệ.');
        }
        const token = authorization.slice('Bearer '.length);
        const secret = this.configService.get('JWT_SECRET');
        if (!secret) {
            throw new common_1.UnauthorizedException('Thiếu cấu hình JWT_SECRET.');
        }
        let payload;
        try {
            payload = (0, jsonwebtoken_1.verify)(token, secret);
        }
        catch {
            throw new common_1.UnauthorizedException('Token không hợp lệ hoặc đã hết hạn.');
        }
        const userCode = typeof payload === 'object' && payload !== null && 'userCode' in payload
            ? String(payload.userCode)
            : null;
        if (!userCode) {
            throw new common_1.UnauthorizedException('Token không chứa userCode hợp lệ.');
        }
        request.user = await this.authorizationService.resolveRequestUser(userCode);
        return true;
    }
};
exports.AuthGuard = AuthGuard;
exports.AuthGuard = AuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        config_1.ConfigService,
        authorization_service_1.AuthorizationService])
], AuthGuard);
//# sourceMappingURL=auth.guard.js.map