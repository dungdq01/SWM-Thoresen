/**
 * Module 7: Work Execution - Inventory Adapter
 * Adapter to call M3 Inventory Core for posting
 */

const { WORK_TYPES } = require('../domain/work.types');
const { InventoryPostingFailedError } = require('../domain/work.errors');

class InventoryAdapter {
  constructor(prisma, postingEngine) {
    this.prisma = prisma;
    this.postingEngine = postingEngine;
  }

  async postMovement(line, header, context, tx = null) {
    if (!this.postingEngine || typeof this.postingEngine.postMovement !== 'function') {
      return {
        success: false,
        postingRefId: null,
        postingRefType: null,
        errorMessage: 'PostingEngine not configured — cannot post inventory',
      };
    }

    try {
      const postingRequest = this._buildPostingRequest(line, header, context);
      const result = await this.postingEngine.postMovement(postingRequest, tx);
      return {
        success: true,
        postingRefId: result.transId || result.id,
        postingRefType: postingRequest.transType,
      };
    } catch (error) {
      return {
        success: false,
        postingRefId: null,
        postingRefType: this._getTransType(header.workType),
        errorMessage: error.message,
      };
    }
  }

  async reversePosting(params, tx = null) {
    if (!this.postingEngine || typeof this.postingEngine.reverseTransaction !== 'function') {
      return {
        success: false,
        reversalRefId: null,
        errorMessage: 'PostingEngine reversal not configured',
      };
    }

    try {
      const result = await this.postingEngine.reverseTransaction({
        originalTransId: params.originalTransId,
        reasonCode: params.reasonCode,
        correlationId: params.correlationId,
        sourceModule: 'M7',
        createdBy: params.createdBy,
      }, tx);
      return {
        success: true,
        reversalRefId: result.transId || result.id,
      };
    } catch (error) {
      return {
        success: false,
        reversalRefId: null,
        errorMessage: error.message,
      };
    }
  }

  _getTransType(workType) {
    switch (workType) {
      case WORK_TYPES.TRANSFER_PICK: return 'TRANSFER_SHIP';
      case WORK_TYPES.TRANSFER_PUT: return 'TRANSFER_RECEIVE';
      default: return 'MOVE';
    }
  }

  _buildPostingRequest(line, header, context) {
    const baseRequest = {
      externalId: `WE-${line.id}`,
      correlationId: header.correlationId,
      sourceModule: 'M7',
      sourceRefType: 'WORK_LINE',
      sourceRefId: line.id,
      itemId: line.itemId,
      ownerId: line.ownerId,
      qty: Number(line.actualQty),
      uom: line.uom,
      createdBy: context.userId,
      warehouseId: header.warehouseId,
    };

    switch (header.workType) {
      case WORK_TYPES.PUTAWAY:
        return {
          ...baseRequest,
          transType: 'MOVE',
          fromLocationId: line.fromLocationId,
          toLocationId: line.scannedLocationId || line.toLocationId,
          fromInventoryStatus: line.inventoryStatusFrom || 'AVAILABLE',
          toInventoryStatus: line.inventoryStatusTo || 'AVAILABLE',
        };

      case WORK_TYPES.PICK:
        return {
          ...baseRequest,
          transType: 'MOVE',
          fromLocationId: line.fromLocationId,
          toLocationId: line.scannedLocationId || line.toLocationId,
          fromInventoryStatus: line.inventoryStatusFrom || 'AVAILABLE',
          toInventoryStatus: line.inventoryStatusTo || 'AVAILABLE',
        };

      case WORK_TYPES.MOVE:
        return {
          ...baseRequest,
          transType: 'MOVE',
          fromLocationId: line.fromLocationId,
          toLocationId: line.scannedLocationId || line.toLocationId,
          fromInventoryStatus: line.inventoryStatusFrom || 'AVAILABLE',
          toInventoryStatus: line.inventoryStatusTo || 'AVAILABLE',
        };

      case WORK_TYPES.TRANSFER_PICK:
        return {
          ...baseRequest,
          transType: 'TRANSFER_SHIP',
          fromLocationId: line.fromLocationId,
          toLocationId: line.scannedLocationId || line.toLocationId,
          fromWarehouseId: line.fromWarehouseId,
          toWarehouseId: line.toWarehouseId,
        };

      case WORK_TYPES.TRANSFER_PUT:
        return {
          ...baseRequest,
          transType: 'TRANSFER_RECEIVE',
          fromLocationId: line.fromLocationId,
          toLocationId: line.scannedLocationId || line.toLocationId,
          fromWarehouseId: line.fromWarehouseId,
          toWarehouseId: line.toWarehouseId,
        };

      default:
        return {
          ...baseRequest,
          transType: 'MOVE',
          fromLocationId: line.fromLocationId,
          toLocationId: line.scannedLocationId || line.toLocationId,
        };
    }
  }
}

module.exports = { InventoryAdapter };
