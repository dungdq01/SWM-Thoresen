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
exports.LogController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../../../common/decorators/current-user.decorator");
const permission_decorator_1 = require("../../../common/decorators/permission.decorator");
const dto_1 = require("../dto");
const idempotency_service_1 = require("../services/idempotency.service");
const log_service_1 = require("../services/log.service");
let LogController = class LogController {
    constructor(logService, idempotencyService) {
        this.logService = logService;
        this.idempotencyService = idempotencyService;
    }
    listAuditLogs(query) {
        return this.logService.listAuditLogs(query);
    }
    listExceptionLogs(query) {
        return this.logService.listExceptionLogs(query);
    }
    resolveException(id, user) {
        return this.logService.resolveException(id, user.id);
    }
    getIdempotency(key) {
        return this.idempotencyService.getByKey(key);
    }
};
exports.LogController = LogController;
__decorate([
    (0, common_1.Get)('audit-logs'),
    (0, permission_decorator_1.Permission)('foundation.audit_logs.view'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.ListAuditLogsQueryDto]),
    __metadata("design:returntype", void 0)
], LogController.prototype, "listAuditLogs", null);
__decorate([
    (0, common_1.Get)('exception-logs'),
    (0, permission_decorator_1.Permission)('foundation.exception_logs.view'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.ListExceptionLogsQueryDto]),
    __metadata("design:returntype", void 0)
], LogController.prototype, "listExceptionLogs", null);
__decorate([
    (0, common_1.Post)('exception-logs/:id/resolve'),
    (0, permission_decorator_1.Permission)('foundation.exception_logs.resolve'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LogController.prototype, "resolveException", null);
__decorate([
    (0, common_1.Get)('idempotency/:key'),
    (0, permission_decorator_1.Permission)('foundation.idempotency.view'),
    __param(0, (0, common_1.Param)('key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LogController.prototype, "getIdempotency", null);
exports.LogController = LogController = __decorate([
    (0, common_1.Controller)('foundation'),
    __metadata("design:paramtypes", [log_service_1.LogService,
        idempotency_service_1.IdempotencyService])
], LogController);
//# sourceMappingURL=log.controller.js.map