import { delay, paginate } from './utils'
import { masterDataMockApi } from './masterData.mock'

const db = masterDataMockApi.__db

const inventoryDb = {
  transactions: [
    { id: 'trans-001', transId: 'TRX-20260308-000123', transType: 'RECEIPT_IN', qty: '25000.000', refType: 'RECEIPT', refId: 'RCV-20260308-001', correlationId: 'corr-20260308-001', postedAt: '2026-03-08T08:30:00Z', sourceApp: 'API', isReversal: false, itemId: 'item-001', ownerId: 'owner-001' },
    { id: 'trans-002', transId: 'TRX-20260308-000124', transType: 'SHIPMENT_OUT', qty: '-5000.000', refType: 'SHIPMENT', refId: 'SHP-20260308-017', correlationId: 'corr-20260308-002', postedAt: '2026-03-08T09:10:00Z', sourceApp: 'API', isReversal: false, itemId: 'item-001', ownerId: 'owner-001' },
    { id: 'trans-003', transId: 'TRX-20260308-000125', transType: 'ADJUSTMENT', qty: '1000.000', refType: 'COUNT', refId: 'CNT-20260308-003', correlationId: 'corr-20260308-003', postedAt: '2026-03-08T10:45:00Z', sourceApp: 'FRONTEND', isReversal: false, itemId: 'item-002', ownerId: 'owner-002' },
  ],
  onHand: [
    { id: 'oh-001', itemId: 'item-001', physicalQty: '30000', reservedQty: '10000', availableQty: '20000', uomId: 'uom-001', lotNumber: 'LOT-2026-001', inventDim: { warehouseId: 'wh-001', locationId: 'loc-001', ownerId: 'owner-001', inventoryStatusId: 'st-001' } },
    { id: 'oh-002', itemId: 'item-002', physicalQty: '12000', reservedQty: '0', availableQty: '12000', uomId: 'uom-001', lotNumber: 'LOT-2026-002', inventDim: { warehouseId: 'wh-001', locationId: 'loc-002', ownerId: 'owner-002', inventoryStatusId: 'st-001' } },
    { id: 'oh-003', itemId: 'item-001', physicalQty: '5500.500', reservedQty: '500.500', availableQty: '5000', uomId: 'uom-002', lotNumber: 'LOT-2026-003', inventDim: { warehouseId: 'wh-002', locationId: 'loc-001', ownerId: 'owner-001', inventoryStatusId: 'st-002' } },
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
    const isOutbound = data.eventCode?.includes('SHIPMENT') || data.eventCode?.includes('OUT')
    const transType = isOutbound ? 'SHIPMENT_OUT' : 'RECEIPT_IN'
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
      const newReserved = Number(onHand.reservedQty)
      onHand.physicalQty = String(Math.max(0, newPhysical))
      onHand.availableQty = String(Math.max(0, newPhysical - newReserved))
    } else {
      onHand = {
        id: `oh-${Date.now()}`,
        itemId,
        physicalQty: String(Math.max(0, signedQty)),
        reservedQty: '0',
        availableQty: String(Math.max(0, signedQty)),
        uomId,
        lotNumber: data.lotNumber || `LOT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(inventoryDb.onHand.length + 1).padStart(3, '0')}`,
        inventDim: { warehouseId, locationId, ownerId, inventoryStatusId: statusId },
      }
      inventoryDb.onHand.push(onHand)
    }

    return delay({ data: { trans_id: record.transId, trans_type: record.transType, idempotent_replay: false, on_hand_after: { physical_qty: onHand.physicalQty, reserved_qty: onHand.reservedQty, available_qty: onHand.availableQty } } })
  },
  reversePosting: (data) => {
    // Find original transaction and reverse its qty from on-hand
    const original = inventoryDb.transactions.find((t) => t.transId === data.originalTransId || t.id === data.originalTransId)
    if (original && original.itemId) {
      const reverseQty = -Number(original.qty || 0)
      const onHand = inventoryDb.onHand.find((oh) => oh.itemId === original.itemId && oh.inventDim.ownerId === original.ownerId)
      if (onHand) {
        const newPhysical = Number(onHand.physicalQty) + reverseQty
        const newReserved = Number(onHand.reservedQty)
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
}
