/**
 * Module 3: Inventory Core Engine - AuditLog Adapter
 * HI-4 Fix: Integration with M1 LogService for audit trail
 */

class AuditLogAdapter {
  constructor(logService) {
    this.logService = logService;
  }

  /**
   * Log inventory posting action
   */
  async logPosting(data) {
    if (!this.logService) return;

    return this.logService.createAuditLog({
      entityType: 'INVENT_TRANS',
      entityId: data.transId,
      action: 'INVENTORY_POSTING',
      oldValue: null,
      newValue: {
        transType: data.transType,
        itemId: data.itemId,
        qty: data.qty,
        dimFromId: data.dimFromId,
        dimToId: data.dimToId,
      },
      userId: data.postedBy,
      correlationId: data.correlationId,
      requestId: data.requestId,
      sourceModule: 'INVENTORY_CORE',
      metadata: {
        refType: data.refType,
        refId: data.refId,
        externalId: data.externalId,
      },
    });
  }

  /**
   * Log reversal action
   */
  async logReversal(data) {
    if (!this.logService) return;

    return this.logService.createAuditLog({
      entityType: 'INVENT_TRANS',
      entityId: data.reversalTransId,
      action: 'INVENTORY_REVERSAL',
      oldValue: {
        originalTransId: data.originalTransId,
      },
      newValue: {
        reversalTransId: data.reversalTransId,
        reversedQty: data.reversedQty,
      },
      userId: data.reversedBy,
      reasonCode: data.reasonCode,
      correlationId: data.correlationId,
      requestId: data.requestId,
      sourceModule: 'INVENTORY_CORE',
      metadata: {
        correctionRefType: data.correctionRefType,
        correctionRefId: data.correctionRefId,
      },
    });
  }

  /**
   * Log hold creation
   */
  async logHoldCreate(data) {
    if (!this.logService) return;

    return this.logService.createAuditLog({
      entityType: 'INVENTORY_HOLD',
      entityId: data.holdId,
      action: 'HOLD_CREATE',
      oldValue: null,
      newValue: {
        holdNo: data.holdNo,
        holdQty: data.holdQty,
        itemId: data.itemId,
        onHandId: data.onHandId,
      },
      userId: data.createdBy,
      reasonCode: data.reasonCode,
      correlationId: data.correlationId,
      requestId: data.requestId,
      sourceModule: 'INVENTORY_CORE',
    });
  }

  /**
   * Log hold release
   */
  async logHoldRelease(data) {
    if (!this.logService) return;

    return this.logService.createAuditLog({
      entityType: 'INVENTORY_HOLD',
      entityId: data.holdId,
      action: 'HOLD_RELEASE',
      oldValue: {
        status: data.oldStatus,
        releasedQty: data.oldReleasedQty,
      },
      newValue: {
        status: data.newStatus,
        releasedQty: data.newReleasedQty,
        releaseQty: data.releaseQty,
      },
      userId: data.releasedBy,
      correlationId: data.correlationId,
      requestId: data.requestId,
      sourceModule: 'INVENTORY_CORE',
    });
  }

  /**
   * Log hold cancellation
   */
  async logHoldCancel(data) {
    if (!this.logService) return;

    return this.logService.createAuditLog({
      entityType: 'INVENTORY_HOLD',
      entityId: data.holdId,
      action: 'HOLD_CANCEL',
      oldValue: {
        status: data.oldStatus,
        holdQty: data.holdQty,
      },
      newValue: {
        status: 'CANCELLED',
      },
      userId: data.cancelledBy,
      reasonCode: data.reasonCode,
      correlationId: data.correlationId,
      requestId: data.requestId,
      sourceModule: 'INVENTORY_CORE',
    });
  }

  /**
   * Log reconciliation run
   */
  async logReconciliationRun(data) {
    if (!this.logService) return;

    return this.logService.createAuditLog({
      entityType: 'RECONCILIATION_RUN',
      entityId: data.runId,
      action: 'RECONCILIATION_EXECUTE',
      oldValue: null,
      newValue: {
        runNo: data.runNo,
        totalChecked: data.totalChecked,
        mismatchCount: data.mismatchCount,
        status: data.status,
      },
      userId: data.triggeredBy,
      correlationId: data.correlationId,
      requestId: data.requestId,
      sourceModule: 'INVENTORY_CORE',
    });
  }

  /**
   * Log snapshot run
   */
  async logSnapshotRun(data) {
    if (!this.logService) return;

    return this.logService.createAuditLog({
      entityType: 'SNAPSHOT_RUN',
      entityId: data.runId,
      action: 'SNAPSHOT_EXECUTE',
      oldValue: null,
      newValue: {
        snapshotDate: data.snapshotDate,
        recordCount: data.recordCount,
        totalQtyKg: data.totalQtyKg,
        status: data.status,
      },
      userId: data.triggeredBy,
      correlationId: data.correlationId,
      requestId: data.requestId,
      sourceModule: 'INVENTORY_CORE',
      warehouseCode: data.warehouseCode,
    });
  }
}

/**
 * Create AuditLogAdapter instance
 * Pass null if LogService is not available (graceful degradation)
 */
function createAuditLogAdapter(logService) {
  return new AuditLogAdapter(logService);
}

module.exports = { AuditLogAdapter, createAuditLogAdapter };
