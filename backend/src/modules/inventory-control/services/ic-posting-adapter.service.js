/**
 * Module 6: Inventory Control - Posting Adapter Service
 * Adapter to call Module 3 (Inventory Core) Posting Engine
 */

const { IcPostingAdapterError } = require('../domain/ic.errors');

async function postInternalMove(moveOrder, lines, correlationId, tx) {
  try {
    const postingEngine = require('../../inventory-core/application/postingEngine');
    const results = [];

    for (const line of lines) {
      const moveResult = await postingEngine.postTransaction({
        transType: 'MOVE',
        refType: 'MOVE_ORDER',
        refId: moveOrder.moveNumber,
        refLineId: `${line.lineNo}`,
        itemId: line.itemId,
        qty: line.executedQty || line.requestedQty,
        uomCode: line.uom,
        dimFrom: {
          warehouseId: moveOrder.warehouseId,
          locationId: line.fromLocationId,
          ownerId: line.ownerId,
          inventoryStatusCode: line.inventoryStatus,
        },
        dimTo: {
          warehouseId: moveOrder.warehouseId,
          locationId: line.toLocationId,
          ownerId: line.ownerId,
          inventoryStatusCode: line.inventoryStatus,
        },
        reasonCode: moveOrder.reasonCode,
        externalId: `${moveOrder.externalId}-L${line.lineNo}`,
        correlationId,
        sourceApp: moveOrder.sourceApp,
        postedBy: moveOrder.requestedBy,
      }, tx);

      results.push({ lineId: line.id, transId: moveResult.transId });
    }

    return { success: true, results };
  } catch (error) {
    throw new IcPostingAdapterError(`Failed to post internal move: ${error.message}`, {
      moveOrderId: moveOrder.id,
      error: error.message,
    });
  }
}

async function postTransferShip(transferOrder, lines, correlationId, tx) {
  try {
    const postingEngine = require('../../inventory-core/application/postingEngine');
    const results = [];

    for (const line of lines) {
      const shipResult = await postingEngine.postTransaction({
        transType: 'TRANSFER_OUT',
        refType: 'TRANSFER_ORDER',
        refId: transferOrder.transferNumber,
        refLineId: `${line.lineNo}`,
        itemId: line.itemId,
        qty: line.shippedQty,
        uomCode: line.uom,
        dimFrom: {
          warehouseId: transferOrder.fromWarehouseId,
          locationId: line.fromLocationId,
          ownerId: line.ownerId,
          inventoryStatusCode: line.inventoryStatus,
        },
        dimTo: {
          warehouseId: transferOrder.fromWarehouseId,
          locationId: line.fromLocationId,
          ownerId: line.ownerId,
          inventoryStatusCode: 'IN_TRANSIT',
        },
        reasonCode: null,
        externalId: `${transferOrder.externalId}-SHIP-L${line.lineNo}`,
        correlationId,
        sourceApp: transferOrder.sourceApp,
        postedBy: transferOrder.shippedBy,
      }, tx);

      results.push({ lineId: line.id, transId: shipResult.transId });
    }

    return { success: true, results };
  } catch (error) {
    throw new IcPostingAdapterError(`Failed to post transfer ship: ${error.message}`, {
      transferOrderId: transferOrder.id,
      error: error.message,
    });
  }
}

async function postTransferReceive(transferOrder, lines, correlationId, tx) {
  try {
    const postingEngine = require('../../inventory-core/application/postingEngine');
    const results = [];

    for (const line of lines) {
      const receiveResult = await postingEngine.postTransaction({
        transType: 'TRANSFER_IN',
        refType: 'TRANSFER_ORDER',
        refId: transferOrder.transferNumber,
        refLineId: `${line.lineNo}`,
        itemId: line.itemId,
        qty: line.receivedQty,
        uomCode: line.uom,
        dimFrom: {
          warehouseId: transferOrder.toWarehouseId,
          locationId: line.toLocationId,
          ownerId: line.ownerId,
          inventoryStatusCode: 'IN_TRANSIT',
        },
        dimTo: {
          warehouseId: transferOrder.toWarehouseId,
          locationId: line.toLocationId,
          ownerId: line.ownerId,
          inventoryStatusCode: line.inventoryStatus,
        },
        reasonCode: null,
        externalId: `${transferOrder.externalId}-RECV-L${line.lineNo}`,
        correlationId,
        sourceApp: transferOrder.sourceApp,
        postedBy: transferOrder.receivedBy,
      }, tx);

      results.push({ lineId: line.id, transId: receiveResult.transId });
    }

    return { success: true, results };
  } catch (error) {
    throw new IcPostingAdapterError(`Failed to post transfer receive: ${error.message}`, {
      transferOrderId: transferOrder.id,
      error: error.message,
    });
  }
}

async function postStatusChange(statusChange, correlationId, tx) {
  try {
    const postingEngine = require('../../inventory-core/application/postingEngine');

    const result = await postingEngine.postTransaction({
      transType: 'STATUS_CHANGE',
      refType: 'STATUS_CHANGE',
      refId: statusChange.statusChangeNumber,
      refLineId: null,
      itemId: statusChange.itemId,
      qty: statusChange.qty,
      uomCode: statusChange.uom,
      dimFrom: {
        warehouseId: statusChange.warehouseId,
        locationId: statusChange.locationId,
        ownerId: statusChange.ownerId,
        inventoryStatusCode: statusChange.fromStatus,
      },
      dimTo: {
        warehouseId: statusChange.warehouseId,
        locationId: statusChange.locationId,
        ownerId: statusChange.ownerId,
        inventoryStatusCode: statusChange.toStatus,
      },
      reasonCode: statusChange.reasonCode,
      externalId: statusChange.externalId,
      correlationId,
      sourceApp: statusChange.sourceApp,
      postedBy: statusChange.requestedBy,
    }, tx);

    return { success: true, transId: result.transId };
  } catch (error) {
    throw new IcPostingAdapterError(`Failed to post status change: ${error.message}`, {
      statusChangeId: statusChange.id,
      error: error.message,
    });
  }
}

async function postAdjustment(adjustment, lines, correlationId, tx) {
  try {
    const postingEngine = require('../../inventory-core/application/postingEngine');
    const results = [];

    for (const line of lines) {
      const qtyDelta = parseFloat(line.qtyDelta);
      const transType = qtyDelta > 0 ? 'COUNT_GAIN' : 'COUNT_LOSS';

      const adjResult = await postingEngine.postTransaction({
        transType,
        refType: 'ADJUSTMENT',
        refId: adjustment.adjustmentNumber,
        refLineId: `${line.lineNo}`,
        itemId: line.itemId,
        qty: Math.abs(qtyDelta),
        uomCode: line.uom,
        dimFrom: qtyDelta < 0 ? {
          warehouseId: line.warehouseId,
          locationId: line.locationId,
          ownerId: line.ownerId,
          inventoryStatusCode: line.inventoryStatus,
        } : null,
        dimTo: qtyDelta > 0 ? {
          warehouseId: line.warehouseId,
          locationId: line.locationId,
          ownerId: line.ownerId,
          inventoryStatusCode: line.inventoryStatus,
        } : null,
        reasonCode: line.reasonCode,
        externalId: `${adjustment.externalId}-L${line.lineNo}`,
        correlationId,
        sourceApp: adjustment.sourceApp,
        postedBy: adjustment.requestedBy,
      }, tx);

      results.push({ lineId: line.id, transId: adjResult.transId });
    }

    return { success: true, results };
  } catch (error) {
    throw new IcPostingAdapterError(`Failed to post adjustment: ${error.message}`, {
      adjustmentId: adjustment.id,
      error: error.message,
    });
  }
}

module.exports = {
  postInternalMove,
  postTransferShip,
  postTransferReceive,
  postStatusChange,
  postAdjustment,
};
