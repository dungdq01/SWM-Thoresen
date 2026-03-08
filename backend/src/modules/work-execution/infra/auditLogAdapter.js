/**
 * Module 7: Work Execution - Audit Log Adapter
 * Fix HI-6: M1 AuditLog integration
 */

class AuditLogAdapter {
  constructor(auditLogService) {
    this.auditLogService = auditLogService;
  }

  async logWorkCreated(work, context) {
    return this._log('WORK_CREATED', 'WeWorkHeader', work.id, {
      workId: work.workId,
      workType: work.workType,
      sourceModule: work.sourceModule,
      sourceRefId: work.sourceRefId,
      lineCount: work.lines?.length || 0,
    }, context);
  }

  async logWorkClaimed(work, context) {
    return this._log('WORK_CLAIMED', 'WeWorkHeader', work.id, {
      workId: work.workId,
      assignedTo: work.assignedTo,
    }, context);
  }

  async logWorkReleased(work, context) {
    return this._log('WORK_RELEASED', 'WeWorkHeader', work.id, {
      workId: work.workId,
      previousAssignee: work.assignedTo,
    }, context);
  }

  async logWorkStarted(work, context) {
    return this._log('WORK_STARTED', 'WeWorkHeader', work.id, {
      workId: work.workId,
      startedAt: work.startedAt,
    }, context);
  }

  async logWorkCompleted(work, context) {
    return this._log('WORK_COMPLETED', 'WeWorkHeader', work.id, {
      workId: work.workId,
      completedAt: work.completedAt,
    }, context);
  }

  async logWorkCancelled(work, reasonCode, context) {
    return this._log('WORK_CANCELLED', 'WeWorkHeader', work.id, {
      workId: work.workId,
      reasonCode,
      cancelledAt: work.cancelledAt,
    }, context);
  }

  async logLineCompleted(line, header, postingResult, context) {
    return this._log('WORK_LINE_COMPLETED', 'WeWorkLine', line.id, {
      workId: header.workId,
      lineNum: line.lineNum,
      expectedQty: line.expectedQty,
      actualQty: line.actualQty,
      varianceQty: line.varianceQty,
      postingRefId: postingResult?.postingRefId,
      postingStatus: line.postingStatus,
    }, context);
  }

  async logLineSkipped(line, header, reasonCode, context) {
    return this._log('WORK_LINE_SKIPPED', 'WeWorkLine', line.id, {
      workId: header.workId,
      lineNum: line.lineNum,
      reasonCode,
    }, context);
  }

  async logManagerOverride(line, header, context) {
    return this._log('WORK_MANAGER_OVERRIDE', 'WeWorkLine', line.id, {
      workId: header.workId,
      lineNum: line.lineNum,
      actualQty: line.actualQty,
      reasonCode: line.reasonCode,
      evidenceText: line.evidenceText,
    }, context);
  }

  async logPostingReversed(line, header, reversalRefId, context) {
    return this._log('WORK_POSTING_REVERSED', 'WeWorkLine', line.id, {
      workId: header.workId,
      lineNum: line.lineNum,
      originalPostingRefId: line.postingRefId,
      reversalRefId,
    }, context);
  }

  async _log(action, entityType, entityId, details, context) {
    if (!this.auditLogService || typeof this.auditLogService.log !== 'function') {
      return null;
    }

    try {
      return await this.auditLogService.log({
        module: 'M7',
        action,
        entityType,
        entityId,
        details,
        userId: context?.userId,
        warehouseId: context?.warehouseId,
        correlationId: context?.correlationId,
        sourceApp: context?.sourceApp || 'WEB',
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('AuditLogAdapter error:', error.message);
      return null;
    }
  }
}

module.exports = { AuditLogAdapter };
