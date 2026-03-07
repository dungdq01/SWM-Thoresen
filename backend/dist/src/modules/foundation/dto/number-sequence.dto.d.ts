export declare class CreateNumberSequenceDto {
    sequenceCode: string;
    description?: string;
    scopeType: 'GLOBAL' | 'PER_WAREHOUSE' | 'CUSTOM';
    resetPolicy: 'NONE' | 'DAILY' | 'MONTHLY' | 'YEARLY';
    prefixTemplate: string;
    formatTemplate: string;
    runningNoLength?: number;
    allowGap?: boolean;
}
export declare class UpdateNumberSequenceDto {
    description?: string;
    scopeType?: 'GLOBAL' | 'PER_WAREHOUSE' | 'CUSTOM';
    resetPolicy?: 'NONE' | 'DAILY' | 'MONTHLY' | 'YEARLY';
    prefixTemplate?: string;
    formatTemplate?: string;
    runningNoLength?: number;
    allowGap?: boolean;
    isActive?: boolean;
}
export declare class GetNextNumberDto {
    scopeKey: string;
}
