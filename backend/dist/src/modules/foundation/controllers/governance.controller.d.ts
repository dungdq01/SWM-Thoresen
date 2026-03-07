import { RequestUser } from '../../../common/interfaces/request-user.interface';
import { CreateBusinessRuleDto, CreateChangeControlDto, CreateDecisionLogDto, ListDecisionLogsQueryDto, ListRulesQueryDto, UpdateBusinessRuleDto } from '../dto';
import { GovernanceService } from '../services/governance.service';
import { IdempotencyService } from '../services/idempotency.service';
export declare class GovernanceController {
    private readonly governanceService;
    private readonly idempotencyService;
    constructor(governanceService: GovernanceService, idempotencyService: IdempotencyService);
    listRules(query: ListRulesQueryDto): import(".prisma/client").Prisma.PrismaPromise<{
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
    createRule(body: CreateBusinessRuleDto, user: RequestUser, request: {
        headers: Record<string, string | string[] | undefined>;
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
    updateRule(id: string, body: UpdateBusinessRuleDto, user: RequestUser, request: {
        headers: Record<string, string | string[] | undefined>;
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
    listDecisionLogs(query: ListDecisionLogsQueryDto): import(".prisma/client").Prisma.PrismaPromise<{
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
    createDecisionLog(body: CreateDecisionLogDto, user: RequestUser, request: {
        headers: Record<string, string | string[] | undefined>;
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
    createChangeControl(body: CreateChangeControlDto, user: RequestUser, request: {
        headers: Record<string, string | string[] | undefined>;
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
    private getHeader;
}
