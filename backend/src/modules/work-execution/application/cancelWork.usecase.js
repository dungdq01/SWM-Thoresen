/**
 * Module 7: Work Execution - Cancel Work Use Case
 */

const { v4: uuidv4 } = require('uuid');
const { WORK_STATUS, WORK_LINE_STATUS, EVENT_TYPES, TRIGGER_ACTION, STATUS_OBJECT_TYPE, CALLBACK_EVENT_TYPES } = require('../domain/work.types');
const { WorkNotFoundError, InvalidStateTransitionError, WorkAlreadyCompletedError } = require('../domain/work.errors');
const { canCancel, hasAnyCompletedLine, getNextHeaderStatus } = require('../domain/work.state-machine');
const { validateCancelWork, getTargetModuleForCallback } = require('../domain/work.policy');

class CancelWorkUseCase {
  constructor(workHeaderRepo, workLineRepo, workEventRepo, workOutboxRepo) {
    this.workHeaderRepo = workHeaderRepo;
    this.workLineRepo = workLineRepo;
    this.workEventRepo = workEventRepo;
    this.workOutboxRepo = workOutboxRepo;
  }

  async execute(workId, input, context, tx) {
    const header = await this.workHeaderRepo.findByWorkId(workId, tx);
    if (!header) {
      throw new WorkNotFoundError(workId);
    }

    if (header.status === WORK_STATUS.CANCELLED) {
      return { work: header, isIdempotent: true };
    }

    if (header.status === WORK_STATUS.COMPLETED) {
      throw new WorkAlreadyCompletedError(workId);
    }

    const completedLines = header.lines?.filter(l => l.status === WORK_LINE_STATUS.COMPLETED) || [];
    validateCancelWork(input, completedLines.length > 0);

    if (!canCancel(header)) {
      throw new InvalidStateTransitionError('HEADER', header.id, header.status, 'CANCELLED', 'CANCEL');
    }

    if (completedLines.length > 0) {
      const isManager = context.roles?.includes('WAREHOUSE_MANAGER') || context.isManager;
      if (!isManager) {
        throw new InvalidStateTransitionError('HEADER', header.id, header.status, 'CANCELLED', 'CANCEL - has completed lines');
      }
    }

    await this.workHeaderRepo.findByIdForUpdate(header.id, tx);

    const openLines = header.lines?.filter(l => 
      l.status === WORK_LINE_STATUS.OPEN || l.status === WORK_LINE_STATUS.IN_PROGRESS
    ) || [];

    for (const line of openLines) {
      await this.workLineRepo.update(line.id, {
        status: WORK_LINE_STATUS.CANCELLED,
      }, tx);

      await this.workEventRepo.createStatusHistory({
        id: uuidv4(),
        objectType: STATUS_OBJECT_TYPE.LINE,
        objectId: line.id,
        fromStatus: line.status,
        toStatus: WORK_LINE_STATUS.CANCELLED,
        triggerAction: TRIGGER_ACTION.CANCEL,
        reasonCode: input.reasonCode,
        workHeaderId: header.id,
        workLineId: line.id,
        createdBy: context.userId,
      }, tx);
    }

    const updatedHeader = await this.workHeaderRepo.update(header.id, {
      status: WORK_STATUS.CANCELLED,
      cancelledAt: new Date(),
      cancelReasonCode: input.reasonCode,
    }, tx);

    await this.workEventRepo.createStatusHistory({
      id: uuidv4(),
      objectType: STATUS_OBJECT_TYPE.HEADER,
      objectId: header.id,
      fromStatus: header.status,
      toStatus: WORK_STATUS.CANCELLED,
      triggerAction: TRIGGER_ACTION.CANCEL,
      reasonCode: input.reasonCode,
      remark: input.remark || null,
      workHeaderId: header.id,
      createdBy: context.userId,
    }, tx);

    await this.workEventRepo.createEventLog({
      id: uuidv4(),
      workHeaderId: header.id,
      eventType: EVENT_TYPES.WORK_CANCELLED,
      eventPayload: {
        workId,
        reasonCode: input.reasonCode,
        remark: input.remark,
        cancelledBy: context.userId,
        hadCompletedLines: completedLines.length > 0,
      },
      correlationId: header.correlationId,
      sourceApp: context.sourceApp || 'WEB',
      createdBy: context.userId,
    }, tx);

    await this.workOutboxRepo.create({
      id: uuidv4(),
      aggregateType: 'WORK',
      aggregateId: header.id,
      eventType: CALLBACK_EVENT_TYPES.WORK_CANCELLED,
      targetModule: getTargetModuleForCallback(header.sourceModule),
      payload: {
        workId: header.workId,
        workType: header.workType,
        sourceRefId: header.sourceRefId,
        sourceRefLineId: header.sourceRefLineId,
        cancelledAt: new Date(),
        reasonCode: input.reasonCode,
      },
      workHeaderId: header.id,
    }, tx);

    return { work: updatedHeader, isIdempotent: false };
  }
}

module.exports = { CancelWorkUseCase };
