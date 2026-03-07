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
exports.LogRepository = void 0;
const client_1 = require("@prisma/client");
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../infrastructure/prisma/prisma.service");
let LogRepository = class LogRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    listAuditLogs(filters) {
        const where = {
            ...(filters.entityType ? { entityType: filters.entityType } : {}),
            ...(filters.entityId ? { entityId: filters.entityId } : {}),
            ...(filters.correlationId ? { correlationId: filters.correlationId } : {}),
            ...(filters.userId ? { userId: filters.userId } : {}),
        };
        return this.prisma.auditLog.findMany({
            where,
            orderBy: { occurredAt: 'desc' },
        });
    }
    createAuditLog(data) {
        return this.prisma.auditLog.create({ data });
    }
    listExceptionLogs(filters) {
        const where = {
            ...(filters.sourceModule ? { sourceModule: filters.sourceModule } : {}),
            ...(filters.isResolved !== undefined ? { isResolved: filters.isResolved } : {}),
        };
        return this.prisma.exceptionLog.findMany({
            where,
            orderBy: { occurredAt: 'desc' },
        });
    }
    createExceptionLog(data) {
        return this.prisma.exceptionLog.create({
            data,
        });
    }
    resolveException(id, resolvedBy) {
        return this.prisma.exceptionLog.update({
            where: { id },
            data: {
                isResolved: true,
                resolvedAt: new Date(),
                resolvedBy,
            },
        });
    }
    getIdempotencyByKey(idempotencyKey) {
        return this.prisma.idempotencyRecord.findUnique({
            where: { idempotencyKey },
        });
    }
    createIdempotencyRecord(data) {
        return this.prisma.idempotencyRecord.create({
            data: {
                ...data,
                status: client_1.IdempotencyStatus.PROCESSING,
            },
        });
    }
    updateIdempotencyRecord(idempotencyKey, data) {
        return this.prisma.idempotencyRecord.update({
            where: { idempotencyKey },
            data,
        });
    }
};
exports.LogRepository = LogRepository;
exports.LogRepository = LogRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LogRepository);
//# sourceMappingURL=log.repository.js.map