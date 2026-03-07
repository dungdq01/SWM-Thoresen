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
exports.NumberSequenceController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../../../common/decorators/current-user.decorator");
const permission_decorator_1 = require("../../../common/decorators/permission.decorator");
const dto_1 = require("../dto");
const idempotency_service_1 = require("../services/idempotency.service");
const number_sequence_service_1 = require("../services/number-sequence.service");
let NumberSequenceController = class NumberSequenceController {
    constructor(numberSequenceService, idempotencyService) {
        this.numberSequenceService = numberSequenceService;
        this.idempotencyService = idempotencyService;
    }
    listSequences() {
        return this.numberSequenceService.list();
    }
    createSequence(body, user, request) {
        return this.idempotencyService.executeIfKeyProvided({
            idempotencyKey: this.getHeader(request.headers, 'idempotency-key'),
            commandName: 'create_number_sequence',
            sourceModule: 'FOUNDATION',
            payload: body,
            correlationId: request.requestId,
            execute: () => this.numberSequenceService.create({
                ...body,
                actorUserId: user.id,
                actorRole: user.roleCodes[0],
                requestId: request.requestId,
            }),
            mapSuccess: (result) => ({
                responseCode: 201,
                responseBody: result,
                resourceType: 'NUMBER_SEQUENCE',
                resourceId: result.id,
            }),
        });
    }
    updateSequence(id, body, user, request) {
        return this.idempotencyService.executeIfKeyProvided({
            idempotencyKey: this.getHeader(request.headers, 'idempotency-key'),
            commandName: 'update_number_sequence',
            sourceModule: 'FOUNDATION',
            payload: { id, ...body },
            correlationId: request.requestId,
            execute: () => this.numberSequenceService.update(id, {
                ...body,
                actorUserId: user.id,
                actorRole: user.roleCodes[0],
                requestId: request.requestId,
            }),
            mapSuccess: (result) => ({
                responseBody: result,
                resourceType: 'NUMBER_SEQUENCE',
                resourceId: id,
            }),
        });
    }
    getNextNumber(code, body, user, request) {
        return this.idempotencyService.executeIfKeyProvided({
            idempotencyKey: this.getHeader(request.headers, 'idempotency-key'),
            commandName: 'get_next_number',
            sourceModule: 'FOUNDATION',
            payload: { code, ...body },
            correlationId: request.requestId,
            execute: () => this.numberSequenceService.getNextNumber(code, body.scopeKey, {
                actorUserId: user.id,
                actorRole: user.roleCodes[0],
                requestId: request.requestId,
            }),
            mapSuccess: (result) => ({
                responseBody: result,
                resourceType: 'NUMBER_SEQUENCE',
                resourceId: code,
            }),
        });
    }
    getHeader(headers, name) {
        const value = headers[name];
        return Array.isArray(value) ? value[0] : value;
    }
};
exports.NumberSequenceController = NumberSequenceController;
__decorate([
    (0, common_1.Get)('number-sequences'),
    (0, permission_decorator_1.Permission)('foundation.number_sequences.view'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], NumberSequenceController.prototype, "listSequences", null);
__decorate([
    (0, common_1.Post)('number-sequences'),
    (0, permission_decorator_1.Permission)('foundation.number_sequences.create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateNumberSequenceDto, Object, Object]),
    __metadata("design:returntype", void 0)
], NumberSequenceController.prototype, "createSequence", null);
__decorate([
    (0, common_1.Put)('number-sequences/:id'),
    (0, permission_decorator_1.Permission)('foundation.number_sequences.update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateNumberSequenceDto, Object, Object]),
    __metadata("design:returntype", void 0)
], NumberSequenceController.prototype, "updateSequence", null);
__decorate([
    (0, common_1.Post)('number-sequences/:code/next'),
    (0, permission_decorator_1.Permission)('foundation.number_sequences.next'),
    __param(0, (0, common_1.Param)('code')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.GetNextNumberDto, Object, Object]),
    __metadata("design:returntype", void 0)
], NumberSequenceController.prototype, "getNextNumber", null);
exports.NumberSequenceController = NumberSequenceController = __decorate([
    (0, common_1.Controller)('foundation'),
    __metadata("design:paramtypes", [number_sequence_service_1.NumberSequenceService,
        idempotency_service_1.IdempotencyService])
], NumberSequenceController);
//# sourceMappingURL=number-sequence.controller.js.map