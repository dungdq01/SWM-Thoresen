import { Injectable, Logger } from '@nestjs/common';
import { ChannelHealthService } from './channel-health.service';
import { AlertService } from './alert.service';
import { WeighbridgeDeviceRepository } from '../repositories/weighbridge-device.repository';
import { OcrResultRepository } from '../repositories/ocr-result.repository';
import { MobileSyncBatchRepository } from '../repositories/mobile-sync-batch.repository';
import { ErpPushLogRepository } from '../repositories/erp-push-log.repository';

export interface DashboardOverview {
  channels: {
    weighbridge: ChannelSummary;
    ocr: ChannelSummary;
    mobileSync: ChannelSummary;
    erpPush: ChannelSummary;
  };
  alerts: {
    criticalCount: number;
    openCount: number;
  };
  devices: {
    onlineCount: number;
    offlineCount: number;
    degradedCount: number;
  };
}

interface ChannelSummary {
  status: string;
  openAlertCount: number;
  backlogCount: number;
  successRate1h: number | null;
  avgLatencyMs1h: number | null;
}

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(
    private readonly channelHealthService: ChannelHealthService,
    private readonly alertService: AlertService,
    private readonly deviceRepo: WeighbridgeDeviceRepository,
    private readonly ocrResultRepo: OcrResultRepository,
    private readonly syncBatchRepo: MobileSyncBatchRepository,
    private readonly erpPushRepo: ErpPushLogRepository,
  ) {}

  async getDashboardOverview(): Promise<DashboardOverview> {
    // Get channel health
    const channels = await this.channelHealthService.getChannelHealth();
    
    // Get alert counts
    const criticalAlerts = await this.alertService.getCriticalAlerts();
    const openAlerts = await this.alertService.getOpenAlerts();

    // Get device status counts
    const activeDevices = await this.deviceRepo.findActiveDevices();
    const deviceCounts = {
      onlineCount: activeDevices.filter(d => d.lastStatus === 'ONLINE').length,
      offlineCount: activeDevices.filter(d => d.lastStatus === 'OFFLINE').length,
      degradedCount: activeDevices.filter(d => d.lastStatus === 'DEGRADED').length,
    };

    // Map channels to summary
    const channelMap = new Map(channels.map(c => [c.channelName, c]));

    return {
      channels: {
        weighbridge: this.mapChannelSummary(channelMap.get('WEIGHBRIDGE')),
        ocr: this.mapChannelSummary(channelMap.get('OCR')),
        mobileSync: this.mapChannelSummary(channelMap.get('MOBILE_SYNC')),
        erpPush: this.mapChannelSummary(channelMap.get('ERP_PUSH')),
      },
      alerts: {
        criticalCount: criticalAlerts.length,
        openCount: openAlerts.length,
      },
      devices: deviceCounts,
    };
  }

  private mapChannelSummary(channel: any): ChannelSummary {
    if (!channel) {
      return {
        status: 'UNKNOWN',
        openAlertCount: 0,
        backlogCount: 0,
        successRate1h: null,
        avgLatencyMs1h: null,
      };
    }
    return {
      status: channel.status,
      openAlertCount: channel.openAlertCount,
      backlogCount: channel.backlogCount,
      successRate1h: channel.successRate1h ? Number(channel.successRate1h) : null,
      avgLatencyMs1h: channel.avgLatencyMs1h,
    };
  }

  async getDetailedStats() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // OCR stats
    const ocrPending = await this.ocrResultRepo.countByStatus('REVIEW_REQUIRED');
    const ocrConfirmed = await this.ocrResultRepo.countByStatus('CONFIRMED');

    // Mobile sync stats
    const syncConflicted = await this.syncBatchRepo.countByStatus('CONFLICTED');
    const syncFailed = await this.syncBatchRepo.countByStatus('FAILED');

    // ERP push stats
    const erpPending = await this.erpPushRepo.countByStatus('PENDING');
    const erpFailed = await this.erpPushRepo.countByStatus('ACK_FAILED');
    const erpDeadLetter = await this.erpPushRepo.countByStatus('DEAD_LETTER');

    return {
      ocr: {
        pendingReview: ocrPending,
        confirmed: ocrConfirmed,
      },
      mobileSync: {
        conflicted: syncConflicted,
        failed: syncFailed,
      },
      erpPush: {
        pending: erpPending,
        failed: erpFailed,
        deadLetter: erpDeadLetter,
      },
    };
  }
}
