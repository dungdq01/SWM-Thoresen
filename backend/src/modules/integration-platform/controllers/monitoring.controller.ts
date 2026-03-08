import { Controller, Get, Post, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { MonitoringService } from '../services/monitoring.service';
import { AlertService } from '../services/alert.service';
import { ChannelHealthService } from '../services/channel-health.service';

class AcknowledgeAlertDto {
  notes?: string;
}

class ResolveAlertDto {
  resolutionNote!: string;
}

@Controller('api/v1/integration')
export class MonitoringController {
  constructor(
    private readonly monitoringService: MonitoringService,
    private readonly alertService: AlertService,
    private readonly channelHealthService: ChannelHealthService,
  ) {}

  @Get('monitoring/overview')
  async getOverview() {
    return this.monitoringService.getDashboardOverview();
  }

  @Get('monitoring/channel-health')
  async getChannelHealth() {
    return this.channelHealthService.getChannelHealth();
  }

  @Get('monitoring/stats')
  async getDetailedStats() {
    return this.monitoringService.getDetailedStats();
  }

  @Get('alerts')
  async getAlerts(
    @Query('alertSource') alertSource?: string,
    @Query('severity') severity?: string,
    @Query('status') status?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.alertService.getAlerts({
      alertSource,
      severity,
      status,
      warehouseId,
      dateFrom,
      dateTo,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('alerts/:id')
  async getAlertById(@Param('id') id: string) {
    return this.alertService.getAlertById(id);
  }

  @Post('alerts/:id/acknowledge')
  @HttpCode(HttpStatus.OK)
  async acknowledgeAlert(@Param('id') id: string, @Body() dto: AcknowledgeAlertDto) {
    const userId = 'admin'; // In production, from auth context
    return this.alertService.acknowledgeAlert(id, userId);
  }

  @Post('alerts/:id/resolve')
  @HttpCode(HttpStatus.OK)
  async resolveAlert(@Param('id') id: string, @Body() dto: ResolveAlertDto) {
    const userId = 'admin'; // In production, from auth context
    return this.alertService.resolveAlert(id, userId, dto.resolutionNote);
  }
}
