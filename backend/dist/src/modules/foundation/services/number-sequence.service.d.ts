import { LogService } from './log.service';
import { NumberSequenceRepository } from '../repositories/number-sequence.repository';
export declare class NumberSequenceService {
    private readonly numberSequenceRepository;
    private readonly logService;
    constructor(numberSequenceRepository: NumberSequenceRepository, logService: LogService);
    list(): import(".prisma/client").Prisma.PrismaPromise<{
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
    create(data: {
        sequenceCode: string;
        description?: string;
        scopeType: 'GLOBAL' | 'PER_WAREHOUSE' | 'CUSTOM';
        resetPolicy: 'NONE' | 'DAILY' | 'MONTHLY' | 'YEARLY';
        prefixTemplate: string;
        formatTemplate: string;
        runningNoLength?: number;
        allowGap?: boolean;
        actorUserId: string;
        actorRole?: string;
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
    update(id: string, data: {
        description?: string;
        scopeType?: 'GLOBAL' | 'PER_WAREHOUSE' | 'CUSTOM';
        resetPolicy?: 'NONE' | 'DAILY' | 'MONTHLY' | 'YEARLY';
        prefixTemplate?: string;
        formatTemplate?: string;
        runningNoLength?: number;
        allowGap?: boolean;
        isActive?: boolean;
        actorUserId: string;
        actorRole?: string;
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
    getNextNumber(sequenceCode: string, scopeKey: string, actor: {
        actorUserId: string;
        actorRole?: string;
        requestId?: string;
    }): Promise<{
        sequenceCode: string;
        scopeKey: string;
        value: string;
        runningNumber: number;
        counterDate: string;
    }>;
    private resolveScopeKey;
    private resolveCounterDate;
    private formatNumber;
}
