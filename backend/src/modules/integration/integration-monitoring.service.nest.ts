import { Injectable } from '@nestjs/common';

@Injectable()
export class IntegrationMonitoringService {
  async getOverview() {
    // Fake data for integration monitoring overview
    // Frontend expects: healthyChannels, degradedChannels, openAlerts, activeDevices
    return {
      data: {
        healthyChannels: 3,
        degradedChannels: 1,
        openAlerts: 5,
        activeDevices: 4,
      },
    };
  }

  async getChannelHealth() {
    // Fake data for channel health
    // Frontend expects array with: id, name, code, status, uptimePercent
    return {
      data: [
        {
          id: 'erp-m3',
          name: 'M3 ERP',
          code: 'ERP-M3',
          status: 'HEALTHY',
          uptimePercent: 99.9,
        },
        {
          id: 'scale-wb1',
          name: 'Weighbridge 1',
          code: 'WB-01',
          status: 'HEALTHY',
          uptimePercent: 99.5,
        },
        {
          id: 'scale-wb2',
          name: 'Weighbridge 2',
          code: 'WB-02',
          status: 'DEGRADED',
          uptimePercent: 95.2,
        },
        {
          id: 'mobile-app',
          name: 'Mobile App',
          code: 'MOBILE',
          status: 'HEALTHY',
          uptimePercent: 99.8,
        },
      ],
    };
  }

  async getDetailedStats() {
    // Fake data for detailed stats
    // Frontend expects: weighbridgeStats, erpSyncStats, mobileSyncStats
    return {
      data: {
        weighbridgeStats: {
          totalEvents: 156,
          avgProcessingMs: 245,
        },
        erpSyncStats: {
          successfulPushes: 1250,
          failedPushes: 12,
        },
        mobileSyncStats: {
          totalSyncs: 890,
          pendingItems: 15,
        },
      },
    };
  }

  async getAlerts(filters: any) {
    const page = Number(filters.page) || 1;
    const pageSize = Number(filters.pageSize) || 20;

    // Fake alerts data
    const alerts = [
      {
        id: 'alert-001',
        type: 'CHANNEL_DEGRADED',
        severity: 'WARNING',
        source: 'Weighbridge 2',
        message: 'High latency detected on Weighbridge 2',
        status: 'OPEN',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        acknowledgedAt: null,
        resolvedAt: null,
      },
      {
        id: 'alert-002',
        type: 'SYNC_FAILED',
        severity: 'CRITICAL',
        source: 'M3 ERP',
        message: 'Failed to sync shipment SHP-20260312-001',
        status: 'OPEN',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        acknowledgedAt: null,
        resolvedAt: null,
      },
      {
        id: 'alert-003',
        type: 'DEVICE_OFFLINE',
        severity: 'WARNING',
        source: 'Mobile Device 003',
        message: 'Device has not synced for 30 minutes',
        status: 'ACKNOWLEDGED',
        createdAt: new Date(Date.now() - 1800000).toISOString(),
        acknowledgedAt: new Date(Date.now() - 900000).toISOString(),
        resolvedAt: null,
      },
      {
        id: 'alert-004',
        type: 'WEIGH_ERROR',
        severity: 'WARNING',
        source: 'Weighbridge 1',
        message: 'Weight variance exceeded threshold',
        status: 'OPEN',
        createdAt: new Date(Date.now() - 5400000).toISOString(),
        acknowledgedAt: null,
        resolvedAt: null,
      },
      {
        id: 'alert-005',
        type: 'SYNC_RETRY',
        severity: 'INFO',
        source: 'M3 ERP',
        message: 'Retrying sync for receipt RCV-20260312-003',
        status: 'OPEN',
        createdAt: new Date(Date.now() - 600000).toISOString(),
        acknowledgedAt: null,
        resolvedAt: null,
      },
    ];

    return {
      data: alerts,
      pagination: {
        page,
        pageSize,
        total: alerts.length,
        totalPages: 1,
      },
    };
  }

  async getAlertById(id: string) {
    return {
      data: {
        id,
        type: 'CHANNEL_DEGRADED',
        severity: 'WARNING',
        source: 'Weighbridge 2',
        message: 'High latency detected on Weighbridge 2',
        status: 'OPEN',
        details: {
          latencyMs: 850,
          threshold: 500,
          consecutiveFailures: 3,
        },
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        acknowledgedAt: null,
        resolvedAt: null,
      },
    };
  }

  async acknowledgeAlert(id: string, data: any) {
    return {
      data: {
        id,
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date().toISOString(),
        acknowledgedBy: data.userId,
      },
    };
  }

  async resolveAlert(id: string, data: any) {
    return {
      data: {
        id,
        status: 'RESOLVED',
        resolvedAt: new Date().toISOString(),
        resolvedBy: data.userId,
        resolution: data.resolution,
      },
    };
  }

  async getWeighbridgeLogs(filters: any) {
    const page = Number(filters.page) || 1;
    const pageSize = Number(filters.pageSize) || 20;

    const logs = [
      {
        id: 'wb-log-001',
        stationId: 'WB-01',
        vehicleNo: '51C-12345',
        grossWeight: 45200,
        tareWeight: 15800,
        netWeight: 29400,
        uom: 'KG',
        status: 'COMPLETED',
        processedAt: new Date(Date.now() - 1800000).toISOString(),
        processingMs: 180,
      },
      {
        id: 'wb-log-002',
        stationId: 'WB-02',
        vehicleNo: '51C-67890',
        grossWeight: 38500,
        tareWeight: 14200,
        netWeight: 24300,
        uom: 'KG',
        status: 'COMPLETED',
        processedAt: new Date(Date.now() - 3600000).toISOString(),
        processingMs: 220,
      },
      {
        id: 'wb-log-003',
        stationId: 'WB-01',
        vehicleNo: '51C-11111',
        grossWeight: 52000,
        tareWeight: 16500,
        netWeight: 35500,
        uom: 'KG',
        status: 'COMPLETED',
        processedAt: new Date(Date.now() - 5400000).toISOString(),
        processingMs: 195,
      },
    ];

    return {
      data: logs,
      pagination: {
        page,
        pageSize,
        total: 156,
        totalPages: 8,
      },
    };
  }

  async getWeighbridgeDevices(filters: any) {
    return {
      data: [
        {
          id: 'WB-01',
          name: 'Weighbridge Station 1',
          location: 'Gate A',
          status: 'ACTIVE',
          lastEventAt: new Date(Date.now() - 1800000).toISOString(),
          todayEvents: 25,
          avgProcessingMs: 185,
        },
        {
          id: 'WB-02',
          name: 'Weighbridge Station 2',
          location: 'Gate B',
          status: 'ACTIVE',
          lastEventAt: new Date(Date.now() - 3600000).toISOString(),
          todayEvents: 17,
          avgProcessingMs: 310,
        },
      ],
    };
  }

  async reprocessWeighEvent(id: string, data: any) {
    return {
      data: {
        id,
        status: 'REPROCESSED',
        reprocessedAt: new Date().toISOString(),
      },
    };
  }
}
