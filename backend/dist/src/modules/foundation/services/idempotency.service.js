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
exports.IdempotencyService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const log_repository_1 = require("../repositories/log.repository");
let IdempotencyService = class IdempotencyService {
    constructor(logRepository) {
        this.logRepository = logRepository;
    }
    async executeIfKeyProvided(params) {
        const trimmedKey = params.idempotencyKey?.trim();
        if (!trimmedKey) {
            return params.execute();
        }
        const requestHash = this.hashPayload(params.payload);
        const existing = await this.logRepository.getIdempotencyByKey(trimmedKey);
        if (existing) {
            if (existing.requestHash && existing.requestHash !== requestHash) {
                await this.logRepository.createExceptionLog({
                    exceptionNo: `EX-${Date.now()}`,
                    exceptionType: 'IDEMPOTENCY_CONFLICT',
                    severity: 'HIGH',
                    sourceModule: params.sourceModule,
                    action: params.commandName,
                    message: 'same key + different payload',
                    correlationId: params.correlationId,
                });
                throw new common_1.ConflictException('Idempotency-Key đã được dùng với payload khác. Vui lòng tạo key mới.');
            }
            if (existing.status === client_1.IdempotencyStatus.PROCESSING) {
                throw new common_1.ConflictException('Yêu cầu với Idempotency-Key này đang được xử lý. Vui lòng thử lại sau.');
            }
            if (existing.status === client_1.IdempotencyStatus.SUCCEEDED) {
                return existing.responseBody;
            }
        }
        await this.logRepository.createIdempotencyRecord({
            idempotencyKey: trimmedKey,
            commandName: params.commandName,
            sourceModule: params.sourceModule,
            requestHash,
            requestPayload: params.payload,
            correlationId: params.correlationId,
            lockedUntil: new Date(Date.now() + 60_000),
            expiredAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        try {
            const result = await params.execute();
            const mapped = params.mapSuccess(result);
            await this.logRepository.updateIdempotencyRecord(trimmedKey, {
                responseCode: mapped.responseCode ?? 200,
                responseBody: (mapped.responseBody ?? result),
                resourceType: mapped.resourceType,
                resourceId: mapped.resourceId,
                status: client_1.IdempotencyStatus.SUCCEEDED,
                lockedUntil: null,
            });
            return result;
        }
        catch (error) {
            await this.logRepository.updateIdempotencyRecord(trimmedKey, {
                status: client_1.IdempotencyStatus.FAILED,
                lockedUntil: null,
            });
            if (error instanceof Error) {
                throw error;
            }
            throw new common_1.InternalServerErrorException('Không thể xử lý yêu cầu idempotent.');
        }
    }
    getByKey(idempotencyKey) {
        return this.logRepository.getIdempotencyByKey(idempotencyKey);
    }
    hashPayload(payload) {
        const serialized = JSON.stringify(payload ?? {});
        return (0, crypto_1.createHash)('sha256').update(serialized).digest('hex');
    }
};
exports.IdempotencyService = IdempotencyService;
exports.IdempotencyService = IdempotencyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [log_repository_1.LogRepository])
], IdempotencyService);
//# sourceMappingURL=idempotency.service.js.map