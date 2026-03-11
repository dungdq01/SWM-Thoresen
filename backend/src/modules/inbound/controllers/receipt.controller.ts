import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ReceiptService } from '../services/receipt.service';
import { 
  CreateReceiptDto, 
  ConfirmReceiptDto, 
  CancelReceiptDto, 
  WeighInDto, 
  WeighOutDto,
  ReceiptQueryDto 
} from '../dto/receipt.dto';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Permission } from '../../../common/decorators/permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';

@ApiTags('Inbound - Receipts')
@Controller('inbound')
// @UseGuards(AuthGuard, PermissionGuard) // Disabled for testing
export class ReceiptController {
  constructor(private readonly receiptService: ReceiptService) {}

  @Post('receipts')
  @ApiOperation({ summary: 'Create a new receipt' })
  @ApiResponse({ status: 201, description: 'Receipt created' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @Permission('INBOUND.RECEIPT.CREATE')
  async create(@Body() dto: CreateReceiptDto, @CurrentUser() user?: RequestUser) {
    return this.receiptService.createReceipt(dto, user?.id || 'system');
  }

  @Get('receipts')
  @ApiOperation({ summary: 'List receipts with pagination and filters' })
  @ApiResponse({ status: 200, description: 'List of receipts' })
  @Permission('INBOUND.RECEIPT.READ')
  async list(@Query() query: ReceiptQueryDto) {
    return this.receiptService.listReceipts(query);
  }

  @Get('receipts/:id')
  @ApiOperation({ summary: 'Get receipt by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Receipt details' })
  @ApiResponse({ status: 404, description: 'Receipt not found' })
  @Permission('INBOUND.RECEIPT.READ')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.receiptService.getReceipt(id);
  }

  @Get('receipts/:id/history')
  @ApiOperation({ summary: 'Get receipt status history' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Receipt history' })
  @Permission('INBOUND.RECEIPT.READ')
  async getHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.receiptService.getReceiptHistory(id);
  }

  @Post('receipts/:id/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm receipt' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Receipt confirmed' })
  @Permission('INBOUND.RECEIPT.CONFIRM')
  async confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmReceiptDto,
    @CurrentUser() user?: RequestUser,
  ) {
    return this.receiptService.confirmReceipt(id, dto, user?.id || 'system');
  }

  @Post('receipts/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel receipt' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Receipt cancelled' })
  @Permission('INBOUND.RECEIPT.CANCEL')
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelReceiptDto,
    @CurrentUser() user?: RequestUser,
  ) {
    return this.receiptService.cancelReceipt(id, dto, user?.id || 'system');
  }

  @Post('receipts/:id/reweigh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reweigh receipt' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Receipt set for reweigh' })
  @Permission('INBOUND.RECEIPT.REWEIGH')
  async reweigh(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user?: RequestUser) {
    return this.receiptService.reweighReceipt(id, user?.id || 'system');
  }

  @Post('receipts/:id/putaway-complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete putaway for receipt' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Putaway completed' })
  @Permission('INBOUND.RECEIPT.CLOSE')
  async putawayComplete(@Param('id', ParseUUIDPipe) id: string, @Body() dto: any, @CurrentUser() user?: RequestUser) {
    return this.receiptService.putawayComplete(id, dto, user?.id || 'system');
  }

  @Post('receipts/:id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close receipt' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Receipt closed' })
  @Permission('INBOUND.RECEIPT.CLOSE')
  async close(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user?: RequestUser) {
    return this.receiptService.closeReceipt(id, user?.id || 'system');
  }

  @Post('receipts/:id/start-processing')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start processing receipt' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Receipt processing started' })
  @Permission('INBOUND.WEIGH.RECEIVE')
  async startProcessing(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user?: RequestUser) {
    return this.receiptService.startProcessing(id, user?.id || 'system');
  }

  @Post('receipts/:id/manual-weight')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apply manual weight' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Manual weight applied' })
  @Permission('INBOUND.WEIGH.RECEIVE')
  async applyManualWeight(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: any,
    @CurrentUser() user?: RequestUser,
  ) {
    return this.receiptService.applyManualWeight(id, dto, user?.id || 'system');
  }

  @Post('weigh-events/in')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive weigh-in event' })
  @ApiResponse({ status: 200, description: 'Weigh-in recorded' })
  @Permission('INBOUND.WEIGH.RECEIVE')
  async weighIn(@Body() dto: WeighInDto, @CurrentUser() user?: RequestUser) {
    return this.receiptService.receiveWeighIn(dto, user?.id || 'system');
  }

  @Post('weigh-events/out')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive weigh-out event' })
  @ApiResponse({ status: 200, description: 'Weigh-out recorded' })
  @Permission('INBOUND.WEIGH.RECEIVE')
  async weighOut(@Body() dto: WeighOutDto, @CurrentUser() user?: RequestUser) {
    return this.receiptService.receiveWeighOut(dto, user?.id || 'system');
  }

  @Get('dashboard/summary')
  @ApiOperation({ summary: 'Get dashboard summary' })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Dashboard summary' })
  @Permission('INBOUND.DASHBOARD.READ')
  async getDashboardSummary(@Query('warehouseId') warehouseId?: string) {
    return this.receiptService.getDashboardSummary(warehouseId);
  }
}
