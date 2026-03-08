import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ShipmentQueryService } from '../services/shipment-query.service';

@ApiTags('Outbound - Query')
@Controller('api/v1/outbound')
export class OutboundQueryController {
  constructor(private readonly queryService: ShipmentQueryService) {}

  @Get('shipments/:id/history')
  @ApiOperation({ summary: 'Get status history for shipment' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Status history' })
  async getHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.queryService.getStatusHistory(id);
  }

  @Get('shipments/:id/exceptions')
  @ApiOperation({ summary: 'Get exceptions for shipment' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Exception logs' })
  async getExceptions(@Param('id', ParseUUIDPipe) id: string) {
    return this.queryService.getExceptions(id);
  }

  @Get('dashboard/summary')
  @ApiOperation({ summary: 'Get dashboard summary' })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Dashboard summary metrics' })
  async getDashboardSummary(@Query('warehouseId') warehouseId?: string) {
    return this.queryService.getDashboardSummary(warehouseId);
  }

  @Get('dashboard/kpis')
  @ApiOperation({ summary: 'Get KPI metrics' })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'KPI metrics' })
  async getKpis(@Query('warehouseId') warehouseId?: string) {
    const summary = await this.queryService.getDashboardSummary(warehouseId);
    return {
      ...summary,
      completionRate: summary.totalShippedToday > 0
        ? (summary.totalShippedToday / (summary.totalDraft + summary.totalConfirmed + summary.totalAllocated + summary.totalPicking + summary.totalShippedToday)) * 100
        : 0,
    };
  }
}
