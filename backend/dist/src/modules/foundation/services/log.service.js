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
exports.LogService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const log_repository_1 = require("../repositories/log.repository");
let LogService = class LogService {
    constructor(logRepository) {
        this.logRepository = logRepository;
    }
    listAuditLogs(filters) {
        return this.logRepository.listAuditLogs(filters);
    }
    listExceptionLogs(filters) {
        return this.logRepository.listExceptionLogs(filters);
    }
    resolveException(id, resolvedBy) {
        return this.logRepository.resolveException(id, resolvedBy);
    }
    createAuditLog(data) {
        return this.logRepository.createAuditLog({
            entityType: data.entityType,
            entityId: data.entityId,
            action: data.action,
            oldValue: data.oldValue ? JSON.stringify(data.oldValue) : undefined,
            newValue: data.newValue ? JSON.stringify(data.newValue) : undefined,
            userId: data.userId,
            userRole: data.userRole,
            ipAddress: data.ipAddress,
            deviceType: data.deviceType,
            reasonCode: data.reasonCode,
            notes: data.notes,
            correlationId: data.correlationId,
            requestId: data.requestId,
            sourceModule: data.sourceModule,
            warehouseCode: data.warehouseCode,
            ownerId: data.ownerId,
            metadata: data.metadata,
        });
    }
    createExceptionLog(data) {
        return this.logRepository.createExceptionLog({
            exceptionNo: data.exceptionNo,
            exceptionType: data.exceptionType,
            severity: data.severity ?? client_1.ExceptionSeverity.MEDIUM,
            sourceModule: data.sourceModule,
            entityType: data.entityType,
            entityId: data.entityId,
            action: data.action,
            reasonCode: data.reasonCode,
            message: data.message,
            details: data.details,
            correlationId: data.correlationId,
            externalId: data.externalId,
            userId: data.userId,
            userRole: data.userRole,
        });
    }
};
exports.LogService = LogService;
exports.LogService = LogService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [log_repository_1.LogRepository])
], LogService);
//# sourceMappingURL=log.service.js.map