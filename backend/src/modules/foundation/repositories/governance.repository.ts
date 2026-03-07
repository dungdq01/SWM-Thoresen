import {
  BusinessRuleStatus,
  ChangeControlStatus,
  ChangePriority,
  DecisionLogStatus,
  EffectivePhase,
  Prisma,
} from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class GovernanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  listRules(filters: { domain?: string; status?: string }) {
    const where: Prisma.BusinessRuleCatalogWhereInput = {
      ...(filters.domain ? { domain: filters.domain } : {}),
      ...(filters.status ? { currentStatus: filters.status as BusinessRuleStatus } : {}),
    };

    return this.prisma.businessRuleCatalog.findMany({
      where,
      orderBy: [{ domain: 'asc' }, { ruleCode: 'asc' }],
    });
  }

  findRuleById(id: string) {
    return this.prisma.businessRuleCatalog.findUnique({ where: { id } });
  }

  findRuleByCode(ruleCode: string) {
    return this.prisma.businessRuleCatalog.findUnique({ where: { ruleCode } });
  }

  createRule(data: {
    ruleCode: string;
    domain: string;
    title: string;
    description: string;
    currentStatus: BusinessRuleStatus;
    sourceOfTruth: string;
    brdReference?: string;
    supersedes?: string;
    effectivePhase: EffectivePhase;
    ownerRole?: string;
  }) {
    return this.prisma.businessRuleCatalog.create({
      data,
    });
  }

  updateRule(
    id: string,
    data: {
      title?: string;
      description?: string;
      currentStatus?: BusinessRuleStatus;
      sourceOfTruth?: string;
      brdReference?: string;
      supersedes?: string;
      effectivePhase?: EffectivePhase;
      ownerRole?: string;
    },
  ) {
    return this.prisma.businessRuleCatalog.update({
      where: { id },
      data,
    });
  }

  listDecisionLogs(filters: { contextDomain?: string; status?: string }) {
    const where: Prisma.DecisionLogWhereInput = {
      ...(filters.contextDomain ? { contextDomain: filters.contextDomain } : {}),
      ...(filters.status ? { status: filters.status as DecisionLogStatus } : {}),
    };

    return this.prisma.decisionLog.findMany({
      where,
      orderBy: [{ contextDomain: 'asc' }, { createdAt: 'desc' }],
    });
  }

  findDecisionLogByNo(decisionNo: string) {
    return this.prisma.decisionLog.findUnique({ where: { decisionNo } });
  }

  createDecisionLog(data: {
    decisionNo: string;
    title: string;
    decisionType: string;
    contextDomain: string;
    summary: string;
    decidedValue: string;
    rationale?: string;
    status: DecisionLogStatus;
    sourceRefs?: string[];
    impactedModules?: string[];
    decidedBy: string;
  }) {
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

  findChangeControlByNo(changeNo: string) {
    return this.prisma.changeControlRecord.findUnique({ where: { changeNo } });
  }

  createChangeControl(data: {
    changeNo: string;
    changeType: string;
    title: string;
    description: string;
    requestedBy: string;
    priority: ChangePriority;
    impactSummary?: string;
    impactedModules?: string[];
    status: ChangeControlStatus;
    targetRelease?: string;
  }) {
    return this.prisma.changeControlRecord.create({
      data,
    });
  }
}
