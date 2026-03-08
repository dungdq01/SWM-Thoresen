import { Injectable, Logger } from '@nestjs/common';
import { BilSnapshotRunStatus } from '../domain/billing.enums';

export interface SnapshotResult {
  runId: string;
  snapshotDate: Date;
  warehouseScope?: string;
  totalSnapshots: number;
  totalEvents: number;
  status: BilSnapshotRunStatus;
  errors: string[];
}

/**
 * StorageSnapshotService - Daily storage snapshot for billing calculation
 * 
 * This service creates daily snapshots of inventory positions to calculate
 * storage fees using TVL formula: Billable Qty = Opening + Inbound Today
 * 
 * TODO: Full implementation requires:
 * - Query OnHand via InventDim join for warehouse/location/owner
 * - Calculate inbound qty from InventTrans
 * - Create BilStorageSnapshot records
 * - Generate billing events for storage fees
 */
@Injectable()
export class StorageSnapshotService {
  private readonly logger = new Logger(StorageSnapshotService.name);

  async createDailySnapshot(
    snapshotDate: Date,
    warehouseScope?: string,
    _triggeredBy = 'SYSTEM',
  ): Promise<SnapshotResult> {
    this.logger.log(
      `StorageSnapshot requested for ${snapshotDate.toISOString().slice(0, 10)}, ` +
      `warehouse: ${warehouseScope || 'ALL'}`,
    );

    // Placeholder implementation - full logic to be added in next sprint
    // when OnHand → InventDim relationship is finalized
    return {
      runId: 'placeholder',
      snapshotDate,
      warehouseScope,
      totalSnapshots: 0,
      totalEvents: 0,
      status: BilSnapshotRunStatus.PENDING,
      errors: ['Full implementation pending - OnHand schema sync required'],
    };
  }
}
