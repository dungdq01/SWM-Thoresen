import { Injectable, Logger } from '@nestjs/common';
import { ChannelHealthRepository } from '../repositories/channel-health.repository';
import { WeighbridgeLogRepository } from '../repositories/weighbridge-log.repository';
import { OcrResultRepository } from '../repositories/ocr-result.repository';
import { MobileSyncBatchRepository } from '../repositories/mobile-sync-batch.repository';
import { ErpPushLogRepository } from '../repositories/erp-push-log.repository';
import { IntegrationAlertRepository } from '../repositories/integration-alert.repository';
import { IntegrationChannel, ChannelStatus } from '../domain/integration.enums';

@Injectable()
export class ChannelHealthService {
  private readonly logger = new Logger(ChannelHealthService.name);

  constructor(
    private readonly healthRepo: ChannelHealthRepository,
    private readonly weighLogRepo: WeighbridgeLogRepository,
    private readonly ocrResultRepo: OcrResultRepository,
    private readonly syncBatchRepo: MobileSyncBatchRepository,
    private readonly erpPushRepo: ErpPushLogRepository,
    private readonly alertRepo: IntegrationAlertRepository,
  ) {}

  async getChannelHealth() {
    // Return fake data matching frontend expected format
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

  async updateChannelHealthSnapshots() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Update Weighbridge health
    await this.updateWeighbridgeHealth(oneHourAgo);

    // Update OCR health
    await this.updateOcrHealth();

    // Update Mobile Sync health
    await this.updateMobileSyncHealth();

    // Update ERP Push health
    await this.updateErpPushHealth();

    this.logger.log('Channel health snapshots updated');
  }

  private async updateWeighbridgeHealth(since: Date) {
    const stats = await this.weighLogRepo.getLatencyStats(since, new Date());
    const openAlerts = await this.alertRepo.countOpenBySource();
    const wbAlertCount = openAlerts.find((a: any) => a.alertSource === 'WEIGHBRIDGE')?._count?.id || 0;

    const status = wbAlertCount > 2 ? ChannelStatus.DOWN
      : wbAlertCount > 0 ? ChannelStatus.DEGRADED
      : ChannelStatus.HEALTHY;

    await this.healthRepo.upsert(IntegrationChannel.WEIGHBRIDGE, {
      status,
      openAlertCount: wbAlertCount,
      backlogCount: 0,
      successRate1h: 99.0, // Would calculate from actual data
      avgLatencyMs1h: stats._avg?.latencyMs || 0,
    });
  }

  private async updateOcrHealth() {
    const pendingCount = await this.ocrResultRepo.countByStatus('REVIEW_REQUIRED');
    const uploadedCount = await this.ocrResultRepo.countByStatus('UPLOADED');
    const backlog = pendingCount + uploadedCount;

    const openAlerts = await this.alertRepo.countOpenBySource();
    const ocrAlertCount = openAlerts.find((a: any) => a.alertSource === 'OCR')?._count?.id || 0;

    const status = ocrAlertCount > 2 ? ChannelStatus.DOWN
      : ocrAlertCount > 0 || backlog > 10 ? ChannelStatus.DEGRADED
      : ChannelStatus.HEALTHY;

    await this.healthRepo.upsert(IntegrationChannel.OCR, {
      status,
      openAlertCount: ocrAlertCount,
      backlogCount: backlog,
      successRate1h: 95.0,
      avgLatencyMs1h: 2000,
    });
  }

  private async updateMobileSyncHealth() {
    const conflictedCount = await this.syncBatchRepo.countByStatus('CONFLICTED');
    const failedCount = await this.syncBatchRepo.countByStatus('FAILED');

    const openAlerts = await this.alertRepo.countOpenBySource();
    const syncAlertCount = openAlerts.find((a: any) => a.alertSource === 'MOBILE_SYNC')?._count?.id || 0;

    const status = syncAlertCount > 2 ? ChannelStatus.DOWN
      : syncAlertCount > 0 || conflictedCount > 5 ? ChannelStatus.DEGRADED
      : ChannelStatus.HEALTHY;

    await this.healthRepo.upsert(IntegrationChannel.MOBILE_SYNC, {
      status,
      openAlertCount: syncAlertCount,
      backlogCount: conflictedCount + failedCount,
      successRate1h: 98.0,
      avgLatencyMs1h: 100,
    });
  }

  private async updateErpPushHealth() {
    const pendingCount = await this.erpPushRepo.countByStatus('PENDING');
    const failedCount = await this.erpPushRepo.countByStatus('ACK_FAILED');
    const deadLetterCount = await this.erpPushRepo.countByStatus('DEAD_LETTER');

    const openAlerts = await this.alertRepo.countOpenBySource();
    const erpAlertCount = openAlerts.find((a: any) => a.alertSource === 'ERP_PUSH')?._count?.id || 0;

    const status = deadLetterCount > 0 || erpAlertCount > 2 ? ChannelStatus.DOWN
      : erpAlertCount > 0 || failedCount > 5 ? ChannelStatus.DEGRADED
      : ChannelStatus.HEALTHY;

    await this.healthRepo.upsert(IntegrationChannel.ERP_PUSH, {
      status,
      openAlertCount: erpAlertCount,
      backlogCount: pendingCount + failedCount + deadLetterCount,
      successRate1h: deadLetterCount > 0 ? 80.0 : 95.0,
      avgLatencyMs1h: 3000,
    });
  }
}
