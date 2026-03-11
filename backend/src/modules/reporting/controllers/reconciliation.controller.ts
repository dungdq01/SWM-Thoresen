import { Controller, Get, Post, Param, Query, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ReconciliationService } from '../services/reconciliation.service';
import { 
  RunReconciliationDto, 
  ReconciliationResultsFilterDto, 
  ResolveReconciliationDto,
} from '../dto';
import { AuthGuard, PermissionGuard, Permission, CurrentUser } from '../../foundation/auth';
import { RequestUser } from '../../../common/interfaces/request-user.interface';
import { REPORTING_CONSTANTS } from '../domain/reporting.constants';

@ApiTags('Reporting - Reconciliation')
@Controller('reporting/reconciliation')
@UseGuards(AuthGuard, PermissionGuard)
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Post('run')
  @HttpCode(HttpStatus.CREATED)
  @Permission(REPORTING_CONSTANTS.PERMISSION_CODES.RECONCILIATION_RUN)
  @ApiOperation({ summary: 'Trigger chạy reconciliation' })
  @ApiResponse({ status: 201, description: 'Reconciliation run created' })
  async runReconciliation(@Body() dto: RunReconciliationDto, @CurrentUser() user: RequestUser) {
    return this.reconciliationService.runReconciliation(dto, user.id);
  }

  @Get('results')
  @Permission(REPORTING_CONSTANTS.PERMISSION_CODES.RECONCILIATION_READ)
  @ApiOperation({ summary: 'Danh sách kết quả reconciliation' })
  @ApiResponse({ status: 200, description: 'Reconciliation results list' })
  async getResults(@Query() filters: ReconciliationResultsFilterDto) {
    return this.reconciliationService.getResults(filters);
  }

  @Get('results/:id')
  @Permission(REPORTING_CONSTANTS.PERMISSION_CODES.RECONCILIATION_READ)
  @ApiOperation({ summary: 'Chi tiết một kết quả reconciliation' })
  @ApiResponse({ status: 200, description: 'Reconciliation result detail' })
  async getResultById(@Param('id') id: string) {
    return this.reconciliationService.getResultById(id);
  }

  @Post('results/:id/resolve')
  @HttpCode(HttpStatus.OK)
  @Permission(REPORTING_CONSTANTS.PERMISSION_CODES.RECONCILIATION_RESOLVE)
  @ApiOperation({ summary: 'Resolve một mismatch' })
  @ApiResponse({ status: 200, description: 'Reconciliation result resolved' })
  async resolveResult(
    @Param('id') id: string,
    @Body() dto: ResolveReconciliationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.reconciliationService.resolveResult(id, dto, user.id);
  }
}
