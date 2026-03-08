/**
 * Module 7: Work Execution - Generate Work Use Case
 * Creates work from source triggers (M4/M5/M6)
 */

const { v4: uuidv4 } = require('uuid');
const { WORK_STATUS, WORK_LINE_STATUS, EVENT_TYPES, TRIGGER_ACTION, STATUS_OBJECT_TYPE } = require('../domain/work.types');
const { DuplicateExternalIdError } = require('../domain/work.errors');
const { calculatePriority } = require('../domain/work.policy');

class GenerateWorkUseCase {
  constructor(workHeaderRepo, workLineRepo, workEventRepo, numberSequenceService) {
    this.workHeaderRepo = workHeaderRepo;
    this.workLineRepo = workLineRepo;
    this.workEventRepo = workEventRepo;
    this.numberSequenceService = numberSequenceService;
  }

  async execute(input, context, tx = null) {
    const existing = await this.workHeaderRepo.findBySourceRef(
      input.sourceModule,
      input.sourceType,
      input.sourceRefId,
      input.sourceRefLineId || null,
      input.workType,
      tx
    );

    if (existing) {
      return { created: false, work: existing, isIdempotent: true };
    }

    if (input.externalId) {
      const existingByExtId = await this.workHeaderRepo.findByExternalId(input.externalId, tx);
      if (existingByExtId) {
        return { created: false, work: existingByExtId, isIdempotent: true };
      }
    }

    const workId = await this._generateWorkId(input.warehouseId);
    const correlationId = input.correlationId || uuidv4();
    const priorityNo = input.priorityNo || calculatePriority(input.sourceModule, input.workType);

    const headerData = {
      id: uuidv4(),
      workId,
      workType: input.workType,
      status: WORK_STATUS.OPEN,
      priorityNo,
      warehouseId: input.warehouseId,
      zoneId: input.zoneId || null,
      sourceModule: input.sourceModule,
      sourceType: input.sourceType,
      sourceRefId: input.sourceRefId,
      sourceRefLineId: input.sourceRefLineId || null,
      sourceOwnerId: input.sourceOwnerId || null,
      assignmentMode: input.assignmentMode || 'SELF_CLAIM',
      sourceDocVersion: input.sourceDocVersion || null,
      externalId: input.externalId || `WE-GEN-${uuidv4()}`,
      correlationId,
      sourceApp: context.sourceApp || 'SYSTEM',
      createdBy: context.userId,
    };

    const header = await this.workHeaderRepo.create(headerData, tx);

    const linesData = input.lines.map((line, index) => ({
      id: uuidv4(),
      workHeaderId: header.id,
      lineNum: index + 1,
      stepType: line.stepType || this._mapWorkTypeToStepType(input.workType),
      status: WORK_LINE_STATUS.OPEN,
      itemId: line.itemId,
      ownerId: line.ownerId,
      fromWarehouseId: line.fromWarehouseId || null,
      fromLocationId: line.fromLocationId || null,
      toWarehouseId: line.toWarehouseId || null,
      toLocationId: line.toLocationId || null,
      expectedQty: line.expectedQty,
      uom: line.uom,
      inventoryStatusFrom: line.inventoryStatusFrom || null,
      inventoryStatusTo: line.inventoryStatusTo || null,
    }));

    await this.workLineRepo.createMany(linesData, tx);

    await this.workEventRepo.createStatusHistory({
      id: uuidv4(),
      objectType: STATUS_OBJECT_TYPE.HEADER,
      objectId: header.id,
      fromStatus: null,
      toStatus: WORK_STATUS.OPEN,
      triggerAction: TRIGGER_ACTION.CREATE,
      workHeaderId: header.id,
      createdBy: context.userId,
    }, tx);

    await this.workEventRepo.createEventLog({
      id: uuidv4(),
      workHeaderId: header.id,
      eventType: EVENT_TYPES.WORK_CREATED,
      eventPayload: {
        workId,
        workType: input.workType,
        sourceModule: input.sourceModule,
        sourceRefId: input.sourceRefId,
        lineCount: linesData.length,
      },
      correlationId,
      sourceApp: context.sourceApp || 'SYSTEM',
      createdBy: context.userId,
    }, tx);

    const fullHeader = await this.workHeaderRepo.findById(header.id, tx);
    return { created: true, work: fullHeader, isIdempotent: false };
  }

  async _generateWorkId(warehouseId) {
    if (this.numberSequenceService) {
      return this.numberSequenceService.getNextNumber('WORK', warehouseId);
    }
    return `WRK-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }

  _mapWorkTypeToStepType(workType) {
    const mapping = {
      PUTAWAY: 'PUT',
      PICK: 'PICK',
      MOVE: 'MOVE',
      TRANSFER_PICK: 'TRANSFER_PICK',
      TRANSFER_PUT: 'TRANSFER_PUT',
    };
    return mapping[workType] || 'MOVE';
  }
}

module.exports = { GenerateWorkUseCase };
