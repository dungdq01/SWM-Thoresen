import { delay, paginate } from './utils'
import { masterDataMockApi } from './masterData.mock'

const db = masterDataMockApi.__db

const workDb = {
  works: [
    {
      id: 'wrk-001',
      workId: 'WRK-20260308-0001',
      workType: 'PUTAWAY',
      status: 'COMPLETED',
      priority: 50,
      warehouseId: 'wh-001',
      zoneId: 'zone-001',
      sourceType: 'RECEIPT',
      sourceId: 'RCV-20260308-0001',
      sourceLineId: 'rcvl-001',
      ownerId: 'owner-001',
      assignedTo: 'keeper.user',
      assignedAt: '2026-03-08T08:00:00Z',
      startedAt: '2026-03-08T08:05:00Z',
      completedAt: '2026-03-08T08:30:00Z',
      cancelReasonCode: null,
      externalId: 'ext-wrk-001',
      correlationId: 'corr-wrk-001',
      createdBy: 'system',
      createdAt: '2026-03-08T07:45:00Z',
      updatedAt: '2026-03-08T08:30:00Z',
      lines: [
        { id: 'wrkl-001', workHeaderId: 'wrk-001', lineNum: 1, stepType: 'PUT', status: 'COMPLETED', fromLocationId: 'loc-receiving', toLocationId: 'loc-001', itemId: 'item-001', expectedQty: 50000, actualQty: 50000, uom: 'KG', inventTransId: 'TRX-WRK-001', scannedLocation: 'LOC-001', varianceQty: 0, varianceReason: null, completedAt: '2026-03-08T08:30:00Z', completedBy: 'keeper.user' },
      ],
    },
    {
      id: 'wrk-002',
      workId: 'WRK-20260308-0002',
      workType: 'PICK',
      status: 'IN_PROGRESS',
      priority: 10,
      warehouseId: 'wh-001',
      zoneId: 'zone-001',
      sourceType: 'SHIPMENT',
      sourceId: 'SHP-20260308-0005',
      sourceLineId: 'shp-line-006',
      ownerId: 'owner-001',
      assignedTo: 'keeper.user',
      assignedAt: '2026-03-08T15:00:00Z',
      startedAt: '2026-03-08T15:05:00Z',
      completedAt: null,
      cancelReasonCode: null,
      externalId: 'ext-wrk-002',
      correlationId: 'corr-wrk-002',
      createdBy: 'system',
      createdAt: '2026-03-08T14:45:00Z',
      updatedAt: '2026-03-08T15:05:00Z',
      lines: [
        { id: 'wrkl-002', workHeaderId: 'wrk-002', lineNum: 1, stepType: 'PICK', status: 'IN_PROGRESS', fromLocationId: 'loc-001', toLocationId: 'loc-staging', itemId: 'item-002', expectedQty: 18000, actualQty: null, uom: 'KG', inventTransId: null, scannedLocation: null, varianceQty: null, varianceReason: null, completedAt: null, completedBy: null },
      ],
    },
    {
      id: 'wrk-003',
      workId: 'WRK-20260308-0003',
      workType: 'MOVE',
      status: 'OPEN',
      priority: 60,
      warehouseId: 'wh-001',
      zoneId: 'zone-001',
      sourceType: 'MOVE_REQUEST',
      sourceId: 'MO-20260308-0002',
      sourceLineId: 'mol-002',
      ownerId: 'owner-001',
      assignedTo: null,
      assignedAt: null,
      startedAt: null,
      completedAt: null,
      cancelReasonCode: null,
      externalId: 'ext-wrk-003',
      correlationId: 'corr-wrk-003',
      createdBy: 'system',
      createdAt: '2026-03-08T10:30:00Z',
      updatedAt: '2026-03-08T10:30:00Z',
      lines: [
        { id: 'wrkl-003', workHeaderId: 'wrk-003', lineNum: 1, stepType: 'MOVE_FROM', status: 'OPEN', fromLocationId: 'loc-002', toLocationId: null, itemId: 'item-002', expectedQty: 8000, actualQty: null, uom: 'KG', inventTransId: null, scannedLocation: null, varianceQty: null, varianceReason: null, completedAt: null, completedBy: null },
        { id: 'wrkl-004', workHeaderId: 'wrk-003', lineNum: 2, stepType: 'MOVE_TO', status: 'OPEN', fromLocationId: null, toLocationId: 'loc-003', itemId: 'item-002', expectedQty: 8000, actualQty: null, uom: 'KG', inventTransId: null, scannedLocation: null, varianceQty: null, varianceReason: null, completedAt: null, completedBy: null },
      ],
    },
    {
      id: 'wrk-004',
      workId: 'WRK-20260308-0004',
      workType: 'TRANSFER_PICK',
      status: 'OPEN',
      priority: 40,
      warehouseId: 'wh-001',
      zoneId: 'zone-001',
      sourceType: 'TRANSFER_ORDER',
      sourceId: 'TO-20260308-0003',
      sourceLineId: 'tol-003',
      ownerId: 'owner-002',
      assignedTo: null,
      assignedAt: null,
      startedAt: null,
      completedAt: null,
      cancelReasonCode: null,
      externalId: 'ext-wrk-004',
      correlationId: 'corr-wrk-004',
      createdBy: 'system',
      createdAt: '2026-03-08T13:30:00Z',
      updatedAt: '2026-03-08T13:30:00Z',
      lines: [
        { id: 'wrkl-005', workHeaderId: 'wrk-004', lineNum: 1, stepType: 'PICK', status: 'OPEN', fromLocationId: 'loc-010', toLocationId: 'loc-staging', itemId: 'item-001', expectedQty: 5000, actualQty: null, uom: 'KG', inventTransId: null, scannedLocation: null, varianceQty: null, varianceReason: null, completedAt: null, completedBy: null },
      ],
    },
    {
      id: 'wrk-005',
      workId: 'WRK-20260308-0005',
      workType: 'PUTAWAY',
      status: 'OPEN',
      priority: 50,
      warehouseId: 'wh-001',
      zoneId: 'zone-001',
      sourceType: 'RECEIPT',
      sourceId: 'RCV-20260308-0002',
      sourceLineId: 'rcvl-002',
      ownerId: 'owner-001',
      assignedTo: null,
      assignedAt: null,
      startedAt: null,
      completedAt: null,
      cancelReasonCode: null,
      externalId: 'ext-wrk-005',
      correlationId: 'corr-wrk-005',
      createdBy: 'system',
      createdAt: '2026-03-08T11:00:00Z',
      updatedAt: '2026-03-08T11:00:00Z',
      lines: [
        { id: 'wrkl-006', workHeaderId: 'wrk-005', lineNum: 1, stepType: 'PUT', status: 'OPEN', fromLocationId: 'loc-receiving', toLocationId: null, itemId: 'item-001', expectedQty: 25000, actualQty: null, uom: 'KG', inventTransId: null, scannedLocation: null, varianceQty: null, varianceReason: null, completedAt: null, completedBy: null },
      ],
    },
  ],
  events: [
    { id: 'evt-001', workHeaderId: 'wrk-001', eventType: 'CREATED', actor: 'system', at: '2026-03-08T07:45:00Z', note: 'Auto-created from receipt RCV-20260308-0001' },
    { id: 'evt-002', workHeaderId: 'wrk-001', eventType: 'CLAIMED', actor: 'keeper.user', at: '2026-03-08T08:00:00Z', note: '' },
    { id: 'evt-003', workHeaderId: 'wrk-001', eventType: 'STARTED', actor: 'keeper.user', at: '2026-03-08T08:05:00Z', note: '' },
    { id: 'evt-004', workHeaderId: 'wrk-001', eventType: 'LINE_COMPLETED', actor: 'keeper.user', at: '2026-03-08T08:30:00Z', note: 'Line 1 completed, InventTrans posted' },
    { id: 'evt-005', workHeaderId: 'wrk-001', eventType: 'COMPLETED', actor: 'system', at: '2026-03-08T08:30:00Z', note: 'All lines completed' },
    { id: 'evt-006', workHeaderId: 'wrk-002', eventType: 'CREATED', actor: 'system', at: '2026-03-08T14:45:00Z', note: 'Auto-created from shipment SHP-20260308-0005' },
    { id: 'evt-007', workHeaderId: 'wrk-002', eventType: 'CLAIMED', actor: 'keeper.user', at: '2026-03-08T15:00:00Z', note: '' },
    { id: 'evt-008', workHeaderId: 'wrk-002', eventType: 'STARTED', actor: 'keeper.user', at: '2026-03-08T15:05:00Z', note: '' },
  ],
  exceptions: [
    { id: 'exc-wrk-001', workHeaderId: 'wrk-002', lineId: 'wrkl-002', type: 'SHORT_PICK', severity: 'medium', status: 'OPEN', reasonCode: 'INSUFFICIENT_STOCK', note: 'Only 9000 kg available at location', createdAt: '2026-03-08T15:10:00Z' },
  ],
}

const findEntity = {
  owner: (id) => db.owners.find((item) => item.id === id),
  item: (id) => db.items.find((item) => item.id === id),
  warehouse: (id) => db.warehouses.find((item) => item.id === id),
  location: (id) => db.locations.find((item) => item.id === id),
}

function enrichWork(work) {
  return {
    ...work,
    owner: findEntity.owner(work.ownerId),
    warehouse: findEntity.warehouse(work.warehouseId),
    lines: work.lines.map((line) => ({
      ...line,
      item: findEntity.item(line.itemId),
      fromLocation: findEntity.location(line.fromLocationId),
      toLocation: line.toLocationId ? findEntity.location(line.toLocationId) : null,
    })),
  }
}

function updateWork(id, updater) {
  const index = workDb.works.findIndex((w) => w.id === id)
  const current = workDb.works[index]
  const next = typeof updater === 'function' ? updater(current) : { ...current, ...updater }
  workDb.works[index] = { ...next, updatedAt: new Date().toISOString() }
  return workDb.works[index]
}

function pushEvent(workHeaderId, eventType, actor = 'system', note = '') {
  workDb.events.unshift({
    id: `evt-${Date.now()}`,
    workHeaderId,
    eventType,
    actor,
    at: new Date().toISOString(),
    note,
  })
}

export const workExecutionMockApi = {
  getDashboardSummary: async (warehouseId) => {
    let works = workDb.works
    if (warehouseId) {
      works = works.filter((w) => w.warehouseId === warehouseId)
    }
    return delay({
      data: {
        totalOpen: works.filter((w) => w.status === 'OPEN').length,
        totalInProgress: works.filter((w) => w.status === 'IN_PROGRESS').length,
        totalCompleted: works.filter((w) => w.status === 'COMPLETED').length,
        totalCancelled: works.filter((w) => w.status === 'CANCELLED').length,
        putawayOpen: works.filter((w) => w.workType === 'PUTAWAY' && w.status === 'OPEN').length,
        pickOpen: works.filter((w) => w.workType === 'PICK' && w.status === 'OPEN').length,
        moveOpen: works.filter((w) => w.workType === 'MOVE' && w.status === 'OPEN').length,
        transferOpen: works.filter((w) => ['TRANSFER_PICK', 'TRANSFER_PUT'].includes(w.workType) && w.status === 'OPEN').length,
        exceptionsOpen: workDb.exceptions.filter((e) => e.status === 'OPEN').length,
      },
    })
  },

  getWorks: async (params = {}) => {
    const rows = workDb.works
      .filter((row) => {
        return (!params.status || row.status === params.status)
          && (!params.workType || row.workType === params.workType)
          && (!params.warehouseId || row.warehouseId === params.warehouseId)
          && (!params.ownerId || row.ownerId === params.ownerId)
      })
      .map(enrichWork)
      .sort((a, b) => a.priority - b.priority)
    return delay({ ...paginate(rows, params.page, params.pageSize) })
  },

  getWorkById: async (id) => {
    const work = workDb.works.find((w) => w.id === id)
    return delay({ data: work ? enrichWork(work) : null })
  },

  getWorkHistory: async (id) => {
    const events = workDb.events.filter((e) => e.workHeaderId === id)
    return delay({ data: events })
  },

  getWorkExceptions: async (id) => {
    const exceptions = workDb.exceptions.filter((e) => e.workHeaderId === id)
    return delay({ data: exceptions })
  },

  getAvailableWorks: async (params = {}) => {
    const rows = workDb.works
      .filter((row) => row.status === 'OPEN' && !row.assignedTo)
      .filter((row) => (!params.warehouseId || row.warehouseId === params.warehouseId))
      .map(enrichWork)
      .sort((a, b) => a.priority - b.priority)
    return delay({ ...paginate(rows, params.page, params.pageSize) })
  },

  getMyWorks: async (params = {}) => {
    const userId = params.userId || 'keeper.user'
    const rows = workDb.works
      .filter((row) => row.assignedTo === userId && ['OPEN', 'IN_PROGRESS'].includes(row.status))
      .map(enrichWork)
      .sort((a, b) => a.priority - b.priority)
    return delay({ ...paginate(rows, params.page, params.pageSize) })
  },

  generateWork: async (data) => {
    const work = {
      id: `wrk-${Date.now()}`,
      workId: `WRK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(workDb.works.length + 1).padStart(4, '0')}`,
      workType: data.workType,
      status: 'OPEN',
      priority: data.priority || (data.workType === 'PICK' ? 10 : data.workType === 'PUTAWAY' ? 50 : 60),
      warehouseId: data.warehouseId,
      zoneId: data.zoneId || null,
      sourceType: data.sourceType || 'MANUAL',
      sourceId: data.sourceId,
      sourceLineId: data.sourceLineId || null,
      ownerId: data.ownerId,
      assignedTo: null,
      assignedAt: null,
      startedAt: null,
      completedAt: null,
      cancelReasonCode: null,
      externalId: data.externalId || `ext-wrk-${Date.now()}`,
      correlationId: data.correlationId || `corr-wrk-${Date.now()}`,
      createdBy: data.createdBy || 'frontend.user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lines: (data.lines || []).map((line, index) => ({
        id: `wrkl-${Date.now()}-${index}`,
        workHeaderId: `wrk-${Date.now()}`,
        lineNum: index + 1,
        stepType: line.stepType,
        status: 'OPEN',
        fromLocationId: line.fromLocationId || null,
        toLocationId: line.toLocationId || null,
        itemId: line.itemId,
        expectedQty: Number(line.expectedQty || 0),
        actualQty: null,
        uom: line.uom || 'KG',
        inventTransId: null,
        scannedLocation: null,
        varianceQty: null,
        varianceReason: null,
        completedAt: null,
        completedBy: null,
      })),
    }
    workDb.works.unshift(work)
    pushEvent(work.id, 'CREATED', work.createdBy, `Manual work created`)
    return delay({ data: enrichWork(work), created: true })
  },

  claimWork: async (id, data = {}) => {
    const userId = data.userId || 'keeper.user'
    const next = updateWork(id, { assignedTo: userId, assignedAt: new Date().toISOString() })
    pushEvent(id, 'CLAIMED', userId, '')
    return delay({ data: enrichWork(next) })
  },

  releaseWork: async (id, data = {}) => {
    const next = updateWork(id, { assignedTo: null, assignedAt: null })
    pushEvent(id, 'RELEASED', data.userId || 'keeper.user', data.reason || '')
    return delay({ data: enrichWork(next) })
  },

  startWork: async (id, data = {}) => {
    const next = updateWork(id, { status: 'IN_PROGRESS', startedAt: new Date().toISOString() })
    pushEvent(id, 'STARTED', data.userId || 'keeper.user', '')
    return delay({ data: enrichWork(next) })
  },

  startLine: async (workId, lineId, data = {}) => {
    const work = workDb.works.find((w) => w.id === workId)
    const lineIndex = work.lines.findIndex((l) => l.id === lineId)
    work.lines[lineIndex] = { ...work.lines[lineIndex], status: 'IN_PROGRESS' }
    updateWork(workId, { lines: work.lines })
    pushEvent(workId, 'LINE_STARTED', data.userId || 'keeper.user', `Line ${work.lines[lineIndex].lineNum} started`)
    return delay({ data: enrichWork(work) })
  },

  completeLine: async (workId, lineId, data = {}) => {
    const work = workDb.works.find((w) => w.id === workId)
    const lineIndex = work.lines.findIndex((l) => l.id === lineId)
    const line = work.lines[lineIndex]

    const actualQty = Number(data.actualQty || line.expectedQty)
    const varianceQty = actualQty - line.expectedQty

    work.lines[lineIndex] = {
      ...line,
      status: 'COMPLETED',
      actualQty,
      varianceQty,
      varianceReason: varianceQty !== 0 ? (varianceQty < 0 ? 'SHORT_PICK' : 'OVERAGE') : null,
      scannedLocation: data.scannedLocation || line.toLocationId || line.fromLocationId,
      inventTransId: `TRX-WRK-${Date.now()}`,
      completedAt: new Date().toISOString(),
      completedBy: data.userId || 'keeper.user',
    }

    const allLinesCompleted = work.lines.every((l) => ['COMPLETED', 'SKIPPED'].includes(l.status))

    if (allLinesCompleted) {
      updateWork(workId, { status: 'COMPLETED', completedAt: new Date().toISOString(), lines: work.lines })
      pushEvent(workId, 'LINE_COMPLETED', data.userId || 'keeper.user', `Line ${line.lineNum} completed, InventTrans posted`)
      pushEvent(workId, 'COMPLETED', 'system', 'All lines completed')
    } else {
      updateWork(workId, { lines: work.lines })
      pushEvent(workId, 'LINE_COMPLETED', data.userId || 'keeper.user', `Line ${line.lineNum} completed, InventTrans posted`)
    }

    return delay({ data: enrichWork(workDb.works.find((w) => w.id === workId)) })
  },

  skipLine: async (workId, lineId, data = {}) => {
    const work = workDb.works.find((w) => w.id === workId)
    const lineIndex = work.lines.findIndex((l) => l.id === lineId)

    work.lines[lineIndex] = { ...work.lines[lineIndex], status: 'SKIPPED', varianceReason: data.reasonCode || 'OTHER' }

    const allLinesCompleted = work.lines.every((l) => ['COMPLETED', 'SKIPPED'].includes(l.status))

    if (allLinesCompleted) {
      updateWork(workId, { status: 'COMPLETED', completedAt: new Date().toISOString(), lines: work.lines })
      pushEvent(workId, 'LINE_SKIPPED', data.userId || 'keeper.user', `Line ${work.lines[lineIndex].lineNum} skipped`)
      pushEvent(workId, 'COMPLETED', 'system', 'All lines completed/skipped')
    } else {
      updateWork(workId, { lines: work.lines })
      pushEvent(workId, 'LINE_SKIPPED', data.userId || 'keeper.user', `Line ${work.lines[lineIndex].lineNum} skipped`)
    }

    return delay({ data: enrichWork(workDb.works.find((w) => w.id === workId)) })
  },

  cancelWork: async (id, data = {}) => {
    const lines = workDb.works.find((w) => w.id === id).lines.map((l) => ({ ...l, status: 'CANCELLED' }))
    const next = updateWork(id, { status: 'CANCELLED', cancelReasonCode: data.reasonCode || 'CANCELLED', lines })
    pushEvent(id, 'CANCELLED', data.userId || 'manager.user', data.note || 'Work cancelled')
    return delay({ data: enrichWork(next) })
  },

  validateScan: async (data) => {
    const location = db.locations.find((l) => l.code === data.locationCode || l.id === data.locationId)
    if (!location) {
      return delay({ success: false, error: { code: 'LOCATION_NOT_FOUND', message: 'Location not found' } })
    }
    const valid = !data.expectedLocationType || location.type === data.expectedLocationType
    return delay({
      success: valid,
      data: { location, valid },
      error: valid ? null : { code: 'LOCATION_TYPE_MISMATCH', message: `Expected ${data.expectedLocationType}, got ${location.type}` },
    })
  },
}
