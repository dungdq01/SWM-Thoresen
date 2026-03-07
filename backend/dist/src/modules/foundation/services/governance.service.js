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
exports.GovernanceService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const governance_repository_1 = require("../repositories/governance.repository");
const log_service_1 = require("./log.service");
let GovernanceService = class GovernanceService {
    constructor(governanceRepository, logService) {
        this.governanceRepository = governanceRepository;
        this.logService = logService;
    }
    listRules(filters) {
        return this.governanceRepository.listRules(filters);
    }
    async createRule(data) {
        const existing = await this.governanceRepository.findRuleByCode(data.ruleCode);
        if (existing) {
            throw new common_1.ConflictException(`Rule code ${data.ruleCode} đã tồn tại.`);
        }
        const created = await this.governanceRepository.createRule({
            ...data,
            currentStatus: data.currentStatus,
            effectivePhase: data.effectivePhase,
        });
        await this.logService.createAuditLog({
            entityType: 'BUSINESS_RULE',
            entityId: created.id,
            action: 'CREATE_BUSINESS_RULE',
            newValue: created,
            userId: data.actorUserId,
            userRole: data.actorRole,
            requestId: data.requestId,
            sourceModule: 'FOUNDATION',
        });
        return created;
    }
    async updateRule(id, data) {
        const existing = await this.governanceRepository.findRuleById(id);
        if (!existing) {
            throw new common_1.NotFoundException(`Không tìm thấy business rule với id ${id}.`);
        }
        const updated = await this.governanceRepository.updateRule(id, {
            ...data,
            currentStatus: data.currentStatus,
            effectivePhase: data.effectivePhase,
        });
        await this.logService.createAuditLog({
            entityType: 'BUSINESS_RULE',
            entityId: id,
            action: 'UPDATE_BUSINESS_RULE',
            oldValue: existing,
            newValue: updated,
            userId: data.actorUserId,
            userRole: data.actorRole,
            requestId: data.requestId,
            sourceModule: 'FOUNDATION',
        });
        return updated;
    }
    listDecisionLogs(filters) {
        return this.governanceRepository.listDecisionLogs(filters);
    }
    async createDecisionLog(data) {
        const existing = await this.governanceRepository.findDecisionLogByNo(data.decisionNo);
        if (existing) {
            throw new common_1.ConflictException(`Decision no ${data.decisionNo} đã tồn tại.`);
        }
        const created = await this.governanceRepository.createDecisionLog({
            ...data,
            status: data.status,
            decidedBy: data.actorUserId,
        });
        await this.logService.createAuditLog({
            entityType: 'DECISION_LOG',
            entityId: created.id,
            action: 'CREATE_DECISION_LOG',
            newValue: created,
            userId: data.actorUserId,
            userRole: data.actorRole,
            requestId: data.requestId,
            sourceModule: 'FOUNDATION',
        });
        return created;
    }
    async createChangeControl(data) {
        const existing = await this.governanceRepository.findChangeControlByNo(data.changeNo);
        if (existing) {
            throw new common_1.ConflictException(`Change no ${data.changeNo} đã tồn tại.`);
        }
        const created = await this.governanceRepository.createChangeControl({
            ...data,
            requestedBy: data.actorUserId,
            priority: data.priority,
            status: data.status,
        });
        await this.logService.createAuditLog({
            entityType: 'CHANGE_CONTROL',
            entityId: created.id,
            action: 'CREATE_CHANGE_CONTROL',
            newValue: created,
            userId: data.actorUserId,
            userRole: data.actorRole,
            requestId: data.requestId,
            sourceModule: 'FOUNDATION',
        });
        return created;
    }
    /**
     * Get business rule by code.
     * Used by other modules to check rule baseline before implementing business logic.
     */
    async getRuleByCode(ruleCode) {
        return this.governanceRepository.findRuleByCode(ruleCode);
    }
    /**
     * Check if a rule is confirmed for go-live.
     * Returns true if rule exists with status CONFIRMED and effectivePhase GO_LIVE.
     */
    async isRuleConfirmedForGoLive(ruleCode) {
        const rule = await this.governanceRepository.findRuleByCode(ruleCode);
        if (!rule)
            return false;
        return rule.currentStatus === client_1.BusinessRuleStatus.CONFIRMED && rule.effectivePhase === client_1.EffectivePhase.GO_LIVE;
    }
};
exports.GovernanceService = GovernanceService;
exports.GovernanceService = GovernanceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [governance_repository_1.GovernanceRepository,
        log_service_1.LogService])
], GovernanceService);
//# sourceMappingURL=governance.service.js.map