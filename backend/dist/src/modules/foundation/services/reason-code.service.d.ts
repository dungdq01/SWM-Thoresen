import { LogService } from './log.service';
import { ReasonCodeRepository } from '../repositories/reason-code.repository';
export declare class ReasonCodeService {
    private readonly reasonCodeRepository;
    private readonly logService;
    constructor(reasonCodeRepository: ReasonCodeRepository, logService: LogService);
    list(filters: {
        domainCode?: string;
        category?: string;
        isActive?: boolean;
    }): import(".prisma/client").Prisma.PrismaPromise<{
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
    create(data: {
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
    update(id: string, data: {
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
    deactivate(id: string, actor: {
        actorUserId: string;
        actorRole?: string;
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
    /**
     * Validate reason code is active and compatible with action/domain.
     * Used by other modules (Inbound, Outbound, Inventory) to validate reason codes.
     * @throws NotFoundException if reason code not found
     * @throws ConflictException if reason code is inactive or incompatible
     */
    assertValid(code: string, options?: {
        action?: string;
        domainCode?: string;
        requireNote?: boolean;
        note?: string;
    }): Promise<{
        id: string;
        code: string;
        requiresApproval: boolean;
        affectsBilling: boolean;
        requiresNote: boolean;
    }>;
    /**
     * Get reason code by code (for internal use by other modules).
     */
    getByCode(code: string): Promise<{
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
    } | null>;
}
