import { LogRepository } from '../repositories/log.repository';
export declare class IdempotencyService {
    private readonly logRepository;
    constructor(logRepository: LogRepository);
    executeIfKeyProvided<T>(params: {
        idempotencyKey?: string;
        commandName: string;
        sourceModule: string;
        payload: unknown;
        correlationId?: string;
        execute: () => Promise<T>;
        mapSuccess: (result: T) => {
            responseCode?: number;
            responseBody?: unknown;
            resourceType?: string;
            resourceId?: string;
        };
    }): Promise<T>;
    getByKey(idempotencyKey: string): import(".prisma/client").Prisma.Prisma__IdempotencyRecordClient<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        correlationId: string | null;
        sourceModule: string;
        idempotencyKey: string;
        commandName: string;
        requestHash: string | null;
        requestPayload: import("@prisma/client/runtime/library").JsonValue | null;
        responseCode: number | null;
        responseBody: import("@prisma/client/runtime/library").JsonValue | null;
        resourceType: string | null;
        resourceId: string | null;
        status: import(".prisma/client").$Enums.IdempotencyStatus;
        lockedUntil: Date | null;
        expiredAt: Date | null;
    } | null, null, import("@prisma/client/runtime/library").DefaultArgs>;
    private hashPayload;
}
