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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../../../common/decorators/current-user.decorator");
const permission_decorator_1 = require("../../../common/decorators/permission.decorator");
const dto_1 = require("../dto");
const idempotency_service_1 = require("../services/idempotency.service");
const role_service_1 = require("../services/role.service");
let RoleController = class RoleController {
    constructor(roleService, idempotencyService) {
        this.roleService = roleService;
        this.idempotencyService = idempotencyService;
    }
    listRoles(query) {
        return this.roleService.list(query);
    }
    createRole(body, user, request) {
        return this.idempotencyService.executeIfKeyProvided({
            idempotencyKey: this.getHeader(request.headers, 'idempotency-key'),
            commandName: 'create_role',
            sourceModule: 'FOUNDATION',
            payload: body,
            correlationId: request.requestId,
            execute: () => this.roleService.create({
                ...body,
                actorUserId: user.id,
                actorRole: user.roleCodes[0],
                requestId: request.requestId,
            }),
            mapSuccess: (result) => ({
                responseCode: 201,
                responseBody: result,
                resourceType: 'ROLE',
                resourceId: result.id,
            }),
        });
    }
    updateRole(id, body, user, request) {
        return this.idempotencyService.executeIfKeyProvided({
            idempotencyKey: this.getHeader(request.headers, 'idempotency-key'),
            commandName: 'update_role',
            sourceModule: 'FOUNDATION',
            payload: { id, ...body },
            correlationId: request.requestId,
            execute: () => this.roleService.update(id, {
                ...body,
                actorUserId: user.id,
                actorRole: user.roleCodes[0],
                requestId: request.requestId,
            }),
            mapSuccess: (result) => ({
                responseBody: result,
                resourceType: 'ROLE',
                resourceId: id,
            }),
        });
    }
    assignPermissions(id, body, user, request) {
        return this.idempotencyService.executeIfKeyProvided({
            idempotencyKey: this.getHeader(request.headers, 'idempotency-key'),
            commandName: 'assign_role_permissions',
            sourceModule: 'FOUNDATION',
            payload: { id, ...body },
            correlationId: request.requestId,
            execute: () => this.roleService.assignPermissions(id, body.changes, {
                actorUserId: user.id,
                actorRole: user.roleCodes[0],
                requestId: request.requestId,
            }),
            mapSuccess: (result) => ({
                responseBody: result,
                resourceType: 'ROLE',
                resourceId: id,
            }),
        });
    }
    assignUserRole(userId, body, user, request) {
        return this.idempotencyService.executeIfKeyProvided({
            idempotencyKey: this.getHeader(request.headers, 'idempotency-key'),
            commandName: 'assign_user_role',
            sourceModule: 'FOUNDATION',
            payload: { userId, ...body },
            correlationId: request.requestId,
            execute: () => this.roleService.assignUserRole(userId, {
                ...body,
                actorUserId: user.id,
                actorRole: user.roleCodes[0],
                requestId: request.requestId,
            }),
            mapSuccess: (result) => ({
                responseBody: result,
                resourceType: 'USER_ROLE',
                resourceId: result.id,
            }),
        });
    }
    getHeader(headers, name) {
        const value = headers[name];
        return Array.isArray(value) ? value[0] : value;
    }
};
exports.RoleController = RoleController;
__decorate([
    (0, common_1.Get)('roles'),
    (0, permission_decorator_1.Permission)('foundation.roles.view'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.ListRolesQueryDto]),
    __metadata("design:returntype", void 0)
], RoleController.prototype, "listRoles", null);
__decorate([
    (0, common_1.Post)('roles'),
    (0, permission_decorator_1.Permission)('foundation.roles.create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateRoleDto, Object, Object]),
    __metadata("design:returntype", void 0)
], RoleController.prototype, "createRole", null);
__decorate([
    (0, common_1.Put)('roles/:id'),
    (0, permission_decorator_1.Permission)('foundation.roles.update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateRoleDto, Object, Object]),
    __metadata("design:returntype", void 0)
], RoleController.prototype, "updateRole", null);
__decorate([
    (0, common_1.Post)('roles/:id/permissions'),
    (0, permission_decorator_1.Permission)('foundation.roles.assign_permission'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.AssignRolePermissionsDto, Object, Object]),
    __metadata("design:returntype", void 0)
], RoleController.prototype, "assignPermissions", null);
__decorate([
    (0, common_1.Post)('users/:userId/roles'),
    (0, permission_decorator_1.Permission)('foundation.users.assign_role'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.AssignUserRoleDto, Object, Object]),
    __metadata("design:returntype", void 0)
], RoleController.prototype, "assignUserRole", null);
exports.RoleController = RoleController = __decorate([
    (0, common_1.Controller)('foundation'),
    __metadata("design:paramtypes", [role_service_1.RoleService,
        idempotency_service_1.IdempotencyService])
], RoleController);
//# sourceMappingURL=role.controller.js.map