export declare class ListRulesQueryDto {
    domain?: string;
    status?: string;
}
export declare class CreateBusinessRuleDto {
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
}
export declare class UpdateBusinessRuleDto {
    title?: string;
    description?: string;
    currentStatus?: 'CONFIRMED' | 'TO_CONFIRM' | 'PHASE_2';
    sourceOfTruth?: string;
    brdReference?: string;
    supersedes?: string;
    effectivePhase?: 'GO_LIVE' | 'PHASE_2';
    ownerRole?: string;
}
export declare class ListDecisionLogsQueryDto {
    contextDomain?: string;
    status?: string;
}
export declare class CreateDecisionLogDto {
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
}
export declare class CreateChangeControlDto {
    changeNo: string;
    changeType: string;
    title: string;
    description: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    impactSummary?: string;
    impactedModules?: string[];
    status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'IMPLEMENTED';
    targetRelease?: string;
}
