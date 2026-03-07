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
exports.ReasonCodeService = void 0;
const common_1 = require("@nestjs/common");
const log_service_1 = require("./log.service");
const reason_code_repository_1 = require("../repositories/reason-code.repository");
let ReasonCodeService = class ReasonCodeService {
    constructor(reasonCodeRepository, logService) {
        this.reasonCodeRepository = reasonCodeRepository;
        this.logService = logService;
    }
    list(filters) {
        return this.reasonCodeRepository.list(filters);
    }
    async create(data) {
        const existing = await this.reasonCodeRepository.findByCode(data.code);
        if (existing) {
            throw new common_1.ConflictException(`Reason code ${data.code} đã tồn tại.`);
        }
        const created = await this.reasonCodeRepository.create(data);
        await this.logService.createAuditLog({
            entityType: 'REASON_CODE',
            entityId: created.id,
            action: 'CREATE_REASON_CODE',
            newValue: created,
            userId: data.actorUserId,
            userRole: data.actorRole,
            requestId: data.requestId,
            sourceModule: 'FOUNDATION',
        });
        return created;
    }
    async update(id, data) {
        const existing = await this.reasonCodeRepository.findById(id);
        if (!existing) {
            throw new common_1.NotFoundException(`Không tìm thấy reason code với id ${id}.`);
        }
        const updated = await this.reasonCodeRepository.update(id, data);
        await this.logService.createAuditLog({
            entityType: 'REASON_CODE',
            entityId: id,
            action: 'UPDATE_REASON_CODE',
            oldValue: existing,
            newValue: updated,
            userId: data.actorUserId,
            userRole: data.actorRole,
            requestId: data.requestId,
            sourceModule: 'FOUNDATION',
        });
        return updated;
    }
    async deactivate(id, actor) {
        return this.update(id, {
            isActive: false,
            actorUserId: actor.actorUserId,
            actorRole: actor.actorRole,
            requestId: actor.requestId,
        });
    }
    /**
     * Validate reason code is active and compatible with action/domain.
     * Used by other modules (Inbound, Outbound, Inventory) to validate reason codes.
     * @throws NotFoundException if reason code not found
     * @throws ConflictException if reason code is inactive or incompatible
     */
    async assertValid(code, options) {
        const reasonCode = await this.reasonCodeRepository.findByCode(code);
        if (!reasonCode) {
            throw new common_1.NotFoundException(`Reason code '${code}' không tồn tại.`);
        }
        if (!reasonCode.isActive) {
            throw new common_1.ConflictException(`Reason code '${code}' đã bị vô hiệu hóa, không thể sử dụng.`);
        }
        if (options?.domainCode && reasonCode.domainCode !== options.domainCode && reasonCode.domainCode !== 'FOUNDATION') {
            throw new common_1.ConflictException(`Reason code '${code}' thuộc domain '${reasonCode.domainCode}', không dùng được cho domain '${options.domainCode}'.`);
        }
        if (reasonCode.requiresNote && options?.requireNote !== false && !options?.note) {
            throw new common_1.ConflictException(`Reason code '${code}' yêu cầu phải có ghi chú bổ sung.`);
        }
        return {
            id: reasonCode.id,
            code: reasonCode.code,
            requiresApproval: reasonCode.requiresApproval,
            affectsBilling: reasonCode.affectsBilling,
            requiresNote: reasonCode.requiresNote,
        };
    }
    /**
     * Get reason code by code (for internal use by other modules).
     */
    async getByCode(code) {
        return this.reasonCodeRepository.findByCode(code);
    }
};
exports.ReasonCodeService = ReasonCodeService;
exports.ReasonCodeService = ReasonCodeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [reason_code_repository_1.ReasonCodeRepository,
        log_service_1.LogService])
], ReasonCodeService);
//# sourceMappingURL=reason-code.service.js.map