import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { IntegrationMonitoringService } from './integration-monitoring.service.nest';
import { Permission } from '../../common/decorators/permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/interfaces/request-user.interface';

@Controller('integration')
export class IntegrationMonitoringController {
  constructor(private readonly integrationService: IntegrationMonitoringService) {}

  @Get('monitoring/overview')
  @Permission('integration.monitoring.read')
  async getOverview() {
    return this.integrationService.getOverview();
  }

  @Get('monitoring/channel-health')
  @Permission('integration.monitoring.read')
  async getChannelHealth() {
    return this.integrationService.getChannelHealth();
  }

  @Get('monitoring/stats')
  @Permission('integration.monitoring.read')
  async getDetailedStats() {
    return this.integrationService.getDetailedStats();
  }

  @Get('alerts')
  @Permission('integration.alerts.read')
  async getAlerts(@Query() query: any) {
    return this.integrationService.getAlerts(query);
  }

  @Get('alerts/:id')
  @Permission('integration.alerts.read')
  async getAlertById(@Param('id') id: string) {
    return this.integrationService.getAlertById(id);
  }

  @Post('alerts/:id/acknowledge')
  @Permission('integration.alerts.manage')
  async acknowledgeAlert(
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser() user: RequestUser,
  ) {
    return this.integrationService.acknowledgeAlert(id, { ...dto, userId: user.id });
  }

  @Post('alerts/:id/resolve')
  @Permission('integration.alerts.manage')
  async resolveAlert(
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser() user: RequestUser,
  ) {
    return this.integrationService.resolveAlert(id, { ...dto, userId: user.id });
  }

  @Get('weighbridge/logs')
  @Permission('integration.weighbridge.read')
  async getWeighbridgeLogs(@Query() query: any) {
    return this.integrationService.getWeighbridgeLogs(query);
  }

  @Get('weighbridge/devices')
  @Permission('integration.weighbridge.read')
  async getWeighbridgeDevices(@Query() query: any) {
    return this.integrationService.getWeighbridgeDevices(query);
  }

  @Post('weighbridge/events/:id/reprocess')
  @Permission('integration.weighbridge.manage')
  async reprocessWeighEvent(
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser() user: RequestUser,
  ) {
    return this.integrationService.reprocessWeighEvent(id, { ...dto, userId: user.id });
  }
}
