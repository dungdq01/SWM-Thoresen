import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DashboardService } from '../services/dashboard.service';
import { DashboardSummaryQueryDto } from '../dto';
import { AuthGuard, PermissionGuard, Permission, CurrentUser } from '../../foundation/auth';
import { RequestUser } from '../../../common/interfaces/request-user.interface';
import { REPORTING_CONSTANTS } from '../domain/reporting.constants';

@ApiTags('Reporting - Dashboard')
@Controller('api/v1/reporting/dashboard')
@UseGuards(AuthGuard, PermissionGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @Permission(REPORTING_CONSTANTS.PERMISSION_CODES.DASHBOARD_READ)
  @ApiOperation({ summary: 'Lấy tổng hợp các widget dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard summary với tất cả widgets' })
  async getSummary(@Query() query: DashboardSummaryQueryDto, @CurrentUser() user: RequestUser) {
    return this.dashboardService.getSummary(query, user.id, user.roleCodes[0] || 'VIEWER');
  }

  @Get('widgets/:code')
  @Permission(REPORTING_CONSTANTS.PERMISSION_CODES.DASHBOARD_READ)
  @ApiOperation({ summary: 'Lấy data của một widget cụ thể' })
  @ApiResponse({ status: 200, description: 'Widget data' })
  async getWidgetData(@Param('code') code: string, @Query() query: DashboardSummaryQueryDto) {
    return this.dashboardService.getWidgetData(code, query);
  }
}
