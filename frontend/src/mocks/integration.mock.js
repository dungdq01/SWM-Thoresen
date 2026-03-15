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
  ocrResults: [
    { id: 'ocr-001', ocrRequestId: 'OCR-1710500000-abc12345', status: 'EXTRACTED', imagePath: '/uploads/ocr/OCR-sample-1.jpg', originalFileName: 'BL-March-2026.jpg', mimeType: 'image/jpeg', fileSize: 2450000, blNumber: 'BL-20260315-001', blConfidence: 95.5, vehicleNumber: '51A-12345', vehicleConfidence: 92.3, productName: 'Thép cuộn Grade A', productConfidence: 88.0, vesselName: 'MV Ocean Star', vesselConfidence: 90.0, qtyExtracted: 25000, qtyUom: 'KG', qtyConfidence: 85.0, overallConfidence: 90.2, operatorConfirmed: false, createdAt: '2026-03-15T08:30:00Z', createdBy: 'ops.user' },
    { id: 'ocr-002', ocrRequestId: 'OCR-1710500100-def67890', status: 'REVIEW_REQUIRED', imagePath: '/uploads/ocr/OCR-sample-2.jpg', originalFileName: 'VanDon-HP-002.jpg', mimeType: 'image/jpeg', fileSize: 1800000, blNumber: 'BL-20260315-002', blConfidence: 72.1, vehicleNumber: '51B-56789', vehicleConfidence: 68.5, productName: 'Xi măng PCB40', productConfidence: 78.0, vesselName: 'MV Hai Phong Express', vesselConfidence: 65.0, qtyExtracted: 50000, qtyUom: 'KG', qtyConfidence: 82.0, overallConfidence: 73.1, operatorConfirmed: false, createdAt: '2026-03-15T09:15:00Z', createdBy: 'ops.user' },
    { id: 'ocr-003', ocrRequestId: 'OCR-1710500200-ghi11111', status: 'CONFIRMED', imagePath: '/uploads/ocr/OCR-sample-3.png', originalFileName: 'BL-SaiGon-003.png', mimeType: 'image/png', fileSize: 3100000, blNumber: 'BL-20260314-003', blConfidence: 96.0, vehicleNumber: '60H-98765', vehicleConfidence: 94.5, productName: 'Gạo Jasmine 5%', productConfidence: 91.0, vesselName: 'MV Mekong River', vesselConfidence: 93.0, qtyExtracted: 100000, qtyUom: 'KG', qtyConfidence: 90.0, overallConfidence: 92.9, operatorConfirmed: true, createdAt: '2026-03-14T14:00:00Z', createdBy: 'ops.user' },
    { id: 'ocr-004', ocrRequestId: 'OCR-1710500300-jkl22222', status: 'REJECTED', imagePath: '/uploads/ocr/OCR-sample-4.jpg', originalFileName: 'blurry-doc.jpg', mimeType: 'image/jpeg', fileSize: 890000, blNumber: null, blConfidence: 0, vehicleNumber: null, vehicleConfidence: 0, productName: null, productConfidence: 0, vesselName: null, vesselConfidence: 0, qtyExtracted: null, qtyUom: null, qtyConfidence: 0, overallConfidence: 0, operatorConfirmed: false, createdAt: '2026-03-14T10:00:00Z', createdBy: 'ops.user' },
    { id: 'ocr-005', ocrRequestId: 'OCR-1710500400-mno33333', status: 'LINKED', imagePath: '/uploads/ocr/OCR-sample-5.jpg', originalFileName: 'BL-DaNang-005.jpg', mimeType: 'image/jpeg', fileSize: 2750000, blNumber: 'BL-20260313-005', blConfidence: 97.0, vehicleNumber: '43A-55555', vehicleConfidence: 96.0, productName: 'Phân bón NPK 16-16-8', productConfidence: 89.0, vesselName: 'MV Da Nang Bay', vesselConfidence: 91.0, qtyExtracted: 30000, qtyUom: 'KG', qtyConfidence: 88.0, overallConfidence: 92.2, operatorConfirmed: true, linkedReceiptId: 'RCV-20260313-0005', createdAt: '2026-03-13T07:30:00Z', createdBy: 'ops.user' },
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

  // OCR mock APIs
  uploadOcrImage: async (formData) => {
    const newId = `ocr-${String(integrationDb.ocrResults.length + 1).padStart(3, '0')}`
    const newResult = {
      id: newId,
      ocrRequestId: `OCR-${Date.now()}-mock`,
      status: 'UPLOADED',
      imagePath: `/uploads/ocr/OCR-mock-${Date.now()}.jpg`,
      originalFileName: formData.get?.('file')?.name || 'uploaded-file.jpg',
      mimeType: 'image/jpeg',
      fileSize: 2000000,
      blNumber: null, blConfidence: 0,
      vehicleNumber: null, vehicleConfidence: 0,
      productName: null, productConfidence: 0,
      vesselName: null, vesselConfidence: 0,
      qtyExtracted: null, qtyUom: null, qtyConfidence: 0,
      overallConfidence: 0,
      operatorConfirmed: false,
      createdAt: new Date().toISOString(),
      createdBy: 'frontend.user',
    }
    integrationDb.ocrResults.unshift(newResult)

    // Simulate async extraction after 1.5s
    setTimeout(() => {
      const idx = integrationDb.ocrResults.findIndex((r) => r.id === newId)
      if (idx !== -1) {
        integrationDb.ocrResults[idx] = {
          ...integrationDb.ocrResults[idx],
          status: 'EXTRACTED',
          blNumber: `BL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-MOCK`,
          blConfidence: 94.2,
          vehicleNumber: '51A-99999',
          vehicleConfidence: 91.0,
          productName: 'Thép cuộn HRC Q235',
          productConfidence: 87.5,
          vesselName: 'MV Saigon Express',
          vesselConfidence: 89.0,
          qtyExtracted: 35000,
          qtyUom: 'KG',
          qtyConfidence: 86.0,
          overallConfidence: 89.5,
        }
      }
    }, 1500)

    return delay({ data: newResult })
  },

  getOcrResults: async (params = {}) => {
    const rows = integrationDb.ocrResults.filter((row) => {
      return (!params.status || row.status === params.status)
    })
    return delay({ ...paginate(rows, params.page, params.limit) })
  },

  getOcrResultById: async (id) => {
    const result = integrationDb.ocrResults.find((r) => r.id === id)
    return delay({ data: result })
  },

  confirmOcrResult: async (id, data = {}) => {
    const index = integrationDb.ocrResults.findIndex((r) => r.id === id)
    if (index !== -1) {
      integrationDb.ocrResults[index] = {
        ...integrationDb.ocrResults[index],
        status: 'CONFIRMED',
        operatorConfirmed: true,
        blNumber: data.confirmedBlNumber || integrationDb.ocrResults[index].blNumber,
        vehicleNumber: data.confirmedVehicleNumber || integrationDb.ocrResults[index].vehicleNumber,
        productName: data.confirmedProductName || integrationDb.ocrResults[index].productName,
        vesselName: data.confirmedVesselName || integrationDb.ocrResults[index].vesselName,
        qtyExtracted: data.confirmedQty || integrationDb.ocrResults[index].qtyExtracted,
        qtyUom: data.confirmedQtyUom || integrationDb.ocrResults[index].qtyUom,
      }
    }
    return delay({ data: integrationDb.ocrResults[index] })
  },

  rejectOcrResult: async (id, data = {}) => {
    const index = integrationDb.ocrResults.findIndex((r) => r.id === id)
    if (index !== -1) {
      integrationDb.ocrResults[index] = { ...integrationDb.ocrResults[index], status: 'REJECTED' }
    }
    return delay({ data: integrationDb.ocrResults[index] })
  },
}
