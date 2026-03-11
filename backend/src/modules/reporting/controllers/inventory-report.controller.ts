import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InventoryReportService } from '../services/inventory-report.service';
import { 
  OnHandReportFilterDto, 
  MovementReportFilterDto, 
  AgingReportFilterDto,
  InboundSummaryFilterDto,
  OutboundSummaryFilterDto,
  UtilizationFilterDto,
} from '../dto';
import { AuthGuard, PermissionGuard, Permission, CurrentUser } from '../../foundation/auth';
import { RequestUser } from '../../../common/interfaces/request-user.interface';
import { REPORTING_CONSTANTS } from '../domain/reporting.constants';

@ApiTags('Reporting - Inventory Reports')
@Controller('reporting/inventory')
@UseGuards(AuthGuard, PermissionGuard)
export class InventoryReportController {
  constructor(private readonly inventoryReportService: InventoryReportService) {}

  @Get('on-hand')
  @Permission(REPORTING_CONSTANTS.PERMISSION_CODES.INVENTORY_READ)
  @ApiOperation({ summary: 'Báo cáo tồn kho hiện tại' })
  @ApiResponse({ status: 200, description: 'On-hand inventory report' })
  async getOnHandReport(@Query() filters: OnHandReportFilterDto, @CurrentUser() user: RequestUser) {
    return this.inventoryReportService.getOnHandReport(filters, user.id);
  }

  @Get('movement')
  @Permission(REPORTING_CONSTANTS.PERMISSION_CODES.INVENTORY_READ)
  @ApiOperation({ summary: 'Lịch sử movement inventory' })
  @ApiResponse({ status: 200, description: 'Movement history report' })
  async getMovementHistory(@Query() filters: MovementReportFilterDto, @CurrentUser() user: RequestUser) {
    return this.inventoryReportService.getMovementHistory(filters, user.id);
  }

  @Get('aging')
  @Permission(REPORTING_CONSTANTS.PERMISSION_CODES.INVENTORY_READ)
  @ApiOperation({ summary: 'Báo cáo aging inventory' })
  @ApiResponse({ status: 200, description: 'Aging report' })
  async getAgingReport(@Query() filters: AgingReportFilterDto, @CurrentUser() user: RequestUser) {
    return this.inventoryReportService.getAgingReport(filters, user.id);
  }

  @Get('inbound-summary')
  @Permission(REPORTING_CONSTANTS.PERMISSION_CODES.INVENTORY_READ)
  @ApiOperation({ summary: 'Tổng hợp inbound' })
  @ApiResponse({ status: 200, description: 'Inbound summary report' })
  async getInboundSummary(@Query() filters: InboundSummaryFilterDto, @CurrentUser() user: RequestUser) {
    return this.inventoryReportService.getInboundSummary(filters, user.id);
  }

  @Get('outbound-summary')
  @Permission(REPORTING_CONSTANTS.PERMISSION_CODES.INVENTORY_READ)
  @ApiOperation({ summary: 'Tổng hợp outbound' })
  @ApiResponse({ status: 200, description: 'Outbound summary report' })
  async getOutboundSummary(@Query() filters: OutboundSummaryFilterDto, @CurrentUser() user: RequestUser) {
    return this.inventoryReportService.getOutboundSummary(filters, user.id);
  }

  @Get('utilization')
  @Permission(REPORTING_CONSTANTS.PERMISSION_CODES.INVENTORY_READ)
  @ApiOperation({ summary: 'Báo cáo sử dụng location' })
  @ApiResponse({ status: 200, description: 'Utilization report' })
  async getUtilizationReport(@Query() filters: UtilizationFilterDto, @CurrentUser() user: RequestUser) {
    return this.inventoryReportService.getUtilizationReport(filters, user.id);
  }
}
