/**
 * Module 7: Work Execution - Data Mappers
 */

function mapWorkHeaderToResponse(header) {
  if (!header) return null;
  
  return {
    id: header.id,
    workId: header.workId,
    workType: header.workType,
    status: header.status,
    priorityNo: header.priorityNo,
    warehouseId: header.warehouseId,
    zoneId: header.zoneId,
    sourceModule: header.sourceModule,
    sourceType: header.sourceType,
    sourceRefId: header.sourceRefId,
    sourceRefLineId: header.sourceRefLineId,
    sourceOwnerId: header.sourceOwnerId,
    assignedTo: header.assignedTo,
    assignedAt: header.assignedAt,
    startedAt: header.startedAt,
    completedAt: header.completedAt,
    cancelledAt: header.cancelledAt,
    cancelReasonCode: header.cancelReasonCode,
    assignmentMode: header.assignmentMode,
    createdAt: header.createdAt,
    updatedAt: header.updatedAt,
    lines: header.lines?.map(mapWorkLineToResponse) || [],
    lineSummary: header.lines ? getLineSummary(header.lines) : null,
  };
}

function mapWorkLineToResponse(line) {
  if (!line) return null;
  
  return {
    id: line.id,
    lineNum: line.lineNum,
    stepType: line.stepType,
    status: line.status,
    itemId: line.itemId,
    ownerId: line.ownerId,
    fromWarehouseId: line.fromWarehouseId,
    fromLocationId: line.fromLocationId,
    toWarehouseId: line.toWarehouseId,
    toLocationId: line.toLocationId,
    expectedQty: Number(line.expectedQty),
    actualQty: line.actualQty ? Number(line.actualQty) : null,
    varianceQty: line.varianceQty ? Number(line.varianceQty) : null,
    uom: line.uom,
    inventoryStatusFrom: line.inventoryStatusFrom,
    inventoryStatusTo: line.inventoryStatusTo,
    scannedLocationCode: line.scannedLocationCode,
    scannedLocationId: line.scannedLocationId,
    reasonCode: line.reasonCode,
    startedAt: line.startedAt,
    completedAt: line.completedAt,
    completedBy: line.completedBy,
    postingStatus: line.postingStatus,
    postingRefId: line.postingRefId,
  };
}

function mapWorkListItemToResponse(header) {
  return {
    id: header.id,
    workId: header.workId,
    workType: header.workType,
    status: header.status,
    priorityNo: header.priorityNo,
    warehouseId: header.warehouseId,
    sourceModule: header.sourceModule,
    sourceType: header.sourceType,
    sourceRefId: header.sourceRefId,
    assignedTo: header.assignedTo,
    assignedAt: header.assignedAt,
    startedAt: header.startedAt,
    createdAt: header.createdAt,
    lineSummary: header.lines ? getLineSummary(header.lines) : null,
  };
}

function mapMobileWorkToResponse(header) {
  return {
    id: header.id,
    workId: header.workId,
    workType: header.workType,
    status: header.status,
    priorityNo: header.priorityNo,
    warehouseId: header.warehouseId,
    sourceRefId: header.sourceRefId,
    assignedTo: header.assignedTo,
    lines: header.lines?.map(line => ({
      id: line.id,
      lineNum: line.lineNum,
      stepType: line.stepType,
      status: line.status,
      itemId: line.itemId,
      expectedQty: Number(line.expectedQty),
      uom: line.uom,
      fromLocationId: line.fromLocationId,
      toLocationId: line.toLocationId,
    })) || [],
    totalLines: header.lines?.length || 0,
  };
}

function getLineSummary(lines) {
  if (!lines || lines.length === 0) {
    return { total: 0, completed: 0, open: 0, inProgress: 0, skipped: 0 };
  }
  
  return {
    total: lines.length,
    completed: lines.filter(l => l.status === 'COMPLETED').length,
    open: lines.filter(l => l.status === 'OPEN').length,
    inProgress: lines.filter(l => l.status === 'IN_PROGRESS').length,
    skipped: lines.filter(l => l.status === 'SKIPPED').length,
    cancelled: lines.filter(l => l.status === 'CANCELLED').length,
  };
}

function mapExceptionToResponse(exception) {
  if (!exception) return null;
  
  return {
    id: exception.id,
    workHeaderId: exception.workHeaderId,
    workLineId: exception.workLineId,
    exceptionType: exception.exceptionType,
    severity: exception.severity,
    status: exception.status,
    reasonCode: exception.reasonCode,
    detailText: exception.detailText,
    resolutionText: exception.resolutionText,
    resolvedBy: exception.resolvedBy,
    resolvedAt: exception.resolvedAt,
    createdAt: exception.createdAt,
    createdBy: exception.createdBy,
  };
}

function mapSyncBatchToResponse(batch) {
  if (!batch) return null;
  
  return {
    id: batch.id,
    batchNo: batch.batchNo,
    deviceId: batch.deviceId,
    syncStatus: batch.syncStatus,
    eventCount: batch.eventCount,
    successCount: batch.successCount,
    duplicateCount: batch.duplicateCount,
    conflictCount: batch.conflictCount,
    createdAt: batch.createdAt,
    processedAt: batch.processedAt,
    events: batch.events?.map(mapSyncEventToResponse) || [],
  };
}

function mapSyncEventToResponse(event) {
  if (!event) return null;
  
  return {
    id: event.id,
    externalId: event.externalId,
    eventType: event.eventType,
    workId: event.workId,
    processingResult: event.processingResult,
    resultMessage: event.resultMessage,
    processedAt: event.processedAt,
  };
}

module.exports = {
  mapWorkHeaderToResponse,
  mapWorkLineToResponse,
  mapWorkListItemToResponse,
  mapMobileWorkToResponse,
  getLineSummary,
  mapExceptionToResponse,
  mapSyncBatchToResponse,
  mapSyncEventToResponse,
};
