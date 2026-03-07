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
exports.NumberSequenceService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const log_service_1 = require("./log.service");
const number_sequence_repository_1 = require("../repositories/number-sequence.repository");
let NumberSequenceService = class NumberSequenceService {
    constructor(numberSequenceRepository, logService) {
        this.numberSequenceRepository = numberSequenceRepository;
        this.logService = logService;
    }
    list() {
        return this.numberSequenceRepository.list();
    }
    async create(data) {
        const existing = await this.numberSequenceRepository.findByCode(data.sequenceCode);
        if (existing) {
            throw new common_1.ConflictException(`Sequence code ${data.sequenceCode} đã tồn tại.`);
        }
        const created = await this.numberSequenceRepository.create({
            ...data,
            scopeType: data.scopeType,
            resetPolicy: data.resetPolicy,
        });
        await this.logService.createAuditLog({
            entityType: 'NUMBER_SEQUENCE',
            entityId: created.id,
            action: 'CREATE_NUMBER_SEQUENCE',
            newValue: created,
            userId: data.actorUserId,
            userRole: data.actorRole,
            requestId: data.requestId,
            sourceModule: 'FOUNDATION',
        });
        return created;
    }
    async update(id, data) {
        const existing = await this.numberSequenceRepository.findById(id);
        if (!existing) {
            throw new common_1.NotFoundException(`Không tìm thấy number sequence với id ${id}.`);
        }
        const updated = await this.numberSequenceRepository.update(id, {
            ...data,
            scopeType: data.scopeType,
            resetPolicy: data.resetPolicy,
        });
        await this.logService.createAuditLog({
            entityType: 'NUMBER_SEQUENCE',
            entityId: id,
            action: 'UPDATE_NUMBER_SEQUENCE',
            oldValue: existing,
            newValue: updated,
            userId: data.actorUserId,
            userRole: data.actorRole,
            requestId: data.requestId,
            sourceModule: 'FOUNDATION',
        });
        return updated;
    }
    async getNextNumber(sequenceCode, scopeKey, actor) {
        const sequence = await this.numberSequenceRepository.findByCode(sequenceCode);
        if (!sequence || !sequence.isActive) {
            throw new common_1.NotFoundException(`Không tìm thấy sequence active ${sequenceCode}.`);
        }
        const normalizedScopeKey = this.resolveScopeKey(sequence.scopeType, scopeKey);
        const counterDate = this.resolveCounterDate(sequence.resetPolicy);
        const runningNumber = await this.numberSequenceRepository.getNextRunningNumber(sequence, normalizedScopeKey, counterDate);
        const formatted = this.formatNumber({
            prefixTemplate: sequence.prefixTemplate,
            formatTemplate: sequence.formatTemplate,
            sequenceCode: sequence.sequenceCode,
            runningNoLength: sequence.runningNoLength,
            runningNumber,
            counterDate,
            scopeKey: normalizedScopeKey,
        });
        await this.logService.createAuditLog({
            entityType: 'NUMBER_SEQUENCE',
            entityId: sequence.id,
            action: 'GET_NEXT_NUMBER',
            newValue: {
                sequenceCode,
                scopeKey: normalizedScopeKey,
                value: formatted,
            },
            userId: actor.actorUserId,
            userRole: actor.actorRole,
            requestId: actor.requestId,
            sourceModule: 'FOUNDATION',
            warehouseCode: sequence.scopeType === client_1.SequenceScopeType.PER_WAREHOUSE
                ? normalizedScopeKey
                : undefined,
        });
        return {
            sequenceCode,
            scopeKey: normalizedScopeKey,
            value: formatted,
            runningNumber,
            counterDate: counterDate.toISOString().slice(0, 10),
        };
    }
    resolveScopeKey(scopeType, scopeKey) {
        if (scopeType === client_1.SequenceScopeType.GLOBAL) {
            return 'GLOBAL';
        }
        if (!scopeKey) {
            throw new common_1.BadRequestException('scopeKey là bắt buộc cho sequence không phải GLOBAL.');
        }
        return scopeKey;
    }
    resolveCounterDate(resetPolicy) {
        const now = new Date();
        const current = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        if (resetPolicy === client_1.SequenceResetPolicy.NONE) {
            return new Date(Date.UTC(2000, 0, 1));
        }
        if (resetPolicy === client_1.SequenceResetPolicy.MONTHLY) {
            return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        }
        if (resetPolicy === client_1.SequenceResetPolicy.YEARLY) {
            return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
        }
        return current;
    }
    formatNumber(params) {
        const yyyy = params.counterDate.getUTCFullYear().toString();
        const mm = String(params.counterDate.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(params.counterDate.getUTCDate()).padStart(2, '0');
        const yyyymmdd = `${yyyy}${mm}${dd}`;
        const prefix = params.prefixTemplate.replaceAll('{SEQ}', params.sequenceCode);
        const runningNo = String(params.runningNumber).padStart(params.runningNoLength, '0');
        return params.formatTemplate
            .replaceAll('{prefix}', prefix)
            .replaceAll('{SEQ}', params.sequenceCode)
            .replaceAll('{yyyy}', yyyy)
            .replaceAll('{mm}', mm)
            .replaceAll('{dd}', dd)
            .replaceAll('{yyyymmdd}', yyyymmdd)
            .replaceAll('{scope_key}', params.scopeKey)
            .replaceAll('{running_no}', runningNo);
    }
};
exports.NumberSequenceService = NumberSequenceService;
exports.NumberSequenceService = NumberSequenceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [number_sequence_repository_1.NumberSequenceRepository,
        log_service_1.LogService])
], NumberSequenceService);
//# sourceMappingURL=number-sequence.service.js.map