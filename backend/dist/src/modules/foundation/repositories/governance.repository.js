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
exports.GovernanceRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../infrastructure/prisma/prisma.service");
let GovernanceRepository = class GovernanceRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    listRules(filters) {
        const where = {
            ...(filters.domain ? { domain: filters.domain } : {}),
            ...(filters.status ? { currentStatus: filters.status } : {}),
        };
        return this.prisma.businessRuleCatalog.findMany({
            where,
            orderBy: [{ domain: 'asc' }, { ruleCode: 'asc' }],
        });
    }
    findRuleById(id) {
        return this.prisma.businessRuleCatalog.findUnique({ where: { id } });
    }
    findRuleByCode(ruleCode) {
        return this.prisma.businessRuleCatalog.findUnique({ where: { ruleCode } });
    }
    createRule(data) {
        return this.prisma.businessRuleCatalog.create({
            data,
        });
    }
    updateRule(id, data) {
        return this.prisma.businessRuleCatalog.update({
            where: { id },
            data,
        });
    }
    listDecisionLogs(filters) {
        const where = {
            ...(filters.contextDomain ? { contextDomain: filters.contextDomain } : {}),
            ...(filters.status ? { status: filters.status } : {}),
        };
        return this.prisma.decisionLog.findMany({
            where,
            orderBy: [{ contextDomain: 'asc' }, { createdAt: 'desc' }],
        });
    }
    findDecisionLogByNo(decisionNo) {
        return this.prisma.decisionLog.findUnique({ where: { decisionNo } });
    }
    createDecisionLog(data) {
        return this.prisma.decisionLog.create({
            data: {
                decisionNo: data.decisionNo,
                title: data.title,
                decisionType: data.decisionType,
                contextDomain: data.contextDomain,
                summary: data.summary,
                decidedValue: data.decidedValue,
                rationale: data.rationale,
                status: data.status,
                sourceRefs: data.sourceRefs,
                impactedModules: data.impactedModules,
                decidedBy: data.decidedBy,
                decidedAt: new Date(),
            },
        });
    }
    findChangeControlByNo(changeNo) {
        return this.prisma.changeControlRecord.findUnique({ where: { changeNo } });
    }
    createChangeControl(data) {
        return this.prisma.changeControlRecord.create({
            data,
        });
    }
};
exports.GovernanceRepository = GovernanceRepository;
exports.GovernanceRepository = GovernanceRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GovernanceRepository);
//# sourceMappingURL=governance.repository.js.map