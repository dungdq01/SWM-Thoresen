import { delay, includesText, paginate } from './utils'
import { masterDataMockApi } from './masterData.mock'

const db = masterDataMockApi.__db

const shipmentDb = {
  shipments: [
    {
      id: 'shp-001',
      shipmentNumber: 'SHP-20260308-0001',
      soId: 'so-001',
      ownerId: 'owner-001',
      customerId: 'cust-001',
      warehouseId: 'wh-001',
      vehicleNumber: '51D-12345',
      status: 'SHIPPED',
      tareWeightKg: 6200,
      totalGrossKg: 36500,
      totalNetKg: 30300,
      isDpmShipment: false,
      cancelReasonCode: '',
      externalId: 'ext-shp-001',
      correlationId: 'corr-out-001',
      sourceApp: 'WEB',
      createdBy: 'manager.user',
      createdAt: '2026-03-08T07:30:00Z',
      updatedAt: '2026-03-08T09:45:00Z',
      lines: [
        {
          id: 'shp-line-001',
          lineNumber: 1,
          itemId: 'item-001',
          cargoForm: 'BAGGED_50KG',
          uom: 'KG',
          expectedQty: 15000,
          allocatedQty: 15000,
          pickedQty: 15000,
          shippedQty: 15150,
          bagCount: 300,
          nominalWeightPerBag: 50,
          grossWeightKg: 21350,
          netWeightKg: 15150,
          tolerancePctApplied: 2,
          variancePct: 1,
          lineStatus: 'LINE_SHIPPED',
          postedTransId: 'TRX-20260308-000201',
        },
        {
          id: 'shp-line-002',
          lineNumber: 2,
          itemId: 'item-002',
          cargoForm: 'BULK',
          uom: 'KG',
          expectedQty: 15000,
          allocatedQty: 15000,
          pickedQty: 15000,
          shippedQty: 15150,
          bagCount: null,
          nominalWeightPerBag: null,
          grossWeightKg: 36500,
          netWeightKg: 15150,
          tolerancePctApplied: 1.5,
          variancePct: 1,
          lineStatus: 'LINE_SHIPPED',
          postedTransId: 'TRX-20260308-000202',
        },
      ],
    },
    {
      id: 'shp-002',
      shipmentNumber: 'SHP-20260308-0002',
      soId: 'so-002',
      ownerId: 'owner-002',
      customerId: 'cust-002',
      warehouseId: 'wh-001',
      vehicleNumber: '51C-77889',
      status: 'PENDING_APPROVAL',
      tareWeightKg: 6100,
      totalGrossKg: 31500,
      totalNetKg: 25400,
      isDpmShipment: true,
      cancelReasonCode: '',
      externalId: 'ext-shp-002',
      correlationId: 'corr-out-002',
      sourceApp: 'WEB',
      createdBy: 'manager.user',
      createdAt: '2026-03-08T10:00:00Z',
      updatedAt: '2026-03-08T11:30:00Z',
      lines: [
        {
          id: 'shp-line-003',
          lineNumber: 1,
          itemId: 'item-001',
          cargoForm: 'BAGGED_50KG',
          uom: 'KG',
          expectedQty: 25000,
          allocatedQty: 25000,
          pickedQty: 25000,
          shippedQty: null,
          bagCount: 500,
          nominalWeightPerBag: 50,
          grossWeightKg: 31500,
          netWeightKg: 25400,
          tolerancePctApplied: 2,
          variancePct: 1.6,
          lineStatus: 'PENDING_APPROVAL',
          postedTransId: null,
        },
      ],
    },
    {
      id: 'shp-003',
      shipmentNumber: 'SHP-20260308-0003',
      soId: null,
      ownerId: 'owner-001',
      customerId: 'cust-003',
      warehouseId: 'wh-001',
      vehicleNumber: '60H-44556',
      status: 'ALLOCATED',
      tareWeightKg: null,
      totalGrossKg: null,
      totalNetKg: null,
      isDpmShipment: false,
      cancelReasonCode: '',
      externalId: 'ext-shp-003',
      correlationId: 'corr-out-003',
      sourceApp: 'WEB',
      createdBy: 'planner.user',
      createdAt: '2026-03-08T12:00:00Z',
      updatedAt: '2026-03-08T12:30:00Z',
      lines: [
        {
          id: 'shp-line-004',
          lineNumber: 1,
          itemId: 'item-002',
          cargoForm: 'BULK',
          uom: 'KG',
          expectedQty: 20000,
          allocatedQty: 20000,
          pickedQty: null,
          shippedQty: null,
          bagCount: null,
          nominalWeightPerBag: null,
          grossWeightKg: null,
          netWeightKg: null,
          tolerancePctApplied: 1.5,
          variancePct: null,
          lineStatus: 'ALLOCATED',
          postedTransId: null,
        },
      ],
    },
    {
      id: 'shp-004',
      shipmentNumber: 'SHP-20260308-0004',
      soId: 'so-003',
      ownerId: 'owner-002',
      customerId: 'cust-001',
      warehouseId: 'wh-001',
      vehicleNumber: '51D-90909',
      status: 'DRAFT',
      tareWeightKg: null,
      totalGrossKg: null,
      totalNetKg: null,
      isDpmShipment: false,
      cancelReasonCode: '',
      externalId: 'ext-shp-004',
      correlationId: 'corr-out-004',
      sourceApp: 'WEB',
      createdBy: 'manager.user',
      createdAt: '2026-03-08T14:00:00Z',
      updatedAt: '2026-03-08T14:00:00Z',
      lines: [
        {
          id: 'shp-line-005',
          lineNumber: 1,
          itemId: 'item-001',
          cargoForm: 'BAGGED_25KG',
          uom: 'KG',
          expectedQty: 10000,
          allocatedQty: null,
          pickedQty: null,
          shippedQty: null,
          bagCount: 400,
          nominalWeightPerBag: 25,
          grossWeightKg: null,
          netWeightKg: null,
          tolerancePctApplied: 2,
          variancePct: null,
          lineStatus: 'PENDING',
          postedTransId: null,
        },
      ],
    },
    {
      id: 'shp-005',
      shipmentNumber: 'SHP-20260308-0005',
      soId: 'so-004',
      ownerId: 'owner-001',
      customerId: 'cust-002',
      warehouseId: 'wh-001',
      vehicleNumber: '51H-22334',
      status: 'PICKING',
      tareWeightKg: null,
      totalGrossKg: null,
      totalNetKg: null,
      isDpmShipment: false,
      cancelReasonCode: '',
      externalId: 'ext-shp-005',
      correlationId: 'corr-out-005',
      sourceApp: 'WEB',
      createdBy: 'planner.user',
      createdAt: '2026-03-08T15:00:00Z',
      updatedAt: '2026-03-08T15:30:00Z',
      lines: [
        {
          id: 'shp-line-006',
          lineNumber: 1,
          itemId: 'item-002',
          cargoForm: 'BULK',
          uom: 'KG',
          expectedQty: 18000,
          allocatedQty: 18000,
          pickedQty: 9000,
          shippedQty: null,
          bagCount: null,
          nominalWeightPerBag: null,
          grossWeightKg: null,
          netWeightKg: null,
          tolerancePctApplied: 1.5,
          variancePct: null,
          lineStatus: 'PICKING',
          postedTransId: null,
        },
      ],
    },
  ],
  statusHistory: [
    { id: 'hist-out-001', shipmentId: 'shp-001', fromStatus: 'DRAFT', toStatus: 'CONFIRMED', action: 'confirm', actor: 'manager.user', at: '2026-03-08T07:35:00Z', note: 'Shipment confirmed' },
    { id: 'hist-out-002', shipmentId: 'shp-001', fromStatus: 'CONFIRMED', toStatus: 'ALLOCATED', action: 'allocate', actor: 'system', at: '2026-03-08T07:40:00Z', note: 'Stock allocated via FIFO' },
    { id: 'hist-out-003', shipmentId: 'shp-001', fromStatus: 'ALLOCATED', toStatus: 'PICKING', action: 'auto-picking', actor: 'system', at: '2026-03-08T07:45:00Z', note: 'Pick work created' },
    { id: 'hist-out-004', shipmentId: 'shp-001', fromStatus: 'PICKING', toStatus: 'PICKED', action: 'pick-complete', actor: 'wb.operator', at: '2026-03-08T08:30:00Z', note: 'All pick work completed' },
    { id: 'hist-out-005', shipmentId: 'shp-001', fromStatus: 'PICKED', toStatus: 'WEIGHING_TARE', action: 'weigh-tare', actor: 'wb.operator', at: '2026-03-08T08:45:00Z', note: 'Tare recorded' },
    { id: 'hist-out-006', shipmentId: 'shp-001', fromStatus: 'ALL_WEIGHED', toStatus: 'SHIPPED', action: 'auto-ship', actor: 'system', at: '2026-03-08T09:45:00Z', note: 'All lines passed tolerance, inventory posted' },
    { id: 'hist-out-007', shipmentId: 'shp-002', fromStatus: 'ALL_WEIGHED', toStatus: 'PENDING_APPROVAL', action: 'auto-pending', actor: 'system', at: '2026-03-08T11:30:00Z', note: 'Line 1 failed tolerance, awaiting manager approval' },
  ],
  allocations: [
    { id: 'alloc-001', shipmentLineId: 'shp-line-001', locationId: 'loc-001', dimId: 'dim-001', allocatedQty: 15000, lotDate: '2026-03-01', status: 'PICKED' },
    { id: 'alloc-002', shipmentLineId: 'shp-line-002', locationId: 'loc-002', dimId: 'dim-002', allocatedQty: 15000, lotDate: '2026-03-02', status: 'PICKED' },
    { id: 'alloc-003', shipmentLineId: 'shp-line-003', locationId: 'loc-001', dimId: 'dim-003', allocatedQty: 25000, lotDate: '2026-03-03', status: 'ALLOCATED' },
    { id: 'alloc-004', shipmentLineId: 'shp-line-004', locationId: 'loc-002', dimId: 'dim-004', allocatedQty: 20000, lotDate: '2026-03-04', status: 'ALLOCATED' },
    { id: 'alloc-005', shipmentLineId: 'shp-line-006', locationId: 'loc-001', dimId: 'dim-005', allocatedQty: 18000, lotDate: '2026-03-05', status: 'ALLOCATED' },
  ],
  weighingAttempts: [
    { id: 'weigh-out-001', shipmentId: 'shp-001', eventType: 'TARE', lineId: null, rawWeightKg: 6200, sourceMode: 'SCALE_AGENT', scaleTicketNo: 'WB-TARE-001', at: '2026-03-08T08:45:00Z' },
    { id: 'weigh-out-002', shipmentId: 'shp-001', eventType: 'GROSS', lineId: 'shp-line-001', rawWeightKg: 21350, sourceMode: 'SCALE_AGENT', scaleTicketNo: 'WB-GROSS-001', at: '2026-03-08T09:00:00Z' },
    { id: 'weigh-out-003', shipmentId: 'shp-001', eventType: 'GROSS', lineId: 'shp-line-002', rawWeightKg: 36500, sourceMode: 'SCALE_AGENT', scaleTicketNo: 'WB-GROSS-002', at: '2026-03-08T09:30:00Z' },
    { id: 'weigh-out-004', shipmentId: 'shp-002', eventType: 'TARE', lineId: null, rawWeightKg: 6100, sourceMode: 'SCALE_AGENT', scaleTicketNo: 'WB-TARE-002', at: '2026-03-08T11:00:00Z' },
    { id: 'weigh-out-005', shipmentId: 'shp-002', eventType: 'GROSS', lineId: 'shp-line-003', rawWeightKg: 31500, sourceMode: 'SCALE_AGENT', scaleTicketNo: 'WB-GROSS-003', at: '2026-03-08T11:25:00Z' },
  ],
  exceptions: [
    { id: 'exc-out-001', shipmentId: 'shp-002', lineId: 'shp-line-003', type: 'TOLERANCE_FAIL', severity: 'high', status: 'OPEN', reasonCode: 'VARIANCE_EXCEEDED', note: 'Variance 1.6% cho DPM shipment cần manager review', createdAt: '2026-03-08T11:30:00Z' },
  ],
}

// ==================== SALES ORDERS ====================
const soDb = {
  salesOrders: [
    {
      id: 'so-001',
      soNumber: 'SO-20260308-001',
      status: 'CONFIRMED',
      ownerId: 'owner-001',
      customerId: 'cust-001',
      customerName: 'Công ty TNHH Thực phẩm Sài Gòn',
      warehouseId: 'wh-001',
      requestedDeliveryDate: '2026-03-10',
      notes: 'Gạo 5% tấm xuất cho đại lý miền Tây',
      totalExpectedQty: 30000,
      totalShippedQty: 30300,
      currency: 'VND',
      createdBy: 'planner.user',
      createdAt: '2026-03-07T08:00:00Z',
      updatedAt: '2026-03-08T09:45:00Z',
      lines: [
        { id: 'sol-001', lineNum: 1, itemId: 'item-001', expectedQty: 15000, shippedQty: 15150, uomId: 'uom-001', unitPrice: 16000, cargoForm: 'BAGGED_50KG', notes: 'Lô 1 - xe 15T', status: 'SHIPPED' },
        { id: 'sol-002', lineNum: 2, itemId: 'item-002', expectedQty: 15000, shippedQty: 15150, uomId: 'uom-001', unitPrice: 13000, cargoForm: 'BULK', notes: 'Lô 2 - bulk', status: 'SHIPPED' },
      ],
    },
    {
      id: 'so-002',
      soNumber: 'SO-20260308-002',
      status: 'CONFIRMED',
      ownerId: 'owner-002',
      customerId: 'cust-002',
      customerName: 'Đại lý Phân bón Đồng Nai',
      warehouseId: 'wh-001',
      requestedDeliveryDate: '2026-03-12',
      notes: 'Xuất Urea cho đại lý',
      totalExpectedQty: 25000,
      totalShippedQty: 0,
      currency: 'VND',
      createdBy: 'planner.user',
      createdAt: '2026-03-07T10:00:00Z',
      updatedAt: '2026-03-08T11:30:00Z',
      lines: [
        { id: 'sol-003', lineNum: 1, itemId: 'item-001', expectedQty: 25000, shippedQty: 0, uomId: 'uom-001', unitPrice: 16000, cargoForm: 'BAGGED_50KG', notes: '', status: 'OPEN' },
      ],
    },
    {
      id: 'so-003',
      soNumber: 'SO-20260308-003',
      status: 'DRAFT',
      ownerId: 'owner-002',
      customerId: 'cust-001',
      customerName: 'Công ty TNHH Thực phẩm Sài Gòn',
      warehouseId: 'wh-001',
      requestedDeliveryDate: '2026-03-15',
      notes: 'Gạo bagged 25kg cho siêu thị',
      totalExpectedQty: 10000,
      totalShippedQty: 0,
      currency: 'VND',
      createdBy: 'manager.user',
      createdAt: '2026-03-08T14:00:00Z',
      updatedAt: '2026-03-08T14:00:00Z',
      lines: [
        { id: 'sol-004', lineNum: 1, itemId: 'item-001', expectedQty: 10000, shippedQty: 0, uomId: 'uom-001', unitPrice: 16500, cargoForm: 'BAGGED_25KG', notes: '', status: 'OPEN' },
      ],
    },
    {
      id: 'so-004',
      soNumber: 'SO-20260308-004',
      status: 'CONFIRMED',
      ownerId: 'owner-001',
      customerId: 'cust-002',
      customerName: 'Đại lý Phân bón Đồng Nai',
      warehouseId: 'wh-001',
      requestedDeliveryDate: '2026-03-14',
      notes: 'Urea bulk xuất tàu',
      totalExpectedQty: 18000,
      totalShippedQty: 0,
      currency: 'VND',
      createdBy: 'planner.user',
      createdAt: '2026-03-08T15:00:00Z',
      updatedAt: '2026-03-08T15:30:00Z',
      lines: [
        { id: 'sol-005', lineNum: 1, itemId: 'item-002', expectedQty: 18000, shippedQty: 0, uomId: 'uom-001', unitPrice: 12500, cargoForm: 'BULK', notes: 'Full vessel load', status: 'OPEN' },
      ],
    },
    {
      id: 'so-005',
      soNumber: 'SO-20260308-005',
      status: 'CLOSED',
      ownerId: 'owner-001',
      customerId: 'cust-003',
      customerName: 'Kho Cảng Cát Lái',
      warehouseId: 'wh-001',
      requestedDeliveryDate: '2026-03-08',
      notes: 'Đã xuất xong',
      totalExpectedQty: 20000,
      totalShippedQty: 20100,
      currency: 'VND',
      createdBy: 'planner.user',
      createdAt: '2026-03-06T09:00:00Z',
      updatedAt: '2026-03-08T13:05:00Z',
      lines: [
        { id: 'sol-006', lineNum: 1, itemId: 'item-001', expectedQty: 12000, shippedQty: 12050, uomId: 'uom-001', unitPrice: 15800, cargoForm: 'BAGGED_50KG', notes: '', status: 'SHIPPED' },
        { id: 'sol-007', lineNum: 2, itemId: 'item-002', expectedQty: 8000, shippedQty: 8050, uomId: 'uom-001', unitPrice: 12200, cargoForm: 'BULK', notes: '', status: 'SHIPPED' },
      ],
    },
  ],
}

const findEntity = {
  owner: (id) => db.owners.find((item) => item.id === id),
  item: (id) => db.items.find((item) => item.id === id),
  warehouse: (id) => db.warehouses.find((item) => item.id === id),
  location: (id) => db.locations.find((item) => item.id === id),
}

function enrichSo(so) {
  return {
    ...so,
    owner: findEntity.owner(so.ownerId),
    warehouse: findEntity.warehouse(so.warehouseId),
    lines: so.lines.map((line) => ({
      ...line,
      item: findEntity.item(line.itemId),
      uom: db.uoms?.find((u) => u.id === line.uomId),
    })),
  }
}

function enrichShipment(shipment) {
  return {
    ...shipment,
    owner: findEntity.owner(shipment.ownerId),
    warehouse: findEntity.warehouse(shipment.warehouseId),
    lines: shipment.lines.map((line) => ({
      ...line,
      item: findEntity.item(line.itemId),
    })),
  }
}

function updateShipment(id, updater) {
  const index = shipmentDb.shipments.findIndex((item) => item.id === id)
  const current = shipmentDb.shipments[index]
  const next = typeof updater === 'function' ? updater(current) : { ...current, ...updater }
  shipmentDb.shipments[index] = { ...next, updatedAt: new Date().toISOString() }
  return shipmentDb.shipments[index]
}

function pushHistory(shipmentId, fromStatus, toStatus, action, actor = 'system', note = '') {
  shipmentDb.statusHistory.unshift({
    id: `hist-out-${Date.now()}`,
    shipmentId,
    fromStatus,
    toStatus,
    action,
    actor,
    at: new Date().toISOString(),
    note,
  })
}

function getStatusSummary(shipments) {
  return {
    totalDraft: shipments.filter((s) => s.status === 'DRAFT').length,
    totalConfirmed: shipments.filter((s) => s.status === 'CONFIRMED').length,
    totalAllocated: shipments.filter((s) => s.status === 'ALLOCATED').length,
    totalPicking: shipments.filter((s) => s.status === 'PICKING').length,
    totalPicked: shipments.filter((s) => s.status === 'PICKED').length,
    totalWeighing: shipments.filter((s) => ['WEIGHING_TARE', 'LOADING', 'ALL_WEIGHED'].includes(s.status)).length,
    totalPendingApproval: shipments.filter((s) => s.status === 'PENDING_APPROVAL').length,
    totalShippedToday: shipments.filter((s) => s.status === 'SHIPPED').length,
    totalClosed: shipments.filter((s) => s.status === 'CLOSED').length,
  }
}

export const outboundOperationsMockApi = {
  getDashboardSummary: async (warehouseId) => {
    let shipments = shipmentDb.shipments
    if (warehouseId) {
      shipments = shipments.filter((s) => s.warehouseId === warehouseId)
    }
    const summary = getStatusSummary(shipments)
    const exceptionsOpen = shipmentDb.exceptions.filter((e) => e.status === 'OPEN').length
    return delay({
      data: {
        ...summary,
        exceptionsOpen,
      },
    })
  },

  getShipments: async (params = {}) => {
    const rows = shipmentDb.shipments
      .filter((row) => {
        return (!params.status || row.status === params.status)
          && (!params.ownerId || row.ownerId === params.ownerId)
          && (!params.warehouseId || row.warehouseId === params.warehouseId)
          && (!params.shipmentNumber || includesText(row.shipmentNumber, params.shipmentNumber))
          && (!params.vehicleNumber || includesText(row.vehicleNumber, params.vehicleNumber))
          && (!params.soId || row.soId === params.soId)
      })
      .map(enrichShipment)

    return delay({ ...paginate(rows, params.page, params.pageSize) })
  },

  getShipmentById: async (id) => {
    const shipment = shipmentDb.shipments.find((s) => s.id === id)
    return delay({ data: shipment ? enrichShipment(shipment) : null })
  },

  createShipment: async (data) => {
    const shipment = {
      id: `shp-${Date.now()}`,
      shipmentNumber: `SHP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(shipmentDb.shipments.length + 1).padStart(4, '0')}`,
      soId: data.soId || null,
      ownerId: data.ownerId,
      customerId: data.customerId,
      warehouseId: data.warehouseId,
      vehicleNumber: data.vehicleNumber,
      status: 'DRAFT',
      tareWeightKg: null,
      totalGrossKg: null,
      totalNetKg: null,
      isDpmShipment: data.isDpmShipment || false,
      cancelReasonCode: '',
      externalId: data.externalId || `ext-shp-${Date.now()}`,
      correlationId: data.correlationId || `corr-out-${Date.now()}`,
      sourceApp: data.sourceApp || 'WEB',
      createdBy: data.createdBy || 'frontend.user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lines: (data.lines || []).map((line, index) => ({
        id: `shp-line-${Date.now()}-${index}`,
        lineNumber: index + 1,
        itemId: line.itemId,
        cargoForm: line.cargoForm || 'BULK',
        uom: line.uom || 'KG',
        expectedQty: Number(line.expectedQty || 0),
        allocatedQty: null,
        pickedQty: null,
        shippedQty: null,
        bagCount: line.bagCount ? Number(line.bagCount) : null,
        nominalWeightPerBag: line.nominalWeightPerBag ? Number(line.nominalWeightPerBag) : null,
        grossWeightKg: null,
        netWeightKg: null,
        tolerancePctApplied: line.cargoForm === 'BULK' ? 1.5 : 2,
        variancePct: null,
        lineStatus: 'PENDING',
        postedTransId: null,
      })),
    }

    shipmentDb.shipments.unshift(shipment)
    pushHistory(shipment.id, 'NEW', 'DRAFT', 'create', shipment.createdBy, 'Shipment created')
    return delay({ data: enrichShipment(shipment) })
  },

  confirmShipment: async (id) => {
    const current = shipmentDb.shipments.find((s) => s.id === id)
    const next = updateShipment(id, { status: 'CONFIRMED' })
    pushHistory(id, current.status, 'CONFIRMED', 'confirm', 'manager.user', 'Shipment confirmed')
    return delay({ data: enrichShipment(next) })
  },

  cancelShipment: async (id, data = {}) => {
    const current = shipmentDb.shipments.find((s) => s.id === id)
    const next = updateShipment(id, {
      status: 'CANCELLED',
      cancelReasonCode: data.reasonCode || 'CANCELLED_BY_MANAGER',
    })
    pushHistory(id, current.status, 'CANCELLED', 'cancel', 'manager.user', data.note || 'Shipment cancelled')
    return delay({ data: enrichShipment(next) })
  },

  allocateShipment: async (id) => {
    const current = shipmentDb.shipments.find((s) => s.id === id)
    const lines = current.lines.map((line) => ({
      ...line,
      allocatedQty: line.expectedQty,
      lineStatus: 'ALLOCATED',
    }))
    const next = updateShipment(id, { status: 'ALLOCATED', lines })
    pushHistory(id, current.status, 'ALLOCATED', 'allocate', 'system', 'Stock allocated via FIFO')
    return delay({ data: enrichShipment(next) })
  },

  unallocateShipment: async (id) => {
    const current = shipmentDb.shipments.find((s) => s.id === id)
    const lines = current.lines.map((line) => ({
      ...line,
      allocatedQty: null,
      lineStatus: 'PENDING',
    }))
    const next = updateShipment(id, { status: 'CONFIRMED', lines })
    pushHistory(id, current.status, 'CONFIRMED', 'unallocate', 'system', 'Allocation released')
    return delay({ data: enrichShipment(next) })
  },

  getAllocations: async (id) => {
    const shipment = shipmentDb.shipments.find((s) => s.id === id)
    const lineIds = shipment?.lines.map((l) => l.id) || []
    const allocations = shipmentDb.allocations.filter((a) => lineIds.includes(a.shipmentLineId))
    return delay({ data: allocations })
  },

  recordTare: async (id, data) => {
    const current = shipmentDb.shipments.find((s) => s.id === id)
    shipmentDb.weighingAttempts.unshift({
      id: `weigh-out-${Date.now()}`,
      shipmentId: id,
      eventType: 'TARE',
      lineId: null,
      rawWeightKg: Number(data.rawWeightKg),
      sourceMode: data.sourceMode || 'MANUAL',
      scaleTicketNo: data.scaleTicketNo || `WB-TARE-${Date.now()}`,
      at: new Date().toISOString(),
    })
    const next = updateShipment(id, {
      status: 'WEIGHING_TARE',
      tareWeightKg: Number(data.rawWeightKg),
    })
    pushHistory(id, current.status, 'WEIGHING_TARE', 'weigh-tare', 'wb.operator', 'Tare weight recorded')
    return delay({ data: enrichShipment(next) })
  },

  recordGross: async (id, data) => {
    const current = shipmentDb.shipments.find((s) => s.id === id)
    const lineIndex = current.lines.findIndex((l) => l.id === data.lineId)
    const line = current.lines[lineIndex]

    const previousGross = shipmentDb.weighingAttempts
      .filter((w) => w.shipmentId === id && w.eventType === 'GROSS')
      .sort((a, b) => new Date(b.at) - new Date(a.at))[0]?.rawWeightKg || current.tareWeightKg

    const netWeightKg = Number(data.rawWeightKg) - previousGross
    const variancePct = Math.abs(netWeightKg - line.expectedQty) / line.expectedQty * 100

    shipmentDb.weighingAttempts.unshift({
      id: `weigh-out-${Date.now()}`,
      shipmentId: id,
      eventType: 'GROSS',
      lineId: data.lineId,
      rawWeightKg: Number(data.rawWeightKg),
      sourceMode: data.sourceMode || 'MANUAL',
      scaleTicketNo: data.scaleTicketNo || `WB-GROSS-${Date.now()}`,
      at: new Date().toISOString(),
    })

    const tolerancePass = variancePct <= line.tolerancePctApplied
    const newLineStatus = tolerancePass ? 'LINE_SHIPPED' : 'PENDING_APPROVAL'

    const updatedLines = [...current.lines]
    updatedLines[lineIndex] = {
      ...line,
      grossWeightKg: Number(data.rawWeightKg),
      netWeightKg,
      variancePct: Number(variancePct.toFixed(2)),
      lineStatus: newLineStatus,
    }

    const allLinesWeighed = updatedLines.every((l) => l.grossWeightKg !== null)
    const anyPendingApproval = updatedLines.some((l) => l.lineStatus === 'PENDING_APPROVAL')

    let nextStatus = 'LOADING'
    if (allLinesWeighed) {
      nextStatus = anyPendingApproval ? 'PENDING_APPROVAL' : 'ALL_WEIGHED'
    }

    const next = updateShipment(id, {
      status: nextStatus,
      totalGrossKg: Number(data.rawWeightKg),
      totalNetKg: Number(data.rawWeightKg) - current.tareWeightKg,
      lines: updatedLines,
    })

    pushHistory(id, current.status, nextStatus, 'weigh-gross', 'wb.operator', `Line ${line.lineNumber} gross recorded, variance ${variancePct.toFixed(2)}%`)

    if (!tolerancePass) {
      shipmentDb.exceptions.unshift({
        id: `exc-out-${Date.now()}`,
        shipmentId: id,
        lineId: data.lineId,
        type: 'TOLERANCE_FAIL',
        severity: 'high',
        status: 'OPEN',
        reasonCode: 'VARIANCE_EXCEEDED',
        note: `Variance ${variancePct.toFixed(2)}% vượt tolerance ${line.tolerancePctApplied}%`,
        createdAt: new Date().toISOString(),
      })
    }

    return delay({
      data: {
        shipment: enrichShipment(next),
        toleranceResult: {
          lineId: data.lineId,
          passed: tolerancePass,
          variancePct: Number(variancePct.toFixed(2)),
          tolerancePct: line.tolerancePctApplied,
        },
      },
    })
  },

  getWeighingHistory: async (id) => {
    const history = shipmentDb.weighingAttempts.filter((w) => w.shipmentId === id)
    return delay({ data: history })
  },

  shipShipment: async (id) => {
    const current = shipmentDb.shipments.find((s) => s.id === id)
    const lines = current.lines.map((line) => ({
      ...line,
      shippedQty: line.netWeightKg,
      lineStatus: 'LINE_SHIPPED',
      postedTransId: `TRX-${Date.now()}-${line.lineNumber}`,
    }))
    const next = updateShipment(id, { status: 'SHIPPED', lines })
    pushHistory(id, current.status, 'SHIPPED', 'ship', 'system', 'Inventory posted to M3, billing event captured')
    return delay({ data: enrichShipment(next) })
  },

  getPendingApprovals: async (warehouseId) => {
    let shipments = shipmentDb.shipments.filter((s) => s.status === 'PENDING_APPROVAL')
    if (warehouseId) {
      shipments = shipments.filter((s) => s.warehouseId === warehouseId)
    }
    return delay({ data: shipments.map(enrichShipment) })
  },

  approveShipment: async (id, data) => {
    const current = shipmentDb.shipments.find((s) => s.id === id)
    const lines = current.lines.map((line) => ({
      ...line,
      shippedQty: line.netWeightKg,
      lineStatus: 'LINE_SHIPPED',
      postedTransId: `TRX-${Date.now()}-${line.lineNumber}`,
    }))
    const next = updateShipment(id, { status: 'SHIPPED', lines })
    pushHistory(id, current.status, 'SHIPPED', 'approve', 'manager.user', data.note || 'Approved by manager')

    shipmentDb.exceptions
      .filter((e) => e.shipmentId === id && e.status === 'OPEN')
      .forEach((e) => { e.status = 'RESOLVED' })

    return delay({ data: enrichShipment(next) })
  },

  rejectShipment: async (id, data) => {
    const current = shipmentDb.shipments.find((s) => s.id === id)
    const lines = current.lines.map((line) => ({
      ...line,
      allocatedQty: null,
      lineStatus: 'PENDING',
    }))
    const next = updateShipment(id, {
      status: 'CANCELLED',
      cancelReasonCode: data.reasonCode || 'REJECTED_BY_MANAGER',
      lines,
    })
    pushHistory(id, current.status, 'CANCELLED', 'reject', 'manager.user', data.note || 'Rejected by manager')

    shipmentDb.exceptions
      .filter((e) => e.shipmentId === id && e.status === 'OPEN')
      .forEach((e) => { e.status = 'REJECTED' })

    return delay({ data: enrichShipment(next) })
  },

  getShipmentHistory: async (id) => {
    const history = shipmentDb.statusHistory.filter((h) => h.shipmentId === id)
    return delay({ data: history })
  },

  getShipmentExceptions: async (id) => {
    const exceptions = shipmentDb.exceptions.filter((e) => e.shipmentId === id)
    return delay({ data: exceptions })
  },

  // ==================== SALES ORDER APIs ====================
  getSalesOrders: async (params = {}) => {
    const rows = soDb.salesOrders
      .filter((row) => {
        return (!params.status || row.status === params.status)
          && (!params.ownerId || row.ownerId === params.ownerId)
          && (!params.customerId || row.customerId === params.customerId)
          && (!params.warehouseId || row.warehouseId === params.warehouseId)
          && (!params.keyword || includesText(row.soNumber, params.keyword) || includesText(row.customerName, params.keyword) || includesText(row.notes, params.keyword))
      })
      .map(enrichSo)
    return delay({ ...paginate(rows, params.page, params.pageSize) })
  },

  getSalesOrderById: async (id) => {
    const so = soDb.salesOrders.find((item) => item.id === id)
    return delay({ data: so ? enrichSo(so) : null })
  },

  createSalesOrder: async (data) => {
    const so = {
      id: `so-${Date.now()}`,
      soNumber: `SO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(soDb.salesOrders.length + 1).padStart(3, '0')}`,
      status: 'DRAFT',
      ownerId: data.ownerId,
      customerId: data.customerId || '',
      customerName: data.customerName || '',
      warehouseId: data.warehouseId,
      requestedDeliveryDate: data.requestedDeliveryDate || '',
      notes: data.notes || '',
      totalExpectedQty: 0,
      totalShippedQty: 0,
      currency: data.currency || 'VND',
      createdBy: data.createdBy || 'planner.user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lines: [],
    }
    if (data.lines && data.lines.length > 0) {
      so.lines = data.lines.map((line, idx) => ({
        id: `sol-${Date.now()}-${idx}`,
        lineNum: idx + 1,
        itemId: line.itemId,
        expectedQty: Number(line.expectedQty || 0),
        shippedQty: 0,
        uomId: line.uomId || 'uom-001',
        unitPrice: Number(line.unitPrice || 0),
        cargoForm: line.cargoForm || 'BULK',
        notes: line.notes || '',
        status: 'OPEN',
      }))
      so.totalExpectedQty = so.lines.reduce((sum, l) => sum + l.expectedQty, 0)
    }
    soDb.salesOrders.unshift(so)
    return delay({ data: enrichSo(so) })
  },

  updateSalesOrder: async (id, data) => {
    const index = soDb.salesOrders.findIndex((item) => item.id === id)
    if (index === -1) return delay(null, { statusCode: 404, message: 'SO not found' })
    const current = soDb.salesOrders[index]
    const updated = {
      ...current,
      ownerId: data.ownerId ?? current.ownerId,
      customerId: data.customerId ?? current.customerId,
      customerName: data.customerName ?? current.customerName,
      warehouseId: data.warehouseId ?? current.warehouseId,
      requestedDeliveryDate: data.requestedDeliveryDate ?? current.requestedDeliveryDate,
      notes: data.notes ?? current.notes,
      currency: data.currency ?? current.currency,
      updatedAt: new Date().toISOString(),
    }
    if (data.lines) {
      updated.lines = data.lines.map((line, idx) => ({
        id: line.id || `sol-${Date.now()}-${idx}`,
        lineNum: idx + 1,
        itemId: line.itemId,
        expectedQty: Number(line.expectedQty || 0),
        shippedQty: Number(line.shippedQty || 0),
        uomId: line.uomId || 'uom-001',
        unitPrice: Number(line.unitPrice || 0),
        cargoForm: line.cargoForm || 'BULK',
        notes: line.notes || '',
        status: line.status || 'OPEN',
      }))
      updated.totalExpectedQty = updated.lines.reduce((sum, l) => sum + l.expectedQty, 0)
      updated.totalShippedQty = updated.lines.reduce((sum, l) => sum + l.shippedQty, 0)
    }
    soDb.salesOrders[index] = updated
    return delay({ data: enrichSo(updated) })
  },

  confirmSalesOrder: async (id) => {
    const index = soDb.salesOrders.findIndex((item) => item.id === id)
    if (index === -1) return delay(null, { statusCode: 404, message: 'SO not found' })
    soDb.salesOrders[index] = { ...soDb.salesOrders[index], status: 'CONFIRMED', updatedAt: new Date().toISOString() }
    return delay({ data: enrichSo(soDb.salesOrders[index]) })
  },

  closeSalesOrder: async (id) => {
    const index = soDb.salesOrders.findIndex((item) => item.id === id)
    if (index === -1) return delay(null, { statusCode: 404, message: 'SO not found' })
    soDb.salesOrders[index] = { ...soDb.salesOrders[index], status: 'CLOSED', updatedAt: new Date().toISOString() }
    return delay({ data: enrichSo(soDb.salesOrders[index]) })
  },

  cancelSalesOrder: async (id) => {
    const index = soDb.salesOrders.findIndex((item) => item.id === id)
    if (index === -1) return delay(null, { statusCode: 404, message: 'SO not found' })
    soDb.salesOrders[index] = { ...soDb.salesOrders[index], status: 'CANCELLED', updatedAt: new Date().toISOString() }
    return delay({ data: enrichSo(soDb.salesOrders[index]) })
  },
}
