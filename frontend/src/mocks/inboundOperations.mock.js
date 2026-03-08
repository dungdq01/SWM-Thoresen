import { delay, includesText, paginate } from './utils'
import { masterDataMockApi } from './masterData.mock'

const db = masterDataMockApi.__db

const receiptDb = {
  receipts: [
    {
      id: 'rcpt-001',
      receiptNumber: 'RCV-20260308-0001',
      receiptType: 'STANDARD',
      poNumber: 'PO-20260308-001',
      asnNumber: 'ASN-20260308-001',
      ownerId: 'owner-001',
      vendorId: 'vendor-002',
      itemId: 'item-001',
      warehouseId: 'wh-001',
      receivingLocationId: 'loc-002',
      vehicleNumber: '51D-12345',
      blNumber: '',
      expectedQty: 30000,
      grossWeightKg: 36500,
      tareWeightKg: 6200,
      netWeightKg: 30300,
      tolerancePctApplied: 2,
      variancePct: 1,
      status: 'RECEIVED',
      attemptNumber: 1,
      isManualEntry: false,
      manualEntryReasonCode: '',
      postedTransId: 'TRX-20260308-000123',
      putawayWorkId: 'PUT-20260308-001',
      cancelReasonCode: '',
      correlationId: 'corr-inb-001',
      sourceApp: 'WEIGHBRIDGE',
      cargoForm: 'BAGGED_50KG',
      bagCount: 606,
      createdBy: 'wb.operator',
      createdAt: '2026-03-08T07:30:00Z',
      updatedAt: '2026-03-08T08:45:00Z',
      integrationStatus: {
        inventoryPosting: 'SUCCESS',
        putaway: 'PENDING',
        billing: 'SUCCESS',
      },
    },
    {
      id: 'rcpt-002',
      receiptNumber: 'RCV-20260308-0002',
      receiptType: 'VESSEL',
      poNumber: 'PO-20260308-002',
      asnNumber: '',
      ownerId: 'owner-002',
      vendorId: 'vendor-001',
      itemId: 'item-002',
      warehouseId: 'wh-001',
      receivingLocationId: 'loc-002',
      vehicleNumber: '51C-77889',
      blNumber: 'BL-TVL-20260308',
      expectedQty: 25000,
      grossWeightKg: 34300,
      tareWeightKg: 6200,
      netWeightKg: 28100,
      tolerancePctApplied: 1.5,
      variancePct: 12.4,
      status: 'REJECTED',
      attemptNumber: 2,
      isManualEntry: false,
      manualEntryReasonCode: '',
      postedTransId: '',
      putawayWorkId: '',
      cancelReasonCode: '',
      correlationId: 'corr-inb-002',
      sourceApp: 'OCR',
      cargoForm: 'BULK',
      bagCount: null,
      createdBy: 'wb.operator',
      createdAt: '2026-03-08T09:10:00Z',
      updatedAt: '2026-03-08T10:05:00Z',
      integrationStatus: {
        inventoryPosting: 'NOT_POSTED',
        putaway: 'NOT_READY',
        billing: 'NOT_READY',
      },
    },
    {
      id: 'rcpt-003',
      receiptNumber: 'RCV-20260308-0003',
      receiptType: 'STANDARD',
      poNumber: 'PO-20260308-003',
      asnNumber: 'ASN-20260308-003',
      ownerId: 'owner-001',
      vendorId: 'vendor-002',
      itemId: 'item-002',
      warehouseId: 'wh-001',
      receivingLocationId: 'loc-002',
      vehicleNumber: '60H-44556',
      blNumber: '',
      expectedQty: 18000,
      grossWeightKg: 0,
      tareWeightKg: 0,
      netWeightKg: 0,
      tolerancePctApplied: 1,
      variancePct: null,
      status: 'AWAITING_WEIGHING',
      attemptNumber: 1,
      isManualEntry: false,
      manualEntryReasonCode: '',
      postedTransId: '',
      putawayWorkId: '',
      cancelReasonCode: '',
      correlationId: 'corr-inb-003',
      sourceApp: 'WEB',
      cargoForm: 'BULK',
      bagCount: null,
      createdBy: 'planner.user',
      createdAt: '2026-03-08T11:00:00Z',
      updatedAt: '2026-03-08T11:10:00Z',
      integrationStatus: {
        inventoryPosting: 'NOT_POSTED',
        putaway: 'NOT_READY',
        billing: 'NOT_READY',
      },
    },
    {
      id: 'rcpt-004',
      receiptNumber: 'RCV-20260308-0004',
      receiptType: 'STANDARD',
      poNumber: 'PO-20260308-004',
      asnNumber: '',
      ownerId: 'owner-002',
      vendorId: 'vendor-002',
      itemId: 'item-001',
      warehouseId: 'wh-001',
      receivingLocationId: 'loc-002',
      vehicleNumber: '51D-90909',
      blNumber: '',
      expectedQty: 20000,
      grossWeightKg: 27000,
      tareWeightKg: 6900,
      netWeightKg: 20100,
      tolerancePctApplied: 2,
      variancePct: 0.5,
      status: 'PUTAWAY',
      attemptNumber: 1,
      isManualEntry: true,
      manualEntryReasonCode: 'WB_FALLBACK',
      postedTransId: 'TRX-20260308-000126',
      putawayWorkId: 'PUT-20260308-004',
      cancelReasonCode: '',
      correlationId: 'corr-inb-004',
      sourceApp: 'WEB',
      cargoForm: 'BAGGED_25KG',
      bagCount: 804,
      createdBy: 'manager.user',
      createdAt: '2026-03-08T12:15:00Z',
      updatedAt: '2026-03-08T13:05:00Z',
      integrationStatus: {
        inventoryPosting: 'SUCCESS',
        putaway: 'IN_PROGRESS',
        billing: 'SUCCESS',
      },
    },
  ],
  statusHistory: [
    { id: 'hist-001', receiptId: 'rcpt-001', fromStatus: 'DRAFT', toStatus: 'AWAITING_WEIGHING', action: 'confirm', actor: 'manager.user', at: '2026-03-08T07:35:00Z', note: 'Receipt confirmed' },
    { id: 'hist-002', receiptId: 'rcpt-001', fromStatus: 'AWAITING_WEIGHING', toStatus: 'WEIGHED_IN', action: 'weigh-in', actor: 'wb.operator', at: '2026-03-08T07:50:00Z', note: 'Gross captured from bridge' },
    { id: 'hist-003', receiptId: 'rcpt-001', fromStatus: 'WEIGHED_IN', toStatus: 'PROCESSING', action: 'start-processing', actor: 'wb.operator', at: '2026-03-08T08:05:00Z', note: 'Truck entered receiving zone' },
    { id: 'hist-004', receiptId: 'rcpt-001', fromStatus: 'PROCESSING', toStatus: 'WEIGHED_OUT', action: 'weigh-out', actor: 'wb.operator', at: '2026-03-08T08:30:00Z', note: 'Tare confirmed' },
    { id: 'hist-005', receiptId: 'rcpt-001', fromStatus: 'WEIGHED_OUT', toStatus: 'RECEIVED', action: 'auto-accept', actor: 'system', at: '2026-03-08T08:32:00Z', note: 'Tolerance passed and inventory posting triggered' },
    { id: 'hist-006', receiptId: 'rcpt-002', fromStatus: 'WEIGHED_OUT', toStatus: 'REJECTED', action: 'auto-reject', actor: 'system', at: '2026-03-08T10:05:00Z', note: 'Variance exceeded tolerance' },
    { id: 'hist-007', receiptId: 'rcpt-004', fromStatus: 'RECEIVED', toStatus: 'PUTAWAY', action: 'putaway-handoff', actor: 'system', at: '2026-03-08T13:05:00Z', note: 'Putaway work created in M7' },
  ],
  weighLogs: [
    { id: 'wb-001', receiptId: 'rcpt-001', eventType: 'IN', ticketId: 'WB-IN-001', weightKg: 36500, sourceApp: 'WEIGHBRIDGE', isManualEntry: false, at: '2026-03-08T07:50:00Z' },
    { id: 'wb-002', receiptId: 'rcpt-001', eventType: 'OUT', ticketId: 'WB-OUT-001', weightKg: 6200, sourceApp: 'WEIGHBRIDGE', isManualEntry: false, at: '2026-03-08T08:30:00Z' },
    { id: 'wb-003', receiptId: 'rcpt-002', eventType: 'IN', ticketId: 'WB-IN-002', weightKg: 34300, sourceApp: 'OCR', isManualEntry: false, at: '2026-03-08T09:20:00Z' },
    { id: 'wb-004', receiptId: 'rcpt-002', eventType: 'OUT', ticketId: 'WB-OUT-002', weightKg: 6200, sourceApp: 'OCR', isManualEntry: false, at: '2026-03-08T10:00:00Z' },
    { id: 'wb-005', receiptId: 'rcpt-004', eventType: 'OUT', ticketId: 'WB-MAN-001', weightKg: 6900, sourceApp: 'WEB', isManualEntry: true, at: '2026-03-08T12:48:00Z' },
  ],
  exceptions: [
    { id: 'exc-001', receiptId: 'rcpt-002', type: 'TOLERANCE_FAIL', severity: 'high', status: 'OPEN', attemptNumber: 2, reasonCode: 'OVER_TOLERANCE', note: 'Variance 12.4% vượt tolerance 1.5%', createdAt: '2026-03-08T10:05:00Z' },
    { id: 'exc-002', receiptId: 'rcpt-004', type: 'MANUAL_WEIGHT', severity: 'medium', status: 'RESOLVED', attemptNumber: 1, reasonCode: 'WB_FALLBACK', note: 'Cân bì nhập tay do bridge timeout', createdAt: '2026-03-08T12:48:00Z' },
  ],
}

const findEntity = {
  owner: (id) => db.owners.find((item) => item.id === id),
  vendor: (id) => db.vendors.find((item) => item.id === id),
  item: (id) => db.items.find((item) => item.id === id),
  warehouse: (id) => db.warehouses.find((item) => item.id === id),
  location: (id) => db.locations.find((item) => item.id === id),
}

function computeVariance(expectedQty, netWeightKg) {
  if (!expectedQty || !netWeightKg) return null
  return Number((Math.abs(Number(netWeightKg) - Number(expectedQty)) / Number(expectedQty) * 100).toFixed(2))
}

function determineTolerance(receipt) {
  const item = findEntity.item(receipt.itemId)
  if (item?.cargoForm === 'BULK') return 1.5
  return 2
}

function pushHistory(receiptId, fromStatus, toStatus, action, actor = 'system', note = '') {
  receiptDb.statusHistory.unshift({
    id: `hist-${Date.now()}`,
    receiptId,
    fromStatus,
    toStatus,
    action,
    actor,
    at: new Date().toISOString(),
    note,
  })
}

function getStatusSummary(receipts) {
  return {
    total: receipts.length,
    awaitingWeighing: receipts.filter((item) => item.status === 'AWAITING_WEIGHING').length,
    inProcess: receipts.filter((item) => ['WEIGHED_IN', 'PROCESSING', 'WEIGHED_OUT'].includes(item.status)).length,
    rejected: receipts.filter((item) => item.status === 'REJECTED').length,
    received: receipts.filter((item) => item.status === 'RECEIVED').length,
    putaway: receipts.filter((item) => item.status === 'PUTAWAY').length,
    closed: receipts.filter((item) => item.status === 'CLOSED').length,
  }
}

function enrichReceipt(receipt) {
  return {
    ...receipt,
    owner: findEntity.owner(receipt.ownerId),
    vendor: findEntity.vendor(receipt.vendorId),
    item: findEntity.item(receipt.itemId),
    warehouse: findEntity.warehouse(receipt.warehouseId),
    receivingLocation: findEntity.location(receipt.receivingLocationId),
  }
}

function updateReceipt(id, updater) {
  const index = receiptDb.receipts.findIndex((item) => item.id === id)
  const current = receiptDb.receipts[index]
  const next = typeof updater === 'function' ? updater(current) : { ...current, ...updater }
  receiptDb.receipts[index] = { ...next, updatedAt: new Date().toISOString() }
  return receiptDb.receipts[index]
}

function createException(receipt, type, severity, reasonCode, note) {
  const exception = {
    id: `exc-${Date.now()}`,
    receiptId: receipt.id,
    type,
    severity,
    status: 'OPEN',
    attemptNumber: receipt.attemptNumber,
    reasonCode,
    note,
    createdAt: new Date().toISOString(),
  }
  receiptDb.exceptions.unshift(exception)
  return exception
}

function applyWeighOutDecision(receipt) {
  const variancePct = computeVariance(receipt.expectedQty, receipt.netWeightKg)
  const tolerancePctApplied = determineTolerance(receipt)
  const fromStatus = 'WEIGHED_OUT'

  if (variancePct !== null && variancePct <= tolerancePctApplied) {
    const next = updateReceipt(receipt.id, {
      variancePct,
      tolerancePctApplied,
      status: 'RECEIVED',
      postedTransId: receipt.postedTransId || `TRX-${Date.now()}`,
      integrationStatus: {
        inventoryPosting: 'SUCCESS',
        putaway: 'PENDING',
        billing: 'SUCCESS',
      },
    })
    pushHistory(receipt.id, fromStatus, 'RECEIVED', 'auto-accept', 'system', 'Tolerance passed and posting sent to M3')
    return next
  }

  const next = updateReceipt(receipt.id, {
    variancePct,
    tolerancePctApplied,
    status: 'REJECTED',
    integrationStatus: {
      inventoryPosting: 'NOT_POSTED',
      putaway: 'NOT_READY',
      billing: 'NOT_READY',
    },
  })
  pushHistory(receipt.id, fromStatus, 'REJECTED', 'auto-reject', 'system', 'Tolerance exceeded baseline')
  createException(next, 'TOLERANCE_FAIL', 'high', 'OVER_TOLERANCE', `Variance ${variancePct}% vượt tolerance ${tolerancePctApplied}%`)
  return next
}

export const inboundOperationsMockApi = {
  getDashboardSummary: async () => {
    const receipts = receiptDb.receipts
    const summary = getStatusSummary(receipts)
    const exceptionsOpen = receiptDb.exceptions.filter((item) => item.status === 'OPEN').length
    return delay({
      data: {
        ...summary,
        exceptionsOpen,
        manualEntryCount: receipts.filter((item) => item.isManualEntry).length,
      },
    })
  },

  getReceipts: async (params = {}) => {
    const rows = receiptDb.receipts
      .filter((row) => {
        return (!params.status || row.status === params.status)
          && (!params.receiptType || row.receiptType === params.receiptType)
          && (!params.ownerId || row.ownerId === params.ownerId)
          && (!params.warehouseId || row.warehouseId === params.warehouseId)
          && (!params.itemId || row.itemId === params.itemId)
          && (!params.keyword || [row.receiptNumber, row.poNumber, row.asnNumber, row.vehicleNumber, row.blNumber].some((value) => includesText(value, params.keyword)))
      })
      .map(enrichReceipt)

    return delay({ ...paginate(rows, params.page, params.pageSize) })
  },

  getReceiptById: async (id) => {
    return delay({ data: enrichReceipt(receiptDb.receipts.find((item) => item.id === id)) })
  },

  createReceipt: async (data) => {
    const receipt = {
      id: `rcpt-${Date.now()}`,
      receiptNumber: data.receiptNumber || `RCV-${Date.now()}`,
      receiptType: data.receiptType,
      poNumber: data.poNumber,
      asnNumber: data.asnNumber || '',
      ownerId: data.ownerId,
      vendorId: data.vendorId,
      itemId: data.itemId,
      warehouseId: data.warehouseId,
      receivingLocationId: data.receivingLocationId,
      vehicleNumber: data.vehicleNumber,
      blNumber: data.blNumber || '',
      expectedQty: Number(data.expectedQty || 0),
      grossWeightKg: 0,
      tareWeightKg: 0,
      netWeightKg: 0,
      tolerancePctApplied: determineTolerance(data),
      variancePct: null,
      status: 'DRAFT',
      attemptNumber: 1,
      isManualEntry: false,
      manualEntryReasonCode: '',
      postedTransId: '',
      putawayWorkId: '',
      cancelReasonCode: '',
      correlationId: data.correlationId || `corr-inb-${Date.now()}`,
      sourceApp: data.sourceApp || 'WEB',
      cargoForm: data.cargoForm || 'BULK',
      bagCount: data.bagCount ? Number(data.bagCount) : null,
      createdBy: data.createdBy || 'frontend.user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      integrationStatus: {
        inventoryPosting: 'NOT_POSTED',
        putaway: 'NOT_READY',
        billing: 'NOT_READY',
      },
    }

    receiptDb.receipts.unshift(receipt)
    pushHistory(receipt.id, 'NEW', 'DRAFT', 'create', receipt.createdBy, 'Receipt created from inbound planning')
    return delay({ data: enrichReceipt(receipt) })
  },

  confirmReceipt: async (id) => {
    const current = receiptDb.receipts.find((item) => item.id === id)
    const next = updateReceipt(id, { status: 'AWAITING_WEIGHING' })
    pushHistory(id, current.status, 'AWAITING_WEIGHING', 'confirm', 'manager.user', 'Receipt confirmed and ready for weighing')
    return delay({ data: enrichReceipt(next) })
  },

  startProcessing: async (id) => {
    const current = receiptDb.receipts.find((item) => item.id === id)
    const next = updateReceipt(id, { status: 'PROCESSING' })
    pushHistory(id, current.status, 'PROCESSING', 'start-processing', 'wb.operator', 'Vehicle entered receiving area')
    return delay({ data: enrichReceipt(next) })
  },

  recordWeighIn: async (data) => {
    const current = receiptDb.receipts.find((item) => item.id === data.receiptId)
    receiptDb.weighLogs.unshift({
      id: `wb-${Date.now()}`,
      receiptId: data.receiptId,
      eventType: 'IN',
      ticketId: data.ticketId || `WB-IN-${Date.now()}`,
      weightKg: Number(data.grossWeightKg),
      sourceApp: data.sourceApp || 'WEB',
      isManualEntry: Boolean(data.isManualEntry),
      at: new Date().toISOString(),
    })
    const next = updateReceipt(data.receiptId, {
      grossWeightKg: Number(data.grossWeightKg),
      status: 'WEIGHED_IN',
      isManualEntry: Boolean(data.isManualEntry),
      manualEntryReasonCode: data.reasonCode || current.manualEntryReasonCode,
    })
    pushHistory(data.receiptId, current.status, 'WEIGHED_IN', 'weigh-in', 'wb.operator', 'Gross weight captured')
    if (data.isManualEntry) {
      createException(next, 'MANUAL_WEIGHT', 'medium', data.reasonCode || 'WB_FALLBACK', 'Manual gross entry used')
    }
    return delay({ data: enrichReceipt(next) })
  },

  recordWeighOut: async (data) => {
    const current = receiptDb.receipts.find((item) => item.id === data.receiptId)
    const tareWeightKg = Number(data.tareWeightKg)
    const netWeightKg = Number(current.grossWeightKg || 0) - tareWeightKg

    receiptDb.weighLogs.unshift({
      id: `wb-${Date.now()}`,
      receiptId: data.receiptId,
      eventType: 'OUT',
      ticketId: data.ticketId || `WB-OUT-${Date.now()}`,
      weightKg: tareWeightKg,
      sourceApp: data.sourceApp || 'WEB',
      isManualEntry: Boolean(data.isManualEntry),
      at: new Date().toISOString(),
    })

    updateReceipt(data.receiptId, {
      tareWeightKg,
      netWeightKg,
      status: 'WEIGHED_OUT',
      isManualEntry: Boolean(data.isManualEntry) || current.isManualEntry,
      manualEntryReasonCode: data.reasonCode || current.manualEntryReasonCode,
    })
    pushHistory(data.receiptId, current.status, 'WEIGHED_OUT', 'weigh-out', 'wb.operator', 'Tare captured and net calculated')

    const decided = applyWeighOutDecision(receiptDb.receipts.find((item) => item.id === data.receiptId))
    return delay({ data: enrichReceipt(decided) })
  },

  applyManualWeight: async (id, data) => {
    const current = receiptDb.receipts.find((item) => item.id === id)
    const grossWeightKg = Number(data.grossWeightKg || current.grossWeightKg || 0)
    const tareWeightKg = Number(data.tareWeightKg || current.tareWeightKg || 0)
    const netWeightKg = grossWeightKg && tareWeightKg ? grossWeightKg - tareWeightKg : current.netWeightKg
    const next = updateReceipt(id, {
      grossWeightKg,
      tareWeightKg,
      netWeightKg,
      isManualEntry: true,
      manualEntryReasonCode: data.reasonCode,
      status: netWeightKg > 0 ? 'WEIGHED_OUT' : current.status,
    })
    createException(next, 'MANUAL_WEIGHT', 'medium', data.reasonCode || 'WB_FALLBACK', data.note || 'Manual weight override')
    pushHistory(id, current.status, next.status, 'manual-weight', 'manager.user', data.note || 'Manual weight applied')
    if (next.status === 'WEIGHED_OUT') {
      const decided = applyWeighOutDecision(next)
      return delay({ data: enrichReceipt(decided) })
    }
    return delay({ data: enrichReceipt(next) })
  },

  reweighReceipt: async (id) => {
    const current = receiptDb.receipts.find((item) => item.id === id)
    const next = updateReceipt(id, {
      status: 'AWAITING_WEIGHING',
      attemptNumber: Number(current.attemptNumber || 1) + 1,
      grossWeightKg: 0,
      tareWeightKg: 0,
      netWeightKg: 0,
      variancePct: null,
    })
    pushHistory(id, current.status, 'AWAITING_WEIGHING', 'reweigh', 'wb.operator', 'Re-weigh initiated')
    return delay({ data: enrichReceipt(next) })
  },

  cancelReceipt: async (id, data = {}) => {
    const current = receiptDb.receipts.find((item) => item.id === id)
    const next = updateReceipt(id, {
      status: 'CANCELLED',
      cancelReasonCode: data.reasonCode || 'CANCELLED_BY_MANAGER',
    })
    pushHistory(id, current.status, 'CANCELLED', 'cancel', 'manager.user', data.note || 'Receipt cancelled')
    return delay({ data: enrichReceipt(next) })
  },

  getExceptions: async (params = {}) => {
    const rows = receiptDb.exceptions
      .filter((row) => (!params.status || row.status === params.status) && (!params.severity || row.severity === params.severity) && (!params.type || row.type === params.type))
      .map((row) => {
        const receipt = receiptDb.receipts.find((item) => item.id === row.receiptId)
        return {
          ...row,
          receipt: receipt ? enrichReceipt(receipt) : null,
        }
      })

    return delay({ ...paginate(rows, params.page, params.pageSize) })
  },

  getPutawayQueue: async (params = {}) => {
    const rows = receiptDb.receipts
      .filter((row) => (!params.status || row.status === params.status) && ['RECEIVED', 'PUTAWAY'].includes(row.status))
      .map(enrichReceipt)

    return delay({ ...paginate(rows, params.page, params.pageSize) })
  },

  completePutaway: async (id) => {
    const current = receiptDb.receipts.find((item) => item.id === id)
    const targetStatus = current.status === 'RECEIVED' ? 'PUTAWAY' : 'CLOSED'
    const next = updateReceipt(id, {
      status: targetStatus,
      putawayWorkId: current.putawayWorkId || `PUT-${Date.now()}`,
      integrationStatus: {
        ...current.integrationStatus,
        putaway: targetStatus === 'PUTAWAY' ? 'IN_PROGRESS' : 'COMPLETED',
      },
    })
    pushHistory(id, current.status, targetStatus, targetStatus === 'PUTAWAY' ? 'putaway-handoff' : 'close', 'system', targetStatus === 'PUTAWAY' ? 'Putaway work created in M7' : 'Receipt closed after putaway complete')
    return delay({ data: enrichReceipt(next) })
  },

  getReceiptHistory: async (id) => {
    const rows = receiptDb.statusHistory.filter((item) => item.receiptId === id)
    return delay({ data: rows })
  },

  getWeighLogs: async (id) => {
    const rows = receiptDb.weighLogs.filter((item) => item.receiptId === id)
    return delay({ data: rows })
  },
}
