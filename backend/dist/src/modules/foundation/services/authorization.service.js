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
exports.AuthorizationService = void 0;
const common_1 = require("@nestjs/common");
const permission_repository_1 = require("../repositories/permission.repository");
const user_repository_1 = require("../repositories/user.repository");
let AuthorizationService = class AuthorizationService {
    constructor(userRepository, permissionRepository) {
        this.userRepository = userRepository;
        this.permissionRepository = permissionRepository;
    }
    async resolveRequestUser(userCode) {
        const user = await this.userRepository.findByUserCode(userCode);
        if (!user || !user.isActive) {
            throw new common_1.UnauthorizedException(`Không tìm thấy user active với mã ${userCode}.`);
        }
        const permissions = await this.permissionRepository.getEffectivePermissionsByUserId(user.id);
        return {
            id: user.id,
            userCode: user.userCode,
            username: user.username,
            fullName: user.fullName,
            roleCodes: permissions.roleCodes,
            permissionCodes: permissions.permissionCodes,
            warehouseScopes: permissions.warehouseScopes,
            ownerScopes: permissions.ownerScopes,
        };
    }
    async assertUserExists(userId) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException(`Không tìm thấy user với id ${userId}.`);
        }
        return user;
    }
};
exports.AuthorizationService = AuthorizationService;
exports.AuthorizationService = AuthorizationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [user_repository_1.UserRepository,
        permission_repository_1.PermissionRepository])
], AuthorizationService);
//# sourceMappingURL=authorization.service.js.map