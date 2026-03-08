import { Controller, Get, Query, Request } from '@nestjs/common';
import { InventoryReportService } from '../services/inventory-report.service';
import { 
  OnHandReportFilterDto, 
  MovementReportFilterDto, 
  AgingReportFilterDto,
  UtilizationFilterDto,
  InboundSummaryFilterDto,
  OutboundSummaryFilterDto,
} from '../dto';

@Controller('api/v1/reporting/inventory')
export class InventoryReportController {
  constructor(private readonly inventoryReportService: InventoryReportService) {}

  @Get('on-hand')
  async getOnHandReport(@Query() query: OnHandReportFilterDto, @Request() req: any) {
    const userId = req.user?.id || 'system';
    return this.inventoryReportService.getOnHandReport(query, userId);
  }

  @Get('movement')
  async getMovementHistory(@Query() query: MovementReportFilterDto, @Request() req: any) {
    const userId = req.user?.id || 'system';
    return this.inventoryReportService.getMovementHistory(query, userId);
  }

  @Get('aging')
  async getAgingReport(@Query() query: AgingReportFilterDto, @Request() req: any) {
    const userId = req.user?.id || 'system';
    return this.inventoryReportService.getAgingReport(query, userId);
  }

  @Get('inbound-summary')
  async getInboundSummary(@Query() query: InboundSummaryFilterDto, @Request() req: any) {
    const userId = req.user?.id || 'system';
    return this.inventoryReportService.getInboundSummary(query, userId);
  }

  @Get('outbound-summary')
  async getOutboundSummary(@Query() query: OutboundSummaryFilterDto, @Request() req: any) {
    const userId = req.user?.id || 'system';
    return this.inventoryReportService.getOutboundSummary(query, userId);
  }

  @Get('utilization')
  async getUtilizationReport(@Query() query: UtilizationFilterDto, @Request() req: any) {
    const userId = req.user?.id || 'system';
    return this.inventoryReportService.getUtilizationReport(query, userId);
  }
}
