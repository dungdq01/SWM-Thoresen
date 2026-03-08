/**
 * Module 7: Work Execution - Complete Line Use Case
 */

const { v4: uuidv4 } = require('uuid');
const { WORK_STATUS, WORK_LINE_STATUS, POSTING_STATUS, EVENT_TYPES, TRIGGER_ACTION, STATUS_OBJECT_TYPE, EXCEPTION_TYPE, EXCEPTION_SEVERITY } = require('../domain/work.types');
const { WorkNotFoundError, WorkLineNotFoundError, InvalidStateTransitionError, LineNotStartedError } = require('../domain/work.errors');
const { canCompleteLine, shouldCompleteHeader, getNextLineStatus, getNextHeaderStatus } = require('../domain/work.state-machine');
const { validateActualQuantity, validateShortPick, getPostingRequestType, getCallbackEventType, getTargetModuleForCallback } = require('../domain/work.policy');

class CompleteLineUseCase {
  constructor(workHeaderRepo, workLineRepo, workEventRepo, workExceptionRepo, workOutboxRepo, inventoryAdapter, locationRepo) {
    this.workHeaderRepo = workHeaderRepo;
    this.workLineRepo = workLineRepo;
    this.workEventRepo = workEventRepo;
    this.workExceptionRepo = workExceptionRepo;
    this.workOutboxRepo = workOutboxRepo;
    this.inventoryAdapter = inventoryAdapter;
    this.locationRepo = locationRepo;
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

    if (line.status === WORK_LINE_STATUS.COMPLETED) {
      return { line, header, isIdempotent: true };
    }

    if (!canCompleteLine(header, line)) {
      if (line.status === WORK_LINE_STATUS.OPEN) {
        throw new LineNotStartedError(workId, lineNum);
      }
      throw new InvalidStateTransitionError('LINE', line.id, line.status, 'COMPLETED', 'COMPLETE');
    }

    await this.workLineRepo.findByIdForUpdate(line.id, tx);
    await this.workHeaderRepo.findByIdForUpdate(header.id, tx);

    const actualQty = validateActualQuantity(input.actualQty);
    const expectedQty = Number(line.expectedQty);
    const varianceQty = actualQty - expectedQty;

    const shortPickResult = validateShortPick(expectedQty, actualQty, input.isManagerOverride);

    let scannedLocationId = input.scannedLocationId;
    if (input.scannedLocationCode && this.locationRepo) {
      const location = await this.locationRepo.findByCode(header.warehouseId, input.scannedLocationCode, tx);
      if (location) {
        scannedLocationId = location.id;
      }
    }

    const postingResult = await this.inventoryAdapter.postMovement(
      { ...line, actualQty, scannedLocationId },
      header,
      context,
      tx
    );

    const newLineStatus = getNextLineStatus(line.status, TRIGGER_ACTION.COMPLETE);
    const updatedLine = await this.workLineRepo.update(line.id, {
      status: newLineStatus,
      actualQty,
      varianceQty,
      scannedLocationCode: input.scannedLocationCode || null,
      scannedLocationId: scannedLocationId || null,
      completedAt: new Date(),
      completedBy: context.userId,
      postingStatus: postingResult.success ? POSTING_STATUS.POSTED : POSTING_STATUS.FAILED,
      postingRefType: postingResult.postingRefType,
      postingRefId: postingResult.postingRefId,
      externalId: input.externalId || null,
      reasonCode: input.reasonCode || null,
      evidenceText: input.evidenceText || null,
    }, tx);

    await this.workEventRepo.createPostingLink({
      id: uuidv4(),
      workLineId: line.id,
      postingModule: 'M3',
      postingRequestType: getPostingRequestType(header.workType),
      postingRefId: postingResult.postingRefId,
      postingStatus: postingResult.success ? POSTING_STATUS.POSTED : POSTING_STATUS.FAILED,
      postedAt: postingResult.success ? new Date() : null,
      errorCode: postingResult.success ? null : 'POSTING_FAILED',
      errorMessage: postingResult.success ? null : postingResult.errorMessage,
    }, tx);

    if (!postingResult.success) {
      await this.workExceptionRepo.create({
        id: uuidv4(),
        workHeaderId: header.id,
        workLineId: line.id,
        exceptionType: EXCEPTION_TYPE.POSTING_FAILED,
        severity: EXCEPTION_SEVERITY.BLOCKER,
        status: 'OPEN',
        detailText: `Inventory posting failed: ${postingResult.errorMessage || 'Unknown error'}`,
        createdBy: context.userId,
      }, tx);
    }

    await this.workEventRepo.createStatusHistory({
      id: uuidv4(),
      objectType: STATUS_OBJECT_TYPE.LINE,
      objectId: line.id,
      fromStatus: line.status,
      toStatus: newLineStatus,
      triggerAction: input.isManagerOverride ? TRIGGER_ACTION.OVERRIDE : TRIGGER_ACTION.COMPLETE,
      reasonCode: input.reasonCode || null,
      workHeaderId: header.id,
      workLineId: line.id,
      createdBy: context.userId,
    }, tx);

    await this.workEventRepo.createEventLog({
      id: uuidv4(),
      workHeaderId: header.id,
      workLineId: line.id,
      eventType: EVENT_TYPES.LINE_COMPLETED,
      eventPayload: {
        workId,
        lineNum,
        actualQty,
        varianceQty,
        postingRefId: postingResult.postingRefId,
        isManagerOverride: input.isManagerOverride || false,
      },
      correlationId: header.correlationId,
      sourceApp: context.sourceApp || 'WEB',
      createdBy: context.userId,
    }, tx);

    if (shortPickResult.requiresException) {
      await this.workExceptionRepo.create({
        id: uuidv4(),
        workHeaderId: header.id,
        workLineId: line.id,
        exceptionType: EXCEPTION_TYPE.SHORT_PICK,
        severity: shortPickResult.variancePct > 5 ? EXCEPTION_SEVERITY.WARN : EXCEPTION_SEVERITY.INFO,
        status: 'OPEN',
        detailText: `Short pick: expected ${expectedQty}, actual ${actualQty}, variance ${shortPickResult.variancePct.toFixed(2)}%`,
        createdBy: context.userId,
      }, tx);
    }

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

      await this.workEventRepo.createEventLog({
        id: uuidv4(),
        workHeaderId: header.id,
        eventType: EVENT_TYPES.WORK_COMPLETED,
        eventPayload: {
          workId,
          completedBy: context.userId,
          totalLines: allLines.length,
          completedLines: allLines.filter(l => l.status === WORK_LINE_STATUS.COMPLETED).length,
        },
        correlationId: header.correlationId,
        sourceApp: context.sourceApp || 'WEB',
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
          sourceRefLineId: header.sourceRefLineId,
          completedAt: new Date(),
          lines: allLines.map(l => ({
            lineNum: l.lineNum,
            itemId: l.itemId,
            expectedQty: Number(l.expectedQty),
            actualQty: l.actualQty ? Number(l.actualQty) : null,
            status: l.status,
          })),
        },
        workHeaderId: header.id,
      }, tx);
    }

    return { line: updatedLine, header: updatedHeader, isIdempotent: false };
  }
}

module.exports = { CompleteLineUseCase };
