/**
 * Module 7: Work Execution - Start Work/Line Use Cases
 */

const { v4: uuidv4 } = require('uuid');
const { WORK_STATUS, WORK_LINE_STATUS, EVENT_TYPES, TRIGGER_ACTION, STATUS_OBJECT_TYPE } = require('../domain/work.types');
const { WorkNotFoundError, WorkLineNotFoundError, WorkNotClaimedError, NotAssignedError, InvalidStateTransitionError } = require('../domain/work.errors');
const { canStart, canStartLine, getNextHeaderStatus, getNextLineStatus, assertCanTransitionHeader, assertCanTransitionLine } = require('../domain/work.state-machine');

class StartWorkUseCase {
  constructor(workHeaderRepo, workEventRepo) {
    this.workHeaderRepo = workHeaderRepo;
    this.workEventRepo = workEventRepo;
  }

  async execute(workId, input, context, tx) {
    const header = await this.workHeaderRepo.findByWorkId(workId, tx);
    if (!header) {
      throw new WorkNotFoundError(workId);
    }

    if (header.status === WORK_STATUS.IN_PROGRESS) {
      return { work: header, isIdempotent: true };
    }

    if (!header.assignedTo) {
      throw new WorkNotClaimedError(workId);
    }

    if (header.assignedTo !== context.userId) {
      throw new NotAssignedError(workId, context.userId);
    }

    assertCanTransitionHeader(header.id, header.status, TRIGGER_ACTION.START);

    await this.workHeaderRepo.findByIdForUpdate(header.id, tx);

    const newStatus = getNextHeaderStatus(header.status, TRIGGER_ACTION.START);
    const updatedHeader = await this.workHeaderRepo.update(header.id, {
      status: newStatus,
      startedAt: new Date(),
    }, tx);

    await this.workEventRepo.createStatusHistory({
      id: uuidv4(),
      objectType: STATUS_OBJECT_TYPE.HEADER,
      objectId: header.id,
      fromStatus: header.status,
      toStatus: newStatus,
      triggerAction: TRIGGER_ACTION.START,
      workHeaderId: header.id,
      createdBy: context.userId,
    }, tx);

    await this.workEventRepo.createEventLog({
      id: uuidv4(),
      workHeaderId: header.id,
      eventType: EVENT_TYPES.WORK_STARTED,
      eventPayload: {
        workId,
        startedBy: context.userId,
      },
      correlationId: header.correlationId,
      sourceApp: context.sourceApp || 'WEB',
      createdBy: context.userId,
    }, tx);

    return { work: updatedHeader, isIdempotent: false };
  }
}

class StartLineUseCase {
  constructor(workHeaderRepo, workLineRepo, workEventRepo) {
    this.workHeaderRepo = workHeaderRepo;
    this.workLineRepo = workLineRepo;
    this.workEventRepo = workEventRepo;
  }

  async execute(workId, lineNum, input, context, tx) {
    const header = await this.workHeaderRepo.findByWorkId(workId, tx);
    if (!header) {
      throw new WorkNotFoundError(workId);
    }

    const line = header.lines?.find(l => l.lineNum === lineNum);
    if (!line) {
      throw new WorkLineNotFoundError(workId, lineNum);
    }

    if (line.status === WORK_LINE_STATUS.IN_PROGRESS) {
      return { line, isIdempotent: true };
    }

    if (!canStartLine(header, line)) {
      throw new InvalidStateTransitionError('LINE', line.id, line.status, 'IN_PROGRESS', 'START');
    }

    await this.workLineRepo.findByIdForUpdate(line.id, tx);

    const newStatus = getNextLineStatus(line.status, TRIGGER_ACTION.START);
    const updatedLine = await this.workLineRepo.update(line.id, {
      status: newStatus,
      startedAt: new Date(),
    }, tx);

    await this.workEventRepo.createStatusHistory({
      id: uuidv4(),
      objectType: STATUS_OBJECT_TYPE.LINE,
      objectId: line.id,
      fromStatus: line.status,
      toStatus: newStatus,
      triggerAction: TRIGGER_ACTION.START,
      workHeaderId: header.id,
      workLineId: line.id,
      createdBy: context.userId,
    }, tx);

    await this.workEventRepo.createEventLog({
      id: uuidv4(),
      workHeaderId: header.id,
      workLineId: line.id,
      eventType: EVENT_TYPES.LINE_STARTED,
      eventPayload: {
        workId,
        lineNum,
        startedBy: context.userId,
      },
      correlationId: header.correlationId,
      sourceApp: context.sourceApp || 'WEB',
      createdBy: context.userId,
    }, tx);

    return { line: updatedLine, isIdempotent: false };
  }
}

module.exports = { StartWorkUseCase, StartLineUseCase };
