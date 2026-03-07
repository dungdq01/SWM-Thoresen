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
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class GovernanceService {
  constructor(
    private readonly governanceRepository: GovernanceRepository,
    private readonly logService: LogService,
    private readonly prisma: PrismaService,
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

    // HI-3 Fix: Wrap create + audit log in transaction
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.businessRuleCatalog.create({
        data: {
          ruleCode: data.ruleCode,
          domain: data.domain,
          title: data.title,
          description: data.description,
          currentStatus: data.currentStatus as BusinessRuleStatus,
          sourceOfTruth: data.sourceOfTruth,
          brdReference: data.brdReference,
          supersedes: data.supersedes,
          effectivePhase: data.effectivePhase as EffectivePhase,
          ownerRole: data.ownerRole,
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: 'BUSINESS_RULE',
          entityId: created.id,
          action: 'CREATE_BUSINESS_RULE',
          newValue: JSON.stringify(created),
          userId: data.actorUserId,
          userRole: data.actorRole,
          requestId: data.requestId,
          sourceModule: 'FOUNDATION',
        },
      });

      return created;
    });
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

    // HI-3 Fix: Wrap update + audit log in transaction
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.businessRuleCatalog.update({
        where: { id },
        data: {
          ...(data.title !== undefined ? { title: data.title } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.currentStatus !== undefined ? { currentStatus: data.currentStatus as BusinessRuleStatus } : {}),
          ...(data.sourceOfTruth !== undefined ? { sourceOfTruth: data.sourceOfTruth } : {}),
          ...(data.brdReference !== undefined ? { brdReference: data.brdReference } : {}),
          ...(data.supersedes !== undefined ? { supersedes: data.supersedes } : {}),
          ...(data.effectivePhase !== undefined ? { effectivePhase: data.effectivePhase as EffectivePhase } : {}),
          ...(data.ownerRole !== undefined ? { ownerRole: data.ownerRole } : {}),
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: 'BUSINESS_RULE',
          entityId: id,
          action: 'UPDATE_BUSINESS_RULE',
          oldValue: JSON.stringify(existing),
          newValue: JSON.stringify(updated),
          userId: data.actorUserId,
          userRole: data.actorRole,
          requestId: data.requestId,
          sourceModule: 'FOUNDATION',
        },
      });

      return updated;
    });
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

    // HI-3 Fix: Wrap create + audit log in transaction
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.decisionLog.create({
        data: {
          decisionNo: data.decisionNo,
          title: data.title,
          decisionType: data.decisionType,
          contextDomain: data.contextDomain,
          summary: data.summary,
          decidedValue: data.decidedValue,
          rationale: data.rationale,
          status: data.status as DecisionLogStatus,
          sourceRefs: data.sourceRefs,
          impactedModules: data.impactedModules,
          decidedBy: data.actorUserId,
          decidedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: 'DECISION_LOG',
          entityId: created.id,
          action: 'CREATE_DECISION_LOG',
          newValue: JSON.stringify(created),
          userId: data.actorUserId,
          userRole: data.actorRole,
          requestId: data.requestId,
          sourceModule: 'FOUNDATION',
        },
      });

      return created;
    });
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

    // HI-3 Fix: Wrap create + audit log in transaction
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.changeControlRecord.create({
        data: {
          changeNo: data.changeNo,
          changeType: data.changeType,
          title: data.title,
          description: data.description,
          requestedBy: data.actorUserId,
          priority: data.priority as ChangePriority,
          impactSummary: data.impactSummary,
          impactedModules: data.impactedModules,
          status: data.status as ChangeControlStatus,
          targetRelease: data.targetRelease,
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: 'CHANGE_CONTROL',
          entityId: created.id,
          action: 'CREATE_CHANGE_CONTROL',
          newValue: JSON.stringify(created),
          userId: data.actorUserId,
          userRole: data.actorRole,
          requestId: data.requestId,
          sourceModule: 'FOUNDATION',
        },
      });

      return created;
    });
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
