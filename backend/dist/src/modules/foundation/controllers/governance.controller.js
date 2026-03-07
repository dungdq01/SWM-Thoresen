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
exports.GovernanceController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../../../common/decorators/current-user.decorator");
const permission_decorator_1 = require("../../../common/decorators/permission.decorator");
const dto_1 = require("../dto");
const governance_service_1 = require("../services/governance.service");
const idempotency_service_1 = require("../services/idempotency.service");
let GovernanceController = class GovernanceController {
    constructor(governanceService, idempotencyService) {
        this.governanceService = governanceService;
        this.idempotencyService = idempotencyService;
    }
    listRules(query) {
        return this.governanceService.listRules(query);
    }
    createRule(body, user, request) {
        return this.idempotencyService.executeIfKeyProvided({
            idempotencyKey: this.getHeader(request.headers, 'idempotency-key'),
            commandName: 'create_business_rule',
            sourceModule: 'FOUNDATION',
            payload: body,
            correlationId: request.requestId,
            execute: () => this.governanceService.createRule({
                ...body,
                actorUserId: user.id,
                actorRole: user.roleCodes[0],
                requestId: request.requestId,
            }),
            mapSuccess: (result) => ({
                responseCode: 201,
                responseBody: result,
                resourceType: 'BUSINESS_RULE',
                resourceId: result.id,
            }),
        });
    }
    updateRule(id, body, user, request) {
        return this.idempotencyService.executeIfKeyProvided({
            idempotencyKey: this.getHeader(request.headers, 'idempotency-key'),
            commandName: 'update_business_rule',
            sourceModule: 'FOUNDATION',
            payload: { id, ...body },
            correlationId: request.requestId,
            execute: () => this.governanceService.updateRule(id, {
                ...body,
                actorUserId: user.id,
                actorRole: user.roleCodes[0],
                requestId: request.requestId,
            }),
            mapSuccess: (result) => ({
                responseBody: result,
                resourceType: 'BUSINESS_RULE',
                resourceId: id,
            }),
        });
    }
    listDecisionLogs(query) {
        return this.governanceService.listDecisionLogs(query);
    }
    createDecisionLog(body, user, request) {
        return this.idempotencyService.executeIfKeyProvided({
            idempotencyKey: this.getHeader(request.headers, 'idempotency-key'),
            commandName: 'create_decision_log',
            sourceModule: 'FOUNDATION',
            payload: body,
            correlationId: request.requestId,
            execute: () => this.governanceService.createDecisionLog({
                ...body,
                actorUserId: user.id,
                actorRole: user.roleCodes[0],
                requestId: request.requestId,
            }),
            mapSuccess: (result) => ({
                responseCode: 201,
                responseBody: result,
                resourceType: 'DECISION_LOG',
                resourceId: result.id,
            }),
        });
    }
    createChangeControl(body, user, request) {
        return this.idempotencyService.executeIfKeyProvided({
            idempotencyKey: this.getHeader(request.headers, 'idempotency-key'),
            commandName: 'create_change_control',
            sourceModule: 'FOUNDATION',
            payload: body,
            correlationId: request.requestId,
            execute: () => this.governanceService.createChangeControl({
                ...body,
                actorUserId: user.id,
                actorRole: user.roleCodes[0],
                requestId: request.requestId,
            }),
            mapSuccess: (result) => ({
                responseCode: 201,
                responseBody: result,
                resourceType: 'CHANGE_CONTROL',
                resourceId: result.id,
            }),
        });
    }
    getHeader(headers, name) {
        const value = headers[name];
        return Array.isArray(value) ? value[0] : value;
    }
};
exports.GovernanceController = GovernanceController;
__decorate([
    (0, common_1.Get)('rules'),
    (0, permission_decorator_1.Permission)('foundation.rules.view'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.ListRulesQueryDto]),
    __metadata("design:returntype", void 0)
], GovernanceController.prototype, "listRules", null);
__decorate([
    (0, common_1.Post)('rules'),
    (0, permission_decorator_1.Permission)('foundation.rules.create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateBusinessRuleDto, Object, Object]),
    __metadata("design:returntype", void 0)
], GovernanceController.prototype, "createRule", null);
__decorate([
    (0, common_1.Put)('rules/:id'),
    (0, permission_decorator_1.Permission)('foundation.rules.update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateBusinessRuleDto, Object, Object]),
    __metadata("design:returntype", void 0)
], GovernanceController.prototype, "updateRule", null);
__decorate([
    (0, common_1.Get)('decision-logs'),
    (0, permission_decorator_1.Permission)('foundation.decision_logs.view'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.ListDecisionLogsQueryDto]),
    __metadata("design:returntype", void 0)
], GovernanceController.prototype, "listDecisionLogs", null);
__decorate([
    (0, common_1.Post)('decision-logs'),
    (0, permission_decorator_1.Permission)('foundation.decision_logs.create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateDecisionLogDto, Object, Object]),
    __metadata("design:returntype", void 0)
], GovernanceController.prototype, "createDecisionLog", null);
__decorate([
    (0, common_1.Post)('change-controls'),
    (0, permission_decorator_1.Permission)('foundation.change_controls.create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateChangeControlDto, Object, Object]),
    __metadata("design:returntype", void 0)
], GovernanceController.prototype, "createChangeControl", null);
exports.GovernanceController = GovernanceController = __decorate([
    (0, common_1.Controller)('foundation'),
    __metadata("design:paramtypes", [governance_service_1.GovernanceService,
        idempotency_service_1.IdempotencyService])
], GovernanceController);
//# sourceMappingURL=governance.controller.js.map