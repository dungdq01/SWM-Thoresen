import { delay, paginate } from './utils'
import { masterDataMockApi } from './masterData.mock'

const db = masterDataMockApi.__db

const reportingDb = {
  dashboard: {
    totalOwners: 3,
    activeShipments: 8,
    onHandQtyKg: 142500,
    pendingBillingEvents: 12,
    openAlerts: 2,
    reconPassRate: 97.8,
    inboundToday: 5,
    outboundToday: 3,
    warehouseUtilPct: 68,
    kpiByOwner: [
      { ownerId: 'owner-001', ownerCode: 'DPM', onHandKg: 85000, pendingShipments: 3, billingOutstanding: 15500000 },
      { ownerId: 'owner-002', ownerCode: 'TCT', onHandKg: 42000, pendingShipments: 4, billingOutstanding: 8200000 },
      { ownerId: 'owner-003', ownerCode: 'VNF', onHandKg: 15500, pendingShipments: 1, billingOutstanding: 3100000 },
    ],
    movementTrend: [
      { date: '2026-03-03', inboundKg: 28000, outboundKg: 15000 },
      { date: '2026-03-04', inboundKg: 32000, outboundKg: 21000 },
      { date: '2026-03-05', inboundKg: 18000, outboundKg: 25000 },
      { date: '2026-03-06', inboundKg: 41000, outboundKg: 18000 },
      { date: '2026-03-07', inboundKg: 22000, outboundKg: 30000 },
      { date: '2026-03-08', inboundKg: 35000, outboundKg: 12000 },
      { date: '2026-03-09', inboundKg: 19000, outboundKg: 8000 },
    ],
  },

  inventoryReport: [
    { id: 'inv-rpt-001', ownerId: 'owner-001', ownerCode: 'DPM', itemId: 'item-001', itemCode: 'DPM-UREA-46', itemName: 'Urea 46% Đạm Phú Mỹ', warehouseId: 'wh-001', warehouseCode: 'TVL-WH1', locationCode: 'A-01-01', statusCode: 'AVAIL', onHandKg: 42000, reservedKg: 8000, availableKg: 34000, bagCount: 840, updatedAt: '2026-03-09T06:00:00Z' },
    { id: 'inv-rpt-002', ownerId: 'owner-001', ownerCode: 'DPM', itemId: 'item-001', itemCode: 'DPM-UREA-46', itemName: 'Urea 46% Đạm Phú Mỹ', warehouseId: 'wh-001', warehouseCode: 'TVL-WH1', locationCode: 'A-01-02', statusCode: 'AVAIL', onHandKg: 28000, reservedKg: 0, availableKg: 28000, bagCount: 560, updatedAt: '2026-03-09T06:00:00Z' },
    { id: 'inv-rpt-003', ownerId: 'owner-001', ownerCode: 'DPM', itemId: 'item-002', itemCode: 'DPM-NPK-20', itemName: 'NPK 20-20-15', warehouseId: 'wh-001', warehouseCode: 'TVL-WH1', locationCode: 'B-02-01', statusCode: 'AVAIL', onHandKg: 15000, reservedKg: 5000, availableKg: 10000, bagCount: 300, updatedAt: '2026-03-09T06:00:00Z' },
    { id: 'inv-rpt-004', ownerId: 'owner-002', ownerCode: 'TCT', itemId: 'item-003', itemCode: 'TCT-SA-BULK', itemName: 'SA Ammonium Sulphate Bulk', warehouseId: 'wh-001', warehouseCode: 'TVL-WH1', locationCode: 'C-01-01', statusCode: 'AVAIL', onHandKg: 38000, reservedKg: 12000, availableKg: 26000, bagCount: 0, updatedAt: '2026-03-09T06:00:00Z' },
    { id: 'inv-rpt-005', ownerId: 'owner-002', ownerCode: 'TCT', itemId: 'item-004', itemCode: 'TCT-KCL-60', itemName: 'KCl 60% Kali', warehouseId: 'wh-001', warehouseCode: 'TVL-WH1', locationCode: 'C-02-01', statusCode: 'QC_HOLD', onHandKg: 4000, reservedKg: 0, availableKg: 0, bagCount: 80, updatedAt: '2026-03-08T18:00:00Z' },
    { id: 'inv-rpt-006', ownerId: 'owner-003', ownerCode: 'VNF', itemId: 'item-005', itemCode: 'VNF-DAP-18', itemName: 'DAP 18-46', warehouseId: 'wh-001', warehouseCode: 'TVL-WH1', locationCode: 'D-01-01', statusCode: 'AVAIL', onHandKg: 15500, reservedKg: 3000, availableKg: 12500, bagCount: 310, updatedAt: '2026-03-09T06:00:00Z' },
    { id: 'inv-rpt-007', ownerId: 'owner-001', ownerCode: 'DPM', itemId: 'item-001', itemCode: 'DPM-UREA-46', itemName: 'Urea 46% Đạm Phú Mỹ', warehouseId: 'wh-002', warehouseCode: 'TVL-WH2', locationCode: 'A-01-01', statusCode: 'AVAIL', onHandKg: 0, reservedKg: 0, availableKg: 0, bagCount: 0, updatedAt: '2026-03-09T06:00:00Z' },
  ],

  billingReport: {
    summary: {
      periodFrom: '2026-03-01',
      periodTo: '2026-03-09',
      totalRevenue: 26800000,
      approvedRevenue: 27800000,
      pendingRevenue: 8200000,
      outstandingDNs: 1,
    },
    byOwner: [
      { ownerId: 'owner-001', ownerCode: 'DPM', ownerName: 'Đạm Phú Mỹ', revenue: 15500000, draftDNs: 0, approvedDNs: 2, events: 18 },
      { ownerId: 'owner-002', ownerCode: 'TCT', ownerName: 'TCT Chemical', revenue: 8200000, draftDNs: 1, approvedDNs: 0, events: 9 },
      { ownerId: 'owner-003', ownerCode: 'VNF', ownerName: 'Viet Nam Fertilizer', revenue: 3100000, draftDNs: 0, approvedDNs: 1, events: 5 },
    ],
    byServiceType: [
      { serviceType: 'STORAGE', label: 'Phí lưu kho', amount: 14200000, pct: 53 },
      { serviceType: 'HANDLING_IN', label: 'Phí xếp dỡ vào', amount: 5400000, pct: 20 },
      { serviceType: 'HANDLING_OUT', label: 'Phí xếp dỡ ra', amount: 4800000, pct: 18 },
      { serviceType: 'VAS_BAGGING', label: 'Phí đóng bao', amount: 2400000, pct: 9 },
    ],
  },

  auditLogs: [
    { id: 'aud-001', entityType: 'PURCHASE_ORDER', entityId: 'PO-20260308-0001', action: 'STATUS_CHANGE', fromValue: 'OPEN', toValue: 'RECEIVED', userId: 'wh.keeper01', userName: 'Nguyễn Văn A', ip: '192.168.1.101', timestamp: '2026-03-09T08:32:15Z', changes: { status: { from: 'OPEN', to: 'RECEIVED' } } },
    { id: 'aud-002', entityType: 'INVENT_TRANS', entityId: 'TXN-20260309-00001', action: 'CREATE', fromValue: null, toValue: null, userId: 'system', userName: 'System', ip: '127.0.0.1', timestamp: '2026-03-09T08:32:16Z', changes: { qty: 50000, transType: 'RECEIPT_RECEIVE' } },
    { id: 'aud-003', entityType: 'SHIPMENT', entityId: 'SHP-20260308-0001', action: 'STATUS_CHANGE', fromValue: 'PICKING', toValue: 'SHIPPED', userId: 'wh.keeper02', userName: 'Trần Thị B', ip: '192.168.1.102', timestamp: '2026-03-09T07:45:00Z', changes: { status: { from: 'PICKING', toValue: 'SHIPPED' } } },
    { id: 'aud-004', entityType: 'DEBIT_NOTE', entityId: 'DN-20260308-0001', action: 'STATUS_CHANGE', fromValue: 'DRAFT', toValue: 'LOCKED', userId: 'billing.ofc', userName: 'Lê Văn C', ip: '192.168.1.110', timestamp: '2026-03-08T16:00:00Z', changes: { status: { from: 'DRAFT', to: 'LOCKED' } } },
    { id: 'aud-005', entityType: 'MOVE_ORDER', entityId: 'MO-20260308-0003', action: 'CREATE', fromValue: null, toValue: null, userId: 'wh.manager', userName: 'Phạm Quốc D', ip: '192.168.1.105', timestamp: '2026-03-08T14:22:00Z', changes: { fromLocation: 'A-01-01', toLocation: 'B-03-02', qty: 5000 } },
    { id: 'aud-006', entityType: 'RATE_CARD', entityId: 'rc-002', action: 'UPDATE', fromValue: '140', toValue: '150', userId: 'wh.admin', userName: 'Admin User', ip: '192.168.1.1', timestamp: '2026-03-07T10:00:00Z', changes: { unitPrice: { from: 140, to: 150 } } },
    { id: 'aud-007', entityType: 'PURCHASE_ORDER', entityId: 'PO-20260307-0002', action: 'CREATE', fromValue: null, toValue: null, userId: 'wh.manager', userName: 'Phạm Quốc D', ip: '192.168.1.105', timestamp: '2026-03-07T09:15:00Z', changes: { totalQty: 30000, vendor: 'VND-001' } },
    { id: 'aud-008', entityType: 'VAS_WORK_ORDER', entityId: 'VAS-20260307-0001', action: 'STATUS_CHANGE', fromValue: 'CONFIRMED', toValue: 'COMPLETED', userId: 'wh.keeper01', userName: 'Nguyễn Văn A', ip: '192.168.1.101', timestamp: '2026-03-07T15:30:00Z', changes: { status: { from: 'CONFIRMED', to: 'COMPLETED' }, actualQtyBagged: 1000 } },
    { id: 'aud-009', entityType: 'CYCLE_COUNT', entityId: 'CC-20260306-0001', action: 'POST', fromValue: null, toValue: null, userId: 'wh.manager', userName: 'Phạm Quốc D', ip: '192.168.1.105', timestamp: '2026-03-06T17:00:00Z', changes: { variance: -500, adjustmentPosted: true } },
    { id: 'aud-010', entityType: 'INVENT_TRANS', entityId: 'TXN-20260306-00089', action: 'CREATE', fromValue: null, toValue: null, userId: 'system', userName: 'System', ip: '127.0.0.1', timestamp: '2026-03-06T17:01:00Z', changes: { qty: -500, transType: 'ADJUSTMENT' } },
    { id: 'aud-011', entityType: 'SHIPMENT', entityId: 'SHP-20260306-0002', action: 'STATUS_CHANGE', fromValue: 'WEIGHING', toValue: 'PENDING_APPROVAL', userId: 'system', userName: 'System', ip: '127.0.0.1', timestamp: '2026-03-06T13:00:00Z', changes: { reason: 'TOLERANCE_EXCEEDED', variance: 2.8 } },
    { id: 'aud-012', entityType: 'OWNER', entityId: 'owner-003', action: 'UPDATE', fromValue: null, toValue: null, userId: 'wh.admin', userName: 'Admin User', ip: '192.168.1.1', timestamp: '2026-03-05T09:00:00Z', changes: { contactEmail: { from: 'old@vnf.com', to: 'new@vnf.com' } } },
  ],

  reconResults: [
    { id: 'recon-001', runId: 'RECON-20260309-001', runType: 'RECON-001', startedAt: '2026-03-09T07:00:00Z', completedAt: '2026-03-09T07:02:45Z', durationSec: 165, status: 'PASS', discrepancies: 0, ownersChecked: 3, locationsChecked: 42, note: null },
    { id: 'recon-002', runId: 'RECON-20260309-000', runType: 'RECON-001', startedAt: '2026-03-09T06:00:00Z', completedAt: '2026-03-09T06:03:10Z', durationSec: 190, status: 'PASS', discrepancies: 0, ownersChecked: 3, locationsChecked: 42, note: null },
    { id: 'recon-003', runId: 'RECON-20260308-023', runType: 'RECON-001', startedAt: '2026-03-08T23:00:00Z', completedAt: '2026-03-08T23:04:55Z', durationSec: 295, status: 'PASS', discrepancies: 0, ownersChecked: 3, locationsChecked: 42, note: null },
    { id: 'recon-004', runId: 'RECON-20260308-022', runType: 'RECON-001', startedAt: '2026-03-08T22:00:00Z', completedAt: '2026-03-08T22:05:10Z', durationSec: 310, status: 'FAIL', discrepancies: 2, ownersChecked: 3, locationsChecked: 42, note: 'OnHand mismatch tại C-01-01 (delta: +200 KG), A-01-02 (delta: -50 KG). Đã tự phục hồi sau 22:05.' },
    { id: 'recon-005', runId: 'RECON-20260308-021', runType: 'RECON-001', startedAt: '2026-03-08T21:00:00Z', completedAt: '2026-03-08T21:02:18Z', durationSec: 138, status: 'PASS', discrepancies: 0, ownersChecked: 3, locationsChecked: 42, note: null },
    { id: 'recon-006', runId: 'RECON-20260308-020', runType: 'RECON-001', startedAt: '2026-03-08T20:00:00Z', completedAt: '2026-03-08T20:03:30Z', durationSec: 210, status: 'PASS', discrepancies: 0, ownersChecked: 3, locationsChecked: 42, note: null },
    { id: 'recon-007', runId: 'RECON-20260308-019', runType: 'RECON-001', startedAt: '2026-03-08T19:00:00Z', completedAt: '2026-03-08T19:04:00Z', durationSec: 240, status: 'PASS', discrepancies: 0, ownersChecked: 3, locationsChecked: 42, note: null },
    { id: 'recon-008', runId: 'RECON-20260308-018', runType: 'RECON-001', startedAt: '2026-03-08T18:00:00Z', completedAt: '2026-03-08T18:03:15Z', durationSec: 195, status: 'PASS', discrepancies: 0, ownersChecked: 3, locationsChecked: 42, note: null },
  ],

  goLiveGates: [
    { id: 'GL-001', name: 'Master Data Completeness', description: 'Owners, Items, Warehouses, Locations, Rate Cards đã cấu hình đầy đủ', category: 'DATA', status: 'PASS', checkedAt: '2026-03-08T10:00:00Z', checkedBy: 'wh.admin', waivedReason: null },
    { id: 'GL-002', name: 'RBAC Roles & Permissions', description: 'Tất cả roles đã assign đúng permissions, test login với từng role', category: 'SECURITY', status: 'PASS', checkedAt: '2026-03-08T10:30:00Z', checkedBy: 'wh.admin', waivedReason: null },
    { id: 'GL-003', name: 'Inbound Flow E2E', description: 'PO → Receipt → Weighbridge → Tolerance → Putaway → InventTrans kiểm tra đủ', category: 'FUNCTIONAL', status: 'PASS', checkedAt: '2026-03-08T11:00:00Z', checkedBy: 'wh.manager', waivedReason: null },
    { id: 'GL-004', name: 'Outbound Flow E2E', description: 'SO → Shipment → Allocation → Pick → Weighing → Ship → InventTrans kiểm tra đủ', category: 'FUNCTIONAL', status: 'PASS', checkedAt: '2026-03-08T12:00:00Z', checkedBy: 'wh.manager', waivedReason: null },
    { id: 'GL-005', name: 'Inventory Posting Correctness', description: 'OnHand = SUM(InventTrans) cho tất cả owners/locations sau full cycle', category: 'INTEGRITY', status: 'PASS', checkedAt: '2026-03-08T13:00:00Z', checkedBy: 'ops.super', waivedReason: null },
    { id: 'GL-006', name: 'Cycle Count & Adjustment', description: 'Cycle count thực hiện được, adjustment posting đúng, variance report hiển thị', category: 'FUNCTIONAL', status: 'PASS', checkedAt: '2026-03-08T13:30:00Z', checkedBy: 'wh.manager', waivedReason: null },
    { id: 'GL-007', name: 'VAS / Bagging Flow', description: 'VAS Work Order full cycle: DRAFT→CONFIRMED→IN_PROGRESS→COMPLETED, 3 transactions posted', category: 'FUNCTIONAL', status: 'PASS', checkedAt: '2026-03-08T14:00:00Z', checkedBy: 'wh.manager', waivedReason: null },
    { id: 'GL-008', name: 'Billing Rate Cards & DN', description: 'Rate cards cấu hình xong, Debit Note sinh đúng theo formula, LOCK flow OK', category: 'BILLING', status: 'PASS', checkedAt: '2026-03-08T15:00:00Z', checkedBy: 'billing.ofc', waivedReason: null },
    { id: 'GL-009', name: 'First Production Debit Note', description: 'Debit Note đầu tiên đã LOCKED và SENT thành công cho ít nhất 1 owner', category: 'BILLING', status: 'FAIL', checkedAt: null, checkedBy: null, waivedReason: null },
    { id: 'GL-010', name: 'Weighbridge Integration', description: 'Weighbridge agent connect được, readings ghi vào DB, tolerance validation hoạt động', category: 'INTEGRATION', status: 'WAIVED', checkedAt: '2026-03-08T16:00:00Z', checkedBy: 'ops.super', waivedReason: 'Weighbridge phần cứng chưa lắp. Sử dụng manual input trong giai đoạn đầu go-live. Review lại sau 30 ngày.' },
    { id: 'GL-011', name: 'OCR Integration', description: 'OCR upload/extract/confirm flow hoạt động với ít nhất 1 provider thật', category: 'INTEGRATION', status: 'FAIL', checkedAt: null, checkedBy: null, waivedReason: null },
    { id: 'GL-012', name: 'UAT Sign-off', description: 'TVL project manager và key users ký UAT acceptance document', category: 'GOVERNANCE', status: 'FAIL', checkedAt: null, checkedBy: null, waivedReason: null },
  ],
}

function enrichInventoryRow(row) {
  return {
    ...row,
    owner: db.owners?.find((o) => o.id === row.ownerId) || { code: row.ownerCode, name: row.ownerCode },
  }
}

export const reportingMockApi = {
  getDashboard: async () => {
    return delay({ data: reportingDb.dashboard })
  },

  getInventoryReport: async (params = {}) => {
    let rows = reportingDb.inventoryReport.map(enrichInventoryRow)
    if (params.ownerId) rows = rows.filter((r) => r.ownerId === params.ownerId)
    if (params.statusCode) rows = rows.filter((r) => r.statusCode === params.statusCode)
    if (params.warehouseId) rows = rows.filter((r) => r.warehouseId === params.warehouseId)
    if (params.keyword) {
      const kw = params.keyword.toLowerCase()
      rows = rows.filter((r) => r.itemCode.toLowerCase().includes(kw) || r.itemName.toLowerCase().includes(kw) || r.locationCode.toLowerCase().includes(kw))
    }
    return delay({ ...paginate(rows, params.page, params.limit) })
  },

  getBillingReport: async (params = {}) => {
    return delay({ data: reportingDb.billingReport })
  },

  getAuditLogs: async (params = {}) => {
    let rows = [...reportingDb.auditLogs]
    if (params.entityType) rows = rows.filter((r) => r.entityType === params.entityType)
    if (params.userId) rows = rows.filter((r) => r.userId === params.userId)
    if (params.action) rows = rows.filter((r) => r.action === params.action)
    if (params.dateFrom) rows = rows.filter((r) => r.timestamp >= params.dateFrom)
    if (params.dateTo) rows = rows.filter((r) => r.timestamp <= params.dateTo + 'T23:59:59Z')
    if (params.keyword) {
      const kw = params.keyword.toLowerCase()
      rows = rows.filter((r) =>
        r.entityId.toLowerCase().includes(kw) ||
        r.userId.toLowerCase().includes(kw) ||
        r.entityType.toLowerCase().includes(kw)
      )
    }
    return delay({ ...paginate(rows, params.page, params.limit) })
  },

  getReconResults: async (params = {}) => {
    let rows = [...reportingDb.reconResults]
    if (params.status) rows = rows.filter((r) => r.status === params.status)
    return delay({ ...paginate(rows, params.page, params.limit) })
  },

  getGoLiveGates: async () => {
    return delay({ data: reportingDb.goLiveGates })
  },

  updateGoLiveGate: async (id, data) => {
    const index = reportingDb.goLiveGates.findIndex((g) => g.id === id)
    if (index === -1) return delay({ data: null })
    reportingDb.goLiveGates[index] = {
      ...reportingDb.goLiveGates[index],
      status: data.status,
      waivedReason: data.waivedReason || null,
      checkedAt: new Date().toISOString(),
      checkedBy: data.checkedBy || 'ops.super',
    }
    return delay({ data: reportingDb.goLiveGates[index] })
  },
}
