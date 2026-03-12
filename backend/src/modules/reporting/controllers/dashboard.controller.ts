import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DashboardService } from '../services/dashboard.service';
import { DashboardSummaryQueryDto } from '../dto';
import { AuthGuard, PermissionGuard, Permission, CurrentUser } from '../../foundation/auth';
import { RequestUser } from '../../../common/interfaces/request-user.interface';
import { REPORTING_CONSTANTS } from '../domain/reporting.constants';

@ApiTags('Reporting - Dashboard')
@Controller('reporting/dashboard')
@UseGuards(AuthGuard, PermissionGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @Permission(REPORTING_CONSTANTS.PERMISSION_CODES.DASHBOARD_READ)
  @ApiOperation({ summary: 'Lấy tổng hợp dashboard dạng flat cho frontend' })
  @ApiResponse({ status: 200, description: 'Dashboard summary với tất cả KPIs' })
  async getSummary(@Query() query: DashboardSummaryQueryDto) {
    // Return flat dashboard format matching frontend expectations
    return this.dashboardService.getFlatDashboard(query);
  }

  @Get('widgets/:code')
  @Permission(REPORTING_CONSTANTS.PERMISSION_CODES.DASHBOARD_READ)
  @ApiOperation({ summary: 'Lấy data của một widget cụ thể' })
  @ApiResponse({ status: 200, description: 'Widget data' })
  async getWidgetData(@Param('code') code: string, @Query() query: DashboardSummaryQueryDto) {
    return this.dashboardService.getWidgetData(code, query);
  }
}
