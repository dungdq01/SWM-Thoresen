import { RequestUser } from '../../../common/interfaces/request-user.interface';
import { CreateNumberSequenceDto, GetNextNumberDto, UpdateNumberSequenceDto } from '../dto';
import { IdempotencyService } from '../services/idempotency.service';
import { NumberSequenceService } from '../services/number-sequence.service';
export declare class NumberSequenceController {
    private readonly numberSequenceService;
    private readonly idempotencyService;
    constructor(numberSequenceService: NumberSequenceService, idempotencyService: IdempotencyService);
    listSequences(): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        description: string | null;
        isActive: boolean;
        createdBy: string | null;
        updatedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
        scopeType: import(".prisma/client").$Enums.SequenceScopeType;
        sequenceCode: string;
        resetPolicy: import(".prisma/client").$Enums.SequenceResetPolicy;
        prefixTemplate: string;
        formatTemplate: string;
        runningNoLength: number;
        allowGap: boolean;
    }[]>;
    createSequence(body: CreateNumberSequenceDto, user: RequestUser, request: {
        headers: Record<string, string | string[] | undefined>;
        requestId?: string;
    }): Promise<{
        id: string;
        description: string | null;
        isActive: boolean;
        createdBy: string | null;
        updatedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
        scopeType: import(".prisma/client").$Enums.SequenceScopeType;
        sequenceCode: string;
        resetPolicy: import(".prisma/client").$Enums.SequenceResetPolicy;
        prefixTemplate: string;
        formatTemplate: string;
        runningNoLength: number;
        allowGap: boolean;
    }>;
    updateSequence(id: string, body: UpdateNumberSequenceDto, user: RequestUser, request: {
        headers: Record<string, string | string[] | undefined>;
        requestId?: string;
    }): Promise<{
        id: string;
        description: string | null;
        isActive: boolean;
        createdBy: string | null;
        updatedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
        scopeType: import(".prisma/client").$Enums.SequenceScopeType;
        sequenceCode: string;
        resetPolicy: import(".prisma/client").$Enums.SequenceResetPolicy;
        prefixTemplate: string;
        formatTemplate: string;
        runningNoLength: number;
        allowGap: boolean;
    }>;
    getNextNumber(code: string, body: GetNextNumberDto, user: RequestUser, request: {
        headers: Record<string, string | string[] | undefined>;
        requestId?: string;
    }): Promise<{
        sequenceCode: string;
        scopeKey: string;
        value: string;
        runningNumber: number;
        counterDate: string;
    }>;
    private getHeader;
}
