import { Controller, Get, Post, Body, Param, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { IsString, IsOptional } from 'class-validator';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Permission } from '../../../common/decorators/permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';
import { MonitoringService } from '../services/monitoring.service';
import { AlertService } from '../services/alert.service';
import { ChannelHealthService } from '../services/channel-health.service';

class AcknowledgeAlertDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

class ResolveAlertDto {
  @IsString()
  resolutionNote!: string;
}

@Controller('api/v1/integration')
@UseGuards(AuthGuard, PermissionGuard)
export class MonitoringController {
  constructor(
    private readonly monitoringService: MonitoringService,
    private readonly alertService: AlertService,
    private readonly channelHealthService: ChannelHealthService,
  ) {}

  @Get('monitoring/overview')
  @Permission('INTEGRATION.MONITORING.VIEW')
  async getOverview() {
    return this.monitoringService.getDashboardOverview();
  }

  @Get('monitoring/channel-health')
  @Permission('INTEGRATION.MONITORING.VIEW')
  async getChannelHealth() {
    return this.channelHealthService.getChannelHealth();
  }

  @Get('monitoring/stats')
  @Permission('INTEGRATION.MONITORING.VIEW')
  async getDetailedStats() {
    return this.monitoringService.getDetailedStats();
  }

  @Get('alerts')
  @Permission('INTEGRATION.ALERT.READ')
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
  @Permission('INTEGRATION.ALERT.READ')
  async getAlertById(@Param('id') id: string) {
    return this.alertService.getAlertById(id);
  }

  @Post('alerts/:id/acknowledge')
  @HttpCode(HttpStatus.OK)
  @Permission('INTEGRATION.ALERT.ACKNOWLEDGE')
  async acknowledgeAlert(@Param('id') id: string, @Body() dto: AcknowledgeAlertDto, @CurrentUser() user: RequestUser) {
    return this.alertService.acknowledgeAlert(id, user.id);
  }

  @Post('alerts/:id/resolve')
  @HttpCode(HttpStatus.OK)
  @Permission('INTEGRATION.ALERT.RESOLVE')
  async resolveAlert(@Param('id') id: string, @Body() dto: ResolveAlertDto, @CurrentUser() user: RequestUser) {
    return this.alertService.resolveAlert(id, user.id, dto.resolutionNote);
  }
}
