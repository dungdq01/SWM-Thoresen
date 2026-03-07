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
exports.RoleService = void 0;
const common_1 = require("@nestjs/common");
const log_service_1 = require("./log.service");
const permission_repository_1 = require("../repositories/permission.repository");
const role_repository_1 = require("../repositories/role.repository");
const authorization_service_1 = require("./authorization.service");
let RoleService = class RoleService {
    constructor(roleRepository, permissionRepository, authorizationService, logService) {
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
        this.authorizationService = authorizationService;
        this.logService = logService;
    }
    list(filters) {
        return this.roleRepository.list(filters);
    }
    async create(data) {
        const existing = await this.roleRepository.findByCode(data.roleCode);
        if (existing) {
            throw new common_1.ConflictException(`Role code ${data.roleCode} đã tồn tại.`);
        }
        const role = await this.roleRepository.create(data);
        await this.logService.createAuditLog({
            entityType: 'ROLE',
            entityId: role.id,
            action: 'CREATE_ROLE',
            newValue: role,
            userId: data.actorUserId,
            userRole: data.actorRole,
            requestId: data.requestId,
            sourceModule: 'FOUNDATION',
        });
        return role;
    }
    async update(roleId, data) {
        const existing = await this.roleRepository.findById(roleId);
        if (!existing) {
            throw new common_1.NotFoundException(`Không tìm thấy role với id ${roleId}.`);
        }
        const updated = await this.roleRepository.update(roleId, data);
        await this.logService.createAuditLog({
            entityType: 'ROLE',
            entityId: roleId,
            action: 'UPDATE_ROLE',
            oldValue: existing,
            newValue: updated,
            userId: data.actorUserId,
            userRole: data.actorRole,
            requestId: data.requestId,
            sourceModule: 'FOUNDATION',
        });
        return updated;
    }
    async assignPermissions(roleId, changes, actor) {
        const role = await this.roleRepository.findById(roleId);
        if (!role) {
            throw new common_1.NotFoundException(`Không tìm thấy role với id ${roleId}.`);
        }
        const permissions = await this.permissionRepository.findByCodes(changes.map((item) => item.permissionCode));
        if (permissions.length !== changes.length) {
            const foundCodes = new Set(permissions.map((item) => item.permissionCode));
            const missing = changes
                .map((item) => item.permissionCode)
                .filter((code) => !foundCodes.has(code));
            throw new common_1.NotFoundException(`Không tìm thấy permission: ${missing.join(', ')}.`);
        }
        const permissionLinks = permissions.map((permission) => {
            const incoming = changes.find((item) => item.permissionCode === permission.permissionCode);
            return {
                permissionId: permission.id,
                effect: (incoming?.effect ?? 'ALLOW'),
            };
        });
        const updated = await this.roleRepository.assignPermissions(roleId, permissionLinks, actor.actorUserId);
        await this.logService.createAuditLog({
            entityType: 'ROLE_PERMISSION',
            entityId: roleId,
            action: 'ASSIGN_ROLE_PERMISSIONS',
            oldValue: role.permissions,
            newValue: updated?.permissions,
            userId: actor.actorUserId,
            userRole: actor.actorRole,
            requestId: actor.requestId,
            sourceModule: 'FOUNDATION',
        });
        return updated;
    }
    async assignUserRole(userId, data) {
        await this.authorizationService.assertUserExists(userId);
        const role = await this.roleRepository.findByCode(data.roleCode);
        if (!role) {
            throw new common_1.NotFoundException(`Không tìm thấy role code ${data.roleCode}.`);
        }
        const assignment = await this.roleRepository.assignRoleToUser({
            userId,
            roleId: role.id,
            warehouseCode: data.warehouseCode,
            ownerId: data.ownerId,
            isPrimary: data.isPrimary,
            actorUserId: data.actorUserId,
        });
        await this.logService.createAuditLog({
            entityType: 'USER_ROLE',
            entityId: assignment.id,
            action: 'ASSIGN_USER_ROLE',
            newValue: assignment,
            userId: data.actorUserId,
            userRole: data.actorRole,
            requestId: data.requestId,
            sourceModule: 'FOUNDATION',
            warehouseCode: data.warehouseCode,
            ownerId: data.ownerId ?? undefined,
        });
        return assignment;
    }
};
exports.RoleService = RoleService;
exports.RoleService = RoleService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [role_repository_1.RoleRepository,
        permission_repository_1.PermissionRepository,
        authorization_service_1.AuthorizationService,
        log_service_1.LogService])
], RoleService);
//# sourceMappingURL=role.service.js.map