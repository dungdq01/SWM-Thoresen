export declare class ListReasonCodesQueryDto {
    domainCode?: string;
    category?: string;
    isActive?: boolean;
}
export declare class CreateReasonCodeDto {
    code: string;
    description: string;
    category: string;
    domainCode: string;
    requiresApproval?: boolean;
    affectsBilling?: boolean;
    requiresNote?: boolean;
    sortOrder?: number;
}
export declare class UpdateReasonCodeDto {
    description?: string;
    category?: string;
    domainCode?: string;
    requiresApproval?: boolean;
    affectsBilling?: boolean;
    requiresNote?: boolean;
    sortOrder?: number;
    isActive?: boolean;
}
