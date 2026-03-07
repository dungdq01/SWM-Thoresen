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
exports.NumberSequenceRepository = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../../../infrastructure/prisma/prisma.service");
let NumberSequenceRepository = class NumberSequenceRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    list() {
        return this.prisma.numberSequence.findMany({
            orderBy: { sequenceCode: 'asc' },
        });
    }
    findById(id) {
        return this.prisma.numberSequence.findUnique({ where: { id } });
    }
    findByCode(sequenceCode) {
        return this.prisma.numberSequence.findUnique({ where: { sequenceCode } });
    }
    create(data) {
        return this.prisma.numberSequence.create({
            data: {
                sequenceCode: data.sequenceCode,
                description: data.description,
                scopeType: data.scopeType,
                resetPolicy: data.resetPolicy,
                prefixTemplate: data.prefixTemplate,
                formatTemplate: data.formatTemplate,
                runningNoLength: data.runningNoLength ?? 6,
                allowGap: data.allowGap ?? true,
                createdBy: data.actorUserId,
                updatedBy: data.actorUserId,
            },
        });
    }
    update(id, data) {
        return this.prisma.numberSequence.update({
            where: { id },
            data: {
                ...(data.description !== undefined ? { description: data.description } : {}),
                ...(data.scopeType !== undefined ? { scopeType: data.scopeType } : {}),
                ...(data.resetPolicy !== undefined ? { resetPolicy: data.resetPolicy } : {}),
                ...(data.prefixTemplate !== undefined
                    ? { prefixTemplate: data.prefixTemplate }
                    : {}),
                ...(data.formatTemplate !== undefined
                    ? { formatTemplate: data.formatTemplate }
                    : {}),
                ...(data.runningNoLength !== undefined
                    ? { runningNoLength: data.runningNoLength }
                    : {}),
                ...(data.allowGap !== undefined ? { allowGap: data.allowGap } : {}),
                ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
                updatedBy: data.actorUserId,
            },
        });
    }
    async getNextRunningNumber(sequence, scopeKey, counterDate) {
        const counterDateLiteral = counterDate.toISOString().slice(0, 10);
        await this.prisma.numberSequenceCounter.upsert({
            where: {
                sequenceId_scopeKey_counterDate: {
                    sequenceId: sequence.id,
                    scopeKey,
                    counterDate,
                },
            },
            update: {},
            create: {
                id: (0, crypto_1.randomUUID)(),
                sequenceId: sequence.id,
                scopeKey,
                counterDate,
            },
        });
        const rows = await this.prisma.$queryRawUnsafe(`UPDATE "number_sequence_counter"
       SET "last_number" = "last_number" + 1,
           "version_no" = "version_no" + 1,
           "updated_at" = NOW()
       WHERE "sequence_id" = $1 AND "scope_key" = $2 AND "counter_date" = $3::date
       RETURNING "last_number"`, sequence.id, scopeKey, counterDateLiteral);
        return Number(rows[0].last_number);
    }
};
exports.NumberSequenceRepository = NumberSequenceRepository;
exports.NumberSequenceRepository = NumberSequenceRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NumberSequenceRepository);
//# sourceMappingURL=number-sequence.repository.js.map