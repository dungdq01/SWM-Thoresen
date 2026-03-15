import { delay, includesText, paginate } from './utils'
import { masterDataMockApi } from './masterData.mock'
import { inventoryCoreMockApi } from './inventoryCore.mock'

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

// ==================== PURCHASE ORDERS ====================
const poDb = {
  purchaseOrders: [
    {
      id: 'po-001',
      poNumber: 'PO-20260308-001',
      externalPoNumber: 'BL-2026-RICE-001',
      status: 'CONFIRMED',
      ownerId: 'owner-001',
      vendorId: 'vendor-002',
      warehouseId: 'wh-001',
      expectedDeliveryDate: '2026-03-10',
      notes: 'Gạo 5% tấm nhập từ miền Tây',
      totalExpectedQty: 50000,
      totalReceivedQty: 30300,
      currency: 'VND',
      createdBy: 'planner.user',
      createdAt: '2026-03-07T08:00:00Z',
      updatedAt: '2026-03-08T08:45:00Z',
      lines: [
        { id: 'pol-001', lineNum: 1, itemId: 'item-001', expectedQty: 30000, receivedQty: 30300, uomId: 'uom-001', unitPrice: 15000, notes: 'Lô 1 - giao xe tải 15T', status: 'RECEIVED' },
        { id: 'pol-002', lineNum: 2, itemId: 'item-001', expectedQty: 20000, receivedQty: 0, uomId: 'uom-001', unitPrice: 15000, notes: 'Lô 2 - giao xe tải 15T', status: 'OPEN' },
      ],
    },
    {
      id: 'po-002',
      poNumber: 'PO-20260308-002',
      externalPoNumber: 'BL-2026-UREA-TQ',
      status: 'CONFIRMED',
      ownerId: 'owner-002',
      vendorId: 'vendor-001',
      warehouseId: 'wh-001',
      expectedDeliveryDate: '2026-03-12',
      notes: 'Phân Urea nhập tàu từ Trung Quốc',
      totalExpectedQty: 25000,
      totalReceivedQty: 0,
      currency: 'VND',
      createdBy: 'planner.user',
      createdAt: '2026-03-07T09:30:00Z',
      updatedAt: '2026-03-08T10:05:00Z',
      lines: [
        { id: 'pol-003', lineNum: 1, itemId: 'item-002', expectedQty: 25000, receivedQty: 0, uomId: 'uom-001', unitPrice: 12000, notes: 'Full vessel discharge', status: 'OPEN' },
      ],
    },
    {
      id: 'po-003',
      poNumber: 'PO-20260308-003',
      externalPoNumber: '',
      status: 'DRAFT',
      ownerId: 'owner-001',
      vendorId: 'vendor-002',
      warehouseId: 'wh-001',
      expectedDeliveryDate: '2026-03-15',
      notes: 'Phân Urea mua nội địa',
      totalExpectedQty: 18000,
      totalReceivedQty: 0,
      currency: 'VND',
      createdBy: 'planner.user',
      createdAt: '2026-03-08T11:00:00Z',
      updatedAt: '2026-03-08T11:10:00Z',
      lines: [
        { id: 'pol-004', lineNum: 1, itemId: 'item-002', expectedQty: 10000, receivedQty: 0, uomId: 'uom-001', unitPrice: 11500, notes: '', status: 'OPEN' },
        { id: 'pol-005', lineNum: 2, itemId: 'item-001', expectedQty: 8000, receivedQty: 0, uomId: 'uom-001', unitPrice: 15500, notes: 'Gạo trộn', status: 'OPEN' },
      ],
    },
    {
      id: 'po-004',
      poNumber: 'PO-20260308-004',
      externalPoNumber: 'BL-2026-RICE-BAG',
      status: 'CLOSED',
      ownerId: 'owner-002',
      vendorId: 'vendor-002',
      warehouseId: 'wh-001',
      expectedDeliveryDate: '2026-03-08',
      notes: 'Gạo bagged 50kg - đã nhận đủ',
      totalExpectedQty: 20000,
      totalReceivedQty: 20100,
      currency: 'VND',
      createdBy: 'planner.user',
      createdAt: '2026-03-06T14:00:00Z',
      updatedAt: '2026-03-08T13:05:00Z',
      lines: [
        { id: 'pol-006', lineNum: 1, itemId: 'item-001', expectedQty: 20000, receivedQty: 20100, uomId: 'uom-001', unitPrice: 15000, notes: '', status: 'RECEIVED' },
      ],
    },
  ],
}

function enrichPo(po) {
  return {
    ...po,
    owner: findEntity.owner(po.ownerId),
    vendor: findEntity.vendor(po.vendorId),
    warehouse: findEntity.warehouse(po.warehouseId),
    lines: po.lines.map((line) => ({
      ...line,
      item: findEntity.item(line.itemId),
      uom: db.uoms.find((u) => u.id === line.uomId),
    })),
  }
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
    // Post to inventory (M3) — update on-hand
    const receivedQty = receipt.netWeightKg || receipt.expectedQty
    const owner = db.owners.find((o) => o.id === receipt.ownerId)
    const warehouse = db.warehouses.find((w) => w.id === receipt.warehouseId)
    const location = db.locations.find((l) => l.id === receipt.receivingLocationId)
    inventoryCoreMockApi.createPosting({
      eventCode: 'RECEIPT_IN',
      refType: 'RECEIPT',
      refId: receipt.receiptNumber,
      correlationId: receipt.correlationId || `corr-rcpt-${Date.now()}`,
      itemId: receipt.itemId,
      qty: receivedQty,
      uomCode: 'KG',
      ownerId: receipt.ownerId,
      warehouseId: receipt.warehouseId,
      locationId: receipt.receivingLocationId,
      inventoryStatusId: 'st-001',
      lotNumber: `LOT-${receipt.receiptNumber}`,
      dimTo: {
        ownerCode: owner?.ownerCode,
        warehouseCode: warehouse?.warehouseCode,
        locationCode: location?.locationCode,
        statusCode: 'AVAILABLE',
      },
      sourceApp: 'INBOUND',
    })

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

  // ==================== PURCHASE ORDER APIs ====================
  getPurchaseOrders: async (params = {}) => {
    const rows = poDb.purchaseOrders
      .filter((row) => {
        return (!params.status || row.status === params.status)
          && (!params.ownerId || row.ownerId === params.ownerId)
          && (!params.vendorId || row.vendorId === params.vendorId)
          && (!params.warehouseId || row.warehouseId === params.warehouseId)
          && (!params.keyword || includesText(row.poNumber, params.keyword) || includesText(row.notes, params.keyword))
      })
      .map(enrichPo)
    return delay({ ...paginate(rows, params.page, params.pageSize) })
  },

  getPurchaseOrderById: async (id) => {
    const po = poDb.purchaseOrders.find((item) => item.id === id)
    return delay({ data: po ? enrichPo(po) : null })
  },

  getNextPoNumber: async () => {
    const prefix = 'PO'
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const nextNum = poDb.purchaseOrders.length + 1
    const code = `${prefix}-${datePart}-${String(nextNum).padStart(3, '0')}`
    return delay({ data: { code, prefix } })
  },

  createPurchaseOrder: async (data) => {
    const po = {
      id: `po-${Date.now()}`,
      poNumber: `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(poDb.purchaseOrders.length + 1).padStart(3, '0')}`,
      poType: data.poType || 'SEA',
      status: 'DRAFT',
      ownerId: data.ownerId,
      vendorId: data.vendorId,
      warehouseId: data.warehouseId,
      vesselName: data.vesselName || '',
      origin: data.origin || '',
      blNumber: data.blNumber || '',
      notes: data.notes || '',
      totalExpectedQty: 0,
      totalReceivedQty: 0,
      createdBy: data.createdBy || 'planner.user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lines: [],
    }
    if (data.lines && data.lines.length > 0) {
      po.lines = data.lines.map((line, idx) => ({
        id: `pol-${Date.now()}-${idx}`,
        lineNum: idx + 1,
        itemId: line.itemId,
        expectedQty: Number(line.expectedQty || 0),
        receivedQty: 0,
        uomId: line.uomId || 'uom-001',
        notes: line.notes || '',
        status: 'NEW',
      }))
      po.totalExpectedQty = po.lines.reduce((sum, l) => sum + l.expectedQty, 0)
    }
    poDb.purchaseOrders.unshift(po)
    return delay({ data: enrichPo(po) })
  },

  updatePurchaseOrder: async (id, data) => {
    const index = poDb.purchaseOrders.findIndex((item) => item.id === id)
    if (index === -1) return delay(null, { statusCode: 404, message: 'PO not found' })
    const current = poDb.purchaseOrders[index]
    const updated = {
      ...current,
      poType: data.poType ?? current.poType,
      ownerId: data.ownerId ?? current.ownerId,
      vendorId: data.vendorId ?? current.vendorId,
      warehouseId: data.warehouseId ?? current.warehouseId,
      vesselName: data.vesselName ?? current.vesselName,
      origin: data.origin ?? current.origin,
      blNumber: data.blNumber ?? current.blNumber,
      notes: data.notes ?? current.notes,
      updatedAt: new Date().toISOString(),
    }
    if (data.lines) {
      updated.lines = data.lines.map((line, idx) => ({
        id: line.id || `pol-${Date.now()}-${idx}`,
        lineNum: idx + 1,
        itemId: line.itemId,
        expectedQty: Number(line.expectedQty || 0),
        receivedQty: Number(line.receivedQty || 0),
        uomId: line.uomId || 'uom-001',
        notes: line.notes || '',
        status: line.status || 'NEW',
      }))
      updated.totalExpectedQty = updated.lines.reduce((sum, l) => sum + l.expectedQty, 0)
      updated.totalReceivedQty = updated.lines.reduce((sum, l) => sum + l.receivedQty, 0)
    }
    poDb.purchaseOrders[index] = updated
    return delay({ data: enrichPo(updated) })
  },

  confirmPurchaseOrder: async (id) => {
    const index = poDb.purchaseOrders.findIndex((item) => item.id === id)
    if (index === -1) return delay(null, { statusCode: 404, message: 'PO not found' })
    poDb.purchaseOrders[index] = { ...poDb.purchaseOrders[index], status: 'CONFIRMED', updatedAt: new Date().toISOString() }
    return delay({ data: enrichPo(poDb.purchaseOrders[index]) })
  },

  unconfirmPurchaseOrder: async (id) => {
    const index = poDb.purchaseOrders.findIndex((item) => item.id === id)
    if (index === -1) return delay(null, { statusCode: 404, message: 'PO not found' })
    poDb.purchaseOrders[index] = { ...poDb.purchaseOrders[index], status: 'NEW', updatedAt: new Date().toISOString() }
    return delay({ data: enrichPo(poDb.purchaseOrders[index]) })
  },

  closePurchaseOrder: async (id) => {
    const index = poDb.purchaseOrders.findIndex((item) => item.id === id)
    if (index === -1) return delay(null, { statusCode: 404, message: 'PO not found' })
    poDb.purchaseOrders[index] = { ...poDb.purchaseOrders[index], status: 'CLOSED', updatedAt: new Date().toISOString() }
    return delay({ data: enrichPo(poDb.purchaseOrders[index]) })
  },

  cancelPurchaseOrder: async (id) => {
    const index = poDb.purchaseOrders.findIndex((item) => item.id === id)
    if (index === -1) return delay(null, { statusCode: 404, message: 'PO not found' })
    poDb.purchaseOrders[index] = { ...poDb.purchaseOrders[index], status: 'CANCELLED', updatedAt: new Date().toISOString() }
    return delay({ data: enrichPo(poDb.purchaseOrders[index]) })
  },
}
