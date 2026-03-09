import { delay, paginate } from './utils'
import { masterDataMockApi } from './masterData.mock'

const db = masterDataMockApi.__db

const inventoryControlDb = {
  moveOrders: [
    { id: 'mo-001', moveNumber: 'MO-20260308-0001', warehouseId: 'wh-001', executionMode: 'DIRECT', status: 'COMPLETED', requestedBy: 'keeper.user', confirmedBy: 'manager.user', completedBy: 'keeper.user', reasonCode: 'CONSOLIDATE', createdAt: '2026-03-08T08:00:00Z', updatedAt: '2026-03-08T09:30:00Z', lines: [
      { id: 'mol-001', lineNo: 1, itemId: 'item-001', ownerId: 'owner-001', fromLocationId: 'loc-001', toLocationId: 'loc-002', inventoryStatus: 'AVAILABLE', requestedQty: 5000, executedQty: 5000, uom: 'KG', status: 'COMPLETED' },
    ]},
    { id: 'mo-002', moveNumber: 'MO-20260308-0002', warehouseId: 'wh-001', executionMode: 'DIRECT', status: 'CONFIRMED', requestedBy: 'keeper.user', confirmedBy: 'manager.user', completedBy: null, reasonCode: 'REPLENISH', createdAt: '2026-03-08T10:00:00Z', updatedAt: '2026-03-08T10:30:00Z', lines: [
      { id: 'mol-002', lineNo: 1, itemId: 'item-002', ownerId: 'owner-001', fromLocationId: 'loc-002', toLocationId: 'loc-003', inventoryStatus: 'AVAILABLE', requestedQty: 8000, executedQty: null, uom: 'KG', status: 'OPEN' },
    ]},
    { id: 'mo-003', moveNumber: 'MO-20260308-0003', warehouseId: 'wh-001', executionMode: 'DIRECT', status: 'DRAFT', requestedBy: 'keeper.user', confirmedBy: null, completedBy: null, reasonCode: null, createdAt: '2026-03-08T11:00:00Z', updatedAt: '2026-03-08T11:00:00Z', lines: [
      { id: 'mol-003', lineNo: 1, itemId: 'item-001', ownerId: 'owner-002', fromLocationId: 'loc-001', toLocationId: 'loc-004', inventoryStatus: 'AVAILABLE', requestedQty: 3000, executedQty: null, uom: 'KG', status: 'OPEN' },
    ]},
  ],
  transferOrders: [
    { id: 'to-001', transferNumber: 'TO-20260308-0001', fromWarehouseId: 'wh-001', toWarehouseId: 'wh-002', executionMode: 'DIRECT', status: 'RECEIVED', vehicleNumber: '51D-99887', shippedBy: 'keeper.user', receivedBy: 'receiver.user', actualShipAt: '2026-03-08T07:00:00Z', actualReceiveAt: '2026-03-08T14:00:00Z', createdAt: '2026-03-08T06:00:00Z', updatedAt: '2026-03-08T14:00:00Z', lines: [
      { id: 'tol-001', lineNo: 1, itemId: 'item-001', ownerId: 'owner-001', uom: 'KG', requestedQty: 10000, shippedQty: 10000, receivedQty: 9950, varianceQty: 50, fromLocationId: 'loc-001', toLocationId: 'loc-010', inventoryStatus: 'AVAILABLE', lineStatus: 'RECEIVED', varianceReasonCode: 'SHORTAGE_MINOR' },
    ]},
    { id: 'to-002', transferNumber: 'TO-20260308-0002', fromWarehouseId: 'wh-001', toWarehouseId: 'wh-002', executionMode: 'DIRECT', status: 'IN_TRANSIT', vehicleNumber: '60H-12345', shippedBy: 'keeper.user', receivedBy: null, actualShipAt: '2026-03-08T12:00:00Z', actualReceiveAt: null, createdAt: '2026-03-08T11:00:00Z', updatedAt: '2026-03-08T12:00:00Z', lines: [
      { id: 'tol-002', lineNo: 1, itemId: 'item-002', ownerId: 'owner-001', uom: 'KG', requestedQty: 15000, shippedQty: 15000, receivedQty: null, varianceQty: null, fromLocationId: 'loc-002', toLocationId: null, inventoryStatus: 'AVAILABLE', lineStatus: 'SHIPPED' },
    ]},
    { id: 'to-003', transferNumber: 'TO-20260308-0003', fromWarehouseId: 'wh-002', toWarehouseId: 'wh-001', executionMode: 'DIRECT', status: 'RELEASED', vehicleNumber: null, shippedBy: null, receivedBy: null, actualShipAt: null, actualReceiveAt: null, createdAt: '2026-03-08T13:00:00Z', updatedAt: '2026-03-08T13:30:00Z', lines: [
      { id: 'tol-003', lineNo: 1, itemId: 'item-001', ownerId: 'owner-002', uom: 'KG', requestedQty: 5000, shippedQty: null, receivedQty: null, varianceQty: null, fromLocationId: 'loc-010', toLocationId: 'loc-001', inventoryStatus: 'AVAILABLE', lineStatus: 'OPEN' },
    ]},
  ],
  statusChanges: [
    { id: 'sc-001', statusChangeNumber: 'SC-20260308-0001', warehouseId: 'wh-001', locationId: 'loc-001', itemId: 'item-001', ownerId: 'owner-001', fromStatus: 'AVAILABLE', toStatus: 'BLOCKED', qty: 2000, uom: 'KG', reasonCode: 'QUALITY_HOLD', reasonText: 'Pending QC inspection', status: 'POSTED', requestedBy: 'manager.user', createdAt: '2026-03-08T09:00:00Z' },
    { id: 'sc-002', statusChangeNumber: 'SC-20260308-0002', warehouseId: 'wh-001', locationId: 'loc-002', itemId: 'item-002', ownerId: 'owner-001', fromStatus: 'BLOCKED', toStatus: 'AVAILABLE', qty: 1500, uom: 'KG', reasonCode: 'QC_PASSED', reasonText: 'QC inspection passed', status: 'POSTED', requestedBy: 'manager.user', createdAt: '2026-03-08T10:00:00Z' },
    { id: 'sc-003', statusChangeNumber: 'SC-20260308-0003', warehouseId: 'wh-001', locationId: 'loc-003', itemId: 'item-001', ownerId: 'owner-002', fromStatus: 'AVAILABLE', toStatus: 'DAMAGED', qty: 500, uom: 'KG', reasonCode: 'DAMAGE_FOUND', reasonText: 'Water damage detected', status: 'POSTED', requestedBy: 'keeper.user', createdAt: '2026-03-08T11:00:00Z' },
  ],
  cycleCounts: [
    { id: 'cc-001', countNumber: 'CC-20260308-0001', warehouseId: 'wh-001', planId: null, countType: 'SPOT', blindCount: true, status: 'POSTED', releasedAt: '2026-03-08T08:00:00Z', countStartedAt: '2026-03-08T08:30:00Z', countCompletedAt: '2026-03-08T09:00:00Z', postedAt: '2026-03-08T09:30:00Z', createdBy: 'manager.user', reviewedBy: 'manager.user', approvedBy: 'manager.user', createdAt: '2026-03-08T07:30:00Z', lines: [
      { id: 'ccl-001', lineNo: 1, locationId: 'loc-001', itemId: 'item-001', ownerId: 'owner-001', inventoryStatus: 'AVAILABLE', snapshotQty: 50000, countedQty: 49800, varianceQty: -200, variancePct: -0.4, recountRequired: false, finalCountedQty: 49800, adjustmentDecision: 'AUTO_POST', issueCode: 'SHORTAGE', countedBy: 'keeper.user', countedAt: '2026-03-08T08:45:00Z' },
    ]},
    { id: 'cc-002', countNumber: 'CC-20260308-0002', warehouseId: 'wh-001', planId: null, countType: 'PARTIAL', blindCount: true, status: 'UNDER_REVIEW', releasedAt: '2026-03-08T10:00:00Z', countStartedAt: '2026-03-08T10:30:00Z', countCompletedAt: '2026-03-08T11:00:00Z', postedAt: null, createdBy: 'manager.user', reviewedBy: null, approvedBy: null, createdAt: '2026-03-08T09:30:00Z', lines: [
      { id: 'ccl-002', lineNo: 1, locationId: 'loc-002', itemId: 'item-002', ownerId: 'owner-001', inventoryStatus: 'AVAILABLE', snapshotQty: 30000, countedQty: 30500, varianceQty: 500, variancePct: 1.67, recountRequired: true, finalCountedQty: null, adjustmentDecision: 'PENDING_APPROVAL', issueCode: 'OVERAGE', countedBy: 'keeper.user', countedAt: '2026-03-08T10:50:00Z' },
    ]},
    { id: 'cc-003', countNumber: 'CC-20260308-0003', warehouseId: 'wh-001', planId: null, countType: 'SPOT', blindCount: true, status: 'RELEASED', releasedAt: '2026-03-08T12:00:00Z', countStartedAt: null, countCompletedAt: null, postedAt: null, createdBy: 'manager.user', reviewedBy: null, approvedBy: null, createdAt: '2026-03-08T11:30:00Z', lines: [
      { id: 'ccl-003', lineNo: 1, locationId: 'loc-003', itemId: 'item-001', ownerId: 'owner-002', inventoryStatus: 'AVAILABLE', snapshotQty: 20000, countedQty: null, varianceQty: null, variancePct: null, recountRequired: false, finalCountedQty: null, adjustmentDecision: null, issueCode: null, countedBy: null, countedAt: null },
    ]},
  ],
  adjustments: [
    { id: 'adj-001', adjustmentNumber: 'ADJ-20260308-0001', warehouseId: 'wh-001', sourceType: 'CYCLE_COUNT', sourceRefId: 'cc-001', status: 'POSTED', approvedBy: 'manager.user', postedBy: 'system', postedAt: '2026-03-08T09:30:00Z', createdAt: '2026-03-08T09:00:00Z', lines: [
      { id: 'adjl-001', lineNo: 1, locationId: 'loc-001', itemId: 'item-001', ownerId: 'owner-001', inventoryStatus: 'AVAILABLE', adjustQty: -200, uom: 'KG', reasonCode: 'COUNT_SHORTAGE', note: 'From cycle count CC-20260308-0001' },
    ]},
    { id: 'adj-002', adjustmentNumber: 'ADJ-20260308-0002', warehouseId: 'wh-001', sourceType: 'MANUAL', sourceRefId: null, status: 'PENDING_APPROVAL', approvedBy: null, postedBy: null, postedAt: null, createdAt: '2026-03-08T13:00:00Z', lines: [
      { id: 'adjl-002', lineNo: 1, locationId: 'loc-002', itemId: 'item-002', ownerId: 'owner-001', inventoryStatus: 'AVAILABLE', adjustQty: 1000, uom: 'KG', reasonCode: 'FOUND_STOCK', note: 'Stock found during cleanup' },
    ]},
  ],
  movementHistory: [
    { id: 'mvh-001', transType: 'RECEIVE', refType: 'RECEIPT', refId: 'rcpt-001', itemId: 'item-001', ownerId: 'owner-001', warehouseId: 'wh-001', locationId: 'loc-001', qty: 50000, uom: 'KG', direction: 'IN', transAt: '2026-03-07T10:00:00Z' },
    { id: 'mvh-002', transType: 'ISSUE', refType: 'SHIPMENT', refId: 'shp-001', itemId: 'item-001', ownerId: 'owner-001', warehouseId: 'wh-001', locationId: 'loc-001', qty: 15000, uom: 'KG', direction: 'OUT', transAt: '2026-03-08T09:45:00Z' },
    { id: 'mvh-003', transType: 'MOVE', refType: 'MOVE_ORDER', refId: 'mo-001', itemId: 'item-001', ownerId: 'owner-001', warehouseId: 'wh-001', locationId: 'loc-002', qty: 5000, uom: 'KG', direction: 'IN', transAt: '2026-03-08T09:30:00Z' },
    { id: 'mvh-004', transType: 'TRANSFER_SHIP', refType: 'TRANSFER_ORDER', refId: 'to-002', itemId: 'item-002', ownerId: 'owner-001', warehouseId: 'wh-001', locationId: 'loc-002', qty: 15000, uom: 'KG', direction: 'OUT', transAt: '2026-03-08T12:00:00Z' },
    { id: 'mvh-005', transType: 'ADJUSTMENT', refType: 'ADJUSTMENT', refId: 'adj-001', itemId: 'item-001', ownerId: 'owner-001', warehouseId: 'wh-001', locationId: 'loc-001', qty: -200, uom: 'KG', direction: 'OUT', transAt: '2026-03-08T09:30:00Z' },
  ],
}

const findEntity = {
  owner: (id) => db.owners.find((item) => item.id === id),
  item: (id) => db.items.find((item) => item.id === id),
  warehouse: (id) => db.warehouses.find((item) => item.id === id),
  location: (id) => db.locations.find((item) => item.id === id),
}

function enrichMoveOrder(mo) {
  return {
    ...mo,
    warehouse: findEntity.warehouse(mo.warehouseId),
    lines: mo.lines.map((line) => ({
      ...line,
      item: findEntity.item(line.itemId),
      owner: findEntity.owner(line.ownerId),
      fromLocation: findEntity.location(line.fromLocationId),
      toLocation: findEntity.location(line.toLocationId),
    })),
  }
}

function enrichTransferOrder(to) {
  return {
    ...to,
    fromWarehouse: findEntity.warehouse(to.fromWarehouseId),
    toWarehouse: findEntity.warehouse(to.toWarehouseId),
    lines: to.lines.map((line) => ({
      ...line,
      item: findEntity.item(line.itemId),
      owner: findEntity.owner(line.ownerId),
      fromLocation: findEntity.location(line.fromLocationId),
      toLocation: line.toLocationId ? findEntity.location(line.toLocationId) : null,
    })),
  }
}

function enrichCycleCount(cc) {
  return {
    ...cc,
    warehouse: findEntity.warehouse(cc.warehouseId),
    lines: cc.lines.map((line) => ({
      ...line,
      location: findEntity.location(line.locationId),
      item: findEntity.item(line.itemId),
      owner: findEntity.owner(line.ownerId),
    })),
  }
}

export const inventoryControlMockApi = {
  getOnHand: async (params = {}) => {
    const rows = db.onHand?.filter((row) => {
      return (!params.warehouseId || row.warehouseId === params.warehouseId)
        && (!params.ownerId || row.ownerId === params.ownerId)
        && (!params.itemId || row.itemId === params.itemId)
    }).map((row) => ({
      ...row,
      item: findEntity.item(row.itemId),
      owner: findEntity.owner(row.ownerId),
      warehouse: findEntity.warehouse(row.warehouseId),
      location: findEntity.location(row.locationId),
    })) || []
    return delay({ ...paginate(rows, params.page, params.limit) })
  },

  getOnHandByItem: async (itemId, params = {}) => {
    const rows = db.onHand?.filter((row) => row.itemId === itemId && (!params.warehouseId || row.warehouseId === params.warehouseId)).map((row) => ({
      ...row,
      item: findEntity.item(row.itemId),
      owner: findEntity.owner(row.ownerId),
      warehouse: findEntity.warehouse(row.warehouseId),
      location: findEntity.location(row.locationId),
    })) || []
    return delay({ data: rows })
  },

  getMovementHistory: async (params = {}) => {
    const rows = inventoryControlDb.movementHistory.filter((row) => {
      return (!params.itemId || row.itemId === params.itemId)
        && (!params.ownerId || row.ownerId === params.ownerId)
        && (!params.warehouseId || row.warehouseId === params.warehouseId)
        && (!params.transType || row.transType === params.transType)
    }).map((row) => ({
      ...row,
      item: findEntity.item(row.itemId),
      owner: findEntity.owner(row.ownerId),
      warehouse: findEntity.warehouse(row.warehouseId),
      location: findEntity.location(row.locationId),
    }))
    return delay({ ...paginate(rows, params.page, params.limit) })
  },

  getMoveOrders: async (params = {}) => {
    const rows = inventoryControlDb.moveOrders.filter((row) => {
      return (!params.warehouseId || row.warehouseId === params.warehouseId)
        && (!params.status || row.status === params.status)
    }).map(enrichMoveOrder)
    return delay({ ...paginate(rows, params.page, params.limit) })
  },

  getMoveOrderById: async (id) => {
    const mo = inventoryControlDb.moveOrders.find((m) => m.id === id)
    return delay({ data: mo ? enrichMoveOrder(mo) : null })
  },

  createMoveOrder: async (data) => {
    const mo = {
      id: `mo-${Date.now()}`,
      moveNumber: `MO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(inventoryControlDb.moveOrders.length + 1).padStart(4, '0')}`,
      warehouseId: data.warehouseId,
      executionMode: data.executionMode || 'DIRECT',
      status: 'DRAFT',
      requestedBy: data.requestedBy || 'frontend.user',
      confirmedBy: null,
      completedBy: null,
      reasonCode: data.reasonCode || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lines: (data.lines || []).map((line, index) => ({
        id: `mol-${Date.now()}-${index}`,
        lineNo: index + 1,
        itemId: line.itemId,
        ownerId: line.ownerId,
        fromLocationId: line.fromLocationId,
        toLocationId: line.toLocationId,
        inventoryStatus: line.inventoryStatus || 'AVAILABLE',
        requestedQty: Number(line.requestedQty || 0),
        executedQty: null,
        uom: line.uom || 'KG',
        status: 'OPEN',
      })),
    }
    inventoryControlDb.moveOrders.unshift(mo)
    return delay({ data: enrichMoveOrder(mo) })
  },

  confirmMoveOrder: async (id) => {
    const index = inventoryControlDb.moveOrders.findIndex((m) => m.id === id)
    inventoryControlDb.moveOrders[index] = { ...inventoryControlDb.moveOrders[index], status: 'CONFIRMED', confirmedBy: 'manager.user', updatedAt: new Date().toISOString() }
    return delay({ data: enrichMoveOrder(inventoryControlDb.moveOrders[index]) })
  },

  executeMoveOrder: async (id) => {
    const index = inventoryControlDb.moveOrders.findIndex((m) => m.id === id)
    const mo = inventoryControlDb.moveOrders[index]
    const lines = mo.lines.map((line) => ({ ...line, executedQty: line.requestedQty, status: 'COMPLETED' }))
    inventoryControlDb.moveOrders[index] = { ...mo, status: 'COMPLETED', completedBy: 'keeper.user', updatedAt: new Date().toISOString(), lines }
    return delay({ data: enrichMoveOrder(inventoryControlDb.moveOrders[index]) })
  },

  cancelMoveOrder: async (id) => {
    const index = inventoryControlDb.moveOrders.findIndex((m) => m.id === id)
    inventoryControlDb.moveOrders[index] = { ...inventoryControlDb.moveOrders[index], status: 'CANCELLED', updatedAt: new Date().toISOString() }
    return delay({ data: enrichMoveOrder(inventoryControlDb.moveOrders[index]) })
  },

  getTransferOrders: async (params = {}) => {
    const rows = inventoryControlDb.transferOrders.filter((row) => {
      return (!params.fromWarehouseId || row.fromWarehouseId === params.fromWarehouseId)
        && (!params.toWarehouseId || row.toWarehouseId === params.toWarehouseId)
        && (!params.status || row.status === params.status)
    }).map(enrichTransferOrder)
    return delay({ ...paginate(rows, params.page, params.limit) })
  },

  getTransferOrderById: async (id) => {
    const to = inventoryControlDb.transferOrders.find((t) => t.id === id)
    return delay({ data: to ? enrichTransferOrder(to) : null })
  },

  createTransferOrder: async (data) => {
    const to = {
      id: `to-${Date.now()}`,
      transferNumber: `TO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(inventoryControlDb.transferOrders.length + 1).padStart(4, '0')}`,
      fromWarehouseId: data.fromWarehouseId,
      toWarehouseId: data.toWarehouseId,
      executionMode: data.executionMode || 'DIRECT',
      status: 'CREATED',
      vehicleNumber: data.vehicleNumber || null,
      shippedBy: null,
      receivedBy: null,
      actualShipAt: null,
      actualReceiveAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lines: (data.lines || []).map((line, index) => ({
        id: `tol-${Date.now()}-${index}`,
        lineNo: index + 1,
        itemId: line.itemId,
        ownerId: line.ownerId,
        uom: line.uom || 'KG',
        requestedQty: Number(line.requestedQty || 0),
        shippedQty: null,
        receivedQty: null,
        varianceQty: null,
        fromLocationId: line.fromLocationId,
        toLocationId: line.toLocationId || null,
        inventoryStatus: line.inventoryStatus || 'AVAILABLE',
        lineStatus: 'OPEN',
      })),
    }
    inventoryControlDb.transferOrders.unshift(to)
    return delay({ data: enrichTransferOrder(to) })
  },

  releaseTransferOrder: async (id) => {
    const index = inventoryControlDb.transferOrders.findIndex((t) => t.id === id)
    inventoryControlDb.transferOrders[index] = { ...inventoryControlDb.transferOrders[index], status: 'RELEASED', updatedAt: new Date().toISOString() }
    return delay({ data: enrichTransferOrder(inventoryControlDb.transferOrders[index]) })
  },

  shipTransferOrder: async (id, data = {}) => {
    const index = inventoryControlDb.transferOrders.findIndex((t) => t.id === id)
    const to = inventoryControlDb.transferOrders[index]
    const lines = to.lines.map((line) => ({ ...line, shippedQty: line.requestedQty, lineStatus: 'SHIPPED' }))
    inventoryControlDb.transferOrders[index] = { ...to, status: 'IN_TRANSIT', shippedBy: 'keeper.user', actualShipAt: new Date().toISOString(), vehicleNumber: data.vehicleNumber || to.vehicleNumber, updatedAt: new Date().toISOString(), lines }
    return delay({ data: enrichTransferOrder(inventoryControlDb.transferOrders[index]) })
  },

  receiveTransferOrder: async (id, data = {}) => {
    const index = inventoryControlDb.transferOrders.findIndex((t) => t.id === id)
    const to = inventoryControlDb.transferOrders[index]
    const lines = to.lines.map((line, i) => {
      const receivedQty = data.lines?.[i]?.receivedQty ?? line.shippedQty
      return { ...line, receivedQty, varianceQty: line.shippedQty - receivedQty, lineStatus: 'RECEIVED' }
    })
    inventoryControlDb.transferOrders[index] = { ...to, status: 'RECEIVED', receivedBy: 'receiver.user', actualReceiveAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lines }
    return delay({ data: enrichTransferOrder(inventoryControlDb.transferOrders[index]) })
  },

  closeTransferOrder: async (id) => {
    const index = inventoryControlDb.transferOrders.findIndex((t) => t.id === id)
    inventoryControlDb.transferOrders[index] = { ...inventoryControlDb.transferOrders[index], status: 'CLOSED', updatedAt: new Date().toISOString() }
    return delay({ data: enrichTransferOrder(inventoryControlDb.transferOrders[index]) })
  },

  cancelTransferOrder: async (id) => {
    const index = inventoryControlDb.transferOrders.findIndex((t) => t.id === id)
    inventoryControlDb.transferOrders[index] = { ...inventoryControlDb.transferOrders[index], status: 'CANCELLED', updatedAt: new Date().toISOString() }
    return delay({ data: enrichTransferOrder(inventoryControlDb.transferOrders[index]) })
  },

  getStatusChanges: async (params = {}) => {
    const rows = inventoryControlDb.statusChanges.filter((row) => {
      return (!params.warehouseId || row.warehouseId === params.warehouseId)
        && (!params.itemId || row.itemId === params.itemId)
    }).map((row) => ({
      ...row,
      warehouse: findEntity.warehouse(row.warehouseId),
      location: findEntity.location(row.locationId),
      item: findEntity.item(row.itemId),
      owner: findEntity.owner(row.ownerId),
    }))
    return delay({ ...paginate(rows, params.page, params.limit) })
  },

  createStatusChange: async (data) => {
    const sc = {
      id: `sc-${Date.now()}`,
      statusChangeNumber: `SC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(inventoryControlDb.statusChanges.length + 1).padStart(4, '0')}`,
      warehouseId: data.warehouseId,
      locationId: data.locationId,
      itemId: data.itemId,
      ownerId: data.ownerId,
      fromStatus: data.fromStatus,
      toStatus: data.toStatus,
      qty: Number(data.qty),
      uom: data.uom || 'KG',
      reasonCode: data.reasonCode,
      reasonText: data.reasonText || null,
      status: 'POSTED',
      requestedBy: data.requestedBy || 'frontend.user',
      createdAt: new Date().toISOString(),
    }
    inventoryControlDb.statusChanges.unshift(sc)
    return delay({ data: { ...sc, warehouse: findEntity.warehouse(sc.warehouseId), location: findEntity.location(sc.locationId), item: findEntity.item(sc.itemId), owner: findEntity.owner(sc.ownerId) } })
  },

  getCycleCounts: async (params = {}) => {
    const rows = inventoryControlDb.cycleCounts.filter((row) => {
      return (!params.warehouseId || row.warehouseId === params.warehouseId)
        && (!params.status || row.status === params.status)
    }).map(enrichCycleCount)
    return delay({ ...paginate(rows, params.page, params.limit) })
  },

  getCycleCountById: async (id) => {
    const cc = inventoryControlDb.cycleCounts.find((c) => c.id === id)
    return delay({ data: cc ? enrichCycleCount(cc) : null })
  },

  createCycleCount: async (data) => {
    const cc = {
      id: `cc-${Date.now()}`,
      countNumber: `CC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(inventoryControlDb.cycleCounts.length + 1).padStart(4, '0')}`,
      warehouseId: data.warehouseId,
      planId: data.planId || null,
      countType: data.countType || 'SPOT',
      blindCount: data.blindCount ?? true,
      status: 'CREATED',
      releasedAt: null,
      countStartedAt: null,
      countCompletedAt: null,
      postedAt: null,
      createdBy: data.createdBy || 'frontend.user',
      reviewedBy: null,
      approvedBy: null,
      createdAt: new Date().toISOString(),
      lines: (data.lines || []).map((line, index) => ({
        id: `ccl-${Date.now()}-${index}`,
        lineNo: index + 1,
        locationId: line.locationId,
        itemId: line.itemId,
        ownerId: line.ownerId,
        inventoryStatus: line.inventoryStatus || 'AVAILABLE',
        snapshotQty: Number(line.snapshotQty || 0),
        countedQty: null,
        varianceQty: null,
        variancePct: null,
        recountRequired: false,
        finalCountedQty: null,
        adjustmentDecision: null,
        issueCode: null,
        countedBy: null,
        countedAt: null,
      })),
    }
    inventoryControlDb.cycleCounts.unshift(cc)
    return delay({ data: enrichCycleCount(cc) })
  },

  releaseCycleCount: async (id) => {
    const index = inventoryControlDb.cycleCounts.findIndex((c) => c.id === id)
    inventoryControlDb.cycleCounts[index] = { ...inventoryControlDb.cycleCounts[index], status: 'RELEASED', releasedAt: new Date().toISOString() }
    return delay({ data: enrichCycleCount(inventoryControlDb.cycleCounts[index]) })
  },

  submitCycleCount: async (id, data = {}) => {
    const index = inventoryControlDb.cycleCounts.findIndex((c) => c.id === id)
    const cc = inventoryControlDb.cycleCounts[index]
    const lines = cc.lines.map((line, i) => {
      const countedQty = data.lines?.[i]?.countedQty ?? line.snapshotQty
      const varianceQty = countedQty - line.snapshotQty
      const variancePct = line.snapshotQty > 0 ? (varianceQty / line.snapshotQty) * 100 : 0
      return { ...line, countedQty, varianceQty, variancePct: Number(variancePct.toFixed(2)), countedBy: 'keeper.user', countedAt: new Date().toISOString() }
    })
    inventoryControlDb.cycleCounts[index] = { ...cc, status: 'UNDER_REVIEW', countCompletedAt: new Date().toISOString(), lines }
    return delay({ data: enrichCycleCount(inventoryControlDb.cycleCounts[index]) })
  },

  approveCycleCount: async (id) => {
    const index = inventoryControlDb.cycleCounts.findIndex((c) => c.id === id)
    inventoryControlDb.cycleCounts[index] = { ...inventoryControlDb.cycleCounts[index], status: 'APPROVED', reviewedBy: 'manager.user', approvedBy: 'manager.user' }
    return delay({ data: enrichCycleCount(inventoryControlDb.cycleCounts[index]) })
  },

  postCycleCount: async (id) => {
    const index = inventoryControlDb.cycleCounts.findIndex((c) => c.id === id)
    inventoryControlDb.cycleCounts[index] = { ...inventoryControlDb.cycleCounts[index], status: 'POSTED', postedAt: new Date().toISOString() }
    return delay({ data: enrichCycleCount(inventoryControlDb.cycleCounts[index]) })
  },

  getAdjustments: async (params = {}) => {
    const rows = inventoryControlDb.adjustments.filter((row) => {
      return (!params.warehouseId || row.warehouseId === params.warehouseId)
        && (!params.status || row.status === params.status)
        && (!params.sourceType || row.sourceType === params.sourceType)
    }).map((adj) => ({
      ...adj,
      warehouse: findEntity.warehouse(adj.warehouseId),
      lines: adj.lines.map((line) => ({
        ...line,
        location: findEntity.location(line.locationId),
        item: findEntity.item(line.itemId),
        owner: findEntity.owner(line.ownerId),
      })),
    }))
    return delay({ ...paginate(rows, params.page, params.limit) })
  },

  createAdjustment: async (data) => {
    const adj = {
      id: `adj-${Date.now()}`,
      adjustmentNumber: `ADJ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(inventoryControlDb.adjustments.length + 1).padStart(4, '0')}`,
      warehouseId: data.warehouseId,
      sourceType: data.sourceType || 'MANUAL',
      sourceRefId: data.sourceRefId || null,
      status: 'DRAFT',
      approvedBy: null,
      postedBy: null,
      postedAt: null,
      createdAt: new Date().toISOString(),
      lines: (data.lines || []).map((line, index) => ({
        id: `adjl-${Date.now()}-${index}`,
        lineNo: index + 1,
        locationId: line.locationId,
        itemId: line.itemId,
        ownerId: line.ownerId,
        inventoryStatus: line.inventoryStatus || 'AVAILABLE',
        adjustQty: Number(line.adjustQty || 0),
        uom: line.uom || 'KG',
        reasonCode: line.reasonCode,
        note: line.note || null,
      })),
    }
    inventoryControlDb.adjustments.unshift(adj)
    return delay({ data: adj })
  },

  submitAdjustment: async (id) => {
    const index = inventoryControlDb.adjustments.findIndex((a) => a.id === id)
    inventoryControlDb.adjustments[index] = { ...inventoryControlDb.adjustments[index], status: 'PENDING_APPROVAL' }
    return delay({ data: inventoryControlDb.adjustments[index] })
  },

  approveAdjustment: async (id) => {
    const index = inventoryControlDb.adjustments.findIndex((a) => a.id === id)
    inventoryControlDb.adjustments[index] = { ...inventoryControlDb.adjustments[index], status: 'APPROVED', approvedBy: 'manager.user' }
    return delay({ data: inventoryControlDb.adjustments[index] })
  },

  postAdjustment: async (id) => {
    const index = inventoryControlDb.adjustments.findIndex((a) => a.id === id)
    inventoryControlDb.adjustments[index] = { ...inventoryControlDb.adjustments[index], status: 'POSTED', postedBy: 'system', postedAt: new Date().toISOString() }
    return delay({ data: inventoryControlDb.adjustments[index] })
  },
}
