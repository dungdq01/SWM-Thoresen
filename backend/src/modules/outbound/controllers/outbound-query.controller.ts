import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ShipmentQueryService } from '../services/shipment-query.service';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Permission } from '../../../common/decorators/permission.decorator';

@ApiTags('Outbound - Query')
@Controller('outbound')
@UseGuards(AuthGuard, PermissionGuard)
export class OutboundQueryController {
  constructor(private readonly queryService: ShipmentQueryService) {}

  @Get('shipments/:id/history')
  @ApiOperation({ summary: 'Get status history for shipment' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Status history' })
  @Permission('OUTBOUND.SHIPMENT.READ')
  async getHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.queryService.getStatusHistory(id);
  }

  @Get('shipments/:id/exceptions')
  @ApiOperation({ summary: 'Get exceptions for shipment' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Exception logs' })
  @Permission('OUTBOUND.SHIPMENT.READ')
  async getExceptions(@Param('id', ParseUUIDPipe) id: string) {
    return this.queryService.getExceptions(id);
  }

  @Get('dashboard/summary')
  @ApiOperation({ summary: 'Get dashboard summary' })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Dashboard summary metrics' })
  @Permission('OUTBOUND.DASHBOARD.READ')
  async getDashboardSummary(@Query('warehouseId') warehouseId?: string) {
    return this.queryService.getDashboardSummary(warehouseId);
  }

  @Get('dashboard/kpis')
  @ApiOperation({ summary: 'Get KPI metrics' })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'KPI metrics' })
  @Permission('OUTBOUND.DASHBOARD.READ')
  async getKpis(@Query('warehouseId') warehouseId?: string) {
    const summary = await this.queryService.getDashboardSummary(warehouseId);
    return {
      ...summary,
      completionRate: summary.totalShippedToday > 0
        ? (summary.totalShippedToday / (summary.totalDraft + summary.totalConfirmed + summary.totalLoading + summary.totalLoaded + summary.totalShippedToday)) * 100
        : 0,
    };
  }
}
