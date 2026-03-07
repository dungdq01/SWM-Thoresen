import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BusinessRuleStatus,
  ChangeControlStatus,
  ChangePriority,
  DecisionLogStatus,
  EffectivePhase,
} from '@prisma/client';
import { GovernanceRepository } from '../repositories/governance.repository';
import { LogService } from './log.service';

@Injectable()
export class GovernanceService {
  constructor(
    private readonly governanceRepository: GovernanceRepository,
    private readonly logService: LogService,
  ) {}

  listRules(filters: { domain?: string; status?: string }) {
    return this.governanceRepository.listRules(filters);
  }

  async createRule(data: {
    ruleCode: string;
    domain: string;
    title: string;
    description: string;
    currentStatus: 'CONFIRMED' | 'TO_CONFIRM' | 'PHASE_2';
    sourceOfTruth: string;
    brdReference?: string;
    supersedes?: string;
    effectivePhase: 'GO_LIVE' | 'PHASE_2';
    ownerRole?: string;
    actorUserId: string;
    actorRole?: string;
    requestId?: string;
  }) {
    const existing = await this.governanceRepository.findRuleByCode(data.ruleCode);
    if (existing) {
      throw new ConflictException(`Rule code ${data.ruleCode} đã tồn tại.`);
    }

    const created = await this.governanceRepository.createRule({
      ...data,
      currentStatus: data.currentStatus as BusinessRuleStatus,
      effectivePhase: data.effectivePhase as EffectivePhase,
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

  async updateRule(
    id: string,
    data: {
      title?: string;
      description?: string;
      currentStatus?: 'CONFIRMED' | 'TO_CONFIRM' | 'PHASE_2';
      sourceOfTruth?: string;
      brdReference?: string;
      supersedes?: string;
      effectivePhase?: 'GO_LIVE' | 'PHASE_2';
      ownerRole?: string;
      actorUserId: string;
      actorRole?: string;
      requestId?: string;
    },
  ) {
    const existing = await this.governanceRepository.findRuleById(id);
    if (!existing) {
      throw new NotFoundException(`Không tìm thấy business rule với id ${id}.`);
    }

    const updated = await this.governanceRepository.updateRule(id, {
      ...data,
      currentStatus: data.currentStatus as BusinessRuleStatus | undefined,
      effectivePhase: data.effectivePhase as EffectivePhase | undefined,
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

  listDecisionLogs(filters: { contextDomain?: string; status?: string }) {
    return this.governanceRepository.listDecisionLogs(filters);
  }

  async createDecisionLog(data: {
    decisionNo: string;
    title: string;
    decisionType: string;
    contextDomain: string;
    summary: string;
    decidedValue: string;
    rationale?: string;
    status: 'DRAFT' | 'CONFIRMED' | 'SUPERSEDED';
    sourceRefs?: string[];
    impactedModules?: string[];
    actorUserId: string;
    actorRole?: string;
    requestId?: string;
  }) {
    const existing = await this.governanceRepository.findDecisionLogByNo(data.decisionNo);
    if (existing) {
      throw new ConflictException(`Decision no ${data.decisionNo} đã tồn tại.`);
    }

    const created = await this.governanceRepository.createDecisionLog({
      ...data,
      status: data.status as DecisionLogStatus,
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

  async createChangeControl(data: {
    changeNo: string;
    changeType: string;
    title: string;
    description: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    impactSummary?: string;
    impactedModules?: string[];
    status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'IMPLEMENTED';
    targetRelease?: string;
    actorUserId: string;
    actorRole?: string;
    requestId?: string;
  }) {
    const existing = await this.governanceRepository.findChangeControlByNo(data.changeNo);
    if (existing) {
      throw new ConflictException(`Change no ${data.changeNo} đã tồn tại.`);
    }

    const created = await this.governanceRepository.createChangeControl({
      ...data,
      requestedBy: data.actorUserId,
      priority: data.priority as ChangePriority,
      status: data.status as ChangeControlStatus,
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
  async getRuleByCode(ruleCode: string) {
    return this.governanceRepository.findRuleByCode(ruleCode);
  }

  /**
   * Check if a rule is confirmed for go-live.
   * Returns true if rule exists with status CONFIRMED and effectivePhase GO_LIVE.
   */
  async isRuleConfirmedForGoLive(ruleCode: string): Promise<boolean> {
    const rule = await this.governanceRepository.findRuleByCode(ruleCode);
    if (!rule) return false;
    return rule.currentStatus === BusinessRuleStatus.CONFIRMED && rule.effectivePhase === EffectivePhase.GO_LIVE;
  }
}
