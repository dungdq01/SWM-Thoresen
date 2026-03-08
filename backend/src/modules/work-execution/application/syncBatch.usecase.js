/**
 * Module 7: Work Execution - Mobile Sync Batch Use Case
 */

const { v4: uuidv4 } = require('uuid');
const { SYNC_RESULT, SYNC_BATCH_STATUS, SYNC_EVENT_TYPE } = require('../domain/work.types');
const { mapSyncBatchToResponse } = require('../infra/work.mapper');

class SyncBatchUseCase {
  constructor(mobileSyncRepo, workHeaderRepo, workLineRepo, startLineUseCase, completeLineUseCase, skipLineUseCase, prisma) {
    this.mobileSyncRepo = mobileSyncRepo;
    this.workHeaderRepo = workHeaderRepo;
    this.workLineRepo = workLineRepo;
    this.startLineUseCase = startLineUseCase;
    this.completeLineUseCase = completeLineUseCase;
    this.skipLineUseCase = skipLineUseCase;
    this.prisma = prisma;
  }

  async execute(input, context) {
    const existingBatch = await this.mobileSyncRepo.findBatchByBatchNo(input.batchExternalId);
    if (existingBatch) {
      return { batch: mapSyncBatchToResponse(existingBatch), isIdempotent: true };
    }

    const batchId = uuidv4();
    const correlationId = input.correlationId || uuidv4();

    const batch = await this.mobileSyncRepo.createBatch({
      id: batchId,
      batchNo: input.batchExternalId,
      deviceId: input.deviceId,
      userId: context.userId,
      syncStatus: SYNC_BATCH_STATUS.RECEIVED,
      eventCount: input.events.length,
      correlationId,
    });

    const eventResults = [];

    for (const event of input.events) {
      const existingEvent = await this.mobileSyncRepo.findEventByExternalId(event.externalId);
      if (existingEvent) {
        eventResults.push({
          externalId: event.externalId,
          result: SYNC_RESULT.DUPLICATE,
          message: 'Event already processed',
        });
        continue;
      }

      const syncEvent = await this.mobileSyncRepo.createEvent({
        id: uuidv4(),
        syncBatchId: batchId,
        externalId: event.externalId,
        deviceSequenceNo: event.sequenceNo,
        eventType: event.eventType,
        workId: event.workId,
        workLineId: event.workLineId || null,
        eventPayload: event.payload || {},
        processingResult: SYNC_RESULT.PENDING,
      });

      try {
        const result = await this._processEvent(event, context);
        
        await this.mobileSyncRepo.updateEvent(syncEvent.id, {
          processingResult: result.result,
          resultMessage: result.message,
          processedAt: new Date(),
        });

        eventResults.push({
          externalId: event.externalId,
          result: result.result,
          message: result.message,
        });
      } catch (error) {
        await this.mobileSyncRepo.updateEvent(syncEvent.id, {
          processingResult: SYNC_RESULT.REJECTED,
          resultMessage: error.message,
          processedAt: new Date(),
        });

        eventResults.push({
          externalId: event.externalId,
          result: SYNC_RESULT.REJECTED,
          message: error.message,
        });
      }
    }

    await this.mobileSyncRepo.updateBatchCounts(batchId);
    const updatedBatch = await this.mobileSyncRepo.findBatchById(batchId);

    return {
      batch: mapSyncBatchToResponse(updatedBatch),
      eventResults,
      isIdempotent: false,
    };
  }

  async _processEvent(event, context) {
    const header = await this.workHeaderRepo.findByWorkId(event.workId);
    if (!header) {
      return { result: SYNC_RESULT.REJECTED, message: 'Work not found' };
    }

    const lineNum = event.payload?.lineNum;
    if (!lineNum) {
      return { result: SYNC_RESULT.REJECTED, message: 'Line number required' };
    }

    const line = header.lines?.find(l => l.lineNum === lineNum);
    if (!line) {
      return { result: SYNC_RESULT.REJECTED, message: 'Line not found' };
    }

    switch (event.eventType) {
      case SYNC_EVENT_TYPE.START_LINE:
        return this._processStartLine(header, line, event, context);
      
      case SYNC_EVENT_TYPE.COMPLETE_LINE:
        return this._processCompleteLine(header, line, event, context);
      
      case SYNC_EVENT_TYPE.SKIP_LINE:
        return this._processSkipLine(header, line, event, context);
      
      default:
        return { result: SYNC_RESULT.REJECTED, message: `Unknown event type: ${event.eventType}` };
    }
  }

  async _processStartLine(header, line, event, context) {
    if (line.status === 'IN_PROGRESS' || line.status === 'COMPLETED') {
      return { result: SYNC_RESULT.DUPLICATE, message: 'Line already started or completed' };
    }

    await this.prisma.$transaction(async (tx) => {
      await this.startLineUseCase.execute(header.workId, line.lineNum, {}, context, tx);
    });

    return { result: SYNC_RESULT.SUCCESS, message: 'Line started' };
  }

  async _processCompleteLine(header, line, event, context) {
    if (line.status === 'COMPLETED') {
      return { result: SYNC_RESULT.DUPLICATE, message: 'Line already completed' };
    }

    await this.prisma.$transaction(async (tx) => {
      await this.completeLineUseCase.execute(header.workId, line.lineNum, {
        actualQty: event.payload.actualQty,
        scannedLocationCode: event.payload.scannedLocationCode,
        externalId: event.externalId,
      }, context, tx);
    });

    return { result: SYNC_RESULT.SUCCESS, message: 'Line completed' };
  }

  async _processSkipLine(header, line, event, context) {
    if (line.status === 'SKIPPED') {
      return { result: SYNC_RESULT.DUPLICATE, message: 'Line already skipped' };
    }

    await this.prisma.$transaction(async (tx) => {
      await this.skipLineUseCase.execute(header.workId, line.lineNum, {
        reasonCode: event.payload.reasonCode,
        remark: event.payload.remark,
        externalId: event.externalId,
      }, context, tx);
    });

    return { result: SYNC_RESULT.SUCCESS, message: 'Line skipped' };
  }
}

module.exports = { SyncBatchUseCase };
