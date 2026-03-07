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
exports.ReasonCodeController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../../../common/decorators/current-user.decorator");
const permission_decorator_1 = require("../../../common/decorators/permission.decorator");
const dto_1 = require("../dto");
const idempotency_service_1 = require("../services/idempotency.service");
const reason_code_service_1 = require("../services/reason-code.service");
let ReasonCodeController = class ReasonCodeController {
    constructor(reasonCodeService, idempotencyService) {
        this.reasonCodeService = reasonCodeService;
        this.idempotencyService = idempotencyService;
    }
    listReasonCodes(query) {
        return this.reasonCodeService.list(query);
    }
    createReasonCode(body, user, request) {
        return this.idempotencyService.executeIfKeyProvided({
            idempotencyKey: this.getHeader(request.headers, 'idempotency-key'),
            commandName: 'create_reason_code',
            sourceModule: 'FOUNDATION',
            payload: body,
            correlationId: request.requestId,
            execute: () => this.reasonCodeService.create({
                ...body,
                actorUserId: user.id,
                actorRole: user.roleCodes[0],
                requestId: request.requestId,
            }),
            mapSuccess: (result) => ({
                responseCode: 201,
                responseBody: result,
                resourceType: 'REASON_CODE',
                resourceId: result.id,
            }),
        });
    }
    updateReasonCode(id, body, user, request) {
        return this.idempotencyService.executeIfKeyProvided({
            idempotencyKey: this.getHeader(request.headers, 'idempotency-key'),
            commandName: 'update_reason_code',
            sourceModule: 'FOUNDATION',
            payload: { id, ...body },
            correlationId: request.requestId,
            execute: () => this.reasonCodeService.update(id, {
                ...body,
                actorUserId: user.id,
                actorRole: user.roleCodes[0],
                requestId: request.requestId,
            }),
            mapSuccess: (result) => ({
                responseBody: result,
                resourceType: 'REASON_CODE',
                resourceId: id,
            }),
        });
    }
    deactivateReasonCode(id, user, request) {
        return this.idempotencyService.executeIfKeyProvided({
            idempotencyKey: this.getHeader(request.headers, 'idempotency-key'),
            commandName: 'deactivate_reason_code',
            sourceModule: 'FOUNDATION',
            payload: { id },
            correlationId: request.requestId,
            execute: () => this.reasonCodeService.deactivate(id, {
                actorUserId: user.id,
                actorRole: user.roleCodes[0],
                requestId: request.requestId,
            }),
            mapSuccess: (result) => ({
                responseBody: result,
                resourceType: 'REASON_CODE',
                resourceId: id,
            }),
        });
    }
    getHeader(headers, name) {
        const value = headers[name];
        return Array.isArray(value) ? value[0] : value;
    }
};
exports.ReasonCodeController = ReasonCodeController;
__decorate([
    (0, common_1.Get)('reason-codes'),
    (0, permission_decorator_1.Permission)('foundation.reason_codes.view'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.ListReasonCodesQueryDto]),
    __metadata("design:returntype", void 0)
], ReasonCodeController.prototype, "listReasonCodes", null);
__decorate([
    (0, common_1.Post)('reason-codes'),
    (0, permission_decorator_1.Permission)('foundation.reason_codes.create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateReasonCodeDto, Object, Object]),
    __metadata("design:returntype", void 0)
], ReasonCodeController.prototype, "createReasonCode", null);
__decorate([
    (0, common_1.Put)('reason-codes/:id'),
    (0, permission_decorator_1.Permission)('foundation.reason_codes.update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateReasonCodeDto, Object, Object]),
    __metadata("design:returntype", void 0)
], ReasonCodeController.prototype, "updateReasonCode", null);
__decorate([
    (0, common_1.Post)('reason-codes/:id/deactivate'),
    (0, permission_decorator_1.Permission)('foundation.reason_codes.deactivate'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], ReasonCodeController.prototype, "deactivateReasonCode", null);
exports.ReasonCodeController = ReasonCodeController = __decorate([
    (0, common_1.Controller)('foundation'),
    __metadata("design:paramtypes", [reason_code_service_1.ReasonCodeService,
        idempotency_service_1.IdempotencyService])
], ReasonCodeController);
//# sourceMappingURL=reason-code.controller.js.map