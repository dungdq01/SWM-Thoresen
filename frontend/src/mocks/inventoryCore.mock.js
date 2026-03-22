import { delay, paginate } from './utils'
import { masterDataMockApi } from './masterData.mock'

const db = masterDataMockApi.__db

const inventoryDb = {
  reconciliationRuns: [
    { id: 'recon-001', runNo: 'RECON-20260310-A1B2C3', runType: 'ON_DEMAND', scopeType: 'FULL', warehouseId: null, ownerId: null, itemId: null, startedAt: '2026-03-10T08:00:00Z', completedAt: '2026-03-10T08:02:30Z', status: 'COMPLETED', mismatchCount: 2, requestedBy: 'admin', correlationId: 'corr-recon-001', results: [
      { id: 'res-001', runId: 'recon-001', itemId: 'item-001', inventDimId: 'dim-001', ledgerQty: '30500.000', onhandPhysicalQty: '30000.000', allocatedQty: '10000.000', availableQty: '20000.000', diffQty: '500.000', severity: 'MEDIUM', ruleCode: 'LEDGER_VS_ONHAND', resultStatus: 'MISMATCH' },
      { id: 'res-002', runId: 'recon-001', itemId: 'item-002', inventDimId: 'dim-002', ledgerQty: '12000.000', onhandPhysicalQty: '12000.000', allocatedQty: '0.000', availableQty: '12000.000', diffQty: '0.000', severity: 'INFO', ruleCode: 'LEDGER_VS_ONHAND', resultStatus: 'OK' },
    ] },
    { id: 'recon-002', runNo: 'RECON-20260308-X9Y8Z7', runType: 'SCHEDULED', scopeType: 'WAREHOUSE', warehouseId: 'wh-001', ownerId: null, itemId: null, startedAt: '2026-03-08T00:00:00Z', completedAt: '2026-03-08T00:01:15Z', status: 'COMPLETED', mismatchCount: 0, requestedBy: 'system', correlationId: 'corr-recon-002', results: [] },
  ],
  snapshotRuns: [
    { id: 'snap-001', runNo: 'SNAP-20260310-D4E5F6', snapshotDate: '2026-03-10', warehouseId: null, cutOffTime: '2026-03-10T23:59:59Z', runMode: 'MANUAL', versionNo: 1, status: 'COMPLETED', startedAt: '2026-03-10T23:00:00Z', completedAt: '2026-03-10T23:01:00Z', requestedBy: 'admin', correlationId: 'corr-snap-001' },
    { id: 'snap-002', runNo: 'SNAP-20260309-G7H8I9', snapshotDate: '2026-03-09', warehouseId: 'wh-001', cutOffTime: '2026-03-09T23:59:59Z', runMode: 'SCHEDULED', versionNo: 1, status: 'COMPLETED', startedAt: '2026-03-09T23:00:00Z', completedAt: '2026-03-09T23:00:45Z', requestedBy: 'system', correlationId: 'corr-snap-002' },
  ],
  snapshotBilling: [
    { id: 'sb-001', snapshotRunId: 'snap-001', snapshotDate: '2026-03-10', warehouseId: 'wh-001', locationId: 'loc-001', ownerId: 'owner-001', itemId: 'item-001', inventDimId: 'dim-001', openingQty: '28000.000', inboundTodayQty: '5000.000', outboundTodayQty: '3000.000', closingQty: '30000.000', cutOffTime: '2026-03-10T23:59:59Z', snapshotSource: 'ONHAND_CAPTURE' },
    { id: 'sb-002', snapshotRunId: 'snap-001', snapshotDate: '2026-03-10', warehouseId: 'wh-001', locationId: 'loc-002', ownerId: 'owner-002', itemId: 'item-002', inventDimId: 'dim-002', openingQty: '12000.000', inboundTodayQty: '0.000', outboundTodayQty: '0.000', closingQty: '12000.000', cutOffTime: '2026-03-10T23:59:59Z', snapshotSource: 'ONHAND_CAPTURE' },
    { id: 'sb-003', snapshotRunId: 'snap-002', snapshotDate: '2026-03-09', warehouseId: 'wh-001', locationId: 'loc-001', ownerId: 'owner-001', itemId: 'item-001', inventDimId: 'dim-001', openingQty: '25000.000', inboundTodayQty: '5000.000', outboundTodayQty: '2000.000', closingQty: '28000.000', cutOffTime: '2026-03-09T23:59:59Z', snapshotSource: 'ONHAND_CAPTURE' },
  ],
  transactions: [
    { id: 'trans-001', transId: 'TRX-20260308-000123', transType: 'RECEIPT', qty: '25000.000', refType: 'RECEIPT', refId: 'RCV-20260308-001', correlationId: 'corr-20260308-001', postedAt: '2026-03-08T08:30:00Z', sourceApp: 'API', isReversal: false, itemId: 'item-001', ownerId: 'owner-001' },
    { id: 'trans-002', transId: 'TRX-20260308-000124', transType: 'ISSUE', qty: '-5000.000', refType: 'SHIPMENT', refId: 'SHP-20260308-017', correlationId: 'corr-20260308-002', postedAt: '2026-03-08T09:10:00Z', sourceApp: 'API', isReversal: false, itemId: 'item-001', ownerId: 'owner-001' },
    { id: 'trans-003', transId: 'TRX-20260308-000125', transType: 'ADJUSTMENT', qty: '1000.000', refType: 'COUNT', refId: 'CNT-20260308-003', correlationId: 'corr-20260308-003', postedAt: '2026-03-08T10:45:00Z', sourceApp: 'FRONTEND', isReversal: false, itemId: 'item-002', ownerId: 'owner-002' },
  ],
  onHand: [
    { id: 'oh-001', itemId: 'item-001', physicalQty: '30000', allocatedQty: '10000', availableQty: '20000', uomId: 'uom-001', lotNumber: 'LOT-2026-001', inventDim: { warehouseId: 'wh-001', locationId: 'loc-001', ownerId: 'owner-001', inventoryStatusId: 'st-001' } },
    { id: 'oh-002', itemId: 'item-002', physicalQty: '12000', allocatedQty: '0', availableQty: '12000', uomId: 'uom-001', lotNumber: 'LOT-2026-002', inventDim: { warehouseId: 'wh-001', locationId: 'loc-002', ownerId: 'owner-002', inventoryStatusId: 'st-001' } },
    { id: 'oh-003', itemId: 'item-001', physicalQty: '5500.500', allocatedQty: '500.500', availableQty: '5000', uomId: 'uom-002', lotNumber: 'LOT-2026-003', inventDim: { warehouseId: 'wh-002', locationId: 'loc-001', ownerId: 'owner-001', inventoryStatusId: 'st-002' } },
  ],
  holds: [
    { id: 'hold-001', holdNo: 'HLD-0001024', shipmentId: 'SHP-20260308-017', shipmentLineId: 'LINE-01', itemId: 'item-001', ownerId: 'owner-001', holdQty: '10000.000', qty: '10000.000', status: 'ACTIVE', correlationId: 'corr-hold-001', dim: { ownerCode: 'CUST001' }, createdAt: '2026-03-08T09:00:00Z' },
  ],
}

const enrich = {
  item: (id) => db.items.find((item) => item.id === id),
  owner: (id) => db.owners.find((item) => item.id === id),
  warehouse: (id) => db.warehouses.find((item) => item.id === id),
  location: (id) => db.locations.find((item) => item.id === id),
  status: (id) => db.inventoryStatuses.find((item) => item.id === id),
  uom: (id) => db.uoms.find((item) => item.id === id),
}

export const inventoryCoreMockApi = {
  getOnHand: (params = {}) => {
    const rows = inventoryDb.onHand
      .filter((row) => (!params.itemId || row.itemId === params.itemId) && (!params.ownerId || row.inventDim.ownerId === params.ownerId) && (!params.warehouseId || row.inventDim.warehouseId === params.warehouseId) && (!params.inventoryStatusId || row.inventDim.inventoryStatusId === params.inventoryStatusId) && (params.hasStock === false || Number(row.physicalQty) > 0))
      .map((row) => ({
        ...row,
        item: enrich.item(row.itemId),
        uom: enrich.uom(row.uomId),
        inventDim: {
          warehouse: enrich.warehouse(row.inventDim.warehouseId),
          location: enrich.location(row.inventDim.locationId),
          owner: enrich.owner(row.inventDim.ownerId),
          inventoryStatus: enrich.status(row.inventDim.inventoryStatusId),
        },
      }))

    return delay({ ...paginate(rows, params.page, params.pageSize) })
  },
  getAvailability: (params = {}) => {
    const row = inventoryDb.onHand.find((item) => item.itemId === params.itemId)
    return delay({ data: { availableQty: row?.availableQty || '0.000', canAllocate: Number(row?.availableQty || 0) >= Number(params.qty || 0) } })
  },
  getTransactions: (params = {}) => {
    const rows = inventoryDb.transactions
      .filter((row) => (!params.itemId || row.itemId === params.itemId) && (!params.ownerId || row.ownerId === params.ownerId) && (!params.refType || row.refType === params.refType) && (!params.refId || String(row.refId).includes(params.refId)) && (!params.transType || row.transType === params.transType) && (!params.correlationId || String(row.correlationId).includes(params.correlationId)))
      .map((row) => ({ ...row, item: enrich.item(row.itemId), owner: enrich.owner(row.ownerId) }))
    return delay({ ...paginate(rows, params.page, params.pageSize) })
  },
  getTransactionById: (transId) => delay({ data: inventoryDb.transactions.find((item) => item.transId === transId || item.id === transId) }),
  createPosting: (data) => {
    const outboundEvents = ['SO_CONFIRMED', 'ALLOCATION_CREATED', 'ALLOCATION_RELEASED', 'PICK_CONFIRMED', 'LOAD_CONFIRMED', 'SHIP_CONFIRMED', 'VAS_CONSUMED', 'TRANSFER_ISSUED']
    const isOutbound = outboundEvents.includes(data.eventCode) || data.eventCode?.includes('SHIP') || data.eventCode?.includes('ISSUE')
    const transType = isOutbound ? 'ISSUE' : 'RECEIPT'
    const qtyNum = Number(data.qty) || 0
    const signedQty = isOutbound ? -Math.abs(qtyNum) : Math.abs(qtyNum)

    // Resolve dimension IDs
    const ownerId = data.ownerId || db.owners.find((o) => o.ownerCode === data.dimTo?.ownerCode)?.id
    const warehouseId = data.warehouseId || db.warehouses.find((w) => w.warehouseCode === data.dimTo?.warehouseCode)?.id
    const locationId = data.locationId || db.locations.find((l) => l.locationCode === data.dimTo?.locationCode)?.id
    const statusId = data.inventoryStatusId || db.inventoryStatuses.find((s) => s.statusCode === (data.dimTo?.statusCode || 'AVAILABLE'))?.id || 'st-001'
    const uomId = data.uomId || db.uoms.find((u) => u.uomCode === (data.uomCode || 'KG'))?.id || 'uom-001'
    const itemId = data.itemId

    // Create transaction record
    const record = { id: `trans-${Date.now()}`, transId: `TRX-${Date.now()}`, transType, qty: String(signedQty), refType: data.refType, refId: data.refId, correlationId: data.correlationId, postedAt: new Date().toISOString(), sourceApp: data.sourceApp || 'FRONTEND', isReversal: false, itemId, ownerId }
    inventoryDb.transactions.unshift(record)

    // Update on-hand: find matching record or create new
    let onHand = inventoryDb.onHand.find((oh) =>
      oh.itemId === itemId &&
      oh.inventDim.ownerId === ownerId &&
      oh.inventDim.warehouseId === warehouseId &&
      oh.inventDim.locationId === locationId &&
      oh.inventDim.inventoryStatusId === statusId
    )

    if (onHand) {
      const newPhysical = Number(onHand.physicalQty) + signedQty
      const newReserved = Number(onHand.allocatedQty)
      onHand.physicalQty = String(Math.max(0, newPhysical))
      onHand.availableQty = String(Math.max(0, newPhysical - newReserved))
    } else {
      onHand = {
        id: `oh-${Date.now()}`,
        itemId,
        physicalQty: String(Math.max(0, signedQty)),
        allocatedQty: '0',
        availableQty: String(Math.max(0, signedQty)),
        uomId,
        lotNumber: data.lotNumber || `LOT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(inventoryDb.onHand.length + 1).padStart(3, '0')}`,
        inventDim: { warehouseId, locationId, ownerId, inventoryStatusId: statusId },
      }
      inventoryDb.onHand.push(onHand)
    }

    return delay({ data: { trans_id: record.transId, trans_type: record.transType, idempotent_replay: false, on_hand_after: { physical_qty: onHand.physicalQty, allocated_qty: onHand.allocatedQty, available_qty: onHand.availableQty } } })
  },
  reversePosting: (data) => {
    // Find original transaction and reverse its qty from on-hand
    const original = inventoryDb.transactions.find((t) => t.transId === data.originalTransId || t.id === data.originalTransId)
    if (original && original.itemId) {
      const reverseQty = -Number(original.qty || 0)
      const onHand = inventoryDb.onHand.find((oh) => oh.itemId === original.itemId && oh.inventDim.ownerId === original.ownerId)
      if (onHand) {
        const newPhysical = Number(onHand.physicalQty) + reverseQty
        const newReserved = Number(onHand.allocatedQty)
        onHand.physicalQty = String(Math.max(0, newPhysical))
        onHand.availableQty = String(Math.max(0, newPhysical - newReserved))
      }
    }
    const record = { id: `trans-${Date.now()}`, transId: `TRX-${Date.now()}`, transType: 'REVERSAL', qty: String(-(Number(original?.qty || 0))), refType: 'REVERSAL', refId: data.originalTransId, correlationId: data.correlationId, postedAt: new Date().toISOString(), sourceApp: 'FRONTEND', isReversal: true, itemId: original?.itemId, ownerId: original?.ownerId }
    inventoryDb.transactions.unshift(record)
    return delay({ data: { original_trans_id: data.originalTransId, reversal_trans_id: record.transId } })
  },
  getHolds: (params = {}) => {
    const rows = inventoryDb.holds.filter((row) => (!params.itemId || row.itemId === params.itemId) && (!params.ownerId || row.ownerId === params.ownerId) && (!params.shipmentId || String(row.shipmentId).includes(params.shipmentId)) && (!params.status || row.status === params.status)).map((row) => ({ ...row, item: enrich.item(row.itemId), owner: enrich.owner(row.ownerId) }))
    return delay({ ...paginate(rows, params.page, params.pageSize) })
  },
  createHold: (data) => {
    const record = { id: `hold-${Date.now()}`, holdNo: `HLD-${Date.now()}`, shipmentId: data.shipmentId, shipmentLineId: data.shipmentLineId, itemId: data.itemId, ownerId: db.owners.find((item) => item.ownerCode === data.dim?.ownerCode)?.id, holdQty: String(data.qty), qty: String(data.qty), status: 'ACTIVE', correlationId: data.correlationId, dim: data.dim }
    inventoryDb.holds.unshift(record)
    return delay({ data: record })
  },
  releaseHold: (holdId) => {
    const hold = inventoryDb.holds.find((item) => item.id === holdId)
    hold.status = 'RELEASED'
    return delay({ data: hold })
  },
  cancelHold: (holdId) => {
    const hold = inventoryDb.holds.find((item) => item.id === holdId)
    hold.status = 'CANCELLED'
    return delay({ data: hold })
  },

  // Reconciliation
  createReconciliationRun: (data) => {
    const run = { id: `recon-${Date.now()}`, runNo: `RECON-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, runType: data.runType || 'ON_DEMAND', scopeType: data.scopeType || 'FULL', warehouseId: data.warehouseId || null, ownerId: data.ownerId || null, itemId: data.itemId || null, startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), status: 'COMPLETED', mismatchCount: 1, requestedBy: 'admin', correlationId: data.correlationId, results: [{ id: `res-${Date.now()}`, runId: `recon-${Date.now()}`, itemId: 'item-001', inventDimId: 'dim-001', ledgerQty: '30500.000', onhandPhysicalQty: '30000.000', allocatedQty: '10000.000', availableQty: '20000.000', diffQty: '500.000', severity: 'MEDIUM', ruleCode: 'LEDGER_VS_ONHAND', resultStatus: 'MISMATCH' }] }
    inventoryDb.reconciliationRuns.unshift(run)
    return delay({ data: run })
  },
  getReconciliationRuns: (params = {}) => {
    const rows = inventoryDb.reconciliationRuns.filter((r) => (!params.status || r.status === params.status) && (!params.warehouseId || r.warehouseId === params.warehouseId)).map((r) => ({ ...r, warehouse: r.warehouseId ? enrich.warehouse(r.warehouseId) : null }))
    return delay({ ...paginate(rows, params.page, params.pageSize) })
  },
  getReconciliationRun: (runId) => {
    const run = inventoryDb.reconciliationRuns.find((r) => r.id === runId)
    if (!run) return delay({ data: null })
    return delay({ data: { ...run, results: (run.results || []).map((r) => ({ ...r, item: enrich.item(r.itemId) })) } })
  },
  reviewReconciliationResult: (resultId) => {
    for (const run of inventoryDb.reconciliationRuns) {
      const result = (run.results || []).find((r) => r.id === resultId)
      if (result) { result.resultStatus = 'REVIEWED'; return delay({ data: result }) }
    }
    return delay({ data: null })
  },
  resolveReconciliationResult: (resultId) => {
    for (const run of inventoryDb.reconciliationRuns) {
      const result = (run.results || []).find((r) => r.id === resultId)
      if (result) { result.resultStatus = 'RESOLVED'; return delay({ data: result }) }
    }
    return delay({ data: null })
  },

  // Snapshot
  createSnapshotRun: (data) => {
    const run = { id: `snap-${Date.now()}`, runNo: `SNAP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, snapshotDate: data.snapshotDate || new Date().toISOString().slice(0, 10), warehouseId: data.warehouseId || null, cutOffTime: new Date().toISOString(), runMode: data.mode || 'MANUAL', versionNo: 1, status: 'COMPLETED', startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), requestedBy: 'admin', correlationId: data.correlationId }
    inventoryDb.snapshotRuns.unshift(run)
    return delay({ data: { runId: run.id, runNo: run.runNo, status: 'COMPLETED', snapshotDate: run.snapshotDate, recordCount: 2 } })
  },
  getSnapshotRuns: (params = {}) => {
    const rows = inventoryDb.snapshotRuns.filter((r) => (!params.status || r.status === params.status) && (!params.warehouseId || r.warehouseId === params.warehouseId)).map((r) => ({ ...r, warehouse: r.warehouseId ? enrich.warehouse(r.warehouseId) : null }))
    return delay({ ...paginate(rows, params.page, params.pageSize) })
  },
  getSnapshotRun: (runId) => {
    const run = inventoryDb.snapshotRuns.find((r) => r.id === runId)
    return delay({ data: run ? { ...run, warehouse: run.warehouseId ? enrich.warehouse(run.warehouseId) : null } : null })
  },
  getSnapshotsBilling: (params = {}) => {
    const rows = inventoryDb.snapshotBilling.filter((r) => (!params.warehouseId || r.warehouseId === params.warehouseId) && (!params.ownerId || r.ownerId === params.ownerId)).map((r) => ({ ...r, item: enrich.item(r.itemId), owner: enrich.owner(r.ownerId), warehouse: enrich.warehouse(r.warehouseId), location: enrich.location(r.locationId) }))
    return delay({ ...paginate(rows, params.page, params.pageSize) })
  },
  getSnapshotsBillingAggregate: (params = {}) => {
    const grouped = {}
    inventoryDb.snapshotBilling.filter((r) => (!params.warehouseId || r.warehouseId === params.warehouseId) && (!params.ownerId || r.ownerId === params.ownerId)).forEach((r) => {
      const key = `${r.ownerId}|${r.itemId}`
      if (!grouped[key]) grouped[key] = { ownerId: r.ownerId, itemId: r.itemId, daysStored: 0, totalClosingQty: 0 }
      grouped[key].daysStored += 1
      grouped[key].totalClosingQty += Number(r.closingQty || 0)
    })
    const results = Object.values(grouped).map((g) => ({ ...g, avgClosingQty: (g.totalClosingQty / (g.daysStored || 1)).toFixed(3), totalQtyDays: g.totalClosingQty.toFixed(3), owner: enrich.owner(g.ownerId), item: enrich.item(g.itemId) }))
    return delay({ data: results })
  },
}
