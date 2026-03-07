import { RequestUser } from '../../../common/interfaces/request-user.interface';
import { CreateReasonCodeDto, ListReasonCodesQueryDto, UpdateReasonCodeDto } from '../dto';
import { IdempotencyService } from '../services/idempotency.service';
import { ReasonCodeService } from '../services/reason-code.service';
export declare class ReasonCodeController {
    private readonly reasonCodeService;
    private readonly idempotencyService;
    constructor(reasonCodeService: ReasonCodeService, idempotencyService: IdempotencyService);
    listReasonCodes(query: ListReasonCodesQueryDto): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        code: string;
        description: string;
        category: string;
        domainCode: string;
        requiresApproval: boolean;
        affectsBilling: boolean;
        requiresNote: boolean;
        sortOrder: number;
        isActive: boolean;
        effectiveFrom: Date | null;
        effectiveTo: Date | null;
        createdBy: string | null;
        updatedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    createReasonCode(body: CreateReasonCodeDto, user: RequestUser, request: {
        headers: Record<string, string | string[] | undefined>;
        requestId?: string;
    }): Promise<{
        id: string;
        code: string;
        description: string;
        category: string;
        domainCode: string;
        requiresApproval: boolean;
        affectsBilling: boolean;
        requiresNote: boolean;
        sortOrder: number;
        isActive: boolean;
        effectiveFrom: Date | null;
        effectiveTo: Date | null;
        createdBy: string | null;
        updatedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateReasonCode(id: string, body: UpdateReasonCodeDto, user: RequestUser, request: {
        headers: Record<string, string | string[] | undefined>;
        requestId?: string;
    }): Promise<{
        id: string;
        code: string;
        description: string;
        category: string;
        domainCode: string;
        requiresApproval: boolean;
        affectsBilling: boolean;
        requiresNote: boolean;
        sortOrder: number;
        isActive: boolean;
        effectiveFrom: Date | null;
        effectiveTo: Date | null;
        createdBy: string | null;
        updatedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deactivateReasonCode(id: string, user: RequestUser, request: {
        headers: Record<string, string | string[] | undefined>;
        requestId?: string;
    }): Promise<{
        id: string;
        code: string;
        description: string;
        category: string;
        domainCode: string;
        requiresApproval: boolean;
        affectsBilling: boolean;
        requiresNote: boolean;
        sortOrder: number;
        isActive: boolean;
        effectiveFrom: Date | null;
        effectiveTo: Date | null;
        createdBy: string | null;
        updatedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    private getHeader;
}
