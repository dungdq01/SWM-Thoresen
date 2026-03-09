import { delay, paginate } from './utils'

const integrationDb = {
  channels: [
    { id: 'ch-weighbridge', code: 'WEIGHBRIDGE', name: 'Weighbridge Integration', status: 'HEALTHY', lastPingAt: '2026-03-08T15:55:00Z', uptimePercent: 99.8 },
    { id: 'ch-erp', code: 'ERP_SYNC', name: 'ERP Push/Pull', status: 'HEALTHY', lastPingAt: '2026-03-08T15:50:00Z', uptimePercent: 99.5 },
    { id: 'ch-mobile', code: 'MOBILE_SYNC', name: 'Mobile Offline Sync', status: 'HEALTHY', lastPingAt: '2026-03-08T15:58:00Z', uptimePercent: 99.9 },
    { id: 'ch-ocr', code: 'OCR', name: 'OCR Document Scan', status: 'DEGRADED', lastPingAt: '2026-03-08T15:45:00Z', uptimePercent: 95.2 },
  ],
  alerts: [
    { id: 'alt-001', alertSource: 'WEIGHBRIDGE', severity: 'HIGH', status: 'OPEN', title: 'Scale device offline', message: 'Scale SCALE-001 has not sent heartbeat for 10 minutes', warehouseId: 'wh-001', createdAt: '2026-03-08T15:30:00Z', acknowledgedBy: null, resolvedBy: null },
    { id: 'alt-002', alertSource: 'ERP_SYNC', severity: 'MEDIUM', status: 'ACKNOWLEDGED', title: 'ERP sync failed', message: 'Failed to push inventory snapshot to ERP - retry scheduled', warehouseId: null, createdAt: '2026-03-08T14:00:00Z', acknowledgedBy: 'ops.user', acknowledgedAt: '2026-03-08T14:15:00Z', resolvedBy: null },
    { id: 'alt-003', alertSource: 'MOBILE_SYNC', severity: 'LOW', status: 'RESOLVED', title: 'Mobile sync queue high', message: 'Mobile sync queue exceeded 100 pending items', warehouseId: 'wh-001', createdAt: '2026-03-08T10:00:00Z', acknowledgedBy: 'ops.user', resolvedBy: 'ops.user', resolvedAt: '2026-03-08T11:00:00Z', resolutionNote: 'Queue cleared after network restored' },
    { id: 'alt-004', alertSource: 'OCR', severity: 'MEDIUM', status: 'OPEN', title: 'OCR recognition low confidence', message: 'OCR confidence below 80% for last 5 documents', warehouseId: 'wh-001', createdAt: '2026-03-08T15:00:00Z', acknowledgedBy: null, resolvedBy: null },
  ],
  weighbridgeLogs: [
    { id: 'wbl-001', scaleDeviceId: 'scale-001', vehicleNumber: '51D-99887', referenceType: 'RECEIPT', referenceId: 'RCV-20260308-0001', weighingType: 'TARE', weightKg: 8500, capturedAt: '2026-03-08T08:00:00Z', isManualEntry: false, sourceChannel: 'AUTO' },
    { id: 'wbl-002', scaleDeviceId: 'scale-001', vehicleNumber: '51D-99887', referenceType: 'RECEIPT', referenceId: 'RCV-20260308-0001', weighingType: 'GROSS', weightKg: 58500, capturedAt: '2026-03-08T08:30:00Z', isManualEntry: false, sourceChannel: 'AUTO' },
    { id: 'wbl-003', scaleDeviceId: 'scale-001', vehicleNumber: '60H-12345', referenceType: 'SHIPMENT', referenceId: 'SHP-20260308-0001', weighingType: 'TARE', weightKg: 9200, capturedAt: '2026-03-08T10:00:00Z', isManualEntry: false, sourceChannel: 'AUTO' },
    { id: 'wbl-004', scaleDeviceId: 'scale-001', vehicleNumber: '60H-12345', referenceType: 'SHIPMENT', referenceId: 'SHP-20260308-0001', weighingType: 'GROSS', weightKg: 27200, capturedAt: '2026-03-08T12:00:00Z', isManualEntry: true, sourceChannel: 'MANUAL' },
  ],
  weighbridgeDevices: [
    { id: 'scale-001', deviceCode: 'SCALE-001', name: 'Main Weighbridge', warehouseId: 'wh-001', isActive: true, lastHeartbeatAt: '2026-03-08T15:55:00Z', healthStatus: 'HEALTHY', agentVersion: '2.1.0' },
    { id: 'scale-002', deviceCode: 'SCALE-002', name: 'Secondary Weighbridge', warehouseId: 'wh-001', isActive: true, lastHeartbeatAt: '2026-03-08T15:50:00Z', healthStatus: 'HEALTHY', agentVersion: '2.1.0' },
    { id: 'scale-003', deviceCode: 'SCALE-003', name: 'Backup Weighbridge', warehouseId: 'wh-002', isActive: false, lastHeartbeatAt: '2026-03-07T10:00:00Z', healthStatus: 'OFFLINE', agentVersion: '2.0.5' },
  ],
}

export const integrationMockApi = {
  getOverview: async () => {
    return delay({
      data: {
        totalChannels: integrationDb.channels.length,
        healthyChannels: integrationDb.channels.filter((c) => c.status === 'HEALTHY').length,
        degradedChannels: integrationDb.channels.filter((c) => c.status === 'DEGRADED').length,
        downChannels: integrationDb.channels.filter((c) => c.status === 'DOWN').length,
        openAlerts: integrationDb.alerts.filter((a) => a.status === 'OPEN').length,
        highSeverityAlerts: integrationDb.alerts.filter((a) => a.severity === 'HIGH' && a.status === 'OPEN').length,
        weighEventsToday: integrationDb.weighbridgeLogs.length,
        activeDevices: integrationDb.weighbridgeDevices.filter((d) => d.isActive).length,
      },
    })
  },

  getChannelHealth: async () => {
    return delay({ data: integrationDb.channels })
  },

  getDetailedStats: async () => {
    return delay({
      data: {
        weighbridgeStats: { totalEvents: 150, autoEvents: 140, manualEvents: 10, avgProcessingMs: 120 },
        erpSyncStats: { totalPushes: 48, successfulPushes: 47, failedPushes: 1, avgLatencyMs: 350 },
        mobileSyncStats: { totalSyncs: 320, pendingItems: 5, avgSyncTimeMs: 80 },
        ocrStats: { totalScans: 25, avgConfidence: 92.5, lowConfidenceCount: 2 },
      },
    })
  },

  getAlerts: async (params = {}) => {
    const rows = integrationDb.alerts.filter((row) => {
      return (!params.alertSource || row.alertSource === params.alertSource)
        && (!params.severity || row.severity === params.severity)
        && (!params.status || row.status === params.status)
    })
    return delay({ ...paginate(rows, params.page, params.limit) })
  },

  getAlertById: async (id) => {
    const alert = integrationDb.alerts.find((a) => a.id === id)
    return delay({ data: alert })
  },

  acknowledgeAlert: async (id) => {
    const index = integrationDb.alerts.findIndex((a) => a.id === id)
    integrationDb.alerts[index] = { ...integrationDb.alerts[index], status: 'ACKNOWLEDGED', acknowledgedBy: 'frontend.user', acknowledgedAt: new Date().toISOString() }
    return delay({ data: integrationDb.alerts[index] })
  },

  resolveAlert: async (id, data = {}) => {
    const index = integrationDb.alerts.findIndex((a) => a.id === id)
    integrationDb.alerts[index] = { ...integrationDb.alerts[index], status: 'RESOLVED', resolvedBy: 'frontend.user', resolvedAt: new Date().toISOString(), resolutionNote: data.resolutionNote || '' }
    return delay({ data: integrationDb.alerts[index] })
  },

  getWeighbridgeLogs: async (params = {}) => {
    const rows = integrationDb.weighbridgeLogs.filter((row) => {
      return (!params.vehicleNumber || row.vehicleNumber.includes(params.vehicleNumber))
        && (!params.referenceType || row.referenceType === params.referenceType)
        && (!params.weighingType || row.weighingType === params.weighingType)
    })
    return delay({ ...paginate(rows, params.page, params.limit) })
  },

  getWeighbridgeDevices: async (params = {}) => {
    const rows = integrationDb.weighbridgeDevices.filter((row) => {
      return (!params.warehouseId || row.warehouseId === params.warehouseId)
        && (params.isActive === undefined || row.isActive === params.isActive)
    })
    return delay({ ...paginate(rows, params.page, params.limit) })
  },

  reprocessWeighEvent: async (id) => {
    return delay({ success: true, message: 'Weigh event reprocessed' })
  },
}
