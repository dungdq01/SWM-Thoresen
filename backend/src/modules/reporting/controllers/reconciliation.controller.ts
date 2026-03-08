import { Controller, Get, Post, Param, Query, Body, Request } from '@nestjs/common';
import { ReconciliationService } from '../services/reconciliation.service';
import { 
  RunReconciliationDto, 
  ReconciliationResultsFilterDto, 
  ResolveReconciliationDto,
} from '../dto';

@Controller('api/v1/reporting/reconciliation')
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Post('run')
  async runReconciliation(@Body() dto: RunReconciliationDto, @Request() req: any) {
    const userId = req.user?.id || 'system';
    return this.reconciliationService.runReconciliation(dto, userId);
  }

  @Get('results')
  async getResults(@Query() filters: ReconciliationResultsFilterDto) {
    return this.reconciliationService.getResults(filters);
  }

  @Get('results/:id')
  async getResultById(@Param('id') id: string) {
    return this.reconciliationService.getResultById(id);
  }

  @Post('results/:id/resolve')
  async resolveResult(
    @Param('id') id: string,
    @Body() dto: ResolveReconciliationDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id || 'system';
    return this.reconciliationService.resolveResult(id, dto, userId);
  }
}
