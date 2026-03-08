/**
 * Module 6: Inventory Control - Cycle Count Service
 */

const prisma = require('../../../shared/db/prismaClient');
const cycleCountRepo = require('../infra/cycle-count.repository');
const adjustmentRepo = require('../infra/adjustment.repository');
const validationService = require('./ic-validation.service');
const stateMachine = require('./ic-state-machine.service');
const statusHistoryRepo = require('../infra/ic-status-history.repository');
const { calculateVariance, shouldRecount, determineAdjustmentType } = require('../domain/ic.policy');
const { IcCycleCountStatus, IcCycleCountLineStatus, IcAdjustmentStatus, IcDocumentEntityType, IcExceptionType } = require('../domain/ic.enums');
const { IcValidationError, IcIdempotencyConflictError, IcNotFoundError, IcRecountPolicyExceededError } = require('../domain/ic.errors');

async function generateCountNumber(warehouseId, tx) {
  const numberSequenceService = require('../../foundation/application/numberSequenceService');
  return numberSequenceService.getNextNumber('CYCLE_COUNT', { warehouseId }, tx);
}

async function createCycleCountPlan(data, requestContext) {
  const { userId } = requestContext;

  const existing = await cycleCountRepo.findCycleCountPlanByCode(data.planCode);
  if (existing) {
    throw new IcValidationError(`Plan code already exists: ${data.planCode}`);
  }

  return prisma.$transaction(async (tx) => {
    await validationService.validateWarehouse(data.warehouseId, tx);

    return cycleCountRepo.createCycleCountPlan({
      ...data,
      createdBy: userId,
    }, tx);
  });
}

async function createCycleCount(data, requestContext) {
  const { userId, correlationId, sourceApp } = requestContext;

  const existing = await cycleCountRepo.findCycleCountByExternalId(data.externalId);
  if (existing) {
    throw new IcIdempotencyConflictError(data.externalId);
  }

  return prisma.$transaction(async (tx) => {
    await validationService.validateWarehouse(data.warehouseId, tx);

    let plan = null;
    if (data.cycleCountPlanId) {
      plan = await cycleCountRepo.findCycleCountPlanById(data.cycleCountPlanId, tx);
      if (!plan) {
        throw new IcNotFoundError('CycleCountPlan', data.cycleCountPlanId);
      }
    }

    const countNumber = await generateCountNumber(data.warehouseId, tx);

    const countScopeSnapshot = {
      scope: data.scope || {},
      snapshotAt: new Date().toISOString(),
      warehouseId: data.warehouseId,
    };

    const cycleCount = await cycleCountRepo.createCycleCountHeader({
      countNumber,
      cycleCountPlanId: data.cycleCountPlanId,
      warehouseId: data.warehouseId,
      countScopeSnapshot,
      status: IcCycleCountStatus.CREATED,
      blindCount: data.blindCount ?? plan?.blindCount ?? true,
      externalId: data.externalId,
      correlationId,
      sourceApp,
      createdBy: userId,
    }, tx);

    await stateMachine.recordStatusChange(
      IcDocumentEntityType.COUNT,
      cycleCount.id,
      null,
      IcCycleCountStatus.CREATED,
      userId,
      correlationId,
      null,
      'Created',
      tx
    );

    return cycleCount;
  });
}

async function releaseCycleCount(id, requestContext) {
  const { userId, correlationId } = requestContext;

  return prisma.$transaction(async (tx) => {
    const cycleCount = await cycleCountRepo.findCycleCountById(id, tx);
    if (!cycleCount) {
      throw new IcNotFoundError('CycleCount', id);
    }

    const newStatus = await stateMachine.transitionCycleCount(
      cycleCount,
      IcCycleCountStatus.RELEASED,
      userId,
      correlationId,
      null,
      'Released',
      tx
    );

    const onHandRecords = await prisma.onHand.findMany({
      where: {
        inventDim: { warehouseId: cycleCount.warehouseId },
        physicalQty: { gt: 0 },
      },
      include: { inventDim: true, item: true },
      take: 1000,
    });

    const lines = onHandRecords.map((oh, index) => ({
      itemId: oh.itemId,
      ownerId: oh.inventDim.ownerId,
      warehouseId: oh.inventDim.warehouseId,
      locationId: oh.inventDim.locationId,
      inventoryStatus: oh.inventDim.inventoryStatusId,
      systemQty: cycleCount.blindCount ? null : oh.physicalQty,
    }));

    if (lines.length > 0) {
      await cycleCountRepo.createCycleCountLines(id, lines, tx);
    }

    return cycleCountRepo.updateCycleCount(id, {
      status: newStatus,
      releasedAt: new Date(),
      updatedBy: userId,
    }, tx);
  });
}

async function submitCycleCount(id, submitData, requestContext) {
  const { userId, correlationId } = requestContext;

  return prisma.$transaction(async (tx) => {
    const cycleCount = await cycleCountRepo.findCycleCountById(id, tx);
    if (!cycleCount) {
      throw new IcNotFoundError('CycleCount', id);
    }

    await stateMachine.transitionCycleCount(
      cycleCount,
      IcCycleCountStatus.COUNTING,
      userId,
      correlationId,
      null,
      'Counting',
      tx
    );

    for (const countLine of submitData.lines) {
      const line = cycleCount.lines.find(l => l.lineNo === countLine.lineNo);
      if (!line) {
        throw new IcValidationError(`Line not found: ${countLine.lineNo}`);
      }

      if (countLine.countedQty < 0) {
        throw new IcValidationError(`Counted qty cannot be negative for line ${countLine.lineNo}`);
      }

      const systemQty = line.systemQty || 0;
      const variance = calculateVariance(systemQty, countLine.countedQty);

      await cycleCountRepo.updateCycleCountLine(line.id, {
        countedQty: countLine.countedQty,
        varianceQty: variance.varianceQty,
        variancePct: variance.variancePct,
        lineStatus: parseFloat(variance.varianceQty) !== 0 ? IcCycleCountLineStatus.VARIANCE : IcCycleCountLineStatus.COUNTED,
        evidenceRef: countLine.evidenceRef,
      }, tx);
    }

    const newStatus = await stateMachine.transitionCycleCount(
      { ...cycleCount, status: IcCycleCountStatus.COUNTING },
      IcCycleCountStatus.SUBMITTED,
      userId,
      correlationId,
      null,
      'Submitted',
      tx
    );

    return cycleCountRepo.updateCycleCount(id, {
      status: newStatus,
      submittedAt: new Date(),
      updatedBy: userId,
    }, tx);
  });
}

async function recountCycleCount(id, recountData, requestContext) {
  const { userId, correlationId } = requestContext;

  return prisma.$transaction(async (tx) => {
    const cycleCount = await cycleCountRepo.findCycleCountById(id, tx);
    if (!cycleCount) {
      throw new IcNotFoundError('CycleCount', id);
    }

    const maxRecount = cycleCount.plan?.maxRecount || 1;

    for (const lineNo of recountData.lineNos || []) {
      const line = cycleCount.lines.find(l => l.lineNo === lineNo);
      if (!line) {
        throw new IcValidationError(`Line not found: ${lineNo}`);
      }

      if (line.recountNo >= maxRecount) {
        throw new IcRecountPolicyExceededError(line.id, line.recountNo, maxRecount);
      }

      await cycleCountRepo.updateCycleCountLine(line.id, {
        recountNo: line.recountNo + 1,
        countedQty: null,
        varianceQty: null,
        variancePct: null,
        lineStatus: IcCycleCountLineStatus.OPEN,
      }, tx);
    }

    await stateMachine.transitionCycleCount(
      cycleCount,
      IcCycleCountStatus.COUNTING,
      userId,
      correlationId,
      null,
      'Recount requested',
      tx
    );

    return cycleCountRepo.updateCycleCount(id, {
      status: IcCycleCountStatus.COUNTING,
      updatedBy: userId,
    }, tx);
  });
}

async function approveCycleCount(id, requestContext) {
  const { userId, correlationId } = requestContext;

  return prisma.$transaction(async (tx) => {
    const cycleCount = await cycleCountRepo.findCycleCountById(id, tx);
    if (!cycleCount) {
      throw new IcNotFoundError('CycleCount', id);
    }

    const newStatus = await stateMachine.transitionCycleCount(
      cycleCount,
      IcCycleCountStatus.APPROVED,
      userId,
      correlationId,
      null,
      'Approved',
      tx
    );

    for (const line of cycleCount.lines) {
      if (line.lineStatus === IcCycleCountLineStatus.VARIANCE || line.lineStatus === IcCycleCountLineStatus.COUNTED) {
        await cycleCountRepo.updateCycleCountLine(line.id, {
          lineStatus: IcCycleCountLineStatus.APPROVED,
        }, tx);
      }
    }

    return cycleCountRepo.updateCycleCount(id, {
      status: newStatus,
      approvedAt: new Date(),
      updatedBy: userId,
    }, tx);
  });
}

async function postCycleCount(id, requestContext) {
  const { userId, correlationId, sourceApp } = requestContext;

  return prisma.$transaction(async (tx) => {
    const cycleCount = await cycleCountRepo.findCycleCountById(id, tx);
    if (!cycleCount) {
      throw new IcNotFoundError('CycleCount', id);
    }

    const varianceLines = cycleCount.lines.filter(l => 
      l.lineStatus === IcCycleCountLineStatus.APPROVED && 
      parseFloat(l.varianceQty || 0) !== 0
    );

    if (varianceLines.length === 0) {
      const newStatus = await stateMachine.transitionCycleCount(
        cycleCount,
        IcCycleCountStatus.POSTED,
        userId,
        correlationId,
        null,
        'Posted (no variance)',
        tx
      );

      return cycleCountRepo.updateCycleCount(id, {
        status: newStatus,
        postedAt: new Date(),
        updatedBy: userId,
      }, tx);
    }

    const numberSequenceService = require('../../foundation/application/numberSequenceService');
    const adjustmentNumber = await numberSequenceService.getNextNumber('ADJUSTMENT', { warehouseId: cycleCount.warehouseId }, tx);

    const adjustmentLines = varianceLines.map(line => ({
      itemId: line.itemId,
      ownerId: line.ownerId,
      locationId: line.locationId,
      inventoryStatus: line.inventoryStatus,
      qtyDelta: line.varianceQty,
      uom: 'KG',
      reasonCode: 'COUNT_VARIANCE',
    }));

    const adjustment = await adjustmentRepo.createAdjustmentHeader({
      adjustmentNumber,
      warehouseId: cycleCount.warehouseId,
      adjustmentType: determineAdjustmentType(adjustmentLines),
      sourceType: 'COUNT',
      status: IcAdjustmentStatus.APPROVED,
      totalAbsQty: adjustmentLines.reduce((sum, l) => sum + Math.abs(parseFloat(l.qtyDelta)), 0),
      requestedBy: userId,
      approvedBy: userId,
      approvedAt: new Date(),
      reasonCode: 'COUNT_VARIANCE',
      remarks: `Auto-created from cycle count ${cycleCount.countNumber}`,
      externalId: `${cycleCount.externalId}-ADJ`,
      correlationId,
      sourceApp,
      createdBy: userId,
      lines: adjustmentLines,
    }, tx);

    for (const line of varianceLines) {
      await cycleCountRepo.updateCycleCountLine(line.id, {
        adjustmentHeaderId: adjustment.id,
        lineStatus: IcCycleCountLineStatus.POSTED,
      }, tx);
    }

    const newStatus = await stateMachine.transitionCycleCount(
      cycleCount,
      IcCycleCountStatus.POSTED,
      userId,
      correlationId,
      null,
      'Posted with adjustment',
      tx
    );

    return cycleCountRepo.updateCycleCount(id, {
      status: newStatus,
      postedAt: new Date(),
      updatedBy: userId,
    }, tx);
  });
}

async function cancelCycleCount(id, cancelReasonCode, requestContext) {
  const { userId, correlationId } = requestContext;

  return prisma.$transaction(async (tx) => {
    const cycleCount = await cycleCountRepo.findCycleCountById(id, tx);
    if (!cycleCount) {
      throw new IcNotFoundError('CycleCount', id);
    }

    const newStatus = await stateMachine.transitionCycleCount(
      cycleCount,
      IcCycleCountStatus.CANCELLED,
      userId,
      correlationId,
      cancelReasonCode,
      'Cancelled',
      tx
    );

    for (const line of cycleCount.lines) {
      await cycleCountRepo.updateCycleCountLine(line.id, {
        lineStatus: IcCycleCountLineStatus.CANCELLED,
      }, tx);
    }

    return cycleCountRepo.updateCycleCount(id, {
      status: newStatus,
      updatedBy: userId,
    }, tx);
  });
}

async function getCycleCount(id) {
  const cycleCount = await cycleCountRepo.findCycleCountById(id);
  if (!cycleCount) {
    throw new IcNotFoundError('CycleCount', id);
  }
  return cycleCount;
}

async function listCycleCounts(filters, pagination) {
  return cycleCountRepo.findCycleCounts(filters, pagination);
}

module.exports = {
  createCycleCountPlan,
  createCycleCount,
  releaseCycleCount,
  submitCycleCount,
  recountCycleCount,
  approveCycleCount,
  postCycleCount,
  cancelCycleCount,
  getCycleCount,
  listCycleCounts,
};
