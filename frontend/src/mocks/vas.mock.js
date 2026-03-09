import { delay, paginate } from './utils'
import { masterDataMockApi } from './masterData.mock'

const db = masterDataMockApi.__db

const vasDb = {
  workOrders: [
    { id: 'vas-wo-001', woNumber: 'VAS-20260308-0001', vasType: 'BAGGING', status: 'COMPLETED', warehouseId: 'wh-001', ownerId: 'owner-001', sourceItemId: 'item-001', targetItemId: 'item-bag-001', sourceQty: 50000, targetQty: 1000, targetUom: 'BAG', bagWeightKg: 50, actualBagsProduced: 1000, createdBy: 'manager.user', createdAt: '2026-03-08T07:00:00Z', releasedAt: '2026-03-08T07:30:00Z', startedAt: '2026-03-08T08:00:00Z', completedAt: '2026-03-08T12:00:00Z' },
    { id: 'vas-wo-002', woNumber: 'VAS-20260308-0002', vasType: 'BAGGING', status: 'IN_PROGRESS', warehouseId: 'wh-001', ownerId: 'owner-001', sourceItemId: 'item-002', targetItemId: 'item-bag-002', sourceQty: 30000, targetQty: 600, targetUom: 'BAG', bagWeightKg: 50, actualBagsProduced: 350, createdBy: 'manager.user', createdAt: '2026-03-08T13:00:00Z', releasedAt: '2026-03-08T13:30:00Z', startedAt: '2026-03-08T14:00:00Z', completedAt: null },
    { id: 'vas-wo-003', woNumber: 'VAS-20260308-0003', vasType: 'BAGGING', status: 'RELEASED', warehouseId: 'wh-001', ownerId: 'owner-002', sourceItemId: 'item-001', targetItemId: 'item-bag-001', sourceQty: 25000, targetQty: 500, targetUom: 'BAG', bagWeightKg: 50, actualBagsProduced: 0, createdBy: 'manager.user', createdAt: '2026-03-08T15:00:00Z', releasedAt: '2026-03-08T15:30:00Z', startedAt: null, completedAt: null },
    { id: 'vas-wo-004', woNumber: 'VAS-20260308-0004', vasType: 'REPACKING', status: 'DRAFT', warehouseId: 'wh-001', ownerId: 'owner-001', sourceItemId: 'item-001', targetItemId: 'item-repack-001', sourceQty: 10000, targetQty: 200, targetUom: 'BAG', bagWeightKg: 50, actualBagsProduced: 0, createdBy: 'manager.user', createdAt: '2026-03-08T16:00:00Z', releasedAt: null, startedAt: null, completedAt: null },
  ],
  sessions: [
    { id: 'vas-sess-001', sessionNumber: 'SESS-20260308-0001', workOrderId: 'vas-wo-001', status: 'CLOSED', stationId: 'station-001', operatorId: 'keeper.user', startedAt: '2026-03-08T08:00:00Z', endedAt: '2026-03-08T12:00:00Z', bagsRecorded: 1000, totalWeightKg: 50000 },
    { id: 'vas-sess-002', sessionNumber: 'SESS-20260308-0002', workOrderId: 'vas-wo-002', status: 'ACTIVE', stationId: 'station-001', operatorId: 'keeper.user', startedAt: '2026-03-08T14:00:00Z', endedAt: null, bagsRecorded: 350, totalWeightKg: 17500 },
  ],
}

const findEntity = {
  owner: (id) => db.owners.find((item) => item.id === id),
  item: (id) => db.items.find((item) => item.id === id),
  warehouse: (id) => db.warehouses.find((item) => item.id === id),
}

function enrichWorkOrder(wo) {
  return {
    ...wo,
    owner: findEntity.owner(wo.ownerId),
    warehouse: findEntity.warehouse(wo.warehouseId),
    sourceItem: findEntity.item(wo.sourceItemId),
    targetItem: findEntity.item(wo.targetItemId) || { code: wo.targetItemId, name: 'Bagged Product' },
  }
}

export const vasMockApi = {
  getWorkOrders: async (params = {}) => {
    const rows = vasDb.workOrders
      .filter((row) => {
        return (!params.status || row.status === params.status)
          && (!params.vasType || row.vasType === params.vasType)
          && (!params.warehouseId || row.warehouseId === params.warehouseId)
      })
      .map(enrichWorkOrder)
    return delay({ ...paginate(rows, params.page, params.limit) })
  },

  getWorkOrderById: async (id) => {
    const wo = vasDb.workOrders.find((w) => w.id === id)
    return delay({ data: wo ? enrichWorkOrder(wo) : null })
  },

  createWorkOrder: async (data) => {
    const wo = {
      id: `vas-wo-${Date.now()}`,
      woNumber: `VAS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(vasDb.workOrders.length + 1).padStart(4, '0')}`,
      vasType: data.vasType || 'BAGGING',
      status: 'DRAFT',
      warehouseId: data.warehouseId,
      ownerId: data.ownerId,
      sourceItemId: data.sourceItemId,
      targetItemId: data.targetItemId || `item-bag-${Date.now()}`,
      sourceQty: Number(data.sourceQty || 0),
      targetQty: Number(data.targetQty || 0),
      targetUom: data.targetUom || 'BAG',
      bagWeightKg: Number(data.bagWeightKg || 50),
      actualBagsProduced: 0,
      createdBy: data.createdBy || 'frontend.user',
      createdAt: new Date().toISOString(),
      releasedAt: null,
      startedAt: null,
      completedAt: null,
    }
    vasDb.workOrders.unshift(wo)
    return delay({ data: enrichWorkOrder(wo) })
  },

  releaseWorkOrder: async (id) => {
    const index = vasDb.workOrders.findIndex((w) => w.id === id)
    vasDb.workOrders[index] = { ...vasDb.workOrders[index], status: 'RELEASED', releasedAt: new Date().toISOString() }
    return delay({ data: enrichWorkOrder(vasDb.workOrders[index]) })
  },

  startWorkOrder: async (id) => {
    const index = vasDb.workOrders.findIndex((w) => w.id === id)
    vasDb.workOrders[index] = { ...vasDb.workOrders[index], status: 'IN_PROGRESS', startedAt: new Date().toISOString() }
    return delay({ data: enrichWorkOrder(vasDb.workOrders[index]) })
  },

  completeWorkOrder: async (id, data = {}) => {
    const index = vasDb.workOrders.findIndex((w) => w.id === id)
    vasDb.workOrders[index] = { ...vasDb.workOrders[index], status: 'COMPLETED', completedAt: new Date().toISOString(), actualBagsProduced: data.actualBagsProduced || vasDb.workOrders[index].targetQty }
    return delay({ data: enrichWorkOrder(vasDb.workOrders[index]) })
  },

  cancelWorkOrder: async (id) => {
    const index = vasDb.workOrders.findIndex((w) => w.id === id)
    vasDb.workOrders[index] = { ...vasDb.workOrders[index], status: 'CANCELLED' }
    return delay({ data: enrichWorkOrder(vasDb.workOrders[index]) })
  },

  getSessions: async (params = {}) => {
    const rows = vasDb.sessions.filter((row) => {
      return (!params.status || row.status === params.status)
        && (!params.workOrderId || row.workOrderId === params.workOrderId)
    })
    return delay({ ...paginate(rows, params.page, params.limit) })
  },

  startSession: async (data) => {
    const session = {
      id: `vas-sess-${Date.now()}`,
      sessionNumber: `SESS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(vasDb.sessions.length + 1).padStart(4, '0')}`,
      workOrderId: data.workOrderId,
      status: 'ACTIVE',
      stationId: data.stationId || 'station-001',
      operatorId: data.operatorId || 'keeper.user',
      startedAt: new Date().toISOString(),
      endedAt: null,
      bagsRecorded: 0,
      totalWeightKg: 0,
    }
    vasDb.sessions.unshift(session)
    return delay({ data: session })
  },

  endSession: async (id) => {
    const index = vasDb.sessions.findIndex((s) => s.id === id)
    vasDb.sessions[index] = { ...vasDb.sessions[index], status: 'CLOSED', endedAt: new Date().toISOString() }
    return delay({ data: vasDb.sessions[index] })
  },

  recordBag: async (sessionId, data) => {
    const index = vasDb.sessions.findIndex((s) => s.id === sessionId)
    const session = vasDb.sessions[index]
    session.bagsRecorded += 1
    session.totalWeightKg += Number(data.weightKg || 50)
    vasDb.sessions[index] = session

    const woIndex = vasDb.workOrders.findIndex((w) => w.id === session.workOrderId)
    vasDb.workOrders[woIndex].actualBagsProduced += 1

    return delay({ data: session })
  },

  getDashboard: async () => {
    return delay({
      data: {
        totalWorkOrders: vasDb.workOrders.length,
        draftCount: vasDb.workOrders.filter((w) => w.status === 'DRAFT').length,
        releasedCount: vasDb.workOrders.filter((w) => w.status === 'RELEASED').length,
        inProgressCount: vasDb.workOrders.filter((w) => w.status === 'IN_PROGRESS').length,
        completedCount: vasDb.workOrders.filter((w) => w.status === 'COMPLETED').length,
        activeSessions: vasDb.sessions.filter((s) => s.status === 'ACTIVE').length,
        totalBagsToday: vasDb.workOrders.reduce((sum, w) => sum + (w.actualBagsProduced || 0), 0),
      },
    })
  },
}
