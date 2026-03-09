import { delay, paginate } from './utils'
import { masterDataMockApi } from './masterData.mock'

const db = masterDataMockApi.__db

const billingDb = {
  invoices: [
    { id: 'inv-001', invoiceNumber: 'INV-20260308-0001', ownerId: 'owner-001', warehouseId: 'wh-001', periodFrom: '2026-03-01', periodTo: '2026-03-07', status: 'APPROVED', totalAmount: 15500000, currency: 'VND', lineCount: 5, createdAt: '2026-03-08T10:00:00Z', approvedAt: '2026-03-08T12:00:00Z', approvedBy: 'finance.user' },
    { id: 'inv-002', invoiceNumber: 'INV-20260308-0002', ownerId: 'owner-002', warehouseId: 'wh-001', periodFrom: '2026-03-01', periodTo: '2026-03-07', status: 'DRAFT', totalAmount: 8200000, currency: 'VND', lineCount: 3, createdAt: '2026-03-08T11:00:00Z', approvedAt: null, approvedBy: null },
    { id: 'inv-003', invoiceNumber: 'INV-20260301-0001', ownerId: 'owner-001', warehouseId: 'wh-001', periodFrom: '2026-02-22', periodTo: '2026-02-28', status: 'APPROVED', totalAmount: 12300000, currency: 'VND', lineCount: 4, createdAt: '2026-03-01T10:00:00Z', approvedAt: '2026-03-01T14:00:00Z', approvedBy: 'finance.user' },
  ],
  invoiceLines: [
    { id: 'invl-001', invoiceId: 'inv-001', serviceType: 'STORAGE', description: 'Storage fee - Week 10', qty: 50000, uom: 'KG', unitPrice: 200, amount: 10000000 },
    { id: 'invl-002', invoiceId: 'inv-001', serviceType: 'HANDLING_IN', description: 'Inbound handling', qty: 20000, uom: 'KG', unitPrice: 150, amount: 3000000 },
    { id: 'invl-003', invoiceId: 'inv-001', serviceType: 'HANDLING_OUT', description: 'Outbound handling', qty: 10000, uom: 'KG', unitPrice: 150, amount: 1500000 },
    { id: 'invl-004', invoiceId: 'inv-001', serviceType: 'VAS_BAGGING', description: 'Bagging service', qty: 500, uom: 'BAG', unitPrice: 2000, amount: 1000000 },
  ],
  rateCards: [
    { id: 'rc-001', ownerId: 'owner-001', serviceType: 'STORAGE', description: 'Standard storage', unitPrice: 200, uom: 'KG', currency: 'VND', effectiveFrom: '2026-01-01', effectiveTo: '2026-12-31', isActive: true },
    { id: 'rc-002', ownerId: 'owner-001', serviceType: 'HANDLING_IN', description: 'Inbound handling', unitPrice: 150, uom: 'KG', currency: 'VND', effectiveFrom: '2026-01-01', effectiveTo: '2026-12-31', isActive: true },
    { id: 'rc-003', ownerId: 'owner-001', serviceType: 'HANDLING_OUT', description: 'Outbound handling', unitPrice: 150, uom: 'KG', currency: 'VND', effectiveFrom: '2026-01-01', effectiveTo: '2026-12-31', isActive: true },
    { id: 'rc-004', ownerId: 'owner-001', serviceType: 'VAS_BAGGING', description: 'Bagging service', unitPrice: 2000, uom: 'BAG', currency: 'VND', effectiveFrom: '2026-01-01', effectiveTo: '2026-12-31', isActive: true },
    { id: 'rc-005', ownerId: 'owner-002', serviceType: 'STORAGE', description: 'Premium storage', unitPrice: 250, uom: 'KG', currency: 'VND', effectiveFrom: '2026-01-01', effectiveTo: '2026-12-31', isActive: true },
  ],
  billableEvents: [
    { id: 'be-001', eventType: 'RECEIPT_RECEIVED', sourceId: 'RCV-20260308-0001', ownerId: 'owner-001', warehouseId: 'wh-001', qty: 50000, uom: 'KG', eventAt: '2026-03-08T09:00:00Z', invoiced: true, invoiceId: 'inv-001' },
    { id: 'be-002', eventType: 'SHIPMENT_SHIPPED', sourceId: 'SHP-20260308-0001', ownerId: 'owner-001', warehouseId: 'wh-001', qty: 18000, uom: 'KG', eventAt: '2026-03-08T14:00:00Z', invoiced: false, invoiceId: null },
    { id: 'be-003', eventType: 'VAS_COMPLETED', sourceId: 'VAS-20260308-0001', ownerId: 'owner-001', warehouseId: 'wh-001', qty: 1000, uom: 'BAG', eventAt: '2026-03-08T12:00:00Z', invoiced: true, invoiceId: 'inv-001' },
    { id: 'be-004', eventType: 'STORAGE_DAILY', sourceId: 'STOR-20260308', ownerId: 'owner-001', warehouseId: 'wh-001', qty: 75000, uom: 'KG', eventAt: '2026-03-08T00:00:00Z', invoiced: false, invoiceId: null },
  ],
}

const findEntity = {
  owner: (id) => db.owners.find((item) => item.id === id),
  warehouse: (id) => db.warehouses.find((item) => item.id === id),
}

function enrichInvoice(inv) {
  return {
    ...inv,
    owner: findEntity.owner(inv.ownerId),
    warehouse: findEntity.warehouse(inv.warehouseId),
    lines: billingDb.invoiceLines.filter((l) => l.invoiceId === inv.id),
  }
}

export const billingMockApi = {
  getInvoices: async (params = {}) => {
    const rows = billingDb.invoices
      .filter((row) => {
        return (!params.status || row.status === params.status)
          && (!params.ownerId || row.ownerId === params.ownerId)
      })
      .map(enrichInvoice)
    return delay({ ...paginate(rows, params.page, params.limit) })
  },

  getInvoiceById: async (id) => {
    const inv = billingDb.invoices.find((i) => i.id === id)
    return delay({ data: inv ? enrichInvoice(inv) : null })
  },

  generateInvoice: async (data) => {
    const inv = {
      id: `inv-${Date.now()}`,
      invoiceNumber: `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(billingDb.invoices.length + 1).padStart(4, '0')}`,
      ownerId: data.ownerId,
      warehouseId: data.warehouseId,
      periodFrom: data.periodFrom,
      periodTo: data.periodTo,
      status: 'DRAFT',
      totalAmount: Math.floor(Math.random() * 10000000) + 5000000,
      currency: 'VND',
      lineCount: Math.floor(Math.random() * 5) + 1,
      createdAt: new Date().toISOString(),
      approvedAt: null,
      approvedBy: null,
    }
    billingDb.invoices.unshift(inv)
    return delay({ data: enrichInvoice(inv) })
  },

  approveInvoice: async (id) => {
    const index = billingDb.invoices.findIndex((i) => i.id === id)
    billingDb.invoices[index] = { ...billingDb.invoices[index], status: 'APPROVED', approvedAt: new Date().toISOString(), approvedBy: 'frontend.user' }
    return delay({ data: enrichInvoice(billingDb.invoices[index]) })
  },

  cancelInvoice: async (id) => {
    const index = billingDb.invoices.findIndex((i) => i.id === id)
    billingDb.invoices[index] = { ...billingDb.invoices[index], status: 'CANCELLED' }
    return delay({ data: enrichInvoice(billingDb.invoices[index]) })
  },

  getRateCards: async (params = {}) => {
    const rows = billingDb.rateCards
      .filter((row) => {
        return (!params.ownerId || row.ownerId === params.ownerId)
          && (!params.serviceType || row.serviceType === params.serviceType)
      })
      .map((rc) => ({ ...rc, owner: findEntity.owner(rc.ownerId) }))
    return delay({ ...paginate(rows, params.page, params.limit) })
  },

  createRateCard: async (data) => {
    const rc = {
      id: `rc-${Date.now()}`,
      ownerId: data.ownerId,
      serviceType: data.serviceType,
      description: data.description,
      unitPrice: Number(data.unitPrice),
      uom: data.uom,
      currency: data.currency || 'VND',
      effectiveFrom: data.effectiveFrom,
      effectiveTo: data.effectiveTo,
      isActive: true,
    }
    billingDb.rateCards.unshift(rc)
    return delay({ data: { ...rc, owner: findEntity.owner(rc.ownerId) } })
  },

  updateRateCard: async (id, data) => {
    const index = billingDb.rateCards.findIndex((r) => r.id === id)
    billingDb.rateCards[index] = { ...billingDb.rateCards[index], ...data }
    return delay({ data: { ...billingDb.rateCards[index], owner: findEntity.owner(billingDb.rateCards[index].ownerId) } })
  },

  getBillableEvents: async (params = {}) => {
    const rows = billingDb.billableEvents
      .filter((row) => {
        return (!params.ownerId || row.ownerId === params.ownerId)
          && (!params.eventType || row.eventType === params.eventType)
          && (params.invoiced === undefined || row.invoiced === params.invoiced)
      })
      .map((ev) => ({ ...ev, owner: findEntity.owner(ev.ownerId), warehouse: findEntity.warehouse(ev.warehouseId) }))
    return delay({ ...paginate(rows, params.page, params.limit) })
  },

  getDashboard: async () => {
    return delay({
      data: {
        totalInvoices: billingDb.invoices.length,
        draftCount: billingDb.invoices.filter((i) => i.status === 'DRAFT').length,
        approvedCount: billingDb.invoices.filter((i) => i.status === 'APPROVED').length,
        totalRevenue: billingDb.invoices.filter((i) => i.status === 'APPROVED').reduce((sum, i) => sum + i.totalAmount, 0),
        pendingEvents: billingDb.billableEvents.filter((e) => !e.invoiced).length,
        activeRateCards: billingDb.rateCards.filter((r) => r.isActive).length,
      },
    })
  },
}
