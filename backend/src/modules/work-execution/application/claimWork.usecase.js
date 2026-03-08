/**
 * Module 7: Work Execution - Claim/Release Work Use Cases
 */

const { v4: uuidv4 } = require('uuid');
const { WORK_STATUS, EVENT_TYPES, ASSIGNMENT_ACTION } = require('../domain/work.types');
const { WorkNotFoundError, WorkAlreadyClaimedError, WorkNotClaimedError, NotAssignedError, DuplicateExternalIdError } = require('../domain/work.errors');
const { canClaim, canRelease, isHeaderTerminal } = require('../domain/work.state-machine');

class ClaimWorkUseCase {
  constructor(workHeaderRepo, workEventRepo) {
    this.workHeaderRepo = workHeaderRepo;
    this.workEventRepo = workEventRepo;
  }

  async execute(workId, input, context, tx) {
    if (input.externalId) {
      const existingByExtId = await this.workHeaderRepo.findByExternalId(input.externalId, tx);
      if (existingByExtId && existingByExtId.workId !== workId) {
        throw new DuplicateExternalIdError(input.externalId);
      }
    }

    const header = await this.workHeaderRepo.findByWorkId(workId, tx);
    if (!header) {
      throw new WorkNotFoundError(workId);
    }

    if (header.assignedTo === context.userId) {
      return { work: header, isIdempotent: true };
    }

    if (!canClaim(header)) {
      if (header.assignedTo) {
        throw new WorkAlreadyClaimedError(workId, header.assignedTo);
      }
      throw new WorkAlreadyClaimedError(workId, 'invalid state');
    }

    await this.workHeaderRepo.findByIdForUpdate(header.id, tx);

    const updatedHeader = await this.workHeaderRepo.update(header.id, {
      assignedTo: context.userId,
      assignedAt: new Date(),
    }, tx);

    await this.workEventRepo.createAssignmentHistory({
      id: uuidv4(),
      workHeaderId: header.id,
      actionType: ASSIGNMENT_ACTION.CLAIM,
      fromUserId: null,
      toUserId: context.userId,
      createdBy: context.userId,
    }, tx);

    await this.workEventRepo.createEventLog({
      id: uuidv4(),
      workHeaderId: header.id,
      eventType: EVENT_TYPES.WORK_CLAIMED,
      eventPayload: {
        workId,
        claimedBy: context.userId,
      },
      correlationId: header.correlationId,
      sourceApp: context.sourceApp || 'WEB',
      createdBy: context.userId,
    }, tx);

    return { work: updatedHeader, isIdempotent: false };
  }
}

class ReleaseWorkUseCase {
  constructor(workHeaderRepo, workEventRepo) {
    this.workHeaderRepo = workHeaderRepo;
    this.workEventRepo = workEventRepo;
  }

  async execute(workId, input, context, tx) {
    const header = await this.workHeaderRepo.findByWorkId(workId, tx);
    if (!header) {
      throw new WorkNotFoundError(workId);
    }

    if (!header.assignedTo) {
      return { work: header, isIdempotent: true };
    }

    const isManager = context.roles?.includes('WAREHOUSE_MANAGER') || context.isManager;
    if (header.assignedTo !== context.userId && !isManager) {
      throw new NotAssignedError(workId, context.userId);
    }

    if (!canRelease(header, header.assignedTo) && !isManager) {
      throw new NotAssignedError(workId, context.userId);
    }

    await this.workHeaderRepo.findByIdForUpdate(header.id, tx);

    const previousAssignee = header.assignedTo;
    const updatedHeader = await this.workHeaderRepo.update(header.id, {
      assignedTo: null,
      assignedAt: null,
    }, tx);

    await this.workEventRepo.createAssignmentHistory({
      id: uuidv4(),
      workHeaderId: header.id,
      actionType: ASSIGNMENT_ACTION.RELEASE,
      fromUserId: previousAssignee,
      toUserId: null,
      reasonCode: input.reasonCode || null,
      createdBy: context.userId,
    }, tx);

    await this.workEventRepo.createEventLog({
      id: uuidv4(),
      workHeaderId: header.id,
      eventType: EVENT_TYPES.WORK_RELEASED,
      eventPayload: {
        workId,
        releasedBy: context.userId,
        previousAssignee,
      },
      correlationId: header.correlationId,
      sourceApp: context.sourceApp || 'WEB',
      createdBy: context.userId,
    }, tx);

    return { work: updatedHeader, isIdempotent: false };
  }
}

module.exports = { ClaimWorkUseCase, ReleaseWorkUseCase };
