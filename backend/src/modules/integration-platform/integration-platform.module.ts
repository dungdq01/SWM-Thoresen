import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';

// Controllers
import { WeighbridgeController } from './controllers/weighbridge.controller';
import { OcrController } from './controllers/ocr.controller';
import { MobileSyncController } from './controllers/mobile-sync.controller';
import { ErpPushController } from './controllers/erp-push.controller';
import { MonitoringController } from './controllers/monitoring.controller';

// Services
import { WeighbridgeIngestService } from './services/weighbridge-ingest.service';
import { WeighbridgeLogService } from './services/weighbridge-log.service';
import { WeighbridgeDeviceService } from './services/weighbridge-device.service';
import { OcrUploadService } from './services/ocr-upload.service';
import { OcrExtractService } from './services/ocr-extract.service';
import { OcrConfirmationService } from './services/ocr-confirmation.service';
import { MobileSyncBatchService } from './services/mobile-sync-batch.service';
import { MobileSyncDispatchService } from './services/mobile-sync-dispatch.service';
import { ErpPushService } from './services/erp-push.service';
import { ErpPayloadMapperService } from './services/erp-payload-mapper.service';
import { AlertService } from './services/alert.service';
import { ChannelHealthService } from './services/channel-health.service';
import { MonitoringService } from './services/monitoring.service';

// Repositories
import { WeighbridgeLogRepository } from './repositories/weighbridge-log.repository';
import { WeighbridgeDeviceRepository } from './repositories/weighbridge-device.repository';
import { WeighbridgeEventStateRepository } from './repositories/weighbridge-event-state.repository';
import { OcrResultRepository } from './repositories/ocr-result.repository';
import { OcrConfirmedSnapshotRepository } from './repositories/ocr-confirmed-snapshot.repository';
import { MobileSyncBatchRepository } from './repositories/mobile-sync-batch.repository';
import { MobileSyncEventRepository } from './repositories/mobile-sync-event.repository';
import { ErpPushLogRepository } from './repositories/erp-push-log.repository';
import { IntegrationAlertRepository } from './repositories/integration-alert.repository';
import { ChannelHealthRepository } from './repositories/channel-health.repository';
import { DeviceHeartbeatRepository } from './repositories/device-heartbeat.repository';

@Module({
  imports: [PrismaModule],
  controllers: [
    WeighbridgeController,
    OcrController,
    MobileSyncController,
    ErpPushController,
    MonitoringController,
  ],
  providers: [
    // Services
    WeighbridgeIngestService,
    WeighbridgeLogService,
    WeighbridgeDeviceService,
    OcrUploadService,
    OcrExtractService,
    OcrConfirmationService,
    MobileSyncBatchService,
    MobileSyncDispatchService,
    ErpPushService,
    ErpPayloadMapperService,
    AlertService,
    ChannelHealthService,
    MonitoringService,
    // Repositories
    WeighbridgeLogRepository,
    WeighbridgeDeviceRepository,
    WeighbridgeEventStateRepository,
    OcrResultRepository,
    OcrConfirmedSnapshotRepository,
    MobileSyncBatchRepository,
    MobileSyncEventRepository,
    ErpPushLogRepository,
    IntegrationAlertRepository,
    ChannelHealthRepository,
    DeviceHeartbeatRepository,
  ],
  exports: [
    WeighbridgeIngestService,
    WeighbridgeLogService,
    OcrUploadService,
    MobileSyncBatchService,
    ErpPushService,
    AlertService,
    MonitoringService,
  ],
})
export class IntegrationPlatformModule {}
