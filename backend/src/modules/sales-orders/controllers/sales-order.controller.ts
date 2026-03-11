import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { SalesOrderNestService } from '../services/sales-order.service';
import {
  CreateSalesOrderDto,
  UpdateSalesOrderDto,
  CancelSalesOrderDto,
  CloseSalesOrderDto,
  ReleaseShipmentDto,
  SalesOrderQueryDto,
  DashboardQueryDto,
} from '../dto/sales-order.dto';
import { Permission } from '../../../common/decorators/permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';

@ApiTags('Sales Orders')
@Controller('sales-orders')
export class SalesOrderController {
  constructor(private readonly service: SalesOrderNestService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo Sales Order mới' })
  @ApiResponse({ status: 201, description: 'SO created' })
  @Permission('sales_order.create')
  async create(@Body() dto: CreateSalesOrderDto, @CurrentUser() user?: RequestUser) {
    return this.service.create(dto, user?.id || 'system');
  }

  @Get('next-number')
  @ApiOperation({ summary: 'Lấy mã SO tiếp theo (tự động sinh)' })
  @ApiResponse({ status: 200, description: 'Next SO number' })
  @Permission('sales_order.view')
  async getNextNumber() {
    return this.service.getNextSoNumber();
  }

  @Get('dashboard/summary')
  @ApiOperation({ summary: 'Dashboard tổng quan SO' })
  @ApiResponse({ status: 200, description: 'Dashboard summary' })
  @Permission('sales_order.dashboard.view')
  async getDashboardSummary(@Query() query: DashboardQueryDto) {
    return this.service.getDashboardSummary(query);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách SO với phân trang và filter' })
  @ApiResponse({ status: 200, description: 'List of sales orders' })
  @Permission('sales_order.view')
  async list(@Query() query: SalesOrderQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết SO theo ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Sales order details' })
  @Permission('sales_order.view')
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật SO (chỉ DRAFT)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'SO updated' })
  @Permission('sales_order.update')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSalesOrderDto,
    @CurrentUser() user?: RequestUser,
  ) {
    return this.service.update(id, dto, user?.id || 'system');
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xác nhận SO (DRAFT → CONFIRMED)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'SO confirmed' })
  @Permission('sales_order.confirm')
  async confirm(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user?: RequestUser) {
    return this.service.confirm(id, user?.id || 'system');
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hủy SO' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'SO cancelled' })
  @Permission('sales_order.cancel')
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelSalesOrderDto,
    @CurrentUser() user?: RequestUser,
  ) {
    return this.service.cancel(id, dto, user?.id || 'system');
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đóng SO (SHIPPED → CLOSED)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'SO closed' })
  @Permission('sales_order.close')
  async close(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloseSalesOrderDto,
    @CurrentUser() user?: RequestUser,
  ) {
    return this.service.close(id, dto, user?.id || 'system');
  }

  @Post(':id/release-shipment')
  @ApiOperation({ summary: 'Tạo Shipment từ SO (release qty)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 201, description: 'Shipment released from SO' })
  @Permission('sales_order.release')
  async releaseShipment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReleaseShipmentDto,
    @CurrentUser() user?: RequestUser,
  ) {
    return this.service.releaseShipment(id, dto, user?.id || 'system');
  }

  @Get(':id/fulfillment')
  @ApiOperation({ summary: 'Tiến độ giao hàng chi tiết' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Fulfillment details' })
  @Permission('sales_order.view')
  async getFulfillment(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getFulfillment(id);
  }

  @Get(':id/shipments')
  @ApiOperation({ summary: 'Danh sách shipments linked to SO' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Linked shipments' })
  @Permission('sales_order.view')
  async getShipments(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getShipments(id);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Lịch sử trạng thái SO' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Status history' })
  @Permission('sales_order.view')
  async getHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getHistory(id);
  }
}
