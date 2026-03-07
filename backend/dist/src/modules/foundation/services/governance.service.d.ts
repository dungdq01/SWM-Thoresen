import { GovernanceRepository } from '../repositories/governance.repository';
import { LogService } from './log.service';
export declare class GovernanceService {
    private readonly governanceRepository;
    private readonly logService;
    constructor(governanceRepository: GovernanceRepository, logService: LogService);
    listRules(filters: {
        domain?: string;
        status?: string;
    }): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        ruleCode: string;
        domain: string;
        title: string;
        description: string;
        currentStatus: import(".prisma/client").$Enums.BusinessRuleStatus;
        sourceOfTruth: string;
        brdReference: string | null;
        supersedes: string | null;
        effectivePhase: import(".prisma/client").$Enums.EffectivePhase;
        ownerRole: string | null;
        lastReviewedAt: Date | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    createRule(data: {
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
    }): Promise<{
        id: string;
        ruleCode: string;
        domain: string;
        title: string;
        description: string;
        currentStatus: import(".prisma/client").$Enums.BusinessRuleStatus;
        sourceOfTruth: string;
        brdReference: string | null;
        supersedes: string | null;
        effectivePhase: import(".prisma/client").$Enums.EffectivePhase;
        ownerRole: string | null;
        lastReviewedAt: Date | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateRule(id: string, data: {
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
    }): Promise<{
        id: string;
        ruleCode: string;
        domain: string;
        title: string;
        description: string;
        currentStatus: import(".prisma/client").$Enums.BusinessRuleStatus;
        sourceOfTruth: string;
        brdReference: string | null;
        supersedes: string | null;
        effectivePhase: import(".prisma/client").$Enums.EffectivePhase;
        ownerRole: string | null;
        lastReviewedAt: Date | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    listDecisionLogs(filters: {
        contextDomain?: string;
        status?: string;
    }): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        title: string;
        createdAt: Date;
        updatedAt: Date;
        decisionNo: string;
        decisionType: string;
        contextDomain: string;
        summary: string;
        decidedValue: string;
        rationale: string | null;
        status: import(".prisma/client").$Enums.DecisionLogStatus;
        sourceRefs: import("@prisma/client/runtime/library").JsonValue | null;
        impactedModules: import("@prisma/client/runtime/library").JsonValue | null;
        effectiveFrom: Date | null;
        decidedBy: string | null;
        decidedAt: Date | null;
    }[]>;
    createDecisionLog(data: {
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
    }): Promise<{
        id: string;
        title: string;
        createdAt: Date;
        updatedAt: Date;
        decisionNo: string;
        decisionType: string;
        contextDomain: string;
        summary: string;
        decidedValue: string;
        rationale: string | null;
        status: import(".prisma/client").$Enums.DecisionLogStatus;
        sourceRefs: import("@prisma/client/runtime/library").JsonValue | null;
        impactedModules: import("@prisma/client/runtime/library").JsonValue | null;
        effectiveFrom: Date | null;
        decidedBy: string | null;
        decidedAt: Date | null;
    }>;
    createChangeControl(data: {
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
    }): Promise<{
        id: string;
        title: string;
        description: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ChangeControlStatus;
        impactedModules: import("@prisma/client/runtime/library").JsonValue | null;
        changeNo: string;
        changeType: string;
        requestedBy: string | null;
        priority: import(".prisma/client").$Enums.ChangePriority;
        impactSummary: string | null;
        targetRelease: string | null;
        approvedBy: string | null;
        approvedAt: Date | null;
    }>;
    /**
     * Get business rule by code.
     * Used by other modules to check rule baseline before implementing business logic.
     */
    getRuleByCode(ruleCode: string): Promise<{
        id: string;
        ruleCode: string;
        domain: string;
        title: string;
        description: string;
        currentStatus: import(".prisma/client").$Enums.BusinessRuleStatus;
        sourceOfTruth: string;
        brdReference: string | null;
        supersedes: string | null;
        effectivePhase: import(".prisma/client").$Enums.EffectivePhase;
        ownerRole: string | null;
        lastReviewedAt: Date | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    /**
     * Check if a rule is confirmed for go-live.
     * Returns true if rule exists with status CONFIRMED and effectivePhase GO_LIVE.
     */
    isRuleConfirmedForGoLive(ruleCode: string): Promise<boolean>;
}
