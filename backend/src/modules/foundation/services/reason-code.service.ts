import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LogService } from './log.service';
import { ReasonCodeRepository } from '../repositories/reason-code.repository';

@Injectable()
export class ReasonCodeService {
  constructor(
    private readonly reasonCodeRepository: ReasonCodeRepository,
    private readonly logService: LogService,
  ) {}

  list(filters: { domainCode?: string; category?: string; isActive?: boolean }) {
    return this.reasonCodeRepository.list(filters);
  }

  async create(data: {
    code: string;
    description: string;
    category: string;
    domainCode: string;
    requiresApproval?: boolean;
    affectsBilling?: boolean;
    requiresNote?: boolean;
    sortOrder?: number;
    actorUserId: string;
    actorRole?: string;
    requestId?: string;
  }) {
    const existing = await this.reasonCodeRepository.findByCode(data.code);
    if (existing) {
      throw new ConflictException(`Reason code ${data.code} đã tồn tại.`);
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

  async update(
    id: string,
    data: {
      description?: string;
      category?: string;
      domainCode?: string;
      requiresApproval?: boolean;
      affectsBilling?: boolean;
      requiresNote?: boolean;
      sortOrder?: number;
      isActive?: boolean;
      actorUserId: string;
      actorRole?: string;
      requestId?: string;
    },
  ) {
    const existing = await this.reasonCodeRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Không tìm thấy reason code với id ${id}.`);
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

  async deactivate(
    id: string,
    actor: { actorUserId: string; actorRole?: string; requestId?: string },
  ) {
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
  async assertValid(
    code: string,
    options?: { action?: string; domainCode?: string; requireNote?: boolean; note?: string },
  ): Promise<{ id: string; code: string; requiresApproval: boolean; affectsBilling: boolean; requiresNote: boolean }> {
    const reasonCode = await this.reasonCodeRepository.findByCode(code);

    if (!reasonCode) {
      throw new NotFoundException(`Reason code '${code}' không tồn tại.`);
    }

    if (!reasonCode.isActive) {
      throw new ConflictException(`Reason code '${code}' đã bị vô hiệu hóa, không thể sử dụng.`);
    }

    if (options?.domainCode && reasonCode.domainCode !== options.domainCode && reasonCode.domainCode !== 'FOUNDATION') {
      throw new ConflictException(
        `Reason code '${code}' thuộc domain '${reasonCode.domainCode}', không dùng được cho domain '${options.domainCode}'.`,
      );
    }

    if (reasonCode.requiresNote && options?.requireNote !== false && !options?.note) {
      throw new ConflictException(`Reason code '${code}' yêu cầu phải có ghi chú bổ sung.`);
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
  async getByCode(code: string) {
    return this.reasonCodeRepository.findByCode(code);
  }
}
