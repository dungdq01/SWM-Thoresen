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
exports.ReasonCodeRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../infrastructure/prisma/prisma.service");
let ReasonCodeRepository = class ReasonCodeRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    list(filters) {
        const where = {
            ...(filters.domainCode ? { domainCode: filters.domainCode } : {}),
            ...(filters.category ? { category: filters.category } : {}),
            ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
        };
        return this.prisma.reasonCode.findMany({
            where,
            orderBy: [{ domainCode: 'asc' }, { category: 'asc' }, { code: 'asc' }],
        });
    }
    findById(id) {
        return this.prisma.reasonCode.findUnique({ where: { id } });
    }
    findByCode(code) {
        return this.prisma.reasonCode.findUnique({ where: { code } });
    }
    create(data) {
        return this.prisma.reasonCode.create({
            data: {
                code: data.code,
                description: data.description,
                category: data.category,
                domainCode: data.domainCode,
                requiresApproval: data.requiresApproval ?? false,
                affectsBilling: data.affectsBilling ?? false,
                requiresNote: data.requiresNote ?? false,
                sortOrder: data.sortOrder ?? 0,
                createdBy: data.actorUserId,
                updatedBy: data.actorUserId,
            },
        });
    }
    update(id, data) {
        return this.prisma.reasonCode.update({
            where: { id },
            data: {
                ...(data.description !== undefined ? { description: data.description } : {}),
                ...(data.category !== undefined ? { category: data.category } : {}),
                ...(data.domainCode !== undefined ? { domainCode: data.domainCode } : {}),
                ...(data.requiresApproval !== undefined
                    ? { requiresApproval: data.requiresApproval }
                    : {}),
                ...(data.affectsBilling !== undefined
                    ? { affectsBilling: data.affectsBilling }
                    : {}),
                ...(data.requiresNote !== undefined ? { requiresNote: data.requiresNote } : {}),
                ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
                ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
                updatedBy: data.actorUserId,
            },
        });
    }
};
exports.ReasonCodeRepository = ReasonCodeRepository;
exports.ReasonCodeRepository = ReasonCodeRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReasonCodeRepository);
//# sourceMappingURL=reason-code.repository.js.map