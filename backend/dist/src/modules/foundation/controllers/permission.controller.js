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
exports.PermissionController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../../../common/decorators/current-user.decorator");
const permission_decorator_1 = require("../../../common/decorators/permission.decorator");
const dto_1 = require("../dto");
const permission_service_1 = require("../services/permission.service");
let PermissionController = class PermissionController {
    constructor(permissionService) {
        this.permissionService = permissionService;
    }
    listPermissions(query) {
        return this.permissionService.list(query);
    }
    getMyPermissions(user) {
        return this.permissionService.getMyPermissions(user.id);
    }
};
exports.PermissionController = PermissionController;
__decorate([
    (0, common_1.Get)('permissions'),
    (0, permission_decorator_1.Permission)('foundation.permissions.view'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.ListPermissionsQueryDto]),
    __metadata("design:returntype", void 0)
], PermissionController.prototype, "listPermissions", null);
__decorate([
    (0, common_1.Get)('me/permissions'),
    (0, permission_decorator_1.Permission)('foundation.permissions.me.view'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PermissionController.prototype, "getMyPermissions", null);
exports.PermissionController = PermissionController = __decorate([
    (0, common_1.Controller)('foundation'),
    __metadata("design:paramtypes", [permission_service_1.PermissionService])
], PermissionController);
//# sourceMappingURL=permission.controller.js.map