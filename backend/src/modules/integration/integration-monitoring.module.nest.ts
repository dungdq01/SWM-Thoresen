import { Module } from '@nestjs/common';
import { IntegrationMonitoringController } from './integration-monitoring.controller.nest';
import { IntegrationMonitoringService } from './integration-monitoring.service.nest';

@Module({
  controllers: [IntegrationMonitoringController],
  providers: [IntegrationMonitoringService],
  exports: [IntegrationMonitoringService],
})
export class IntegrationMonitoringModule {}
