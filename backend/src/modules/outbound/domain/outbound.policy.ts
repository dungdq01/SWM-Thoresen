/**
 * Outbound Policy - Domain Layer
 * Business rules and policies for outbound operations
 */

export interface ToleranceConfig {
  tolerancePct: number;
  source: 'OWNER_ITEM_POLICY' | 'ITEM' | 'OWNER' | 'ENV_DEFAULT';
}

export interface AllocationPolicy {
  strategy: 'FIFO' | 'LIFO' | 'FEFO';
  allowPartial: boolean;
  requireHold: boolean;
}

export const DEFAULT_ALLOCATION_POLICY: AllocationPolicy = {
  strategy: 'FIFO',
  allowPartial: false,
  requireHold: true,
};

export const DEFAULT_TOLERANCE_PCT = 2.0;

export function calculateVariance(actual: number, expected: number): number {
  if (expected === 0) return actual === 0 ? 0 : 100;
  return ((actual - expected) / expected) * 100;
}

export function checkTolerancePass(variancePct: number, tolerancePct: number): boolean {
  return Math.abs(variancePct) <= tolerancePct;
}

export interface DpmTrackingInfo {
  isDpmLine: boolean;
  bagCount: number | null;
  nominalWeightPerBag: number | null;
  dpmNominalQtyKg: number | null;
}

export function calculateDpmNominalQty(bagCount: number, nominalWeightPerBag: number): number {
  return bagCount * nominalWeightPerBag;
}

export function validateDpmLine(line: DpmTrackingInfo): { valid: boolean; error?: string } {
  if (!line.isDpmLine) return { valid: true };
  
  if (!line.bagCount || line.bagCount <= 0) {
    return { valid: false, error: 'DPM line requires positive bag count' };
  }
  if (!line.nominalWeightPerBag || line.nominalWeightPerBag <= 0) {
    return { valid: false, error: 'DPM line requires positive nominal weight per bag' };
  }
  
  return { valid: true };
}

export const SHIPMENT_BUSINESS_RULES = {
  maxLinesPerShipment: 100,
  minLinesToConfirm: 1,
  requireTareBeforeGross: true,
  allowManualWeigh: true,
  allowReweigh: true,
  maxReweighAttempts: 3,
};

export const PERMISSION_CODES = {
  CREATE: 'OUTBOUND.SHIPMENT.CREATE',
  READ: 'OUTBOUND.SHIPMENT.READ',
  UPDATE: 'OUTBOUND.SHIPMENT.UPDATE',
  CONFIRM: 'OUTBOUND.SHIPMENT.CONFIRM',
  CANCEL: 'OUTBOUND.SHIPMENT.CANCEL',
  ALLOCATE: 'OUTBOUND.ALLOCATION.EXECUTE',
  WEIGH: 'OUTBOUND.WEIGH.RECEIVE',
  APPROVE: 'OUTBOUND.APPROVAL.DECIDE',
  SHIP: 'OUTBOUND.SHIPMENT.SHIP',
  DASHBOARD: 'OUTBOUND.DASHBOARD.READ',
};
