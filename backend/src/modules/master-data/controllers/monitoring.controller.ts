import { Controller, Get, Param, Query, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { MonitoringService } from '../services/monitoring.service';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Permission } from '../../../common/decorators/permission.decorator';

@Controller('monitoring')
@UseGuards(AuthGuard, PermissionGuard)
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('site-overview')
  @Permission('master_data.warehouse.view')
  async getSiteOverview(@Query('siteId') siteId?: string) {
    return this.monitoringService.getSiteOverview(siteId || 'TVL-SITE');
  }

  @Get('warehouses/:id/detail')
  @Permission('master_data.warehouse.view')
  async getWarehouseDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.monitoringService.getWarehouseDetail(id);
  }
}
