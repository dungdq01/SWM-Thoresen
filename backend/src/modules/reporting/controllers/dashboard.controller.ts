import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { DashboardService } from '../services/dashboard.service';
import { DashboardSummaryQueryDto } from '../dto';

@Controller('api/v1/reporting/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  async getSummary(@Query() query: DashboardSummaryQueryDto, @Request() req: any) {
    const userId = req.user?.id || 'system';
    const userRole = req.user?.role || 'ADMIN';
    return this.dashboardService.getSummary(query, userId, userRole);
  }

  @Get('widgets/:code')
  async getWidgetData(@Param('code') code: string, @Query() query: DashboardSummaryQueryDto) {
    return this.dashboardService.getWidgetData(code, query);
  }
}
