/**
 * Module 7: Work Execution - Skip Line Use Case
 */

const { v4: uuidv4 } = require('uuid');
const { WORK_LINE_STATUS, EVENT_TYPES, TRIGGER_ACTION, STATUS_OBJECT_TYPE, EXCEPTION_TYPE, EXCEPTION_SEVERITY } = require('../domain/work.types');
const { WorkNotFoundError, WorkLineNotFoundError, InvalidStateTransitionError, ReasonCodeRequiredError } = require('../domain/work.errors');
const { canSkipLine, shouldCompleteHeader, getNextLineStatus, getNextHeaderStatus } = require('../domain/work.state-machine');
const { validateSkipLine, getCallbackEventType, getTargetModuleForCallback } = require('../domain/work.policy');

class SkipLineUseCase {
  constructor(workHeaderRepo, workLineRepo, workEventRepo, workExceptionRepo, workOutboxRepo) {
    this.workHeaderRepo = workHeaderRepo;
    this.workLineRepo = workLineRepo;
    this.workEventRepo = workEventRepo;
    this.workExceptionRepo = workExceptionRepo;
    this.workOutboxRepo = workOutboxRepo;
  }

  async execute(workId, lineNum, input, context, tx) {
    validateSkipLine(input);

    const header = await this.workHeaderRepo.findByWorkId(workId, tx);
    if (!header) {
      throw new WorkNotFoundError(workId);
    }

    const line = header.lines?.find(l => l.lineNum === lineNum);
    if (!line) {
      throw new WorkLineNotFoundError(workId, lineNum);
    }

    if (line.status === WORK_LINE_STATUS.SKIPPED) {
      return { line, header, isIdempotent: true };
    }

    if (!canSkipLine(header, line)) {
      throw new InvalidStateTransitionError('LINE', line.id, line.status, 'SKIPPED', 'SKIP');
    }

    await this.workLineRepo.findByIdForUpdate(line.id, tx);
    await this.workHeaderRepo.findByIdForUpdate(header.id, tx);

    const newLineStatus = getNextLineStatus(line.status, TRIGGER_ACTION.SKIP);
    const updatedLine = await this.workLineRepo.update(line.id, {
      status: newLineStatus,
      reasonCode: input.reasonCode,
      evidenceText: input.remark || null,
      externalId: input.externalId || null,
    }, tx);

    await this.workEventRepo.createStatusHistory({
      id: uuidv4(),
      objectType: STATUS_OBJECT_TYPE.LINE,
      objectId: line.id,
      fromStatus: line.status,
      toStatus: newLineStatus,
      triggerAction: TRIGGER_ACTION.SKIP,
      reasonCode: input.reasonCode,
      remark: input.remark || null,
      workHeaderId: header.id,
      workLineId: line.id,
      createdBy: context.userId,
    }, tx);

    await this.workEventRepo.createEventLog({
      id: uuidv4(),
      workHeaderId: header.id,
      workLineId: line.id,
      eventType: EVENT_TYPES.LINE_SKIPPED,
      eventPayload: {
        workId,
        lineNum,
        reasonCode: input.reasonCode,
        remark: input.remark,
        skippedBy: context.userId,
      },
      correlationId: header.correlationId,
      sourceApp: context.sourceApp || 'WEB',
      createdBy: context.userId,
    }, tx);

    await this.workExceptionRepo.create({
      id: uuidv4(),
      workHeaderId: header.id,
      workLineId: line.id,
      exceptionType: EXCEPTION_TYPE.ITEM_NOT_FOUND,
      severity: EXCEPTION_SEVERITY.WARN,
      status: 'OPEN',
      reasonCode: input.reasonCode,
      detailText: input.remark || `Line ${lineNum} skipped`,
      createdBy: context.userId,
    }, tx);

    const allLines = await this.workLineRepo.findByHeaderId(header.id, tx);
    let updatedHeader = header;

    if (shouldCompleteHeader(allLines)) {
      const newHeaderStatus = getNextHeaderStatus(header.status, TRIGGER_ACTION.COMPLETE);
      updatedHeader = await this.workHeaderRepo.update(header.id, {
        status: newHeaderStatus,
        completedAt: new Date(),
      }, tx);

      await this.workEventRepo.createStatusHistory({
        id: uuidv4(),
        objectType: STATUS_OBJECT_TYPE.HEADER,
        objectId: header.id,
        fromStatus: header.status,
        toStatus: newHeaderStatus,
        triggerAction: TRIGGER_ACTION.COMPLETE,
        workHeaderId: header.id,
        createdBy: context.userId,
      }, tx);

      await this.workOutboxRepo.create({
        id: uuidv4(),
        aggregateType: 'WORK',
        aggregateId: header.id,
        eventType: getCallbackEventType(header.workType),
        targetModule: getTargetModuleForCallback(header.sourceModule),
        payload: {
          workId: header.workId,
          workType: header.workType,
          sourceRefId: header.sourceRefId,
          completedAt: new Date(),
          hasSkippedLines: true,
        },
        workHeaderId: header.id,
      }, tx);
    }

    return { line: updatedLine, header: updatedHeader, isIdempotent: false };
  }
}

module.exports = { SkipLineUseCase };
