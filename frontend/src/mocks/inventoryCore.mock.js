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
    { id: 'oh-001', itemId: 'item-001', physicalQty: '30000.000', reservedQty: '10000.000', availableQty: '20000.000', uomId: 'uom-001', inventDim: { warehouseId: 'wh-001', locationId: 'loc-001', ownerId: 'owner-001', inventoryStatusId: 'st-001' } },
    { id: 'oh-002', itemId: 'item-002', physicalQty: '12000.000', reservedQty: '0.000', availableQty: '12000.000', uomId: 'uom-001', inventDim: { warehouseId: 'wh-001', locationId: 'loc-002', ownerId: 'owner-002', inventoryStatusId: 'st-001' } },
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
    const record = { id: `trans-${Date.now()}`, transId: `TRX-${Date.now()}`, transType: data.eventCode?.includes('SHIPMENT') ? 'SHIPMENT_OUT' : 'RECEIPT_IN', qty: String(data.qty), refType: data.refType, refId: data.refId, correlationId: data.correlationId, postedAt: new Date().toISOString(), sourceApp: data.sourceApp || 'FRONTEND', isReversal: false, itemId: data.itemId, ownerId: db.owners.find((item) => item.ownerCode === data.dimTo?.ownerCode)?.id }
    inventoryDb.transactions.unshift(record)
    return delay({ data: { trans_id: record.transId, trans_type: record.transType, idempotent_replay: false, on_hand_after: { physical_qty: 'mocked', reserved_qty: 'mocked', available_qty: 'mocked' } } })
  },
  reversePosting: (data) => {
    const record = { id: `trans-${Date.now()}`, transId: `TRX-${Date.now()}`, transType: 'REVERSAL', qty: '0.000', refType: 'REVERSAL', refId: data.originalTransId, correlationId: data.correlationId, postedAt: new Date().toISOString(), sourceApp: 'FRONTEND', isReversal: true }
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
